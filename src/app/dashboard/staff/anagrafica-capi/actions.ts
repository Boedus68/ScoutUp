"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { joinFullName } from "@/lib/profile-name";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isCocaUnit } from "@/lib/staff-unit";
import type { CocaGroupRole } from "@/lib/types";

export type InviteLeaderResult = {
  ok: boolean;
  mode: "invited" | "linked" | "needs_auth" | "error";
  message: string;
};

const groupRoles = new Set<CocaGroupRole>([
  "capo_gruppo",
  "tesoriere",
  "segretario",
  "cambusiere",
  "maestro_novizi",
  "capo_unita",
]);

const RPC_SQL_MESSAGE =
  "Sul database manca la funzione link_leader_by_email. In Supabase → SQL Editor (ruolo postgres) esegui sql_editor_link_leader_membership.sql (solo RPC, nessun utente), poi riprova «Collega capo».";

const NO_SERVICE_ROLE_MESSAGE =
  "L'invito Auth dall'app richiede SUPABASE_SERVICE_ROLE_KEY sul server Netlify (mai NEXT_PUBLIC_*). Configurala e usa «Invita capo», oppure invita da Authentication e poi «Collega capo». Non inserire membership da SQL Editor.";

async function assertCocaLeader() {
  const session = await requireRole(["leader"]);
  if (!isCocaUnit(session.unit)) {
    throw new Error("Anagrafica Capi disponibile solo in contesto Co.Ca.");
  }
  if (!session.unit?.group_id) {
    throw new Error("Unità Co.Ca. senza group_id.");
  }
  return session;
}

function isMissingLinkRpc(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("link_leader_by_email") &&
    (m.includes("does not exist") ||
      m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("non esiste"))
  );
}

function isAuthMissing(message: string) {
  const m = message.toLowerCase();
  return m.includes("utente assente in auth") || m.includes("user not found");
}

export async function inviteOrLinkLeaderAction(
  formData: FormData,
): Promise<InviteLeaderResult> {
  const { supabase, unit, availableUnits } = await assertCocaLeader();
  const groupId = unit!.group_id!;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const serviceUnitId = String(formData.get("service_unit_id") ?? "").trim();
  const groupRoleRaw = String(formData.get("group_role") ?? "").trim();
  const groupRole =
    groupRoleRaw && groupRoles.has(groupRoleRaw as CocaGroupRole)
      ? (groupRoleRaw as CocaGroupRole)
      : null;

  if (!email || !email.includes("@")) {
    return { ok: false, mode: "error", message: "Email non valida." };
  }
  const fullName = joinFullName(firstName, lastName) || email;
  if (!firstName && !lastName) {
    return {
      ok: false,
      mode: "error",
      message: "Inserisci nome e/o cognome del capo.",
    };
  }

  const serviceUnits = availableUnits.filter((u) => u.group_id === groupId);
  const serviceUnit =
    serviceUnits.find((u) => u.id === serviceUnitId) ??
    serviceUnits.find((u) => u.branch !== "COCA") ??
    serviceUnits[0] ??
    null;

  if (!serviceUnit) {
    return {
      ok: false,
      mode: "error",
      message: "Nessuna unità di servizio nel gruppo.",
    };
  }

  async function linkLeader(): Promise<InviteLeaderResult | null> {
    const { error } = await supabase.rpc("link_leader_by_email", {
      p_email: email,
      p_unit_id: serviceUnit!.id,
      p_full_name: fullName,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
      p_phone: phone,
      p_group_role: groupRole,
    });
    if (!error) return null;
    if (isMissingLinkRpc(error.message)) {
      return { ok: false, mode: "error", message: RPC_SQL_MESSAGE };
    }
    if (isAuthMissing(error.message)) {
      return {
        ok: false,
        mode: "needs_auth",
        message: hasServiceRoleKey()
          ? "Utente assente in Authentication dopo l'invito."
          : NO_SERVICE_ROLE_MESSAGE,
      };
    }
    return { ok: false, mode: "error", message: error.message };
  }

  try {
    const admin = createAdminClient();
    if (admin && hasServiceRoleKey()) {
      const { data: invited, error: invErr } =
        await admin.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: fullName,
            role: "leader",
          },
        });

      if (invErr) {
        const { data: existingId, error: rpcErr } = await supabase.rpc(
          "user_id_by_email",
          { p_email: email },
        );
        if (rpcErr && isMissingLinkRpc(rpcErr.message)) {
          return { ok: false, mode: "error", message: RPC_SQL_MESSAGE };
        }
        if (rpcErr && !isMissingLinkRpc(rpcErr.message)) {
          // user_id_by_email esiste; altro errore
          throw new Error(rpcErr.message);
        }
        if (existingId) {
          const linkErr = await linkLeader();
          if (linkErr) return linkErr;
          revalidatePath("/dashboard/staff/anagrafica-capi");
          return {
            ok: true,
            mode: "linked",
            message: `Capo già in Auth: profilo collegato (${email}).`,
          };
        }
        return {
          ok: false,
          mode: "error",
          message: invErr.message,
        };
      }

      if (!invited.user?.id) {
        return {
          ok: false,
          mode: "error",
          message: "Invite inviato ma senza user id.",
        };
      }

      const linkErr = await linkLeader();
      if (linkErr) {
        return {
          ok: false,
          mode: "error",
          message: `Invito Auth inviato a ${email}. ${linkErr.message}`,
        };
      }

      revalidatePath("/dashboard/staff/anagrafica-capi");
      return {
        ok: true,
        mode: "invited",
        message: `Invito Auth inviato a ${email}. Il capo riceverà l'email di setup.`,
      };
    }

    const { data: existingId, error: rpcErr } = await supabase.rpc(
      "user_id_by_email",
      { p_email: email },
    );
    if (rpcErr) {
      if (isMissingLinkRpc(rpcErr.message)) {
        return { ok: false, mode: "error", message: RPC_SQL_MESSAGE };
      }
      throw new Error(rpcErr.message);
    }

    if (existingId) {
      const linkErr = await linkLeader();
      if (linkErr) return linkErr;
      revalidatePath("/dashboard/staff/anagrafica-capi");
      return {
        ok: true,
        mode: "linked",
        message: `Profilo capo collegato a ${email} (Auth già presente).`,
      };
    }

    return {
      ok: false,
      mode: "needs_auth",
      message: NO_SERVICE_ROLE_MESSAGE,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore imprevisto.";
    if (isMissingLinkRpc(message)) {
      return { ok: false, mode: "error", message: RPC_SQL_MESSAGE };
    }
    return { ok: false, mode: "error", message };
  }
}

export async function updateLeaderGroupRoleAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const { supabase, unit } = await assertCocaLeader();
  const leaderId = String(formData.get("leader_id") ?? "").trim();
  const groupRoleRaw = String(formData.get("group_role") ?? "").trim();
  const groupRole =
    groupRoleRaw && groupRoles.has(groupRoleRaw as CocaGroupRole)
      ? (groupRoleRaw as CocaGroupRole)
      : null;

  if (!leaderId) {
    return { ok: false, message: "Capo non indicato." };
  }

  const { data: peer } = await supabase
    .from("profiles")
    .select("id, unit_id, role")
    .eq("id", leaderId)
    .maybeSingle();

  if (!peer) {
    return { ok: false, message: "Capo non trovato o non visibile." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ group_role: groupRole })
    .eq("id", leaderId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/staff/anagrafica-capi");
  revalidatePath("/dashboard/staff/unita");
  revalidatePath("/dashboard/staff/profilo");
  void unit;
  return { ok: true, message: "Incarico aggiornato." };
}

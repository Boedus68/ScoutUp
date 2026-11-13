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
  sqlHint?: string;
};

const groupRoles = new Set<CocaGroupRole>([
  "capo_gruppo",
  "tesoriere",
  "segretario",
  "cambusiere",
  "maestro_novizi",
  "capo_unita",
]);

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

  const profilePatch = {
    full_name: fullName,
    first_name: firstName || null,
    last_name: lastName || null,
    phone,
    role: "leader" as const,
    active_role: "leader" as const,
    unit_id: serviceUnit.id,
    group_role: groupRole,
  };

  const sqlHint = [
    `-- SQL Editor come postgres: supabase/sql_editor_link_leader_membership.sql`,
    `-- Installa solo le RPC (nessun INSERT di utenti). Poi riesegui «Collega capo».`,
    `-- Se l'utente non è in Authentication, invita da Dashboard Auth e riprova dall'app.`,
  ].join("\n");

  function isMissingLinkRpc(message: string) {
    const m = message.toLowerCase();
    return (
      m.includes("link_leader_by_email") &&
      (m.includes("does not exist") ||
        m.includes("schema cache") ||
        m.includes("could not find"))
    );
  }

  async function linkLeader() {
    const { error } = await supabase.rpc("link_leader_by_email", {
      p_email: email,
      p_unit_id: serviceUnit.id,
      p_full_name: fullName,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
      p_phone: phone,
      p_group_role: groupRole,
    });
    if (!error) return;

    const admin = createAdminClient();
    if (admin && hasServiceRoleKey() && isMissingLinkRpc(error.message)) {
      const { data: existingId, error: lookupErr } = await supabase.rpc(
        "user_id_by_email",
        { p_email: email },
      );
      if (lookupErr) throw new Error(lookupErr.message);
      const userId = existingId as string | null;
      if (!userId) throw new Error(error.message);
      const { error: upErr } = await admin.from("profiles").upsert({
        id: userId,
        ...profilePatch,
      });
      if (upErr) throw new Error(upErr.message);
      const { error: memErr } = await admin.from("role_memberships").upsert(
        { user_id: userId, role: "leader" },
        { onConflict: "user_id,role" },
      );
      if (memErr) throw new Error(memErr.message);
      return;
    }

    throw new Error(error.message);
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
        // Utente già esistente → collega
        const { data: existingId, error: rpcErr } = await supabase.rpc(
          "user_id_by_email",
          { p_email: email },
        );
        if (rpcErr) throw new Error(rpcErr.message);
        if (existingId) {
          await linkLeader();
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
          sqlHint,
        };
      }

      const userId = invited.user?.id;
      if (!userId) {
        return {
          ok: false,
          mode: "error",
          message: "Invite inviato ma senza user id.",
          sqlHint,
        };
      }

      try {
        await linkLeader();
      } catch (linkErr) {
        const { error: upErr } = await admin.from("profiles").upsert({
          id: userId,
          ...profilePatch,
        });
        if (upErr) {
          throw linkErr instanceof Error ? linkErr : new Error(upErr.message);
        }
        const { error: memErr } = await admin.from("role_memberships").upsert(
          { user_id: userId, role: "leader" },
          { onConflict: "user_id,role" },
        );
        if (memErr) {
          throw linkErr instanceof Error ? linkErr : new Error(memErr.message);
        }
      }

      revalidatePath("/dashboard/staff/anagrafica-capi");
      return {
        ok: true,
        mode: "invited",
        message: `Invito Auth inviato a ${email}. Il capo riceverà l'email di setup.`,
      };
    }

    // Senza service role: collega se Auth esiste già.
    const { data: existingId, error: rpcErr } = await supabase.rpc(
      "user_id_by_email",
      { p_email: email },
    );
    if (rpcErr) throw new Error(rpcErr.message);

    if (existingId) {
      await linkLeader();
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
      message:
        "Nessuna service role sul server e utente assente in Auth. Invita l'utente da Supabase Authentication, poi riesegui «Collega capo» con la stessa email.",
      sqlHint,
    };
  } catch (e) {
    return {
      ok: false,
      mode: "error",
      message: e instanceof Error ? e.message : "Errore imprevisto.",
      sqlHint,
    };
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

  // Verifica peer stesso gruppo (RLS + check app).
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
  void unit;
  return { ok: true, message: "Incarico aggiornato." };
}

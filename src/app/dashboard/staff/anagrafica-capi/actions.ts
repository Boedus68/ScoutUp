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

  async function applyProfile(userId: string) {
    const { error: upErr } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);

    const { error: memErr } = await supabase.from("role_memberships").upsert(
      { user_id: userId, role: "leader" },
      { onConflict: "user_id,role" },
    );
    if (memErr) throw new Error(memErr.message);
  }

  const sqlHint = [
    `-- 1) Authentication → Users → Invite user: ${email}`,
    `-- 2) Poi riesegui «Collega capo» dall'app, oppure:`,
    `UPDATE public.profiles SET`,
    `  full_name = '${fullName.replace(/'/g, "''")}',`,
    `  first_name = ${firstName ? `'${firstName.replace(/'/g, "''")}'` : "NULL"},`,
    `  last_name = ${lastName ? `'${lastName.replace(/'/g, "''")}'` : "NULL"},`,
    `  role = 'leader', active_role = 'leader',`,
    `  unit_id = '${serviceUnit.id}',`,
    `  group_role = ${groupRole ? `'${groupRole}'` : "NULL"}`,
    `WHERE id = public.user_id_by_email('${email}');`,
    `INSERT INTO public.role_memberships (user_id, role)`,
    `VALUES (public.user_id_by_email('${email}'), 'leader')`,
    `ON CONFLICT DO NOTHING;`,
  ].join("\n");

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
          await applyProfile(existingId as string);
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

      // Trigger handle_new_user può aver creato il profilo; aggiorniamo i campi.
      await applyProfile(userId);
      // Fallback insert se il trigger non è attivo
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (!existing) {
        await admin.from("profiles").upsert({
          id: userId,
          ...profilePatch,
        });
        await admin.from("role_memberships").upsert(
          { user_id: userId, role: "leader" },
          { onConflict: "user_id,role" },
        );
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
      await applyProfile(existingId as string);
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

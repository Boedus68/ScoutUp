"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isCocaUnit, staffUnitId } from "@/lib/staff-unit";
import type { ProgressionStatus } from "@/lib/types";

async function assertCocaContext() {
  const session = await requireRole(["leader"]);
  if (!isCocaUnit(session.unit)) {
    throw new Error("Disponibile solo in contesto Comunità Capi.");
  }
  return session;
}

async function assertCanEditLeader(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  editorId: string,
  editorGroupRole: string | null,
  targetLeaderId: string,
  groupId: string,
) {
  if (editorId === targetLeaderId) return;

  if (editorGroupRole !== "capo_gruppo") {
    throw new Error("Solo il Capo Gruppo può aggiornare il percorso degli altri capi.");
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, unit_id")
    .eq("id", targetLeaderId)
    .maybeSingle();
  if (!target || target.role !== "leader") {
    throw new Error("Destinatario non valido.");
  }

  const { data: targetUnit } = await supabase
    .from("units")
    .select("group_id")
    .eq("id", target.unit_id)
    .maybeSingle();

  if (!targetUnit || targetUnit.group_id !== groupId) {
    throw new Error("Il capo non appartiene al tuo gruppo.");
  }
}

export async function upsertFormativeStepAction(formData: FormData) {
  const { profile, unit, supabase } = await assertCocaContext();
  const catalogId = String(formData.get("catalog_id") ?? "").trim();
  const targetId = String(formData.get("member_id") ?? profile.id).trim();
  const status = String(formData.get("status") ?? "in_progress") as ProgressionStatus;
  const heldAt = String(formData.get("held_at") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const comment = String(formData.get("staff_comment") ?? "").trim();

  if (!catalogId) throw new Error("Tappa non valida.");
  if (!["in_progress", "conquered", "requested", "rejected"].includes(status)) {
    throw new Error("Stato non valido.");
  }

  await assertCanEditLeader(
    supabase,
    profile.id,
    profile.group_role,
    targetId,
    unit!.group_id!,
  );

  const { data: catalog } = await supabase
    .from("progression_catalog")
    .select("id, title, kind, branch")
    .eq("id", catalogId)
    .eq("branch", "COCA")
    .maybeSingle();
  if (!catalog) throw new Error("Voce di catalogo non trovata.");

  const { data: existing } = await supabase
    .from("progression_items")
    .select("id")
    .eq("member_id", targetId)
    .eq("catalog_id", catalogId)
    .maybeSingle();

  const payload = {
    member_id: targetId,
    catalog_id: catalogId,
    branch: "COCA" as const,
    kind: catalog.kind,
    title: catalog.title,
    status,
    held_at: heldAt || null,
    location: location || null,
    staff_comment: comment || null,
    assigned_by: profile.id,
    decided_at: status === "conquered" ? new Date().toISOString() : null,
    decided_by: status === "conquered" ? profile.id : null,
  };

  const { error } = existing
    ? await supabase.from("progression_items").update(payload).eq("id", existing.id)
    : await supabase.from("progression_items").insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/percorso-formativo");
  revalidatePath(`/dashboard/staff/percorso-formativo/${targetId}`);
}

export async function ensureOwnFormativePathAction() {
  const { profile, supabase } = await assertCocaContext();
  const unitId = staffUnitId(profile);
  if (!unitId) throw new Error("Unità non disponibile.");

  const { data: catalog } = await supabase
    .from("progression_catalog")
    .select("id, title, kind")
    .eq("branch", "COCA")
    .order("sort_order");

  const { data: existing } = await supabase
    .from("progression_items")
    .select("catalog_id")
    .eq("member_id", profile.id)
    .eq("branch", "COCA");

  const have = new Set((existing ?? []).map((r) => r.catalog_id).filter(Boolean));
  const missing = (catalog ?? []).filter((c) => !have.has(c.id));

  if (missing.length > 0) {
    const { error } = await supabase.from("progression_items").insert(
      missing.map((c) => ({
        member_id: profile.id,
        catalog_id: c.id,
        branch: "COCA",
        kind: c.kind,
        title: c.title,
        status: "in_progress",
        assigned_by: profile.id,
      })),
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/staff/percorso-formativo");
}

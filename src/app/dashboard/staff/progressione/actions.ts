"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { ProgressionKind, ScoutBranch } from "@/lib/types";

async function assertLeaderOfMember(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  leaderUnitId: string | null,
  memberId: string,
) {
  if (!leaderUnitId) throw new Error("Capo senza unità.");
  const { data: member } = await supabase
    .from("profiles")
    .select("id, unit_id, role")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || member.role !== "member" || member.unit_id !== leaderUnitId) {
    throw new Error("Ragazzo non nella tua unità.");
  }
  return member;
}

export async function decideProgressionAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  const itemId = String(formData.get("item_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("staff_comment") ?? "").trim();

  if (!itemId || !["conquered", "rejected"].includes(decision)) {
    throw new Error("Decisione non valida.");
  }

  const { data: item } = await supabase
    .from("progression_items")
    .select("id, member_id, status")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Item non trovato.");
  await assertLeaderOfMember(supabase, profile.unit_id, item.member_id);

  const { error } = await supabase
    .from("progression_items")
    .update({
      status: decision,
      staff_comment: comment || null,
      decided_at: new Date().toISOString(),
      decided_by: profile.id,
    })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/progressione");
  revalidatePath(`/dashboard/staff/progressione/${item.member_id}`);
  revalidatePath("/dashboard/member/progressione");
}

export async function assignProgressionAction(formData: FormData) {
  const { profile, unit, supabase } = await requireRole(["leader"]);
  if (!unit) throw new Error("Unità mancante.");

  const memberId = String(formData.get("member_id") ?? "");
  const catalogId = String(formData.get("catalog_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as ProgressionKind;
  const asConquered = formData.get("as_conquered") === "on";

  await assertLeaderOfMember(supabase, profile.unit_id, memberId);

  let finalTitle = title;
  let finalKind = kind;
  let finalCatalogId: string | null = catalogId || null;

  if (catalogId) {
    const { data: cat } = await supabase
      .from("progression_catalog")
      .select("id, title, kind, branch")
      .eq("id", catalogId)
      .maybeSingle();
    if (!cat || cat.branch !== unit.branch) {
      throw new Error("Voce di catalogo non valida per la branca.");
    }
    finalTitle = title || cat.title;
    finalKind = cat.kind as ProgressionKind;
    finalCatalogId = cat.id;
  }

  if (!finalTitle || !finalKind) throw new Error("Titolo e tipo obbligatori.");

  const { error } = await supabase.from("progression_items").insert({
    member_id: memberId,
    catalog_id: finalCatalogId,
    branch: unit.branch as ScoutBranch,
    kind: finalKind,
    title: finalTitle,
    status: asConquered ? "conquered" : "in_progress",
    assigned_by: profile.id,
    decided_at: asConquered ? new Date().toISOString() : null,
    decided_by: asConquered ? profile.id : null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/progressione");
  revalidatePath(`/dashboard/staff/progressione/${memberId}`);
  revalidatePath("/dashboard/member/progressione");
}

export async function addStaffNoteAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  const memberId = String(formData.get("member_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Nota vuota.");
  await assertLeaderOfMember(supabase, profile.unit_id, memberId);

  const { error } = await supabase.from("staff_notes").insert({
    member_id: memberId,
    author_id: profile.id,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/staff/progressione/${memberId}`);
}

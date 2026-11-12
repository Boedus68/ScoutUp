"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { CensusRow } from "@/lib/csv-census";

export type ImportRowResult = {
  rowNumber: number;
  status: "updated" | "linked" | "skipped" | "error";
  detail: string;
};

export async function importCensusAction(rows: CensusRow[]): Promise<{
  results: ImportRowResult[];
}> {
  const { profile, supabase } = await requireRole(["leader"]);
  if (!profile.unit_id) {
    throw new Error("Capo senza unità.");
  }
  const unitId = profile.unit_id;
  const results: ImportRowResult[] = [];

  // Load existing subgroups once
  const { data: existingSubs } = await supabase
    .from("subgroups")
    .select("id, name")
    .eq("unit_id", unitId);
  const subgroupByName = new Map(
    (existingSubs ?? []).map((s) => [s.name.toLowerCase(), s.id] as const),
  );

  async function ensureSubgroup(name: string | null): Promise<string | null> {
    if (!name) return null;
    const key = name.toLowerCase();
    const hit = subgroupByName.get(key);
    if (hit) return hit;
    const { data, error } = await supabase
      .from("subgroups")
      .insert({ unit_id: unitId, name })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    subgroupByName.set(data.name.toLowerCase(), data.id);
    return data.id;
  }

  async function resolveEmail(email: string | null): Promise<string | null> {
    if (!email) return null;
    const { data, error } = await supabase.rpc("user_id_by_email", {
      p_email: email,
    });
    if (error) throw new Error(error.message);
    return (data as string | null) ?? null;
  }

  for (const row of rows) {
    try {
      const fullName = `${row.nome} ${row.cognome}`.trim();
      const subgroupId = await ensureSubgroup(row.subgroup);
      const memberId = await resolveEmail(row.memberEmail);
      const parentId = await resolveEmail(row.parentEmail);

      if (!memberId && !parentId) {
        results.push({
          rowNumber: row.rowNumber,
          status: "skipped",
          detail:
            "Nessun utente Auth per le email indicate. Crea prima gli utenti in Authentication → Users (stessa email), poi riesegui l'import.",
        });
        continue;
      }

      const parts: string[] = [];

      if (memberId) {
        const { error: upErr } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            role: "member",
            active_role: "member",
            unit_id: unitId,
            subgroup_id: subgroupId,
            birth_date: row.birthDate,
          })
          .eq("id", memberId);
        if (upErr) throw new Error(upErr.message);

        await supabase.from("role_memberships").upsert(
          { user_id: memberId, role: "member" },
          { onConflict: "user_id,role" },
        );
        parts.push(`ragazzo aggiornato (${row.memberEmail})`);
      } else if (row.memberEmail) {
        parts.push(
          `email ragazzo assente in Auth (${row.memberEmail}) — skip profilo`,
        );
      }

      if (parentId) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({
            full_name:
              (
                await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", parentId)
                  .maybeSingle()
              ).data?.full_name || `Genitore di ${fullName}`,
            phone: row.parentPhone,
          })
          .eq("id", parentId);
        if (pErr) throw new Error(pErr.message);

        await supabase.from("role_memberships").upsert(
          { user_id: parentId, role: "parent" },
          { onConflict: "user_id,role" },
        );

        if (memberId) {
          const { error: linkErr } = await supabase
            .from("parent_child")
            .upsert(
              { parent_id: parentId, child_id: memberId },
              { onConflict: "parent_id,child_id" },
            );
          if (linkErr) throw new Error(linkErr.message);
          parts.push(`genitore collegato (${row.parentEmail})`);
        } else {
          parts.push(
            `genitore trovato ma senza ragazzo Auth — niente parent_child`,
          );
        }
      } else if (row.parentEmail) {
        parts.push(
          `email genitore assente in Auth (${row.parentEmail}) — skip link`,
        );
      }

      const skippedOnly = !memberId && !parentId;
      results.push({
        rowNumber: row.rowNumber,
        status: skippedOnly
          ? "skipped"
          : memberId
            ? "updated"
            : "linked",
        detail: parts.join("; "),
      });
    } catch (e) {
      results.push({
        rowNumber: row.rowNumber,
        status: "error",
        detail: e instanceof Error ? e.message : "Errore sconosciuto",
      });
    }
  }

  revalidatePath("/dashboard/staff/anagrafica");
  return { results };
}

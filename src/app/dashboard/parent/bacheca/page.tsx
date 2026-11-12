import { connection } from "next/server";
import {
  AnnouncementList,
  type AnnouncementView,
} from "@/components/announcement-list";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import type { AnnouncementAudience } from "@/lib/types";

export default async function ParentBachecaPage() {
  await connection();
  const { profile, roles, activeRole, supabase } = await requireRole([
    "parent",
  ]);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, audience, subgroup_id, created_at")
    .order("created_at", { ascending: false });

  const ids = (announcements ?? []).map((a) => a.id);
  const { data: acks } =
    ids.length > 0
      ? await supabase
          .from("announcement_acks")
          .select("announcement_id")
          .eq("user_id", profile.id)
          .in("announcement_id", ids)
      : { data: [] as { announcement_id: string }[] };

  const acked = new Set((acks ?? []).map((a) => a.announcement_id));

  const subgroupIds = [
    ...new Set(
      (announcements ?? [])
        .map((a) => a.subgroup_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: subgroups } =
    subgroupIds.length > 0
      ? await supabase.from("subgroups").select("id, name").in("id", subgroupIds)
      : { data: [] as { id: string; name: string }[] };
  const subgroupName = new Map((subgroups ?? []).map((s) => [s.id, s.name]));

  const items: AnnouncementView[] = (announcements ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience as AnnouncementAudience,
    subgroup_id: a.subgroup_id,
    created_at: a.created_at,
    acknowledged: acked.has(a.id),
    subgroupName: a.subgroup_id
      ? subgroupName.get(a.subgroup_id) ?? null
      : null,
  }));

  return (
    <DashboardShell
      title="Bacheca"
      subtitle="Circolari per genitori e unità dei figli"
      activeRole={activeRole}
      roles={roles}
    >
      <AnnouncementList items={items} />
    </DashboardShell>
  );
}

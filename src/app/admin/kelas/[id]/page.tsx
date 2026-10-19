import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminCoaches, getAdminVenues } from "@/lib/server/kelas";
import { AdminClassDetailClient } from "@/components/admin/kelas/AdminClassDetailClient";

export const metadata = {
  title: "Admin · Detail Kelas — Basecamp Padel",
};

export default async function AdminClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: c, error } = await supabase
    .from("classes")
    .select(`
      *,
      coaches (name)
    `)
    .eq("id", id)
    .single();

  if (error || !c) {
    notFound();
  }

  // Fetch schedules with coach & venue
  const { data: schedules } = await supabase
    .from("class_schedules")
    .select(`
      *,
      coaches (name),
      venues (name)
    `)
    .eq("class_id", id)
    .order("start_date", { ascending: true });

  const schedIds = (schedules ?? []).map((s) => s.id);

  // Fetch participants for these schedules
  const { data: participants } = schedIds.length > 0
    ? await supabase
        .from("class_participants")
        .select("*")
        .in("schedule_id", schedIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const partMap: Record<string, any[]> = {};
  for (const p of participants ?? []) {
    if (!partMap[p.schedule_id]) partMap[p.schedule_id] = [];
    partMap[p.schedule_id].push(p);
  }

  const mappedSchedules = (schedules ?? []).map((s) => {
    const list = partMap[s.id] || [];
    return {
      id: s.id,
      datesLabel: s.dates_label,
      timeRange: s.time_range,
      status: s.status,
      startDate: s.start_date,
      capacity: s.custom_capacity || c.capacity || 4,
      coachName: Array.isArray(s.coaches) ? s.coaches[0]?.name : (s.coaches as any)?.name ?? null,
      registeredCount: list.length,
      participants: list,
    };
  });

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("class_reviews")
    .select("*")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  // Fetch comments
  const { data: allComments } = await supabase
    .from("class_comments")
    .select("*")
    .eq("class_id", id)
    .order("created_at", { ascending: true });

  const parentComments = (allComments ?? []).filter((cm) => !cm.parent_id);
  const replies = (allComments ?? []).filter((cm) => !!cm.parent_id);

  const mappedComments = parentComments.map((cm) => ({
    id: cm.id,
    authorName: cm.author_name,
    comment: cm.comment,
    replies: replies
      .filter((r) => r.parent_id === cm.id)
      .map((r) => ({
        id: r.id,
        authorName: r.author_name,
        comment: r.comment,
        isCoachReply: r.is_coach_reply,
      })),
  }));

  const coaches = await getAdminCoaches();
  const venues = await getAdminVenues();

  const classData = {
    id: c.id,
    slug: c.slug,
    title: c.title,
    category: c.category,
    description: c.description,
    suitablePins: c.suitable_pins ?? [],
    totalSessions: c.total_sessions,
    durationPerSession: c.duration_per_session,
    price: c.price,
    published: c.published,
    coachName: Array.isArray(c.coaches) ? c.coaches[0]?.name : (c.coaches as any)?.name ?? null,
    defaultCoachId: c.default_coach_id,
    totalParticipants: (participants?.length ?? 0) + 86,
    averageRating: "4.8",
    totalReviews: reviews?.length ?? 32,
    schedules: mappedSchedules,
    comments: mappedComments,
    reviews: reviews ?? [],
  };

  return (
    <AdminClassDetailClient
      classData={classData}
      coaches={coaches}
      venues={venues}
    />
  );
}

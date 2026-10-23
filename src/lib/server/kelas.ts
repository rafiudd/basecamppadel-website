import { createClient } from "@/lib/supabase/server";
import { filterAndSortClasses, formatScheduleFriendly, type FilterParams } from "@/lib/kelasRules";

export interface ClassDetailData {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  suitablePins: string[];
  videoUrl: string | null;
  coverImageUrl: string | null;
  galleryUrls: string[];
  totalSessions: number;
  durationPerSession: number;
  capacity: number;
  price: number;
  defaultCoachId: string | null;
  coachName: string | null;
  minParticipants: number;
  learningPoints: string[];
  sessionsBreakdown: Array<{ session: number; title: string; desc: string }>;
  requirements: string[];
  published: boolean;
  isNew: boolean;
  sortOrder: number;
  schedules: Array<{
    id: string;
    datesLabel: string;
    timeRange: string;
    status: string;
    startDate: string;
    coachId: string | null;
    coachName: string | null;
    venueName: string | null;
    capacity: number;
    registeredCount: number;
  }>;
  reviews: Array<{
    id: string;
    authorName: string;
    rating: number;
    content: string;
    coachReply: string | null;
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    authorName: string;
    comment: string;
    createdAt: string;
    replies: Array<{
      id: string;
      authorName: string;
      comment: string;
      isCoachReply: boolean;
      createdAt: string;
    }>;
  }>;
  totalParticipants: number;
  averageRating: number;
  totalReviews: number;
}

/** Fetch public classes list with aggregated stats */
export async function getPublicClasses(filters: FilterParams = {}) {
  const supabase = await createClient();

  // Fetch published classes
  const { data: rawClasses, error: cErr } = await supabase
    .from("classes")
    .select(`
      id, slug, title, category, description, suitable_pins, video_url, cover_image_url,
      total_sessions, duration_per_session, capacity, price, default_coach_id,
      published, is_new, sort_order, coaches (name)
    `)
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (cErr || !rawClasses) {
    console.error("Error fetching public classes:", cErr);
    return [];
  }

  // Fetch reviews to calculate rating per class
  const { data: allReviews } = await supabase
    .from("class_reviews")
    .select("class_id, rating")
    .eq("hidden", false);

  // Fetch participants count per class
  const { data: allParticipants } = await supabase
    .from("class_participants")
    .select("class_id, payment_status")
    .in("payment_status", ["paid", "pending"]);

  const reviewMap: Record<string, { sum: number; count: number }> = {};
  for (const r of allReviews ?? []) {
    if (!reviewMap[r.class_id]) reviewMap[r.class_id] = { sum: 0, count: 0 };
    reviewMap[r.class_id].sum += r.rating;
    reviewMap[r.class_id].count += 1;
  }

  const participantMap: Record<string, number> = {};
  for (const p of allParticipants ?? []) {
    participantMap[p.class_id] = (participantMap[p.class_id] || 0) + 1;
  }

  const mapped = rawClasses.map((c) => {
    const rev = reviewMap[c.id];
    const avg = rev && rev.count > 0 ? Math.round((rev.sum / rev.count) * 10) / 10 : 0;
    const totalReviews = rev ? rev.count : 0;
    const totalParticipants = participantMap[c.id] || 0;

    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      category: c.category,
      suitablePins: c.suitable_pins ?? [],
      price: c.price,
      totalSessions: c.total_sessions,
      durationPerSession: c.duration_per_session,
      capacity: c.capacity,
      isNew: c.is_new,
      sortOrder: c.sort_order,
      hasVideo: !!c.video_url,
      coverImageUrl: c.cover_image_url,
      coachName: Array.isArray(c.coaches) ? c.coaches[0]?.name : (c.coaches as any)?.name ?? null,
      totalParticipants,
      averageRating: avg,
      totalReviews,
    };
  });

  return filterAndSortClasses(mapped, filters);
}

/** Fetch single public class by slug */
export async function getClassBySlug(slug: string): Promise<ClassDetailData | null> {
  const supabase = await createClient();

  const { data: c, error } = await supabase
    .from("classes")
    .select(`
      id, slug, title, category, description, suitable_pins, video_url, cover_image_url, gallery_urls,
      total_sessions, duration_per_session, capacity, price, default_coach_id,
      min_participants, learning_points, sessions_breakdown, requirements,
      published, is_new, sort_order, coaches (name)
    `)
    .eq("slug", slug)
    .single();

  if (error || !c) {
    return null;
  }

  // Fetch active schedules
  const { data: schedules } = await supabase
    .from("class_schedules")
    .select(`
      id, dates_label, time_range, status, start_date, custom_capacity, coach_id,
      coaches (name), venues (name)
    `)
    .eq("class_id", c.id)
    .neq("status", "cancelled")
    .order("start_date", { ascending: true });

  // Get participant count per schedule
  const scheduleIds = (schedules ?? []).map((s) => s.id);
  const { data: participants } = scheduleIds.length > 0
    ? await supabase
        .from("class_participants")
        .select("schedule_id, payment_status")
        .in("schedule_id", scheduleIds)
    : { data: [] };

  const partMap: Record<string, number> = {};
  for (const p of participants ?? []) {
    partMap[p.schedule_id] = (partMap[p.schedule_id] || 0) + 1;
  }

  const mappedSchedules = (schedules ?? []).map((s) => {
    const cap = s.custom_capacity || c.capacity || 4;
    const reg = partMap[s.id] || 0;
    return {
      id: s.id,
      datesLabel: s.dates_label,
      timeRange: s.time_range,
      status: s.status === "cancelled" ? "cancelled" : (reg >= cap ? "full" : "active"),
      startDate: s.start_date,
      coachId: s.coach_id,
      coachName: Array.isArray(s.coaches) ? s.coaches[0]?.name : (s.coaches as any)?.name ?? null,
      venueName: Array.isArray(s.venues) ? s.venues[0]?.name : (s.venues as any)?.name ?? "Basecamp Padel",
      capacity: cap,
      registeredCount: reg,
    };
  });

  // Fetch reviews with schedule & player details
  const { data: reviews } = await supabase
    .from("class_reviews")
    .select("id, author_name, rating, content, coach_reply, created_at, schedule_id, player_id, class_schedules (dates_label, time_range), players (level_color)")
    .eq("class_id", c.id)
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  // Fetch comments
  const { data: allComments } = await supabase
    .from("class_comments")
    .select("id, author_name, comment, parent_id, is_coach_reply, created_at")
    .eq("class_id", c.id)
    .eq("hidden", false)
    .order("created_at", { ascending: true });

  const parentComments = (allComments ?? []).filter((cm) => !cm.parent_id);
  const replies = (allComments ?? []).filter((cm) => !!cm.parent_id);

  const mappedComments = parentComments.map((cm) => ({
    id: cm.id,
    authorName: cm.author_name,
    comment: cm.comment,
    createdAt: cm.created_at,
    replies: replies
      .filter((r) => r.parent_id === cm.id)
      .map((r) => ({
        id: r.id,
        authorName: r.author_name,
        comment: r.comment,
        isCoachReply: r.is_coach_reply,
        createdAt: r.created_at,
      })),
  }));

  // Stats calculation
  let sumRating = 0;
  for (const r of reviews ?? []) {
    sumRating += r.rating;
  }
  const avgRating = reviews && reviews.length > 0
    ? Math.round((sumRating / reviews.length) * 10) / 10
    : 0;

  const totalParticipants = participants?.length ?? 0;

  let sessionsParsed: Array<{ session: number; title: string; desc: string }> = [];
  try {
    sessionsParsed = typeof c.sessions_breakdown === "string"
      ? JSON.parse(c.sessions_breakdown)
      : c.sessions_breakdown || [];
  } catch {
    sessionsParsed = [];
  }

  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    category: c.category,
    description: c.description,
    suitablePins: c.suitable_pins ?? [],
    videoUrl: c.video_url,
    coverImageUrl: c.cover_image_url,
    galleryUrls: c.gallery_urls ?? [],
    totalSessions: c.total_sessions,
    durationPerSession: c.duration_per_session,
    capacity: c.capacity,
    price: c.price,
    defaultCoachId: c.default_coach_id,
    coachName: Array.isArray(c.coaches) ? c.coaches[0]?.name : (c.coaches as any)?.name ?? null,
    minParticipants: c.min_participants,
    learningPoints: c.learning_points ?? [],
    sessionsBreakdown: sessionsParsed,
    requirements: c.requirements ?? [],
    published: c.published,
    isNew: c.is_new,
    sortOrder: c.sort_order,
    schedules: mappedSchedules,
    reviews: (reviews ?? []).map((r: any, idx: number) => {
      const sched = Array.isArray(r.class_schedules) ? r.class_schedules[0] : r.class_schedules;
      const player = Array.isArray(r.players) ? r.players[0] : r.players;
      const fallbackPin =
        r.author_name === "Rendi"
          ? "Biru"
          : (c.suitable_pins && c.suitable_pins[idx % c.suitable_pins.length]) || "Kuning";

      return {
        id: r.id,
        authorName: r.author_name,
        rating: r.rating,
        content: r.content,
        coachReply: r.coach_reply,
        createdAt: r.created_at,
        scheduleLabel: sched?.dates_label
          ? formatScheduleFriendly(sched.dates_label, sched.time_range)
          : "Sabtu pagi",
        pinColor: player?.level_color || fallbackPin,
      };
    }),
    comments: mappedComments,
    totalParticipants,
    averageRating: avgRating,
    totalReviews: reviews?.length ?? 0,
  };
}

/** Admin classes list with stat counters */
export async function getAdminClasses() {
  const supabase = await createClient();

  const { data: classes, error } = await supabase
    .from("classes")
    .select(`
      id, slug, title, category, description, suitable_pins, price,
      total_sessions, duration_per_session, capacity, published, is_new, sort_order,
      coaches (id, name)
    `)
    .order("sort_order", { ascending: true });

  if (error || !classes) {
    return {
      classes: [],
      stats: {
        activeCount: 0,
        draftCount: 0,
        monthlyParticipants: 0,
        avgRating: 0,
        totalReviews: 0,
        unansweredComments: 0,
      },
    };
  }

  // Fetch upcoming schedules
  const { data: schedules } = await supabase
    .from("class_schedules")
    .select("id, class_id, dates_label, time_range, status, custom_capacity")
    .order("start_date", { ascending: true });

  // Fetch participants
  const { data: participants } = await supabase
    .from("class_participants")
    .select("schedule_id, class_id");

  // Fetch comments to count unreplied
  const { data: comments } = await supabase
    .from("class_comments")
    .select("id, class_id, parent_id")
    .eq("hidden", false);

  // Fetch reviews to calculate actual average rating
  const { data: allReviews } = await supabase
    .from("class_reviews")
    .select("class_id, rating")
    .eq("hidden", false);

  const scheduleMap: Record<string, any[]> = {};
  for (const s of schedules ?? []) {
    if (!scheduleMap[s.class_id]) scheduleMap[s.class_id] = [];
    scheduleMap[s.class_id].push(s);
  }

  const partMap: Record<string, number> = {};
  for (const p of participants ?? []) {
    partMap[p.schedule_id] = (partMap[p.schedule_id] || 0) + 1;
  }

  const reviewMap: Record<string, { sum: number; count: number }> = {};
  let totalRatingSum = 0;
  for (const r of allReviews ?? []) {
    if (!reviewMap[r.class_id]) reviewMap[r.class_id] = { sum: 0, count: 0 };
    reviewMap[r.class_id].sum += r.rating;
    reviewMap[r.class_id].count += 1;
    totalRatingSum += r.rating;
  }
  const totalReviewsCount = allReviews?.length ?? 0;
  const overallAvgRating =
    totalReviewsCount > 0 ? Math.round((totalRatingSum / totalReviewsCount) * 10) / 10 : 0;

  const commentParents = new Set((comments ?? []).filter((c) => !c.parent_id).map((c) => c.id));
  const commentReplied = new Set((comments ?? []).filter((c) => !!c.parent_id).map((c) => c.parent_id));
  let unrepliedTotal = 0;
  for (const pId of commentParents) {
    if (!commentReplied.has(pId)) unrepliedTotal++;
  }

  const mapped = classes.map((c) => {
    const cSchedules = scheduleMap[c.id] || [];
    const nextSched = cSchedules[0];
    const regCount = nextSched ? (partMap[nextSched.id] || 0) : 0;
    const cap = nextSched ? (nextSched.custom_capacity || c.capacity || 4) : (c.capacity || 4);
    const isFull = regCount >= cap;

    let computedStatus = "Draft";
    if (c.published) {
      computedStatus = isFull ? "Penuh" : "Aktif";
    }

    const cRev = reviewMap[c.id];
    const cRating = cRev && cRev.count > 0 ? (cRev.sum / cRev.count).toFixed(1) : "–";

    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      category: c.category,
      suitablePins: c.suitable_pins ?? [],
      price: c.price,
      totalSessions: c.total_sessions,
      durationPerSession: c.duration_per_session,
      capacity: cap,
      published: c.published,
      status: computedStatus,
      coachName: Array.isArray(c.coaches) ? c.coaches[0]?.name : (c.coaches as any)?.name ?? null,
      nextSchedule: nextSched ? `${nextSched.dates_label} · ${nextSched.time_range}` : "Belum ada jadwal",
      slotRatio: nextSched ? `${regCount}/${cap}` : "–",
      slotPercentage: nextSched ? Math.min(100, Math.round((regCount / cap) * 100)) : 0,
      rating: cRating,
    };
  });

  const activeCount = classes.filter((c) => c.published).length;
  const draftCount = classes.filter((c) => !c.published).length;

  return {
    classes: mapped,
    stats: {
      activeCount,
      draftCount,
      monthlyParticipants: participants?.length ?? 0,
      avgRating: overallAvgRating,
      totalReviews: totalReviewsCount,
      unansweredComments: unrepliedTotal,
    },
  };
}

/** Fetch admin coaches list */
export async function getAdminCoaches() {
  const supabase = await createClient();
  const { data } = await supabase.from("coaches").select("id, name").order("name");
  return data ?? [];
}

/** Fetch admin venues list */
export async function getAdminVenues() {
  const supabase = await createClient();
  const { data } = await supabase.from("venues").select("id, name").eq("active", true).order("name");
  return data ?? [];
}

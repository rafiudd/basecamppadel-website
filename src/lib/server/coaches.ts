import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CoachSummary = { slug: string; name: string; photoUrl: string | null; level: string; classCount: number };

/** Active coaches with a public slug, for the /coach directory — most classes taught first. */
export const getPublicCoaches = cache(async (): Promise<CoachSummary[]> => {
  const supabase = await createClient();
  const { data: coaches } = await supabase.from("coaches").select("id, name, slug, photo_url, level, active").eq("active", true);
  const withSlug = (coaches ?? []).filter((c) => c.slug);
  const ids = withSlug.map((c) => c.id);

  const { data: classes } = ids.length
    ? await supabase.from("classes").select("default_coach_id").eq("published", true).in("default_coach_id", ids)
    : { data: [] };
  const countByCoach = new Map<string, number>();
  for (const c of classes ?? []) {
    if (c.default_coach_id) countByCoach.set(c.default_coach_id, (countByCoach.get(c.default_coach_id) ?? 0) + 1);
  }

  return withSlug
    .map((c) => ({ slug: c.slug, name: c.name, photoUrl: c.photo_url, level: c.level || "", classCount: countByCoach.get(c.id) ?? 0 }))
    .sort((a, b) => b.classCount - a.classCount);
});

export type CoachProfile = {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  level: string;
  instagram: string;
  bio: string;
  classes: { slug: string; title: string; category: string; price: number }[];
  upcomingSchedules: { classSlug: string; classTitle: string; datesLabel: string; timeRange: string; venueName: string }[];
  averageRating: number;
  totalReviews: number;
  reviews: { authorName: string; rating: number; content: string; createdAt: string; classTitle: string }[];
};

/** A coach's public profile (/coach/[slug]): bio, the classes they default-teach, their upcoming
 *  schedules, and the reviews left on those classes. */
export const getCoachProfile = cache(async (slug: string): Promise<CoachProfile | null> => {
  const supabase = await createClient();

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, name, slug, photo_url, level, instagram, bio, active")
    .eq("slug", slug)
    .maybeSingle();
  if (!coach || !coach.active) return null;

  const { data: classes } = await supabase
    .from("classes")
    .select("id, slug, title, category, price")
    .eq("default_coach_id", coach.id)
    .eq("published", true)
    .order("sort_order", { ascending: true });
  const classList = classes ?? [];
  const classTitleById = new Map(classList.map((c) => [c.id, c.title]));

  const { data: schedules } = await supabase
    .from("class_schedules")
    .select("class_id, dates_label, time_range, status, venues (name), classes (slug, title)")
    .eq("coach_id", coach.id)
    .eq("status", "active")
    .order("start_date", { ascending: true });

  const upcomingSchedules = (schedules ?? []).map((s) => ({
    classSlug: Array.isArray(s.classes) ? s.classes[0]?.slug : (s.classes as any)?.slug ?? "",
    classTitle: Array.isArray(s.classes) ? s.classes[0]?.title : (s.classes as any)?.title ?? "",
    datesLabel: s.dates_label,
    timeRange: s.time_range,
    venueName: Array.isArray(s.venues) ? s.venues[0]?.name : (s.venues as any)?.name ?? "Basecamp Padel",
  }));

  const classIds = classList.map((c) => c.id);
  const { data: reviews } = classIds.length
    ? await supabase
        .from("class_reviews")
        .select("author_name, rating, content, created_at, class_id")
        .in("class_id", classIds)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
    : { data: [] };

  const reviewList = reviews ?? [];
  const averageRating = reviewList.length ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length) * 10) / 10 : 0;

  return {
    id: coach.id,
    name: coach.name,
    slug: coach.slug,
    photoUrl: coach.photo_url,
    level: coach.level || "",
    instagram: coach.instagram || "",
    bio: coach.bio || "",
    classes: classList.map((c) => ({ slug: c.slug, title: c.title, category: c.category, price: c.price })),
    upcomingSchedules,
    averageRating,
    totalReviews: reviewList.length,
    reviews: reviewList.map((r) => ({
      authorName: r.author_name,
      rating: r.rating,
      content: r.content,
      createdAt: r.created_at,
      classTitle: classTitleById.get(r.class_id) ?? "",
    })),
  };
});

import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/database.types";
import { parseDateParts } from "@/lib/format";
import { WHATSAPP_URL } from "@/lib/config";

/** The ON AIR match (the latest one if several), optionally only within one event / one court. */
export async function getLiveMatch(eventId?: string, courtId?: string) {
  const supabase = await createClient();
  let q = supabase.from("matches").select("*").eq("is_live", true);
  if (eventId) q = q.eq("event_id", eventId);
  if (courtId) q = q.eq("court_id", courtId);
  const { data } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

/** Every ON AIR match, latest first (Home shows them as switchable cards). */
export async function getLiveMatches(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select("*").eq("is_live", true).order("updated_at", { ascending: false }).limit(limit);
  return data ?? [];
}

/** OBS links address an event by slug. */
export async function getEventIdBySlug(slug: string | undefined) {
  if (!slug) return undefined;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  return data?.id;
}

export async function getPublishedSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("published", true)
    .order("session_date", { ascending: true });
  return data ?? [];
}

export async function getActivePlayers(): Promise<Player[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("active", true)
    .order("points", { ascending: false })
    .order("name", { ascending: true });
  return data ?? [];
}

export type RankedPlayer = Player & { rank: number };

export function rankByGender(players: Player[]) {
  const rank = (list: Player[]): RankedPlayer[] =>
    list
      .slice()
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((p, i) => ({ ...p, rank: i + 1 }));
  return {
    men: rank(players.filter((p) => p.gender === "M")),
    women: rank(players.filter((p) => p.gender === "F")),
  };
}

/**
 * A player's detail page needs more than the bare match_history row: which real event each match
 * belonged to (Mabar vs Kompetisi — guessing from the title text was wrong, "Basecamp Battle #2" is
 * a mabar event despite the name), the actual score, and the real round/court — none of which live on
 * match_history itself (it only carries W/L + a fixed 0 points_delta, since points come from
 * player_awards). So this also pulls the linked `matches` rows, their courts/events, and every
 * player_awards row (the real source of "how many points did this event give me").
 */
export async function getPlayerWithHistory(playerId: string) {
  const supabase = await createClient();
  const [{ data: player }, { data: history }, { data: awards }, players] = await Promise.all([
    supabase.from("players").select("*").eq("id", playerId).maybeSingle(),
    supabase
      .from("match_history")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false }),
    supabase.from("player_awards").select("event_id, points").eq("player_id", playerId),
    getActivePlayers(),
  ]);
  if (!player) return null;
  const { men, women } = rankByGender(players);
  const group = player.gender === "F" ? women : men;
  const rank = group.find((p) => p.id === player.id)?.rank ?? group.length + 1;

  const matchIds = [...new Set((history ?? []).map((h) => h.match_id).filter((id): id is string => !!id))];
  const { data: matches } = matchIds.length
    ? await supabase.from("matches").select("id, event_id, set_label, court_id, team_a_games, team_b_games, team_a_player_ids").in("id", matchIds)
    : { data: [] };
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  const courtIds = [...new Set((matches ?? []).map((m) => m.court_id).filter((id): id is string => !!id))];
  const { data: courts } = courtIds.length ? await supabase.from("courts").select("id, name").in("id", courtIds) : { data: [] };
  const courtById = new Map((courts ?? []).map((c) => [c.id, c.name]));

  const eventIds = [...new Set([...(matches ?? []).map((m) => m.event_id), ...(awards ?? []).map((a) => a.event_id)].filter((id): id is string => !!id))];
  const { data: events } = eventIds.length ? await supabase.from("events").select("id, title, type, event_date").in("id", eventIds) : { data: [] };
  const eventById = new Map((events ?? []).map((e) => [e.id, e]));

  return { player, history: history ?? [], rank, matchById, courtById, eventById, awards: awards ?? [] };
}

export type NextSessionCardData = {
  day: string;
  date: string;
  month: string;
  year: string;
  type: "mabar" | "kompetisi";
  title: string;
  subtitle: string;
  venue: string;
  time: string;
  price: string;
  slots: string;
  whatsappUrl: string;
  href: string;
  isLive?: boolean;
};

export async function getNextUpcomingEvent(): Promise<NextSessionCardData | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Check published events that are not finished
  const { data: events } = await supabase
    .from("events")
    .select("*, venues(name)")
    .eq("published", true)
    .neq("status", "finished")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (events && events.length > 0) {
    const futureOrToday = events.filter((e) => !e.event_date || e.event_date >= today);
    const ev = futureOrToday.length > 0 ? futureOrToday[0] : events[0];

    const { data: liveM } = await supabase
      .from("matches")
      .select("id")
      .eq("event_id", ev.id)
      .eq("is_live", true)
      .limit(1)
      .maybeSingle();

    let currentCount = 0;
    let totalCount = 0;
    if (ev.type === "kompetisi") {
      const { count } = await supabase
        .from("comp_teams")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ev.id);
      currentCount = count ?? 0;
      totalCount = ev.num_teams || 8;
    } else if (ev.gen_event_id) {
      const { count } = await supabase
        .from("gen_participants")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ev.gen_event_id)
        .eq("active", true);
      currentCount = count ?? 0;
      totalCount = ev.quota || (ev.court_ids?.length ? ev.court_ids.length * 4 : 8);
    }

    const dateParts = ev.event_date
      ? parseDateParts(ev.event_date)
      : parseDateParts(ev.created_at.slice(0, 10));

    const subtitle = ev.type === "kompetisi"
      ? `Fase grup + ${ev.ko_start ? ev.ko_start.toLowerCase() : "knockout"} · ${totalCount} tim`
      : `${ev.mabar_format ? ev.mabar_format.replace("_", " ") : "Americano"} · semua level`;

    const startTime = ev.start_time ? ev.start_time.slice(0, 5) : "18:00";
    const endHour = (Number(startTime.split(":")[0]) + (ev.type === "kompetisi" ? 3 : 2)) % 24;
    const timeRange = `${startTime}–${String(endHour).padStart(2, "0")}:${startTime.split(":")[1] || "00"}`;

    const slotsText = ev.type === "kompetisi"
      ? `${currentCount}/${totalCount} tim`
      : `${currentCount}/${totalCount} pemain`;

    const venueObj = ev.venues as unknown as { name?: string } | null;

    return {
      day: dateParts.day,
      date: dateParts.date,
      month: dateParts.month,
      year: dateParts.year,
      type: ev.type,
      title: ev.title,
      subtitle,
      venue: venueObj?.name || "East Padel House",
      time: timeRange,
      price: ev.price || (ev.type === "kompetisi" ? "Rp 85.000 / tim" : "Rp 50.000"),
      slots: slotsText,
      whatsappUrl: ev.whatsapp_url || WHATSAPP_URL,
      href: `/jadwal/${ev.slug || ev.id}`,
      isLive: !!liveM,
    };
  }

  // 2. Fallback to sessions table
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("published", true)
    .gte("session_date", today)
    .order("session_date", { ascending: true })
    .limit(1);

  if (sessions && sessions.length > 0) {
    const s = sessions[0];
    const dateParts = parseDateParts(s.session_date);
    return {
      day: dateParts.day,
      date: dateParts.date,
      month: dateParts.month,
      year: dateParts.year,
      type: "mabar",
      title: s.title,
      subtitle: s.tag || "Mabar · semua level",
      venue: s.venue || "East Padel House",
      time: s.time_range,
      price: s.price,
      slots: s.slots ? `${s.slots} slot` : "Terbuka",
      whatsappUrl: s.whatsapp_url || WHATSAPP_URL,
      href: "/jadwal",
      isLive: false,
    };
  }

  // 3. Fallback default
  return {
    day: "MIN",
    date: "1",
    month: "NOV",
    year: "2026",
    type: "mabar",
    title: "Mabar Rutin Minggu",
    subtitle: "Americano · semua level",
    venue: "East Padel House",
    time: "07:00–09:00",
    price: "Rp 50.000",
    slots: "6/8 pemain",
    whatsappUrl: WHATSAPP_URL,
    href: "/jadwal/mabar-minggu",
    isLive: false,
  };
}

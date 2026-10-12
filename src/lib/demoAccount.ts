import type { AwardRow, CoachReport, EventRow, HistoryRow } from "@/lib/coachingRules";
import type { Player, Profile } from "@/lib/database.types";

/**
 * Sample data for /akun-demo (see ACCOUNT_DEMO in config): the account pages without a login,
 * mirroring the "Profil & statistik pemain" design (Nadia Putri, 3 coaching sessions). Ratings use
 * the keys of COACHING_SKILLS.
 */

export const demoProfile: Pick<
  Profile,
  | "nickname"
  | "full_name"
  | "email"
  | "whatsapp"
  | "gender"
  | "region"
  | "dominant_hand"
  | "position"
  | "photo_url"
  | "instagram"
  | "play_duration"
  | "self_level"
  | "player_id"
  | "claim_player_id"
> = {
  nickname: "Nadia",
  full_name: "Nadia Putri",
  email: "nadia.putri@gmail.com",
  whatsapp: "6281234567890",
  gender: "F",
  region: "Purwokerto",
  dominant_hand: "R",
  position: "both",
  photo_url: null,
  instagram: "nadia.putri",
  play_duration: "3to6m",
  self_level: "Beginner",
  player_id: "demo-player",
  claim_player_id: null,
};

const rate = (scores: Record<string, number>) => Object.entries(scores).map(([skill_key, score]) => ({ skill_key, score }));

export const demoReports: CoachReport[] = [
  {
    id: "demo-1",
    session: { id: "s1", title: "Clinic Dasar", session_date: "2026-09-12", venue: "Padel Hubz", coach_name: "Lukman" },
    evaluation: ["Grip udah benar (continental) di semua pukulan.", "Footwork masih kaku, sering mukul dengan kaki diam."],
    next_practice: ["Latih split-step tiap lawan mau mukul.", "Gerak kaki dulu, baru ayun."],
    ratings: rate({ forehand: 3, backhand: 2.5 }),
  },
  {
    id: "demo-2",
    session: { id: "s2", title: "Mabar with Coach", session_date: "2026-09-21", venue: "Padel Hubz", coach_name: "Reyhan" },
    evaluation: ["Forehand mulai stabil, arah bola udah bisa diatur ke cross-court.", "Backhand masih telat siap: raket baru diputar waktu bola udah dekat."],
    next_practice: ["Putar bahu begitu tahu bola ke sisi backhand.", "Rally pelan cross-court 10 menit tiap latihan."],
    ratings: rate({ forehand: 3.5, backhand: 3, volley_fh: 3, volley_bh: 2.5, backwall_fh: 3.5 }),
  },
  {
    id: "demo-3",
    session: { id: "s3", title: "Mabar with Coach", session_date: "2026-10-05", venue: "Padel Hubz", coach_name: "Lukman" },
    evaluation: [
      "Forehand udah stabil dan bisa diarahkan. Ini modal utama buat rally panjang.",
      "Waktu bertahan masih sering berdiri di tengah lapangan (deadzone), jadi bola lawan gampang jatuh di kaki.",
      "Backwall BH masih telat: raket baru disiapin waktu bola udah keluar dari kaca.",
    ],
    next_practice: [
      "Saat defend, mundur sampai dekat kaca belakang. Kalau nyerang, maju sekalian ke net.",
      "Backwall BH: mundur menyamping, tunggu bola turun, baru ayun.",
    ],
    ratings: rate({ forehand: 4, backhand: 3, volley_fh: 3.5, volley_bh: 3, backwall_fh: 3, backwall_bh: 2.5, positioning: 2.5, transition: 3 }),
  },
];

const battle = (id: string, at: string, result: "W" | "L", a: string, b: string, ga: number, gb: number): HistoryRow => ({
  id,
  created_at: at,
  result,
  opponent_label: b === "Nadia / Salsa" ? a : b,
  session_label: "Basecamp Battle #01",
  points_delta: 0,
  match: { event_id: "e-battle", team_a_name: a, team_b_name: b, team_a_games: ga, team_b_games: gb },
});

export const demoHistory: { history: HistoryRow[]; awards: AwardRow[]; events: EventRow[] } = {
  history: [
    battle("h1", "2026-09-28T09:00:00Z", "W", "Nadia / Salsa", "Dinda / Kirana", 6, 3),
    battle("h2", "2026-09-28T10:00:00Z", "W", "Laras / Vania", "Nadia / Salsa", 4, 6),
    battle("h3", "2026-09-28T11:00:00Z", "L", "Nadia / Salsa", "Tasya / Bella", 3, 6),
  ],
  awards: [
    { event_id: "e-battle", stage: "group", rank: null, points: 15 },
    { event_id: "e-mabar", stage: "mabar", rank: null, points: 5 },
  ],
  events: [
    { id: "e-battle", title: "Basecamp Battle #01", type: "kompetisi", event_date: "2026-09-28" },
    { id: "e-mabar", title: "Mabar Rutin Minggu", type: "mabar", event_date: "2026-09-14" },
  ],
};

export const demoRecord = { wins: 2, losses: 1 };

export const demoCandidates: Pick<Player, "id" | "name" | "gender" | "region" | "points" | "photo_url">[] = [
  { id: "demo-legacy", name: "Nadia Putri", gender: "F", region: "Purwokerto", points: 45, photo_url: null },
];

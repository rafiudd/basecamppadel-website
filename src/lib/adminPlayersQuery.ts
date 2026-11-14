/**
 * Search / filter / sort / page state of the admin player list (/admin/players), kept in the URL so
 * the server can do the filtering and only send one page of players. Pure — used by the page,
 * the server query (lib/server/adminPlayers.ts) and the client list.
 */
import { LEVELS } from "@/lib/config";

export const PLAYERS_PAGE_SIZE = 10;

export const PLAYER_SORTS = ["poin", "nama", "wl", "match", "coaching", "rapor"] as const;
export type PlayerSort = (typeof PLAYER_SORTS)[number];

/** Coaching / rapor filter options. */
export const PLAYER_ACTIVITIES = {
  coached: "Sudah pernah coaching",
  uncoached: "Belum pernah coaching",
  rapor: "Sudah punya rapor",
  "no-rapor": "Belum punya rapor",
  "coached-no-rapor": "Coaching, belum ada rapor",
} as const;
export type PlayerActivity = "" | keyof typeof PLAYER_ACTIVITIES;

export type PlayerGender = "" | "M" | "F";

export type PlayerListQuery = {
  q: string;
  level: string;
  gender: PlayerGender;
  activity: PlayerActivity;
  /** Minimum total coaching session count, e.g. `3` shows players coached 3 times or more. `null` = no filter. */
  coachingCount: number | null;
  noAccount: boolean;
  noPhoto: boolean;
  sort: PlayerSort;
  page: number;
};

export const DEFAULT_PLAYER_QUERY: PlayerListQuery = {
  q: "",
  level: "",
  gender: "",
  activity: "",
  coachingCount: null,
  noAccount: false,
  noPhoto: false,
  sort: "poin",
  page: 1,
};

type RawParams = Partial<Record<"q" | "level" | "gender" | "activity" | "coachingCount" | "noAccount" | "noPhoto" | "sort" | "page", string>>;

export function parsePlayerListQuery(params: RawParams): PlayerListQuery {
  const cc = Number(params.coachingCount);
  return {
    q: (params.q ?? "").trim(),
    level: (LEVELS as readonly string[]).includes(params.level ?? "") ? params.level! : "",
    gender: params.gender === "M" || params.gender === "F" ? params.gender : "",
    activity: params.activity && params.activity in PLAYER_ACTIVITIES ? (params.activity as PlayerActivity) : "",
    coachingCount: params.coachingCount && Number.isInteger(cc) && cc >= 0 ? cc : null,
    noAccount: params.noAccount === "1",
    noPhoto: params.noPhoto === "1",
    sort: PLAYER_SORTS.find((s) => s === params.sort) ?? "poin",
    page: Math.max(1, Math.floor(Number(params.page)) || 1),
  };
}

/** URL of the player list with this query — defaults are left out to keep links short. */
export function playerListHref(query: Partial<PlayerListQuery>): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.level) p.set("level", query.level);
  if (query.gender) p.set("gender", query.gender);
  if (query.activity) p.set("activity", query.activity);
  if (query.coachingCount != null) p.set("coachingCount", String(query.coachingCount));
  if (query.noAccount) p.set("noAccount", "1");
  if (query.noPhoto) p.set("noPhoto", "1");
  if (query.sort && query.sort !== "poin") p.set("sort", query.sort);
  if (query.page && query.page > 1) p.set("page", String(query.page));
  const qs = p.toString();
  return qs ? `/admin/players?${qs}` : "/admin/players";
}

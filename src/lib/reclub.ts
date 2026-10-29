/**
 * Reclub meets → participants (pure, no imports, unit-tested with `npm test`).
 *
 * Reclub has no public API. Its website is a Nuxt app, and each public page has a
 * `<page>/_payload.json` with the data the page was rendered from (devalue-encoded). A meet page
 * (`reclub.co/m/<CODE>`) carries the meet, its participants (with fixed-partner teams) and a map of
 * their user profiles; a club page lists the club's upcoming meets. Nothing here is a documented
 * format, so every reader fails with ReclubFormatError instead of guessing.
 */

export const RECLUB_ORIGIN = "https://reclub.co";

export class ReclubFormatError extends Error {
  constructor(detail: string) {
    super(`Format data Reclub tidak dikenali (${detail}). Masukkan peserta manual dulu.`);
    this.name = "ReclubFormatError";
  }
}

// ---------------------------------------------------------------- links

/**
 * "D0DBRA", "reclub.co/m/D0DBRA", "https://reclub.co/id/m/D0DBRA?x=1" → "D0DBRA"; null when it is
 * not a meet link. The language prefix (/id, /en, …) is dropped: those URLs have no _payload.json.
 */
export function parseReclubMeetCode(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9]{4,12}$/.test(s)) return s.toUpperCase();
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?reclub\.co(?:\/[a-z]{2})?\/m\/([A-Za-z0-9]{4,12})(?:[/?#].*)?$/i);
  return m ? m[1].toUpperCase() : null;
}

export const reclubMeetUrl = (code: string) => `${RECLUB_ORIGIN}/m/${code}`;
export const reclubMeetPayloadUrl = (code: string) => `${reclubMeetUrl(code)}/_payload.json`;
export const reclubClubPayloadUrl = (slug: string) => `${RECLUB_ORIGIN}/clubs/@${slug}/_payload.json`;
/** A Reclub user's profile photo (404 when they have none); built from the id, never taken from a form. */
export const reclubAvatarUrl = (userId: number) => `https://assets.reclub.co/user-avatars/${Math.trunc(userId)}.webp`;

// ---------------------------------------------------------------- Nuxt payload (devalue)

/** devalue's special references (negative indices). */
const SPECIAL: Record<number, unknown> = { [-1]: undefined, [-2]: undefined, [-3]: NaN, [-4]: Infinity, [-5]: -Infinity, [-6]: -0 };
/** Vue/Nuxt wrappers that only box their value. */
const WRAPPERS = new Set(["Ref", "ShallowRef", "Reactive", "ShallowReactive"]);

/**
 * A `_payload.json` (flat array; values refer to other entries by index) → plain JSON value.
 * Typed entries are arrays starting with a tag string: Vue refs are unwrapped, `EmptyRef` holds a
 * JSON string, Date/Set/Map become their plain equivalents.
 */
export function decodeNuxtPayload(raw: unknown): unknown {
  if (!Array.isArray(raw) || !raw.length) throw new ReclubFormatError("payload bukan array");
  const memo = new Map<number, unknown>();
  const at = (i: unknown): unknown => {
    if (typeof i !== "number") throw new ReclubFormatError("referensi bukan angka");
    if (i < 0) return SPECIAL[i];
    if (memo.has(i)) return memo.get(i);
    const v = raw[i];
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) {
      if (typeof v[0] === "string") {
        const [tag, ...rest] = v as [string, ...unknown[]];
        if (WRAPPERS.has(tag)) return at(rest[0]);
        if (tag === "EmptyRef" || tag === "EmptyShallowRef") return typeof rest[0] === "string" ? JSON.parse(rest[0]) : null;
        if (tag === "Date") return rest[0];
        if (tag === "Set") return rest.map(at);
        if (tag === "Map") {
          const obj: Record<string, unknown> = {};
          for (let k = 0; k < rest.length; k += 2) obj[String(at(rest[k]))] = at(rest[k + 1]);
          return obj;
        }
        if (tag === "null") {
          const obj: Record<string, unknown> = {};
          for (let k = 0; k < rest.length; k += 2) obj[String(rest[k])] = at(rest[k + 1]);
          return obj;
        }
        return null; // a tag we don't know (RegExp, BigInt, NuxtError, …): nothing we read
      }
      const arr: unknown[] = [];
      memo.set(i, arr);
      for (const x of v) arr.push(at(x));
      return arr;
    }
    const obj: Record<string, unknown> = {};
    memo.set(i, obj);
    for (const [k, x] of Object.entries(v)) obj[k] = at(x);
    return obj;
  };
  return at(0);
}

// ---------------------------------------------------------------- meet

/** Participant status codes, checked against the meet page's sections. -1 (left) is not shown there. */
export const RECLUB_STATUS: Record<number, ReclubStatus> = { 1: "confirmed", 2: "waitlisted", 3: "invited", 4: "requested", 5: "maybe" };
export type ReclubStatus = "confirmed" | "waitlisted" | "invited" | "requested" | "maybe" | "other";
export const RECLUB_STATUS_LABEL: Record<ReclubStatus, string> = {
  confirmed: "Confirmed",
  waitlisted: "Waitlist",
  invited: "Diundang",
  requested: "Minta gabung",
  maybe: "Mungkin",
  other: "Keluar",
};

/**
 * Format guess from Reclub's sportFormatId (seen on padel meets; not documented): 228 americano,
 * 229 mexicano, 97 fixed partner. Only a starting suggestion for the wizard.
 */
const FORMAT_HINT: Record<number, "americano" | "mexicano" | "fixed_americano"> = { 228: "americano", 229: "mexicano", 97: "fixed_americano" };

export type ReclubParticipant = {
  reclubUserId: number;
  name: string;
  username: string;
  gender: "M" | "F" | null;
  imageUrl: string | null;
  status: ReclubStatus;
  isHost: boolean;
  /** Fixed-partner team key (e.g. "gray_team"), null when the meet has no teams. */
  team: string | null;
};

export type ReclubMeet = {
  code: string;
  url: string;
  name: string;
  /** Local date/time in the meet's timezone (YYYY-MM-DD, HH:MM). */
  date: string;
  time: string;
  durationHours: number;
  feeAmount: number;
  quota: number | null;
  venueName: string;
  clubName: string | null;
  formatHint: "americano" | "mexicano" | "fixed_americano" | null;
  hasTeams: boolean;
  isPast: boolean;
  participants: ReclubParticipant[];
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Unix seconds → { date, time } in `timeZone` (Reclub meets carry their community's zone). */
export function localDateTime(unix: number, timeZone = "Asia/Jakarta") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(unix * 1000))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** A decoded meet `_payload.json` → the meet and its participants (with names from the users map). */
export function readReclubMeet(payload: unknown, code: string): ReclubMeet {
  const data = isObj(payload) && isObj(payload.data) ? payload.data : null;
  const entry = data && Object.entries(data).find(([k]) => k.toLowerCase() === `meet-${code.toLowerCase()}`)?.[1];
  if (!isObj(entry)) throw new ReclubFormatError("data meet tidak ada");
  const meet = entry.meet;
  if (!isObj(meet) || !Array.isArray(meet.participants)) throw new ReclubFormatError("daftar peserta tidak ada");
  const users = isObj(entry.usersMap) ? entry.usersMap : {};
  const start = num(meet.startDatetime);
  if (start === null) throw new ReclubFormatError("jam mulai tidak ada");
  const community = isObj(entry.community) ? entry.community : isObj(meet.community) ? meet.community : {};
  const { date, time } = localDateTime(start, str(community.timezone) || "Asia/Jakarta");

  const participants: ReclubParticipant[] = [];
  for (const p of meet.participants) {
    if (!isObj(p)) continue;
    const id = num(p.referenceId);
    const profile = id === null ? null : users[String(id)];
    // referenceType 1 and 2 are both users (2 seen on hosts and some joins); anything else without a
    // profile in the users map (a guest, a +1) has nobody to import
    if (id === null || (!isObj(profile) && p.referenceType !== 1 && p.referenceType !== 2)) continue;
    const u = isObj(profile) ? profile : {};
    const gender = u.gender === "M" || u.gender === "F" ? u.gender : null;
    participants.push({
      reclubUserId: id,
      name: str(u.name) || str(u.username) || `Reclub #${id}`,
      username: str(u.username),
      gender,
      imageUrl: str(u.imageUrl) || null,
      status: RECLUB_STATUS[num(p.status) ?? NaN] ?? "other",
      isHost: p.isHost === true,
      team: str(p.teamId) || null,
    });
  }

  const venue = isObj(meet.venue) ? meet.venue : {};
  const club = isObj(entry.group) ? entry.group : {};
  const quota = num(meet.numPlayers);
  return {
    code,
    url: reclubMeetUrl(code),
    name: str(meet.name),
    date,
    time,
    durationHours: Math.max(0.5, Math.round(((num(meet.duration) ?? 7200) / 3600) * 2) / 2),
    feeAmount: Math.max(0, num(meet.feeAmount) ?? 0),
    quota: quota && quota > 0 ? quota : null,
    venueName: str(venue.name),
    clubName: str(club.name) || null,
    formatHint: FORMAT_HINT[num(meet.sportFormatId) ?? NaN] ?? null,
    hasTeams: participants.some((p) => p.team !== null) || num(meet.sportFormatId) === 97,
    isPast: meet.isPast === true,
    participants,
  };
}

/**
 * Confirmed fixed-partner teams in Reclub's order: [team key, [userId, userId]]. Teams that are not
 * exactly two confirmed players (a waitlisted partner, a solo sign-up) are left out for the admin.
 */
export function reclubPairs(participants: ReclubParticipant[]): [string, [number, number]][] {
  const byTeam = new Map<string, number[]>();
  for (const p of participants) {
    if (p.status !== "confirmed" || !p.team) continue;
    byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p.reclubUserId]);
  }
  return [...byTeam].filter(([, ids]) => ids.length === 2).map(([team, ids]) => [team, [ids[0], ids[1]]]);
}

/**
 * Imported players into team slots ({ p1, p2 } rows): Reclub's complete fixed-partner teams go into
 * empty rows first, then everyone else (no team, or a partner left out) fills the remaining gaps in
 * order. Rows are added up to `limit`; players already in a row are skipped. A row filled with a
 * whole Reclub team carries its key in `team`. Returns new rows.
 */
export function placeInPairs<S extends { p1: string; p2: string; team?: string | null }>(
  slots: S[],
  imported: { playerId: string; team: string | null }[],
  limit: number,
  newSlot: (index: number) => S,
): { slots: S[]; pairs: number; soloTeams: number; singles: number; left: number } {
  const used = new Set(slots.flatMap((s) => [s.p1, s.p2]).filter(Boolean));
  const byTeam = new Map<string, string[]>();
  const noTeam: string[] = [];
  for (const p of imported) {
    if (used.has(p.playerId)) continue;
    used.add(p.playerId);
    if (p.team) byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p.playerId]);
    else noTeam.push(p.playerId);
  }
  const completePairs: [string, string, string][] = [];
  const soloTeams: [string, string][] = [];
  for (const [team, ids] of byTeam) {
    if (ids.length >= 2) {
      completePairs.push([ids[0], ids[1], team]);
      if (ids.length > 2) noTeam.push(...ids.slice(2));
    } else if (ids.length === 1) {
      soloTeams.push([ids[0], team]);
    }
  }
  const rows = slots.map((s) => ({ ...s }));
  const slot = (free: (s: S) => boolean) => {
    const i = rows.findIndex(free);
    if (i >= 0 || rows.length >= limit) return i;
    rows.push(newSlot(rows.length));
    return rows.length - 1;
  };
  let left = 0;
  // 1. Complete pairs go into empty slots together with their team tag
  for (const [a, b, team] of completePairs) {
    const i = slot((s) => !s.p1 && !s.p2);
    if (i < 0) left += 2;
    else Object.assign(rows[i], { p1: a, p2: b, team });
  }
  // 2. Solo teams (1 player registered in a team) take their OWN slot with their team tag, leaving p2 open
  for (const [id, team] of soloTeams) {
    const i = slot((s) => !s.p1 && !s.p2);
    if (i < 0) left++;
    else Object.assign(rows[i], { p1: id, p2: "", team });
  }
  // 3. Players with no team at all (non-team meet) fill empty spaces sequentially
  for (const id of noTeam) {
    const i = slot((s) => !s.p1 || !s.p2);
    if (i < 0) left++;
    else if (!rows[i].p1) rows[i].p1 = id;
    else rows[i].p2 = id;
  }
  return {
    slots: rows,
    pairs: completePairs.length,
    soloTeams: soloTeams.length,
    singles: noTeam.length,
    left,
  };
}

/** Reclub's team keys (jersey colors) → our label and a swatch that shows on the dark admin. */
const TEAM_COLORS: Record<string, [string, string]> = {
  gray: ["Abu-abu", "#9CA3AF"],
  white: ["Putih", "#F3F4F6"],
  black: ["Hitam", "#52525B"],
  blue: ["Biru", "#3B82F6"],
  red: ["Merah", "#EF4444"],
  yellow: ["Kuning", "#FACC15"],
  green: ["Hijau", "#22C55E"],
  orange: ["Oranye", "#F97316"],
  purple: ["Ungu", "#A855F7"],
  pink: ["Pink", "#EC4899"],
};

/** "red_team" → { label: "Merah", color: "#EF4444" }; an unknown key keeps its own name, in gray. */
export function reclubTeam(team: string): { label: string; color: string } {
  const key = team.replace(/_team$/, "");
  const known = TEAM_COLORS[key];
  if (known) return { label: known[0], color: known[1] };
  const s = key.replace(/_/g, " ");
  return { label: s.charAt(0).toUpperCase() + s.slice(1), color: "#9CA3AF" };
}

// ---------------------------------------------------------------- club

export type ReclubClubMeet = { code: string; name: string; date: string; time: string; confirmed: number; quota: number | null; hasTeams?: boolean };

/** A decoded club `_payload.json` → its upcoming meets (the page lists no past ones), soonest first. */
export function readReclubClubMeets(payload: unknown): ReclubClubMeet[] {
  const data = isObj(payload) && isObj(payload.data) ? payload.data : null;
  const entry = data && Object.entries(data).find(([k]) => k.startsWith("club-@"))?.[1];
  if (!isObj(entry) || !Array.isArray(entry.activities)) throw new ReclubFormatError("daftar meet klub tidak ada");
  const out: { start: number; meet: ReclubClubMeet }[] = [];
  for (const a of entry.activities) {
    if (!isObj(a) || a.context !== "meet") continue;
    const code = str(a.referenceCode);
    const start = num(a.startDatetime);
    if (!code || start === null) continue;
    const confirmed = Array.isArray(a.participants) ? a.participants.filter((p) => isObj(p) && p.status === 1).length : 0;
    const quota = num(a.numPlayers);
    const hasTeams = num(a.sportFormatId) === 97 || (Array.isArray(a.participants) && a.participants.some((p) => isObj(p) && p.teamId != null));
    out.push({ start, meet: { code, name: str(a.name), ...localDateTime(start), confirmed, quota: quota && quota > 0 ? quota : null, hasTeams } });
  }
  return out.sort((a, b) => a.start - b.start).map((m) => m.meet);
}

// ---------------------------------------------------------------- matching to our players

/** Lowercase letters/digits only, single spaces: "  Erick KS 🎾" → "erick ks". */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type ReclubMatch = { playerId: string | null; how: "linked" | "name" | "none" };

/**
 * Each participant → one of our players: the one already linked to that Reclub user, else the only
 * not-yet-linked player whose name (or the Reclub username) is the same after normalizing, else none.
 * Name matches are suggestions the admin confirms; the link is saved only then.
 */
export function matchReclubPlayers(
  participants: Pick<ReclubParticipant, "reclubUserId" | "name" | "username">[],
  players: { id: string; name: string; reclub_user_id?: number | null }[],
): Map<number, ReclubMatch> {
  const linked = new Map(players.filter((p) => p.reclub_user_id != null).map((p) => [p.reclub_user_id as number, p.id]));
  const byName = new Map<string, string[]>();
  for (const p of players) {
    if (p.reclub_user_id != null) continue;
    const key = normalizeName(p.name);
    if (key) byName.set(key, [...(byName.get(key) ?? []), p.id]);
  }
  const taken = new Set<string>();
  const out = new Map<number, ReclubMatch>();
  for (const r of participants) {
    const id = linked.get(r.reclubUserId);
    if (id) out.set(r.reclubUserId, { playerId: id, how: "linked" });
  }
  for (const r of participants) {
    if (out.has(r.reclubUserId)) continue;
    const keys = [normalizeName(r.name), normalizeName(r.username.replace(/[-_]\d+$/, ""))].filter(Boolean);
    const hits = [...new Set(keys.flatMap((k) => byName.get(k) ?? []))].filter((pid) => !taken.has(pid));
    if (hits.length === 1) {
      taken.add(hits[0]);
      out.set(r.reclubUserId, { playerId: hits[0], how: "name" });
    } else out.set(r.reclubUserId, { playerId: null, how: "none" });
  }
  return out;
}

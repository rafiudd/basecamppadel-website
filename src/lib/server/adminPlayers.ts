import type { Document } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc } from "@/lib/server/mongo/utils";
import type { Player } from "@/lib/database.types";
import { PLAYERS_PAGE_SIZE, type PlayerListQuery, type PlayerSort } from "@/lib/adminPlayersQuery";

/** A player row of the admin list, with the totals the list shows and filters on. */
export type AdminPlayerRow = Player & { coachingCount: number; raporCount: number };

export type AdminPlayersPage = {
  rows: AdminPlayerRow[];
  /** Players matching every filter (what the pager pages through). */
  shown: number;
  /** All players, unfiltered. */
  total: number;
  page: number;
  totalPages: number;
  /** What picking each chip would show: every other filter applied, its own left out. */
  chipCounts: { all: number; M: number; F: number; noAccount: number; noPhoto: number };
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS: Record<PlayerSort, Record<string, 1 | -1>> = {
  poin: { points: -1, _nameKey: 1, _id: 1 },
  nama: { _nameKey: 1, _id: 1 },
  wl: { _wl: -1, wins: -1, _nameKey: 1, _id: 1 },
  match: { _matches: -1, _nameKey: 1, _id: 1 },
  coaching: { _coaching: -1, _nameKey: 1, _id: 1 },
  rapor: { _rapor: -1, _nameKey: 1, _id: 1 },
};

const ACTIVITY_MATCH: Record<Exclude<PlayerListQuery["activity"], "">, Document> = {
  coached: { _coaching: { $gt: 0 } },
  uncoached: { _coaching: 0 },
  rapor: { _rapor: { $gt: 0 } },
  "no-rapor": { _rapor: 0 },
  "coached-no-rapor": { _coaching: { $gt: 0 }, _rapor: 0 },
};

/** `$lookup` of rows in `from` whose player_id is this player, reduced by `then`. */
const lookupByPlayer = (from: string, as: string, then: Document[], extraMatch: Document = {}): Document => ({
  $lookup: {
    from,
    let: { pid: "$_pid" },
    pipeline: [{ $match: { ...extraMatch, $expr: { $eq: ["$player_id", "$$pid"] } } }, ...then],
    as,
  },
});

const countOf = (field: string) => ({ $ifNull: [{ $arrayElemAt: [`$${field}.n`, 0] }, 0] });

/**
 * One page of the admin player list. Search, level / gender / activity / missing-data filters,
 * sort and paging all run in one MongoDB aggregation, together with the per-chip counts — the
 * browser gets 25 players instead of every player, profile and coaching total.
 * Coaching counts distinct sessions joined; rapor counts submitted assessments.
 */
export async function getAdminPlayersPage(query: PlayerListQuery): Promise<AdminPlayersPage> {
  const db = await getDb();
  const players = db.collection("players");

  const base: Document = {};
  const term = query.q.trim();
  if (term) {
    const rx = { $regex: escapeRegex(term), $options: "i" };
    base.$or = [{ name: rx }, { region: rx }];
  }
  if (query.level) base.level = query.level;

  const genderMatch: Document = query.gender ? { gender: query.gender } : {};
  const accountMatch: Document = query.noAccount ? { _hasAccount: false } : {};
  const photoMatch: Document = query.noPhoto ? { _hasPhoto: false } : {};
  const count = [{ $count: "n" }];

  const run = async (page: number) => {
    const [res] = await players
      .aggregate([
        { $match: base },
        { $addFields: { _pid: { $ifNull: ["$id", { $toString: "$_id" }] } } },
        lookupByPlayer("profiles", "_acc", [{ $limit: 1 }, { $project: { _id: 1 } }]),
        lookupByPlayer("coaching_session_players", "_coach", [{ $group: { _id: "$session_id" } }, ...count]),
        lookupByPlayer("coaching_assessments", "_rap", count, { status: "submitted" }),
        {
          $addFields: {
            _hasAccount: { $gt: [{ $size: "$_acc" }, 0] },
            _hasPhoto: { $gt: [{ $strLenCP: { $ifNull: [{ $toString: "$photo_url" }, ""] } }, 0] },
            _coaching: countOf("_coach"),
            _rapor: countOf("_rap"),
            _wl: { $subtract: [{ $ifNull: ["$wins", 0] }, { $ifNull: ["$losses", 0] }] },
            _matches: { $add: [{ $ifNull: ["$wins", 0] }, { $ifNull: ["$losses", 0] }] },
            _nameKey: { $toLower: { $ifNull: ["$name", ""] } },
          },
        },
        ...(query.activity ? [{ $match: ACTIVITY_MATCH[query.activity] }] : []),
        {
          $facet: {
            rows: [
              { $match: { ...genderMatch, ...accountMatch, ...photoMatch } },
              { $sort: SORTS[query.sort] },
              { $skip: (page - 1) * PLAYERS_PAGE_SIZE },
              { $limit: PLAYERS_PAGE_SIZE },
              { $project: { _acc: 0, _coach: 0, _rap: 0 } },
            ],
            shown: [{ $match: { ...genderMatch, ...accountMatch, ...photoMatch } }, ...count],
            genders: [{ $match: { ...accountMatch, ...photoMatch } }, { $group: { _id: "$gender", n: { $sum: 1 } } }],
            noAccount: [{ $match: { ...genderMatch, ...photoMatch, _hasAccount: false } }, ...count],
            noPhoto: [{ $match: { ...genderMatch, ...accountMatch, _hasPhoto: false } }, ...count],
          },
        },
      ])
      .toArray();
    return res as { rows: Document[]; shown: { n: number }[]; genders: { _id: string; n: number }[]; noAccount: { n: number }[]; noPhoto: { n: number }[] };
  };

  let page = query.page;
  const [firstRun, total] = await Promise.all([run(page), players.estimatedDocumentCount()]);
  let res = firstRun;
  const shown = res.shown[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(shown / PLAYERS_PAGE_SIZE));
  if (page > totalPages) {
    // A stale ?page= past the end (filters narrowed the list) — show the last page instead of nothing.
    page = totalPages;
    res = await run(page);
  }

  const gender = (g: string) => res.genders.find((x) => x._id === g)?.n ?? 0;
  const rows = res.rows.map((d) => {
    const { _pid, _hasAccount, _hasPhoto, _coaching, _rapor, _wl, _matches, _nameKey, ...doc } = d;
    void [_hasAccount, _hasPhoto, _wl, _matches, _nameKey];
    return { ...normalizeDoc(doc), id: String(_pid), coachingCount: Number(_coaching) || 0, raporCount: Number(_rapor) || 0 } as AdminPlayerRow;
  });

  return {
    rows,
    shown,
    total,
    page,
    totalPages,
    chipCounts: {
      all: res.genders.reduce((sum, g) => sum + g.n, 0),
      M: gender("M"),
      F: gender("F"),
      noAccount: res.noAccount[0]?.n ?? 0,
      noPhoto: res.noPhoto[0]?.n ?? 0,
    },
  };
}

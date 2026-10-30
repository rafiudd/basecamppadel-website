// Run: npm test  (node --test with TypeScript type stripping)
import test from "node:test";
import assert from "node:assert/strict";
import { mergeBlockers, mergePlayers, playerFootprint } from "../src/lib/server/playerMerge.ts";
import { footprintParts, renameInTeamName } from "../src/lib/playerMerge.ts";

// In-memory Db: {f: v} (an array field matches when it contains v), {f: {$in}}, {$or}; $set updates;
// and the $match + $group/$sum aggregation recomputePlayerStats runs.
function fakeDb(seed) {
  const data = structuredClone(seed);
  const matches = (doc, filter) =>
    Object.entries(filter).every(([k, cond]) => {
      if (k === "$or") return cond.some((f) => matches(doc, f));
      if (cond && typeof cond === "object" && "$in" in cond) return cond.$in.includes(doc[k]);
      if (Array.isArray(doc[k]) && !Array.isArray(cond)) return doc[k].includes(cond);
      return doc[k] === cond;
    });
  const expr = (doc, e) => {
    if (typeof e === "string" && e.startsWith("$")) return doc[e.slice(1)];
    if (!e || typeof e !== "object") return e;
    if ("$cond" in e) return expr(doc, e.$cond[0]) ? expr(doc, e.$cond[1]) : expr(doc, e.$cond[2]);
    if ("$eq" in e) return expr(doc, e.$eq[0]) === expr(doc, e.$eq[1]);
    if ("$ifNull" in e) return expr(doc, e.$ifNull[0]) ?? expr(doc, e.$ifNull[1]);
    if ("$toDouble" in e) return Number(expr(doc, e.$toDouble));
    throw new Error(`fakeDb: unsupported expression ${JSON.stringify(e)}`);
  };
  const aggregate = (rows, pipeline) => {
    for (const stage of pipeline) {
      if (stage.$match) rows = rows.filter((d) => matches(d, stage.$match));
      else if (stage.$group) {
        const { _id, ...fields } = stage.$group;
        const groups = new Map();
        for (const d of rows) {
          const key = expr(d, _id);
          const g = groups.get(key) ?? { _id: key, ...Object.fromEntries(Object.keys(fields).map((f) => [f, 0])) };
          for (const [f, acc] of Object.entries(fields)) g[f] += expr(d, acc.$sum);
          groups.set(key, g);
        }
        rows = [...groups.values()];
      } else throw new Error(`fakeDb: unsupported stage ${Object.keys(stage)}`);
    }
    return rows;
  };
  return {
    data,
    collection(name) {
      data[name] ??= [];
      return {
        find: (f) => ({ toArray: async () => data[name].filter((d) => matches(d, f)) }),
        findOne: async (f) => data[name].find((d) => matches(d, f)) ?? null,
        updateMany: async (f, u) => {
          for (const d of data[name]) if (matches(d, f)) Object.assign(d, u.$set);
        },
        updateOne: async (f, u) => {
          const d = data[name].find((x) => matches(x, f));
          if (d) Object.assign(d, u.$set);
        },
        deleteOne: async (f) => {
          const i = data[name].findIndex((d) => matches(d, f));
          if (i >= 0) data[name].splice(i, 1);
        },
        aggregate: (pipeline) => ({ toArray: async () => aggregate(data[name], pipeline) }),
        bulkWrite: async (ops) => {
          for (const { updateOne: u } of ops) {
            const d = data[name].find((x) => matches(x, u.filter));
            if (d) Object.assign(d, u.update.$set);
          }
        },
      };
    },
  };
}

const player = (id, name, extra = {}) => ({ _id: id, id, name, points: 0, wins: 0, losses: 0, points_adjustment: 0, ...extra });

// DUP is a Reclub-made duplicate of REAL: it played a mabar and a kompetisi, and got coached once.
const SEED = {
  players: [
    player("REAL", "Erick", { whatsapp: "6281", region: "" }),
    player("DUP", "Erick KS", { reclub_user_id: 77, reclub_name: "Erick KS", reclub_username: "erick-ks", photo_url: "players/dup.webp", region: "Jaksel", points_adjustment: 5 }),
    player("BUDI", "Budi"),
  ],
  events: [{ _id: "E1", id: "E1", title: "Mabar Jumat" }, { _id: "E2", id: "E2", title: "Liga Vol 1" }],
  match_history: [
    { _id: "h1", player_id: "DUP", result: "W", points_delta: 3 },
    { _id: "h2", player_id: "DUP", result: "L", points_delta: 1 },
    { _id: "h3", player_id: "REAL", result: "W", points_delta: 3 },
  ],
  player_awards: [{ _id: "a1", player_id: "DUP", event_id: "E2", points: 10 }],
  gen_participants: [{ _id: "g1", player_id: "DUP", event_id: "E1", display_name: "Erick KS" }],
  comp_teams: [{ _id: "T1", id: "T1", event_id: "E2", name: "Erick KS / Budi" }],
  comp_team_players: [
    { _id: "tp1", team_id: "T1", event_id: "E2", player_id: "DUP", slot: 1 },
    { _id: "tp2", team_id: "T1", event_id: "E2", player_id: "BUDI", slot: 2 },
  ],
  matches: [{ _id: "M1", id: "M1", team_a_player_ids: ["DUP", "BUDI"], team_b_player_ids: ["X", "Y"], team_a_name: "Erick KS / Budi", team_b_name: "X / Y" }],
  coaching_sessions: [{ _id: "S1", id: "S1", title: "Coaching Sabtu" }],
  coaching_session_players: [{ _id: "cp1", session_id: "S1", player_id: "DUP" }],
  coaching_assessments: [{ _id: "ca1", session_id: "S1", player_id: "DUP" }],
  profiles: [],
};

test("nama tim: hanya nama utuh di antara ' / ' yang diganti", () => {
  assert.equal(renameInTeamName("Erick KS / Budi", "Erick KS", "Erick"), "Erick / Budi");
  assert.equal(renameInTeamName("Erick KSX / Budi", "Erick KS", "Erick"), "Erick KSX / Budi");
  assert.equal(renameInTeamName("Erick KS", "", "Erick"), "Erick KS");
});

test("jejak pemain: dihitung per jenis data, yang nol tidak disebut", async () => {
  const f = await playerFootprint(fakeDb(SEED), "DUP");
  assert.deepEqual(f, { matches: 2, awards: 1, events: 2, coachingSessions: 1, assessments: 1, classes: 0, accountEmail: null });
  assert.deepEqual(footprintParts(f), ["2 match", "1 penghargaan event", "2 event", "1 sesi coaching", "1 penilaian coaching"]);
});

test("gabung: semua data duplikat pindah, nama di event ikut, poin dihitung ulang, duplikat dihapus", async () => {
  const db = fakeDb(SEED);
  const res = await mergePlayers(db, "DUP", "REAL");
  const d = db.data;

  assert.equal(res.targetName, "Erick");
  assert.deepEqual(d.players.map((p) => p.id), ["REAL", "BUDI"]);
  for (const name of ["match_history", "player_awards", "gen_participants", "coaching_session_players", "coaching_assessments"]) {
    assert.ok(d[name].every((r) => r.player_id !== "DUP"), `${name} masih menunjuk duplikat`);
  }
  assert.equal(d.comp_team_players.find((r) => r._id === "tp1").player_id, "REAL");
  assert.deepEqual(d.matches[0].team_a_player_ids, ["REAL", "BUDI"]);
  assert.equal(d.matches[0].team_a_name, "Erick / Budi");
  assert.equal(d.comp_teams[0].name, "Erick / Budi");
  assert.equal(d.gen_participants[0].display_name, "Erick");

  const real = d.players.find((p) => p.id === "REAL");
  // what REAL lacked comes from DUP; its own WA stays
  assert.equal(real.reclub_user_id, 77);
  assert.equal(real.reclub_username, "erick-ks");
  assert.equal(real.photo_url, "players/dup.webp");
  assert.equal(real.region, "Jaksel");
  assert.equal(real.whatsapp, "6281");
  // W-L and points over the merged history: 3 + 1 + 3 match points, 10 award, 5 adjustment
  assert.deepEqual([real.wins, real.losses, real.points, real.points_adjustment], [2, 1, 22, 5]);
});

test("gabung ditolak: event/sesi yang sama, atau dua-duanya punya akun", async () => {
  const sameEvent = structuredClone(SEED);
  sameEvent.gen_participants.push({ _id: "g2", player_id: "REAL", event_id: "E1", display_name: "Erick" });
  sameEvent.coaching_session_players.push({ _id: "cp2", session_id: "S1", player_id: "REAL" });
  const blockers = await mergeBlockers(fakeDb(sameEvent), "DUP", "REAL");
  assert.equal(blockers.length, 2);
  assert.match(blockers[0], /Mabar Jumat/);
  assert.match(blockers[1], /Coaching Sabtu/);

  const twoAccounts = structuredClone(SEED);
  twoAccounts.profiles = [
    { _id: "u1", player_id: "DUP", email: "a@x.id" },
    { _id: "u2", player_id: "REAL", email: "b@x.id" },
  ];
  const db = fakeDb(twoAccounts);
  await assert.rejects(mergePlayers(db, "DUP", "REAL"), /Dua-duanya punya akun/);
  assert.equal(db.data.players.length, 3, "tidak ada yang berubah saat ditolak");

  assert.deepEqual(await mergeBlockers(fakeDb(SEED), "DUP", "DUP"), ["Pilih dua pemain yang berbeda."]);
});

test("gabung: akun milik duplikat pindah ke pemain yang tetap", async () => {
  const seed = structuredClone(SEED);
  seed.profiles = [{ _id: "u1", player_id: "DUP", claim_player_id: null, email: "erick@x.id" }];
  const db = fakeDb(seed);
  await mergePlayers(db, "DUP", "REAL");
  assert.equal(db.data.profiles[0].player_id, "REAL");
});

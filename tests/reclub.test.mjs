// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeNuxtPayload,
  matchReclubPlayers,
  normalizeName,
  parseReclubMeetCode,
  placeInPairs,
  readReclubClubMeets,
  readReclubMeet,
  reclubPairs,
  reclubTeam,
  ReclubFormatError,
} from "../src/lib/reclub.ts";

/** Minimal devalue encoder (the format of Nuxt's _payload.json): `{ tag, value }` boxes a value in a Vue wrapper. */
function encode(root) {
  const out = [];
  const put = (v) => {
    if (v === undefined) return -1;
    const i = out.length;
    out.push(null);
    if (v && v.tag === "EmptyRef") out[i] = ["EmptyRef", JSON.stringify(v.value)];
    else if (v && v.tag) out[i] = [v.tag, put(v.value)];
    else if (Array.isArray(v)) out[i] = v.map(put);
    else if (v && typeof v === "object") out[i] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, put(x)]));
    else out[i] = v;
    return i;
  };
  put(root);
  return out;
}

const user = (userId, name, gender = "M", username = name.toLowerCase()) => ({ userId, name, username, gender, imageUrl: `https://assets.reclub.co/user-avatars/${userId}.webp` });
const part = (referenceId, status, teamId = null, extra = {}) => ({ referenceType: 1, referenceId, status, isHost: false, teamId, ...extra });

// 23 Oct 2026, 17:40 WIB
const START = Date.UTC(2026, 9, 23, 10, 40) / 1000;
const meetPayload = encode({
  data: {
    tag: "ShallowReactive",
    value: {
      "meet-D0DBRA": {
        meet: {
          name: "BASECAMP BATTLE",
          startDatetime: START,
          duration: 10800,
          feeAmount: 100000,
          numPlayers: 12,
          sportFormatId: 97,
          isPast: true,
          isCancelled: { tag: "EmptyRef", value: false },
          venue: { name: "Pine Sports Venues" },
          participants: [
            part(1, 1, "gray_team", { isHost: true }),
            part(2, 1, "gray_team"),
            part(3, 1, "blue_team"),
            { ...part(4, 2, "blue_team"), referenceType: 2 }, // waitlisted partner: blue is not a full pair
            part(5, 4),
            part(6, -1),
            { referenceType: 9, referenceId: 77, status: 1 }, // a guest without a profile
            part(7, 1, "red_team"), // solo sign-up
          ],
        },
        usersMap: { 1: user(1, "Ray"), 2: user(2, "sean"), 3: user(3, "Andra"), 4: user(4, "Siemen"), 5: user(5, "Maul", null), 6: user(6, "Uyoo"), 7: user(7, "Dinda", "F") },
        community: { timezone: "Asia/Jakarta" },
        group: { name: "Basecamp Padel" },
      },
    },
  },
  prerenderedAt: undefined,
});

test("link Reclub → kode meet; awalan bahasa dibuang, link lain ditolak", () => {
  assert.equal(parseReclubMeetCode("https://reclub.co/id/m/D0DBRA"), "D0DBRA");
  assert.equal(parseReclubMeetCode("reclub.co/m/d0dbra?utm=wa"), "D0DBRA");
  assert.equal(parseReclubMeetCode("  D0DBRA "), "D0DBRA");
  assert.equal(parseReclubMeetCode("https://reclub.co/clubs/@basecamp"), null);
  assert.equal(parseReclubMeetCode("https://evil.com/m/D0DBRA"), null);
  assert.equal(parseReclubMeetCode(""), null);
});

test("payload Nuxt: wrapper dibuka, EmptyRef di-parse, -1 = undefined, angka -1 tetap angka", () => {
  const decoded = decodeNuxtPayload(encode({ a: { tag: "Ref", value: [1, -1, "x"] }, b: { tag: "EmptyRef", value: null }, c: undefined }));
  assert.deepEqual(decoded, { a: [1, -1, "x"], b: null, c: undefined });
  assert.throws(() => decodeNuxtPayload({}), ReclubFormatError);
});

test("meet: detail, jam lokal WIB, status peserta, tamu tanpa profil dilewati", () => {
  const meet = readReclubMeet(decodeNuxtPayload(meetPayload), "D0DBRA");
  assert.equal(meet.name, "BASECAMP BATTLE");
  assert.equal(meet.date, "2026-10-23");
  assert.equal(meet.time, "17:40");
  assert.equal(meet.durationHours, 3);
  assert.equal(meet.feeAmount, 100000);
  assert.equal(meet.quota, 12);
  assert.equal(meet.venueName, "Pine Sports Venues");
  assert.equal(meet.clubName, "Basecamp Padel");
  assert.equal(meet.formatHint, "fixed_americano");
  assert.equal(meet.url, "https://reclub.co/m/D0DBRA");
  assert.deepEqual(
    meet.participants.map((p) => [p.reclubUserId, p.status]),
    [[1, "confirmed"], [2, "confirmed"], [3, "confirmed"], [4, "waitlisted"], [5, "requested"], [6, "other"], [7, "confirmed"]],
  );
  assert.equal(meet.participants[0].isHost, true);
  assert.equal(meet.participants[4].gender, null);
  assert.equal(meet.participants[6].gender, "F");
});

test("meet: data tidak dikenal → ReclubFormatError, bukan tebakan", () => {
  assert.throws(() => readReclubMeet(decodeNuxtPayload(meetPayload), "XXXXXX"), ReclubFormatError);
  assert.throws(() => readReclubMeet({ data: { "meet-D0DBRA": { meet: { participants: [] } } } }, "D0DBRA"), /jam mulai/);
});

test("pasangan tetap: hanya tim berisi tepat 2 pemain confirmed", () => {
  const meet = readReclubMeet(decodeNuxtPayload(meetPayload), "D0DBRA");
  assert.deepEqual(reclubPairs(meet.participants), [["gray_team", [1, 2]]]);
  assert.deepEqual(reclubTeam("red_team"), { label: "Merah", color: "#EF4444" });
  assert.deepEqual(reclubTeam("light_blue_team"), { label: "Light blue", color: "#9CA3AF" });
});

test("isi slot tim: pasangan Reclub utuh dulu, sisanya berurutan, berhenti di batas", () => {
  const empty = () => ({ p1: "", p2: "" });
  const imported = [
    { playerId: "a", team: "gray_team" },
    { playerId: "x", team: null },
    { playerId: "b", team: "gray_team" },
    { playerId: "c", team: "blue_team" }, // partner not imported
    { playerId: "d", team: "red_team" },
    { playerId: "e", team: "red_team" },
    { playerId: "old", team: null }, // already in a slot
  ];
  // one slot half-filled by the admin, one empty, room for one more
  const r = placeInPairs([{ p1: "old", p2: "" }, empty()], imported, 3, empty);
  assert.deepEqual(r.slots, [
    { p1: "old", p2: "x" },
    { p1: "a", p2: "b", team: "gray_team" },
    { p1: "d", p2: "e", team: "red_team" },
  ]);
  assert.deepEqual({ pairs: r.pairs, soloTeams: r.soloTeams, singles: r.singles, left: r.left }, { pairs: 2, soloTeams: 1, singles: 1, left: 1 }); // c does not fit
  assert.equal(placeInPairs([], [{ playerId: "a", team: null }], Infinity, empty).slots.length, 1);
});

test("isi slot tim: solo player di meet berformat tim tetap di slot timnya sendiri", () => {
  const empty = () => ({ p1: "", p2: "" });
  const soloPlayers = [
    { playerId: "p-ray", team: "gray_team" },
    { playerId: "p-erick", team: "white_team" },
    { playerId: "p-pao", team: "black_team" },
  ];
  const r = placeInPairs([], soloPlayers, 4, empty);
  assert.deepEqual(r.slots, [
    { p1: "p-ray", p2: "", team: "gray_team" },
    { p1: "p-erick", p2: "", team: "white_team" },
    { p1: "p-pao", p2: "", team: "black_team" },
  ]);
  assert.equal(r.soloTeams, 3);
  assert.equal(r.pairs, 0);
  assert.equal(r.singles, 0);
});

test("klub: meet mendatang urut paling dekat, hitung yang confirmed", () => {
  const club = encode({
    data: {
      tag: "ShallowReactive",
      value: {
        "club-@basecamp-padel": {
          activities: [
            { context: "meet", referenceCode: "LATER1", name: "Mabar Sore", startDatetime: START + 86400, numPlayers: 16, participants: [{ status: 1 }, { status: 2 }] },
            { context: "competition", referenceCode: "COMP01", name: "Liga", startDatetime: START },
            { context: "meet", referenceCode: "SOON01", name: "Battle", startDatetime: START, numPlayers: 0, participants: [{ status: 1 }, { status: 1 }] },
          ],
        },
      },
    },
  });
  assert.deepEqual(readReclubClubMeets(decodeNuxtPayload(club)), [
    { code: "SOON01", name: "Battle", date: "2026-10-23", time: "17:40", confirmed: 2, quota: null, hasTeams: false },
    { code: "LATER1", name: "Mabar Sore", date: "2026-10-24", time: "17:40", confirmed: 1, quota: 16, hasTeams: false },
  ]);
});

test("cocokkan pemain: tautan Reclub dulu, lalu nama unik; nama ganda tidak ditebak", () => {
  assert.equal(normalizeName("  Erick KS 🎾 "), "erick ks");
  assert.equal(normalizeName("Ándra"), "andra");
  const players = [
    { id: "p-ray", name: "Ray", reclub_user_id: 1 },
    { id: "p-ray2", name: "Ray" }, // same name, but Reclub user 1 is already linked to p-ray
    { id: "p-sean", name: "Sean" },
    { id: "p-budi1", name: "Budi" },
    { id: "p-budi2", name: "budi" },
    { id: "p-pao", name: "pasaribu" },
  ];
  const m = matchReclubPlayers(
    [
      { reclubUserId: 1, name: "Ray", username: "awalrayziq-144" },
      { reclubUserId: 2, name: "sean", username: "se-7" },
      { reclubUserId: 3, name: "Budi", username: "budi" },
      { reclubUserId: 4, name: "Nauval", username: "pasaribu25" },
      { reclubUserId: 5, name: "SEAN", username: "sean-2" }, // p-sean already taken by user 2
    ],
    players,
  );
  assert.deepEqual(Object.fromEntries(m), {
    1: { playerId: "p-ray", how: "linked" },
    2: { playerId: "p-sean", how: "name" },
    3: { playerId: null, how: "none" },
    4: { playerId: null, how: "none" },
    5: { playerId: null, how: "none" },
  });
});

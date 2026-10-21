import { MongoClient } from "mongodb";
import crypto from "node:crypto";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found in environment.");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB_DEV || "DEV";
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db(dbName);
  console.log(`Seeding coaching demo data into MongoDB [${dbName}]...`);

  const now = new Date();

  // 1. Ensure coaches
  const coachNames = ["Lukman", "Dani", "Rian"];
  const coachIds = {};
  for (const cName of coachNames) {
    let existing = await db.collection("coaches").findOne({ name: cName });
    if (!existing) {
      const id = crypto.randomUUID();
      await db.collection("coaches").insertOne({
        _id: id,
        id,
        name: cName,
        active: true,
        created_at: now,
        updated_at: now,
      });
      coachIds[cName] = id;
    } else {
      coachIds[cName] = String(existing.id || existing._id);
    }
  }

  // 2. Ensure players
  const samplePlayers = [
    { name: "Nadia Putri", gender: "F", level: "Beginner", region: "Jakarta Selatan" },
    { name: "Salsa Amalia", gender: "F", level: "Beginner", region: "Jakarta Selatan" },
    { name: "Dinda Rahma", gender: "F", level: "Rookie", region: "Tangerang" },
    { name: "Kirana Dewi", gender: "F", level: "Low Bronze", region: "Jakarta Barat" },
    { name: "Laras Ayu", gender: "F", level: "Rookie", region: "Jakarta Selatan" },
    { name: "Vania Sari", gender: "F", level: "Beginner", region: "Jakarta Pusat" },
    { name: "Tasya Nur", gender: "F", level: "Low Bronze", region: "Jakarta Selatan" },
    { name: "Rizky Pratama", gender: "M", level: "Beginner", region: "Jakarta Selatan" },
    { name: "Dimas Aditya", gender: "M", level: "Low Bronze", region: "Jakarta Barat" },
    { name: "Fajar Nugraha", gender: "M", level: "Rookie", region: "Tangerang Selatan" },
    { name: "Bima Arya", gender: "M", level: "Beginner", region: "Jakarta Timur" },
    { name: "Kevin Sanjaya", gender: "M", level: "Bronze", region: "Jakarta Selatan" },
  ];

  const playerIds = {};
  for (const p of samplePlayers) {
    let existing = await db.collection("players").findOne({ name: p.name });
    if (!existing) {
      const id = crypto.randomUUID();
      await db.collection("players").insertOne({
        _id: id,
        id,
        name: p.name,
        gender: p.gender,
        level: p.level,
        region: p.region,
        points: 0,
        wins: 0,
        losses: 0,
        points_adjustment: 0,
        active: true,
        created_at: now,
        updated_at: now,
      });
      playerIds[p.name] = id;
    } else {
      playerIds[p.name] = String(existing.id || existing._id);
    }
  }

  // 3. Get skills
  const skillsDocs = await db
    .collection("coaching_skills")
    .find({})
    .sort({ sort_order: 1 })
    .toArray();
  const skillMap = {};
  for (const s of skillsDocs) {
    skillMap[s.name] = String(s.id || s._id);
  }

  const defaultSkillNames = [
    "Forehand",
    "Backhand",
    "Volley FH",
    "Volley BH",
    "Backwall FH",
    "Backwall BH",
    "Positioning",
    "Transisi nyerang ↔ bertahan",
  ];
  const defaultSkillIds = defaultSkillNames.map((n) => skillMap[n]).filter(Boolean);

  // 4. Create coaching session
  const sessionId = crypto.randomUUID();
  await db.collection("coaching_sessions").insertOne({
    _id: sessionId,
    id: sessionId,
    title: "Mabar with Coach · Sen, 5 Okt 2026",
    session_date: "2026-10-05",
    venue_name: "Padel Hubz",
    default_skill_ids: defaultSkillIds,
    status: "draft",
    created_at: now,
    updated_at: now,
  });

  // 5. Create groups
  const g1Id = crypto.randomUUID();
  const g2Id = crypto.randomUUID();
  const g3Id = crypto.randomUUID();

  await db.collection("coaching_groups").insertMany([
    {
      _id: g1Id,
      id: g1Id,
      session_id: sessionId,
      name: "Grup 1",
      color: "#FFD43B",
      coach_id: coachIds["Lukman"],
      created_at: now,
    },
    {
      _id: g2Id,
      id: g2Id,
      session_id: sessionId,
      name: "Grup 2",
      color: "#2563EB",
      coach_id: coachIds["Dani"],
      created_at: now,
    },
    {
      _id: g3Id,
      id: g3Id,
      session_id: sessionId,
      name: "Grup 3",
      color: "#FF5A3C",
      coach_id: coachIds["Rian"],
      created_at: now,
    },
  ]);

  // 6. Assign players to session & groups
  const pList = Object.keys(playerIds);
  for (let i = 0; i < pList.length; i++) {
    const pName = pList[i];
    const pid = playerIds[pName];
    const gid = i < 7 ? g1Id : i < 10 ? g2Id : g3Id;
    const spId = crypto.randomUUID();
    await db.collection("coaching_session_players").insertOne({
      _id: spId,
      id: spId,
      session_id: sessionId,
      player_id: pid,
      group_id: gid,
      attended: true,
      created_at: now,
    });
  }

  // 7. Assessments
  const nadiaScores = {
    [skillMap["Forehand"]]: 4,
    [skillMap["Backhand"]]: 3,
    [skillMap["Volley FH"]]: 3.5,
    [skillMap["Volley BH"]]: 3,
    [skillMap["Backwall FH"]]: 3,
    [skillMap["Backwall BH"]]: 2.5,
    [skillMap["Positioning"]]: 2.5,
    [skillMap["Transisi nyerang ↔ bertahan"]]: 3,
  };

  await db.collection("coaching_assessments").insertMany([
    {
      _id: crypto.randomUUID(),
      session_id: sessionId,
      player_id: playerIds["Nadia Putri"],
      coach_id: coachIds["Lukman"],
      group_id: g1Id,
      scores: nadiaScores,
      active_skill_ids: defaultSkillIds,
      evaluation:
        "- Forehand udah stabil dan bisa diarahkan. Ini modal utama buat rally panjang.\n- Waktu bertahan masih sering berdiri di tengah lapangan (deadzone), jadi bola lawan gampang jatuh di kaki.\n- Backwall BH masih telat: raket baru disiapin waktu bola udah keluar dari kaca.",
      next_practice:
        "- Saat defend, mundur sampai dekat kaca belakang. Kalau nyerang, maju sekalian ke net.\n- Backwall BH: mundur menyamping, tunggu bola turun, baru ayun.",
      published_to_player: true,
      status: "draft",
      computed_level: "Beginner",
      created_at: now,
      updated_at: now,
    },
    {
      _id: crypto.randomUUID(),
      session_id: sessionId,
      player_id: playerIds["Salsa Amalia"],
      coach_id: coachIds["Lukman"],
      group_id: g1Id,
      scores: { [skillMap["Forehand"]]: 3.5, [skillMap["Backhand"]]: 3 },
      active_skill_ids: defaultSkillIds,
      evaluation: "Servis dan pengembalian bola sudah konsisten.",
      next_practice: "Latihan volley dan positioning di dekat net.",
      published_to_player: true,
      status: "submitted",
      computed_level: "Beginner",
      created_at: now,
      updated_at: now,
    },
    {
      _id: crypto.randomUUID(),
      session_id: sessionId,
      player_id: playerIds["Dinda Rahma"],
      coach_id: coachIds["Lukman"],
      group_id: g1Id,
      scores: { [skillMap["Forehand"]]: 2, [skillMap["Backhand"]]: 1.5 },
      active_skill_ids: defaultSkillIds,
      evaluation: "Footwork cukup gesit, tinggal perbaiki teknik pegangan raket.",
      next_practice: "Fokus grip forehand dan backhand dasar.",
      published_to_player: true,
      status: "submitted",
      computed_level: "Rookie",
      created_at: now,
      updated_at: now,
    },
    {
      _id: crypto.randomUUID(),
      session_id: sessionId,
      player_id: playerIds["Kirana Dewi"],
      coach_id: coachIds["Lukman"],
      group_id: g1Id,
      scores: {
        [skillMap["Forehand"]]: 3.5,
        [skillMap["Backhand"]]: 3.5,
        [skillMap["Volley FH"]]: 3,
      },
      active_skill_ids: defaultSkillIds,
      evaluation: "Permainan solid, transisi menyerang sangat baik.",
      next_practice: "Tingkatkan akurasi smash dan víbora.",
      published_to_player: true,
      status: "submitted",
      computed_level: "Low Bronze",
      created_at: now,
      updated_at: now,
    },
  ]);

  console.log("Coaching demo seed completed!");
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

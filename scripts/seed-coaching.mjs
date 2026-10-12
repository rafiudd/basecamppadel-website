import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log("Seeding coaching demo data...");

  // 1. Ensure coaches
  const coachNames = ["Lukman", "Dani", "Rian"];
  const coachIds = {};
  for (const cName of coachNames) {
    const res = await client.query(
      `insert into coaches (name) values ($1)
       on conflict do nothing
       returning id;`,
      [cName]
    );
    if (res.rows[0]) {
      coachIds[cName] = res.rows[0].id;
    } else {
      const q = await client.query(`select id from coaches where name = $1`, [cName]);
      coachIds[cName] = q.rows[0]?.id;
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
    const res = await client.query(
      `insert into players (name, gender, level, region) values ($1, $2, $3, $4)
       returning id;`,
      [p.name, p.gender, p.level, p.region]
    );
    playerIds[p.name] = res.rows[0].id;
  }

  // 3. Get skills
  const skillsRes = await client.query(`select id, name from coaching_skills order by sort_order;`);
  const skillMap = {};
  for (const s of skillsRes.rows) {
    skillMap[s.name] = s.id;
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
  const sessionRes = await client.query(
    `insert into coaching_sessions (title, session_date, venue_name, default_skill_ids, status)
     values ($1, $2, $3, $4, $5)
     returning id;`,
    [
      "Mabar with Coach · Sen, 5 Okt 2026",
      "2026-10-05",
      "Padel Hubz",
      defaultSkillIds,
      "draft",
    ]
  );
  const sessionId = sessionRes.rows[0].id;

  // 5. Create groups
  const g1Res = await client.query(
    `insert into coaching_groups (session_id, name, color, coach_id) values ($1, $2, $3, $4) returning id;`,
    [sessionId, "Grup 1", "#FFD43B", coachIds["Lukman"]]
  );
  const g2Res = await client.query(
    `insert into coaching_groups (session_id, name, color, coach_id) values ($1, $2, $3, $4) returning id;`,
    [sessionId, "Grup 2", "#2563EB", coachIds["Dani"]]
  );
  const g3Res = await client.query(
    `insert into coaching_groups (session_id, name, color, coach_id) values ($1, $2, $3, $4) returning id;`,
    [sessionId, "Grup 3", "#FF5A3C", coachIds["Rian"]]
  );

  const g1Id = g1Res.rows[0].id;
  const g2Id = g2Res.rows[0].id;
  const g3Id = g3Res.rows[0].id;

  // 6. Assign players to session & groups
  const pList = Object.keys(playerIds);
  for (let i = 0; i < pList.length; i++) {
    const pName = pList[i];
    const pid = playerIds[pName];
    const gid = i < 7 ? g1Id : i < 10 ? g2Id : g3Id;
    await client.query(
      `insert into coaching_session_players (session_id, player_id, group_id) values ($1, $2, $3);`,
      [sessionId, pid, gid]
    );
  }

  // 7. Assessments
  // Nadia Putri: Draft
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
  await client.query(
    `insert into coaching_assessments (session_id, player_id, coach_id, group_id, scores, active_skill_ids, evaluation, next_practice, published_to_player, status, computed_level)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true, 'draft', 'Beginner');`,
    [
      sessionId,
      playerIds["Nadia Putri"],
      coachIds["Lukman"],
      g1Id,
      JSON.stringify(nadiaScores),
      defaultSkillIds,
      "- Forehand udah stabil dan bisa diarahkan. Ini modal utama buat rally panjang.\n- Waktu bertahan masih sering berdiri di tengah lapangan (deadzone), jadi bola lawan gampang jatuh di kaki.\n- Backwall BH masih telat: raket baru disiapin waktu bola udah keluar dari kaca.",
      "- Saat defend, mundur sampai dekat kaca belakang. Kalau nyerang, maju sekalian ke net.\n- Backwall BH: mundur menyamping, tunggu bola turun, baru ayun.",
    ]
  );

  // Salsa Amalia: Terkirim
  await client.query(
    `insert into coaching_assessments (session_id, player_id, coach_id, group_id, scores, active_skill_ids, evaluation, next_practice, published_to_player, status, computed_level)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true, 'submitted', 'Beginner');`,
    [
      sessionId,
      playerIds["Salsa Amalia"],
      coachIds["Lukman"],
      g1Id,
      JSON.stringify({ [skillMap["Forehand"]]: 3.5, [skillMap["Backhand"]]: 3 }),
      defaultSkillIds,
      "Servis dan pengembalian bola sudah konsisten.",
      "Latihan volley dan positioning di dekat net.",
    ]
  );

  // Dinda Rahma: Terkirim
  await client.query(
    `insert into coaching_assessments (session_id, player_id, coach_id, group_id, scores, active_skill_ids, evaluation, next_practice, published_to_player, status, computed_level)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true, 'submitted', 'Rookie');`,
    [
      sessionId,
      playerIds["Dinda Rahma"],
      coachIds["Lukman"],
      g1Id,
      JSON.stringify({ [skillMap["Forehand"]]: 2, [skillMap["Backhand"]]: 1.5 }),
      defaultSkillIds,
      "Footwork cukup gesit, tinggal perbaiki teknik pegangan raket.",
      "Fokus grip forehand dan backhand dasar.",
    ]
  );

  // Kirana Dewi: Terkirim
  await client.query(
    `insert into coaching_assessments (session_id, player_id, coach_id, group_id, scores, active_skill_ids, evaluation, next_practice, published_to_player, status, computed_level)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true, 'submitted', 'Low Bronze');`,
    [
      sessionId,
      playerIds["Kirana Dewi"],
      coachIds["Lukman"],
      g1Id,
      JSON.stringify({ [skillMap["Forehand"]]: 3.5, [skillMap["Backhand"]]: 3.5, [skillMap["Volley FH"]]: 3 }),
      defaultSkillIds,
      "Permainan solid, transisi menyerang sangat baik.",
      "Tingkatkan akurasi smash dan víbora.",
    ]
  );

  console.log("Coaching demo seed completed!");
  await client.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

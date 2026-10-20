import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found in environment.");
  process.exit(1);
}

const targetDb = process.argv.includes("--prod")
  ? (process.env.MONGODB_DB_PROD || "PROD")
  : (process.env.MONGODB_DB_DEV || "DEV");

if (targetDb === (process.env.MONGODB_DB_PROD || "PROD") && !process.argv.includes("--confirm-prod")) {
  console.error("⛔ PROD database protection active. Pass --confirm-prod if you really intend to index PROD.");
  process.exit(1);
}

async function run() {
  console.log(`🚀 Optimizing MongoDB indexes for database: [${targetDb}]...`);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(targetDb);

  const indexDefinitions = [
    {
      collection: "profiles",
      indexes: [
        { key: { user_id: 1 }, options: { name: "idx_profiles_user_id", unique: true, sparse: true } },
        { key: { player_id: 1 }, options: { name: "idx_profiles_player_id", sparse: true } },
      ],
    },
    {
      collection: "admin_users",
      indexes: [
        { key: { user_id: 1 }, options: { name: "idx_admin_users_user_id", unique: true, sparse: true } },
        { key: { role: 1 }, options: { name: "idx_admin_users_role" } },
      ],
    },
    {
      collection: "auth_users",
      indexes: [
        { key: { email: 1 }, options: { name: "idx_auth_users_email", sparse: true } },
        { key: { id: 1 }, options: { name: "idx_auth_users_id", unique: true, sparse: true } },
      ],
    },
    {
      collection: "matches",
      indexes: [
        { key: { event_id: 1, is_live: 1 }, options: { name: "idx_matches_event_live" } },
        { key: { is_live: 1, updated_at: -1 }, options: { name: "idx_matches_live_updated" } },
        { key: { id: 1 }, options: { name: "idx_matches_id", sparse: true } },
        { key: { event_id: 1, starts_at: 1 }, options: { name: "idx_matches_event_starts" } },
      ],
    },
    {
      collection: "events",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_events_id", sparse: true } },
        { key: { slug: 1 }, options: { name: "idx_events_slug", sparse: true } },
        { key: { status: 1, event_date: -1 }, options: { name: "idx_events_status_date" } },
        { key: { venue_id: 1 }, options: { name: "idx_events_venue_id" } },
        { key: { league_id: 1 }, options: { name: "idx_events_league_id" } },
      ],
    },
    {
      collection: "players",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_players_id", sparse: true } },
        { key: { points: -1 }, options: { name: "idx_players_points" } },
        { key: { name: 1 }, options: { name: "idx_players_name" } },
      ],
    },
    {
      collection: "sessions",
      indexes: [
        { key: { published: 1, date: -1 }, options: { name: "idx_sessions_published_date" } },
      ],
    },
    {
      collection: "classes",
      indexes: [
        { key: { published: 1, date: 1 }, options: { name: "idx_classes_published_date" } },
      ],
    },
    {
      collection: "coaching_sessions",
      indexes: [
        { key: { session_date: -1 }, options: { name: "idx_coaching_sessions_date" } },
        { key: { status: 1 }, options: { name: "idx_coaching_sessions_status" } },
        { key: { event_id: 1 }, options: { name: "idx_coaching_sessions_event_id" } },
      ],
    },
    {
      collection: "league_volumes",
      indexes: [
        { key: { league_id: 1, volume_number: 1 }, options: { name: "idx_league_volumes_league_vol" } },
      ],
    },
    {
      collection: "leagues",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_leagues_id", sparse: true } },
        { key: { slug: 1 }, options: { name: "idx_leagues_slug", sparse: true } },
      ],
    },
    {
      collection: "venues",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_venues_id", sparse: true } },
      ],
    },
    {
      collection: "courts",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_courts_id", sparse: true } },
      ],
    },
  ];

  for (const item of indexDefinitions) {
    const coll = db.collection(item.collection);
    for (const idx of item.indexes) {
      try {
        await coll.createIndex(idx.key, idx.options);
        console.log(`  ✓ ${item.collection} -> ${idx.options.name || JSON.stringify(idx.key)}`);
      } catch (err) {
        console.warn(`  ⚠️ Failed to create index on ${item.collection}: ${err.message}`);
      }
    }
  }

  console.log("✅ All performance indexes created successfully!");
  await client.close();
}

run().catch((err) => {
  console.error("Index creation error:", err);
  process.exit(1);
});

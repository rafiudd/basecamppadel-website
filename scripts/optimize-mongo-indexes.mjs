import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found in environment.");
  process.exit(1);
}

const targetDb = process.argv.includes("--prod")
  ? process.env.MONGODB_DB_PROD || "PROD"
  : process.env.MONGODB_DB_DEV || "DEV";

if (
  targetDb === (process.env.MONGODB_DB_PROD || "PROD") &&
  !process.argv.includes("--confirm-prod")
) {
  console.error(
    "⛔ PROD database protection active. Pass --confirm-prod if you really intend to index PROD."
  );
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
        {
          key: { user_id: 1 },
          options: {
            name: "idx_profiles_user_id",
            unique: true,
            partialFilterExpression: { user_id: { $type: "string" } },
          },
        },
        {
          key: { player_id: 1 },
          options: {
            name: "profiles_player_id_key",
            unique: true,
            partialFilterExpression: { player_id: { $type: "string" } },
          },
        },
        {
          key: { whatsapp: 1 },
          options: {
            name: "profiles_whatsapp_key",
            unique: true,
            partialFilterExpression: { whatsapp: { $type: "string" } },
          },
        },
      ],
    },
    {
      collection: "admin_users",
      indexes: [
        {
          key: { user_id: 1 },
          options: {
            name: "idx_admin_users_user_id",
            unique: true,
            partialFilterExpression: { user_id: { $type: "string" } },
          },
        },
        { key: { role: 1 }, options: { name: "idx_admin_users_role" } },
      ],
    },
    {
      collection: "push_subscriptions",
      indexes: [
        { key: { userId: 1 }, options: { name: "idx_push_subscriptions_user_id", sparse: true } },
        { key: { email: 1 }, options: { name: "idx_push_subscriptions_email", sparse: true } },
      ],
    },
    {
      collection: "auth_users",
      indexes: [
        {
          key: { email: 1 },
          options: {
            name: "idx_auth_users_email",
            unique: true,
            partialFilterExpression: { email: { $type: "string" } },
          },
        },
        {
          key: { id: 1 },
          options: {
            name: "idx_auth_users_id",
            unique: true,
            partialFilterExpression: { id: { $type: "string" } },
          },
        },
      ],
    },
    {
      collection: "matches",
      indexes: [
        { key: { event_id: 1, is_live: 1 }, options: { name: "idx_matches_event_live" } },
        { key: { is_live: 1, updated_at: -1 }, options: { name: "idx_matches_live_updated" } },
        { key: { id: 1 }, options: { name: "idx_matches_id", sparse: true } },
        { key: { event_id: 1, scheduled_order: 1 }, options: { name: "idx_matches_event_order" } },
        {
          key: { court_id: 1 },
          options: {
            name: "matches_one_on_air_per_court",
            unique: true,
            partialFilterExpression: {
              is_live: true,
              court_id: { $type: "string" },
            },
          },
        },
      ],
    },
    {
      collection: "events",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_events_id", sparse: true } },
        {
          key: { slug: 1 },
          options: {
            name: "events_slug_key",
            unique: true,
            partialFilterExpression: { slug: { $type: "string" } },
          },
        },
        { key: { status: 1, event_date: -1 }, options: { name: "idx_events_status_date" } },
        { key: { published: 1, event_date: -1, created_at: -1 }, options: { name: "idx_events_published_date" } },
        { key: { published: 1, status: 1, event_date: 1 }, options: { name: "idx_events_home_next" } },
        { key: { venue_id: 1 }, options: { name: "idx_events_venue_id" } },
        { key: { league_id: 1 }, options: { name: "idx_events_league_id" } },
      ],
    },
    {
      collection: "players",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_players_id", sparse: true } },
        { key: { active: 1, gender: 1, points: -1, name: 1 }, options: { name: "idx_players_active_gender_pts_name" } },
        { key: { active: 1, points: -1, name: 1 }, options: { name: "idx_players_active_pts_name" } },
        { key: { active: 1, name: 1 }, options: { name: "idx_players_active_name" } },
        { key: { points: -1 }, options: { name: "idx_players_points" } },
        { key: { name: 1 }, options: { name: "idx_players_name" } },
        {
          key: { whatsapp: 1 },
          options: {
            name: "players_whatsapp_key",
            unique: true,
            partialFilterExpression: { whatsapp: { $type: "string" } },
          },
        },
        {
          // one of our players per Reclub user (set when an admin confirms a Reclub import)
          key: { reclub_user_id: 1 },
          options: {
            name: "players_reclub_user_id_key",
            unique: true,
            partialFilterExpression: { reclub_user_id: { $type: "number" } },
          },
        },
      ],
    },
    {
      collection: "match_history",
      indexes: [
        { key: { player_id: 1, match_date: -1 }, options: { name: "idx_match_history_player" } },
        { key: { match_id: 1 }, options: { name: "idx_match_history_match" } },
        { key: { event_id: 1 }, options: { name: "idx_match_history_event" } },
      ],
    },
    {
      collection: "player_awards",
      indexes: [
        { key: { player_id: 1 }, options: { name: "idx_player_awards_player" } },
        {
          key: { event_id: 1, player_id: 1 },
          options: {
            name: "player_awards_event_id_player_id_key",
            unique: true,
          },
        },
      ],
    },
    {
      collection: "comp_teams",
      indexes: [
        { key: { event_id: 1 }, options: { name: "idx_comp_teams_event" } },
      ],
    },
    {
      collection: "comp_team_players",
      indexes: [
        { key: { team_id: 1, slot: 1 }, options: { name: "idx_comp_team_players_team_slot" } },
        {
          key: { event_id: 1, player_id: 1 },
          options: {
            name: "comp_team_players_event_id_player_id_key",
            unique: true,
          },
        },
      ],
    },
    {
      collection: "gen_rounds",
      indexes: [
        {
          key: { event_id: 1, round_no: 1 },
          options: {
            name: "gen_rounds_event_id_round_no_key",
            unique: true,
          },
        },
      ],
    },
    {
      collection: "gen_participants",
      indexes: [
        { key: { event_id: 1, player_id: 1 }, options: { name: "idx_gen_participants_event_player" } },
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
        { key: { published: 1, sort_order: 1 }, options: { name: "idx_classes_published_sort" } },
        {
          key: { slug: 1 },
          options: {
            name: "classes_slug_key",
            unique: true,
            partialFilterExpression: { slug: { $type: "string" } },
          },
        },
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
      collection: "coaching_session_players",
      indexes: [
        {
          key: { session_id: 1, player_id: 1 },
          options: {
            name: "coaching_session_players_session_id_player_id_key",
            unique: true,
          },
        },
      ],
    },
    {
      collection: "coaching_assessments",
      indexes: [
        {
          key: { session_id: 1, player_id: 1 },
          options: {
            name: "coaching_assessments_session_id_player_id_key",
            unique: true,
          },
        },
      ],
    },
    {
      collection: "league_volumes",
      indexes: [
        {
          key: { league_id: 1, volume_number: 1 },
          options: {
            name: "league_volumes_league_id_volume_number_key",
            unique: true,
          },
        },
        {
          key: { event_id: 1 },
          options: {
            name: "league_volumes_event_id_key",
            unique: true,
            partialFilterExpression: { event_id: { $type: "string" } },
          },
        },
      ],
    },
    {
      collection: "leagues",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_leagues_id", sparse: true } },
        {
          key: { slug: 1 },
          options: {
            name: "leagues_slug_key",
            unique: true,
            partialFilterExpression: { slug: { $type: "string" } },
          },
        },
      ],
    },
    {
      collection: "venues",
      indexes: [
        { key: { id: 1 }, options: { name: "idx_venues_id", sparse: true } },
        {
          key: { name: 1 },
          options: {
            name: "venues_name_key",
            unique: true,
            partialFilterExpression: { name: { $type: "string" } },
          },
        },
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
        console.log(
          `  ✓ ${item.collection} -> ${idx.options.name || JSON.stringify(idx.key)}`
        );
      } catch (err) {
        if (err.codeName === "IndexOptionsConflict" || err.code === 85 || err.code === 86) {
          try {
            try {
              await coll.dropIndex(idx.options.name);
            } catch {
              await coll.dropIndex(idx.key);
            }
            await coll.createIndex(idx.key, idx.options);
            console.log(`  ↻ Recreated ${item.collection} -> ${idx.options.name}`);
          } catch (dropErr) {
            console.warn(
              `  ⚠️ Failed to recreate index on ${item.collection}: ${dropErr.message}`
            );
          }
        } else {
          console.warn(
            `  ⚠️ Failed to create index on ${item.collection}: ${err.message}`
          );
        }
      }
    }
  }

  console.log("✅ All unique & performance indexes created successfully!");
  await client.close();
}

run().catch((err) => {
  console.error("Index creation error:", err);
  process.exit(1);
});

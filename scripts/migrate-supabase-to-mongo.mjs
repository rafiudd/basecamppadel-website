#!/usr/bin/env node
/**
 * Basecamp Padel — Supabase to MongoDB Migration Script
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-supabase-to-mongo.mjs                  # Migrasi ke DEV (default)
 *   node --env-file=.env scripts/migrate-supabase-to-mongo.mjs --target=dev    # Migrasi ke DEV
 *   node --env-file=.env scripts/migrate-supabase-to-mongo.mjs --target=prod --confirm-prod  # Migrasi ke PROD
 *
 * Flags:
 *   --target=<dev|prod>       Pilih target database (default: dev)
 *   --confirm-prod            Wajib disertakan jika target=prod (safety lock)
 *   --drop                    Drop koleksi tujuan sebelum import
 *   --dry-run                 Hanya baca dan tampilkan preview tanpa menulis ke Mongo
 *   --table=<name>            Migrasi satu tabel saja (cth: --table=players)
 *   --batch-size=<num>        Jumlah baris per batch (default: 500)
 */

import { MongoClient } from "mongodb";
import pg from "pg";

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const target = (getArg("target") || "dev").toLowerCase();
const isProd = target === "prod";
const confirmProd = hasFlag("confirm-prod");
const shouldDrop = hasFlag("drop");
const isDryRun = hasFlag("dry-run");
const specificTable = getArg("table");
const batchSize = parseInt(getArg("batch-size") || "500", 10);

console.log("\n==================================================");
console.log("🚀 MIGRATION: SUPABASE (Postgres) ➔ MONGODB ATLAS");
console.log("==================================================");

// Safety Lock untuk PROD:
if (isProd && !confirmProd) {
  console.error("\n❌ ERROR: Target adalah PROD!");
  console.error("⚠️ Sesuai permintaan, migrasi ke PROD dikunci (jangan dimigrasi dulu).");
  console.error("💡 Jalankan migrasi ke DEV terlebih dahulu:");
  console.error("   npm run db:mongo:migrate:dev\n");
  process.exit(1);
}

// Resolve Database Configuration
const supabaseUrl = process.env.SUPABASE_DB_URL;
const mongoUri = process.env.MONGODB_URI;

if (!supabaseUrl) {
  console.error("❌ SUPABASE_DB_URL tidak ditemukan di environment (.env).");
  process.exit(1);
}

if (!mongoUri) {
  console.error("❌ MONGODB_URI tidak ditemukan di environment (.env).");
  process.exit(1);
}

const targetDbName = isProd
  ? process.env.MONGODB_DB_PROD || "PROD"
  : process.env.MONGODB_DB_DEV || "DEV";

console.log(`📌 Target Environment : ${target.toUpperCase()}`);
console.log(`📌 Target MongoDB DB  : ${targetDbName}`);
console.log(`📌 Mode               : ${isDryRun ? "DRY-RUN (Simulasi)" : shouldDrop ? "DROP & REPLACE" : "UPSERT (Idempotent)"}`);
if (specificTable) console.log(`📌 Filter Tabel       : ${specificTable}`);
console.log("--------------------------------------------------\n");

async function run() {
  const startTime = Date.now();

  // 1. Connect to Postgres (Supabase)
  const pgClient = new pg.Client({
    connectionString: supabaseUrl,
    ssl: /localhost|127\.0\.0\.1/.test(supabaseUrl) ? false : { rejectUnauthorized: false },
  });
  await pgClient.connect();
  console.log("✓ Berhasil terhubung ke Supabase Postgres");

  // 2. Connect to MongoDB
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db(targetDbName);
  console.log(`✓ Berhasil terhubung ke MongoDB Atlas [${targetDbName}]`);

  try {
    // 3. Ambil daftar primary keys untuk tiap tabel di public schema
    const pkRes = await pgClient.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `);
    const primaryKeys = {};
    for (const r of pkRes.rows) {
      if (!primaryKeys[r.table_name]) primaryKeys[r.table_name] = [];
      primaryKeys[r.table_name].push(r.column_name);
    }

    // 4. Ambil index unik dari public schema
    const indexRes = await pgClient.query(`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        a.attname AS column_name
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.relname, i.relname, a.attnum;
    `);
    const tableIndexes = {};
    for (const r of indexRes.rows) {
      if (!tableIndexes[r.table_name]) tableIndexes[r.table_name] = {};
      if (!tableIndexes[r.table_name][r.index_name]) {
        tableIndexes[r.table_name][r.index_name] = {
          name: r.index_name,
          unique: r.is_unique,
          columns: [],
        };
      }
      tableIndexes[r.table_name][r.index_name].columns.push(r.column_name);
    }
    // Konversi map objek ke array index per tabel
    for (const tbl of Object.keys(tableIndexes)) {
      tableIndexes[tbl] = Object.values(tableIndexes[tbl]);
    }

    // 5. Ambil daftar tabel yang akan dimigrasikan
    let tablesToMigrate = [];
    if (specificTable) {
      tablesToMigrate = [specificTable];
    } else {
      const publicTablesRes = await pgClient.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      tablesToMigrate = publicTablesRes.rows.map((r) => r.table_name);

      // Tambahkan auth tables jika ada akses
      try {
        const authCheck = await pgClient.query("SELECT 1 FROM auth.users LIMIT 1;");
        if (authCheck) {
          tablesToMigrate.push("auth.users");
          tablesToMigrate.push("auth.identities");
        }
      } catch {
        // auth schema tidak bisa diakses langsung, lewati
      }
    }

    console.log(`\n📦 Total objek/tabel untuk dimigrasi: ${tablesToMigrate.length}`);
    console.log("--------------------------------------------------");

    const results = [];

    for (const tbl of tablesToMigrate) {
      const isAuthTable = tbl.startsWith("auth.");
      const schema = isAuthTable ? "auth" : "public";
      const rawTableName = isAuthTable ? tbl.split(".")[1] : tbl;
      const mongoCollName = isAuthTable ? `auth_${rawTableName}` : tbl;

      const coll = db.collection(mongoCollName);

      // Hitung total baris di Postgres
      const countRes = await pgClient.query(`SELECT count(*)::int as c FROM "${schema}"."${rawTableName}"`);
      const totalPgRows = countRes.rows[0].c;

      process.stdout.write(`→ [${tbl.padEnd(25)}] PG: ${String(totalPgRows).padStart(4)} baris … `);

      if (totalPgRows === 0) {
        if (!isDryRun && shouldDrop) {
          await coll.drop().catch(() => {});
        }
        console.log("dilewati (0 data)");
        results.push({ table: tbl, pgCount: 0, mongoCount: 0, status: "EMPTY" });
        continue;
      }

      if (isDryRun) {
        console.log("dry-run ok");
        results.push({ table: tbl, pgCount: totalPgRows, mongoCount: 0, status: "DRY-RUN" });
        continue;
      }

      if (shouldDrop) {
        await coll.drop().catch(() => {});
      }

      // Query data dengan streaming / batching
      const pks = primaryKeys[rawTableName] || (isAuthTable ? ["id"] : ["id"]);
      const selectQuery = `SELECT * FROM "${schema}"."${rawTableName}"`;
      const dataRes = await pgClient.query(selectQuery);
      const rows = dataRes.rows;

      // Transform data rows ke dokumen MongoDB
      const documents = rows.map((row) => {
        const doc = { ...row };

        // Tentukan _id yang konsisten
        if (pks.length === 1) {
          doc._id = row[pks[0]];
        } else if (pks.length > 1) {
          doc._id = pks.map((k) => row[k]).join("_");
        } else {
          doc._id = row.id || row.user_id || undefined;
        }

        // Pastikan Date objects tetap valid
        for (const [key, value] of Object.entries(doc)) {
          if (value instanceof Date) {
            // MongoDB native BSON Date
            doc[key] = value;
          }
        }

        return doc;
      });

      // Simpan ke MongoDB secara batch menggunakan bulkWrite (upsert)
      let insertedOrUpdated = 0;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const operations = batch.map((doc) => {
          if (doc._id) {
            return {
              replaceOne: {
                filter: { _id: doc._id },
                replacement: doc,
                upsert: true,
              },
            };
          }
          return {
            insertOne: {
              document: doc,
            },
          };
        });

        const bulkResult = await coll.bulkWrite(operations, { ordered: false });
        insertedOrUpdated += (bulkResult.upsertedCount || 0) + (bulkResult.modifiedCount || 0) + (bulkResult.insertedCount || 0);
      }

      // Buat Index di MongoDB sesuai index Postgres
      if (!isAuthTable && tableIndexes[rawTableName]) {
        for (const idx of tableIndexes[rawTableName]) {
          // Lewati index pkey jika hanya _id
          if (idx.columns.length === 1 && (idx.columns[0] === "id" || idx.columns[0] === pks[0])) {
            continue;
          }
          const indexSpec = {};
          idx.columns.forEach((col) => {
            indexSpec[col] = 1;
          });
          try {
            await coll.createIndex(indexSpec, {
              unique: idx.unique,
              sparse: idx.unique, // sparse untuk mencegah error duplicate null
              name: `idx_${idx.name}`,
            });
          } catch {
            // Abaikan jika index sudah ada atau constraint beda format
          }
        }
      }

      const totalMongo = await coll.countDocuments();
      const isSuccess = totalMongo >= totalPgRows;
      console.log(`ok (${totalMongo} dokumen di Mongo)`);

      results.push({
        table: tbl,
        pgCount: totalPgRows,
        mongoCount: totalMongo,
        status: isSuccess ? "SUCCESS" : "MISMATCH",
      });
    }

    // Tampilkan Tabel Rekapitulasi
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n==================================================");
    console.log("📊 REKAPITULASI HASIL MIGRASI");
    console.log("==================================================");
    console.table(
      results.map((r) => ({
        "Tabel / Koleksi": r.table,
        "Supabase (PG)": r.pgCount,
        "MongoDB Atlas": r.mongoCount,
        Status: r.status === "SUCCESS" ? "✅ SUKSES" : r.status === "EMPTY" ? "⚪ KOSONG" : "⚠️ CEK",
      }))
    );

    const totalMigratedPg = results.reduce((acc, r) => acc + r.pgCount, 0);
    const totalMigratedMongo = results.reduce((acc, r) => acc + r.mongoCount, 0);
    console.log(`\n🎉 Migrasi selesai dalam ${elapsedSeconds} detik!`);
    console.log(`📦 Total baris Supabase: ${totalMigratedPg} | Total dokumen di Mongo: ${totalMigratedMongo}`);
    console.log(`🎯 Database target: ${targetDbName} (${target.toUpperCase()})\n`);

  } finally {
    await pgClient.end();
    await mongoClient.close();
  }
}

run().catch((err) => {
  console.error("\n❌ Fatal error saat migrasi:", err);
  process.exit(1);
});

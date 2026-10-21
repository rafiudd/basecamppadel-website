#!/usr/bin/env node
/**
 * Script untuk membuat atau memperbarui user Admin / Coach di MongoDB.
 *
 * Penggunaan:
 *   node --env-file=.env scripts/create-mongo-admin.mjs
 *   node --env-file=.env scripts/create-mongo-admin.mjs --email=coach@basecamppadel.com --password=secret --role=coach
 *   node --env-file=.env scripts/create-mongo-admin.mjs --target=prod --email=admin@basecamppadel.com --password=secret
 */

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};

const target = getArg("target") || (process.env.MONGODB_DB_NAME === "PROD" ? "prod" : "dev");
const dbName = target === "prod" ? (process.env.MONGODB_DB_PROD || "PROD") : (process.env.MONGODB_DB_DEV || "DEV");

const email = (getArg("email") || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const password = getArg("password") || process.env.ADMIN_PASSWORD || "";
const role = getArg("role") || "admin";
const coachId = getArg("coach_id") || null;

if (!email || !password) {
  console.error("❌ Email dan password harus diisi lewat argumen (--email=... --password=...) atau di .env (ADMIN_EMAIL, ADMIN_PASSWORD)");
  process.exit(1);
}

if (role !== "admin" && role !== "coach") {
  console.error("❌ Role harus 'admin' atau 'coach'");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI belum di-set di environment.");
  process.exit(1);
}

console.log(`\n========================================`);
console.log(`  Basecamp Padel — Mongo Admin / Coach`);
console.log(`========================================`);
console.log(`Target Database : ${dbName}`);
console.log(`Email           : ${email}`);
console.log(`Role            : ${role}`);
if (coachId) console.log(`Coach ID        : ${coachId}`);

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db(dbName);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let existingUser = await db.collection("auth_users").findOne({ email });
    let userId = existingUser ? String(existingUser.id || existingUser._id) : crypto.randomUUID();

    if (existingUser) {
      await db.collection("auth_users").updateOne(
        { $or: [{ _id: userId }, { id: userId }] },
        {
          $set: {
            encrypted_password: hashedPassword,
            updated_at: new Date(),
          },
        }
      );
      console.log(`\n✓ Password user auth_users (${email}) berhasil diperbarui.`);
    } else {
      await db.collection("auth_users").insertOne({
        _id: userId,
        id: userId,
        email,
        encrypted_password: hashedPassword,
        role: "authenticated",
        raw_user_meta_data: {
          name: email.split("@")[0],
        },
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`\n✓ User baru auth_users (${email}) berhasil dibuat.`);
    }

    // Upsert admin_users
    await db.collection("admin_users").updateOne(
      { $or: [{ user_id: userId }, { _id: userId }] },
      {
        $set: {
          user_id: userId,
          role,
          coach_id: coachId,
          updated_at: new Date(),
        },
        $setOnInsert: {
          _id: userId,
          created_at: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`✓ Data admin_users (${role}) berhasil disimpan.`);
    console.log(`\n✅ Selesai! Anda sekarang dapat login di /admin/login`);
    console.log(`   Email: ${email}`);
  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err);
  } finally {
    await client.close();
  }
}

run();


"use server";

import { guard, str } from "@/lib/server/action";
import type { ActionState } from "@/lib/actionState";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ==========================================
// 1. SUPER ADMIN MANAGEMENT
// ==========================================

export async function createAdminUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const name = str(fd, "name");
    const email = str(fd, "email").toLowerCase().trim();
    const password = str(fd, "password");

    if (!name || !email || !password) {
      throw new Error("Nama, email, dan password wajib diisi.");
    }
    if (password.length < 6) {
      throw new Error("Password minimal 6 karakter.");
    }

    const db = await getDb();
    const existing = await db.collection("auth_users").findOne({ email });
    if (existing) {
      const existingAdmin = await db.collection("admin_users").findOne({
        $or: [{ user_id: String(existing.id || existing._id) }, { _id: String(existing.id || existing._id) }],
      } as any);
      if (existingAdmin) {
        throw new Error("Pengguna dengan email ini sudah terdaftar sebagai admin/staf.");
      }
    }

    const userId = existing ? String(existing.id || existing._id) : crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      await db.collection("auth_users").updateOne(
        { _id: existing._id },
        {
          $set: {
            encrypted_password: hashedPassword,
            "raw_user_meta_data.name": name,
            "raw_user_meta_data.full_name": name,
            updated_at: new Date(),
          },
        }
      );
    } else {
      await db.collection("auth_users").insertOne({
        _id: userId,
        id: userId,
        email,
        encrypted_password: hashedPassword,
        role: "authenticated",
        raw_user_meta_data: {
          name,
          full_name: name,
          email,
        },
        created_at: new Date(),
        updated_at: new Date(),
      } as any);
    }

    const adminId = crypto.randomUUID();
    await db.collection("admin_users").insertOne({
      _id: adminId,
      id: adminId,
      user_id: userId,
      role: "admin",
      name,
      active: true,
      created_at: new Date().toISOString(),
    } as any);

    revalidatePath("/admin/users/admin");
  });
}

export async function updateAdminUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const adminId = str(fd, "id");
    const name = str(fd, "name");
    const password = str(fd, "password");

    if (!adminId || !name) {
      throw new Error("ID dan nama wajib diisi.");
    }

    const db = await getDb();
    const adminRow = await db.collection("admin_users").findOne({
      $or: [{ _id: adminId }, { id: adminId }],
    } as any);

    if (!adminRow) {
      throw new Error("Data admin tidak ditemukan.");
    }

    await db.collection("admin_users").updateOne(
      { _id: adminRow._id },
      { $set: { name } }
    );

    const userId = adminRow.user_id || String(adminRow._id);
    const updateAuth: Record<string, any> = {
      "raw_user_meta_data.name": name,
      "raw_user_meta_data.full_name": name,
      updated_at: new Date(),
    };

    if (password) {
      if (password.length < 6) throw new Error("Password minimal 6 karakter.");
      updateAuth.encrypted_password = await bcrypt.hash(password, 10);
    }

    await db.collection("auth_users").updateOne(
      { $or: [{ _id: userId }, { id: userId }] } as any,
      { $set: updateAuth }
    );

    revalidatePath("/admin/users/admin");
  });
}

export async function deleteAdminUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const currentUser = await requireAdmin();
    const adminId = str(fd, "id");

    if (!adminId) throw new Error("ID admin tidak valid.");

    const db = await getDb();
    const adminRow = await db.collection("admin_users").findOne({
      $or: [{ _id: adminId }, { id: adminId }],
    } as any);

    if (!adminRow) throw new Error("Admin tidak ditemukan.");

    const targetUserId = String(adminRow.user_id || adminRow._id);
    if (targetUserId === currentUser.id) {
      throw new Error("Anda tidak dapat menghapus akun admin yang sedang Anda gunakan.");
    }

    // Pastikan tidak menghapus jika hanya tersisa 1 admin
    const totalAdmins = await db.collection("admin_users").countDocuments({ role: "admin" });
    if (totalAdmins <= 1) {
      throw new Error("Tidak dapat menghapus super admin terakhir.");
    }

    await db.collection("admin_users").deleteOne({ _id: adminRow._id });
    // Optionally delete from auth_users if no profile attached
    const hasProfile = await db.collection("profiles").findOne({
      $or: [{ _id: targetUserId }, { user_id: targetUserId }],
    } as any);

    if (!hasProfile) {
      await db.collection("auth_users").deleteOne({
        $or: [{ _id: targetUserId }, { id: targetUserId }] as any,
      });
    }

    revalidatePath("/admin/users/admin");
  });
}

// ==========================================
// 2. SCORE KEEPER MANAGEMENT
// ==========================================

export async function createScoreKeeper(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const name = str(fd, "name");
    const email = str(fd, "email").toLowerCase().trim();
    const password = str(fd, "password");

    if (!name || !email || !password) {
      throw new Error("Nama, email, dan password wajib diisi.");
    }
    if (password.length < 6) {
      throw new Error("Password minimal 6 karakter.");
    }

    const db = await getDb();
    const existing = await db.collection("auth_users").findOne({ email });
    if (existing) {
      const existingStaff = await db.collection("admin_users").findOne({
        $or: [{ user_id: String(existing.id || existing._id) }, { _id: String(existing.id || existing._id) }],
      } as any);
      if (existingStaff) {
        throw new Error("Pengguna dengan email ini sudah memiliki hak akses di sistem.");
      }
    }

    const userId = existing ? String(existing.id || existing._id) : crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      await db.collection("auth_users").updateOne(
        { _id: existing._id },
        {
          $set: {
            encrypted_password: hashedPassword,
            "raw_user_meta_data.name": name,
            "raw_user_meta_data.full_name": name,
            updated_at: new Date(),
          },
        }
      );
    } else {
      await db.collection("auth_users").insertOne({
        _id: userId,
        id: userId,
        email,
        encrypted_password: hashedPassword,
        role: "authenticated",
        raw_user_meta_data: {
          name,
          full_name: name,
          email,
        },
        created_at: new Date(),
        updated_at: new Date(),
      } as any);
    }

    const skId = crypto.randomUUID();
    await db.collection("admin_users").insertOne({
      _id: skId,
      id: skId,
      user_id: userId,
      role: "scorekeeper",
      name,
      active: true,
      created_at: new Date().toISOString(),
    } as any);

    revalidatePath("/admin/users/scorekeeper");
  });
}

export async function updateScoreKeeper(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const id = str(fd, "id");
    const name = str(fd, "name");
    const password = str(fd, "password");
    const active = fd.get("active") === "on";

    if (!id || !name) throw new Error("ID dan nama wajib diisi.");

    const db = await getDb();
    const row = await db.collection("admin_users").findOne({
      $or: [{ _id: id }, { id }],
      role: "scorekeeper",
    } as any);

    if (!row) throw new Error("Score keeper tidak ditemukan.");

    await db.collection("admin_users").updateOne(
      { _id: row._id },
      { $set: { name, active } }
    );

    const userId = row.user_id || String(row._id);
    const updateAuth: Record<string, any> = {
      "raw_user_meta_data.name": name,
      "raw_user_meta_data.full_name": name,
      updated_at: new Date(),
    };

    if (password) {
      if (password.length < 6) throw new Error("Password minimal 6 karakter.");
      updateAuth.encrypted_password = await bcrypt.hash(password, 10);
    }

    await db.collection("auth_users").updateOne(
      { $or: [{ _id: userId }, { id: userId }] } as any,
      { $set: updateAuth }
    );

    revalidatePath("/admin/users/scorekeeper");
  });
}

export async function deleteScoreKeeper(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const id = str(fd, "id");
    if (!id) throw new Error("ID tidak valid.");

    const db = await getDb();
    const row = await db.collection("admin_users").findOne({
      $or: [{ _id: id }, { id }],
      role: "scorekeeper",
    } as any);

    if (!row) throw new Error("Score keeper tidak ditemukan.");

    const userId = String(row.user_id || row._id);
    await db.collection("admin_users").deleteOne({ _id: row._id });

    // Hapus dari auth_users jika tidak memiliki relasi lain
    const hasProfile = await db.collection("profiles").findOne({
      $or: [{ _id: userId }, { user_id: userId }],
    } as any);
    if (!hasProfile) {
      await db.collection("auth_users").deleteOne({
        $or: [{ _id: userId }, { id: userId }] as any,
      });
    }

    revalidatePath("/admin/users/scorekeeper");
  });
}

// ==========================================
// 3. COACH MANAGEMENT
// ==========================================

export async function upsertCoachUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const coachId = str(fd, "id");
    const name = str(fd, "name");
    const active = fd.get("active") === "on";
    const email = str(fd, "email").toLowerCase().trim();
    const password = str(fd, "password");

    if (!name) throw new Error("Nama coach wajib diisi.");

    const db = await getDb();
    const targetCoachId = coachId || crypto.randomUUID();

    let authUserId: string | null = null;

    if (email) {
      // Manage or create login account for this coach
      const existingUser = await db.collection("auth_users").findOne({ email });
      if (existingUser) {
        authUserId = String(existingUser.id || existingUser._id);
        const updateAuth: Record<string, any> = {
          "raw_user_meta_data.name": name,
          "raw_user_meta_data.full_name": name,
          updated_at: new Date(),
        };
        if (password) {
          if (password.length < 6) throw new Error("Password minimal 6 karakter.");
          updateAuth.encrypted_password = await bcrypt.hash(password, 10);
        }
        await db.collection("auth_users").updateOne({ _id: existingUser._id }, { $set: updateAuth });
      } else {
        if (!password) {
          throw new Error("Password wajib diisi untuk pembuatan akun coach baru.");
        }
        if (password.length < 6) throw new Error("Password minimal 6 karakter.");
        authUserId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.collection("auth_users").insertOne({
          _id: authUserId,
          id: authUserId,
          email,
          encrypted_password: hashedPassword,
          role: "authenticated",
          raw_user_meta_data: { name, full_name: name, email },
          created_at: new Date(),
          updated_at: new Date(),
        } as any);
      }

      // Upsert into admin_users with role: "coach" & coach_id
      const existingAdminCoach = await db.collection("admin_users").findOne({ coach_id: targetCoachId });
      if (existingAdminCoach) {
        await db.collection("admin_users").updateOne(
          { _id: existingAdminCoach._id },
          { $set: { user_id: authUserId, name, active, role: "coach" } }
        );
      } else {
        await db.collection("admin_users").insertOne({
          _id: crypto.randomUUID(),
          id: crypto.randomUUID(),
          user_id: authUserId,
          coach_id: targetCoachId,
          role: "coach",
          name,
          active,
          created_at: new Date().toISOString(),
        } as any);
      }
    }

    if (coachId) {
      const updateData: Record<string, any> = { name, active };
      if (authUserId) updateData.user_id = authUserId;
      await db.collection("coaches").updateOne(
        { $or: [{ _id: coachId }, { id: coachId }] } as any,
        { $set: updateData }
      );
    } else {
      await db.collection("coaches").insertOne({
        _id: targetCoachId,
        id: targetCoachId,
        name,
        active,
        user_id: authUserId,
        created_at: new Date().toISOString(),
      } as any);
    }

    revalidatePath("/admin/users/coach");
    revalidatePath("/admin/coaching");
  });
}

export async function unlinkCoachLogin(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const coachId = str(fd, "id");
    if (!coachId) throw new Error("ID coach tidak valid.");

    const db = await getDb();
    await db.collection("admin_users").deleteMany({ coach_id: coachId });
    await db.collection("coaches").updateOne(
      { $or: [{ _id: coachId }, { id: coachId }] } as any,
      { $set: { user_id: null } }
    );

    revalidatePath("/admin/users/coach");
    revalidatePath("/admin/coaching");
  });
}

export async function deleteCoach(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const coachId = str(fd, "id");
    if (!coachId) throw new Error("ID coach tidak valid.");

    const db = await getDb();

    // Check if coach has session groups
    const sessionsUsingCoach = await db.collection("coaching_groups").countDocuments({ coach_id: coachId });
    if (sessionsUsingCoach > 0) {
      // Soft-delete (nonaktifkan) daripada merusak relasi histori coaching
      await db.collection("coaches").updateOne(
        { $or: [{ _id: coachId }, { id: coachId }] } as any,
        { $set: { active: false } }
      );
      await db.collection("admin_users").updateOne(
        { coach_id: coachId },
        { $set: { active: false } }
      );
      revalidatePath("/admin/users/coach");
      revalidatePath("/admin/coaching");
      return;
    }

    await db.collection("admin_users").deleteMany({ coach_id: coachId });
    await db.collection("coaches").deleteOne({ $or: [{ _id: coachId }, { id: coachId }] } as any);

    revalidatePath("/admin/users/coach");
    revalidatePath("/admin/coaching");
  });
}

// ==========================================
// 4. PLAYER LOGIN MANAGEMENT
// ==========================================

export async function createPlayerLogin(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const playerId = str(fd, "player_id");
    const email = str(fd, "email").toLowerCase().trim();
    const password = str(fd, "password");

    if (!playerId || !email || !password) {
      throw new Error("Data pemain, email, dan password wajib diisi.");
    }
    if (password.length < 6) {
      throw new Error("Password minimal 6 karakter.");
    }

    const db = await getDb();
    const player = await db.collection("players").findOne({
      $or: [{ _id: playerId }, { id: playerId }],
    } as any);

    if (!player) throw new Error("Data pemain tidak ditemukan.");

    // Check if player is already linked to a profile
    const existingProfileForPlayer = await db.collection("profiles").findOne({ player_id: playerId });
    if (existingProfileForPlayer) {
      throw new Error(`Pemain ini sudah tersambung ke akun ${existingProfileForPlayer.email}.`);
    }

    // Check auth_users by email
    const existingUser = await db.collection("auth_users").findOne({ email });
    let userId: string;

    if (existingUser) {
      userId = String(existingUser.id || existingUser._id);
      // Ensure this user is not already linked to another player
      const existingUserProf = await db.collection("profiles").findOne({
        $or: [{ _id: userId }, { user_id: userId }],
      } as any);
      if (existingUserProf?.player_id) {
        throw new Error(`Akun ${email} sudah terhubung ke pemain lain.`);
      }

      // Update password
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.collection("auth_users").updateOne(
        { _id: existingUser._id },
        { $set: { encrypted_password: hashedPassword, updated_at: new Date() } }
      );

      // Link profile to player
      if (existingUserProf) {
        await db.collection("profiles").updateOne(
          { _id: existingUserProf._id },
          { $set: { player_id: playerId, updated_at: new Date().toISOString() } }
        );
      } else {
        await db.collection("profiles").insertOne({
          _id: userId,
          user_id: userId,
          email,
          full_name: player.name,
          nickname: player.name,
          gender: player.gender || "M",
          whatsapp: player.whatsapp || "",
          region: player.region || "Purwokerto",
          player_id: playerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
    } else {
      userId = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(password, 10);

      await db.collection("auth_users").insertOne({
        _id: userId,
        id: userId,
        email,
        encrypted_password: hashedPassword,
        role: "authenticated",
        raw_user_meta_data: {
          name: player.name,
          full_name: player.name,
          email,
        },
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      await db.collection("profiles").insertOne({
        _id: userId,
        user_id: userId,
        email,
        full_name: player.name,
        nickname: player.name,
        gender: player.gender || "M",
        whatsapp: player.whatsapp || "",
        region: player.region || "Purwokerto",
        player_id: playerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    revalidatePath("/admin/players");
  });
}

export async function resetPlayerPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const playerId = str(fd, "player_id");
    const password = str(fd, "password");

    if (!playerId || !password) throw new Error("Data pemain dan password baru wajib diisi.");
    if (password.length < 6) throw new Error("Password minimal 6 karakter.");

    const db = await getDb();
    const profile = await db.collection("profiles").findOne({ player_id: playerId });
    if (!profile) throw new Error("Pemain belum tersambung ke akun manapun.");

    const userId = String(profile.user_id || profile._id);
    const hashedPassword = await bcrypt.hash(password, 10);

    const res = await db.collection("auth_users").updateOne(
      { $or: [{ _id: userId }, { id: userId }] } as any,
      { $set: { encrypted_password: hashedPassword, updated_at: new Date() } }
    );

    if (res.matchedCount === 0) {
      throw new Error("Akun autentikasi untuk pemain ini tidak ditemukan.");
    }

    revalidatePath("/admin/players");
  });
}

export async function unlinkPlayerAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const playerId = str(fd, "player_id");
    if (!playerId) throw new Error("ID pemain tidak valid.");

    const db = await getDb();
    await db.collection("profiles").updateMany(
      { player_id: playerId },
      { $set: { player_id: null, updated_at: new Date().toISOString() } }
    );

    revalidatePath("/admin/players");
  });
}

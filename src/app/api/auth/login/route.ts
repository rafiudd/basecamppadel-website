import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { setSessionCookie } from "@/lib/server/session";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const db = await getDb();

    const user = await db.collection("auth_users").findOne({ email: cleanEmail });
    if (!user || !user.encrypted_password) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.encrypted_password);
    if (!match) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    const userId = String(user.id || user._id);
    const adminRow = await db.collection("admin_users").findOne({
      $or: [{ user_id: userId }, { _id: userId }],
    } as any);

    if (!adminRow || (adminRow.role !== "admin" && adminRow.role !== "coach")) {
      return NextResponse.json(
        { error: "Akun Anda tidak memiliki hak akses admin atau coach." },
        { status: 403 }
      );
    }

    await setSessionCookie({
      id: userId,
      email: user.email,
      role: adminRow.role,
      coach_id: adminRow.coach_id || null,
      user_metadata: user.raw_user_meta_data || {},
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        role: adminRow?.role || null,
      },
    });
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server saat login." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { setSessionCookie } from "@/lib/server/session";
import bcrypt from "bcryptjs";
import { staffLoginError, staffRole } from "@/lib/accountRules";

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

    const role = staffRole(adminRow);
    if (!adminRow || !role) {
      return NextResponse.json({ error: staffLoginError(adminRow) }, { status: 403 });
    }

    await setSessionCookie({
      id: userId,
      email: user.email,
      role,
      coach_id: adminRow.coach_id || null,
      user_metadata: user.raw_user_meta_data || {},
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        role,
      },
    });
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server saat login." }, { status: 500 });
  }
}

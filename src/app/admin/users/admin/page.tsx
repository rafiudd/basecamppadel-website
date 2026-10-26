import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { AdminUsersClient } from "@/components/admin/users/AdminUsersClient";
import type { AdminUserItem } from "@/components/admin/users/AdminUserForm";

export const metadata = { title: "Super Admin — Basecamp Padel" };

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();

  const db = await getDb();
  const adminDocs = await db
    .collection("admin_users")
    .find({ role: "admin" })
    .sort({ created_at: -1 })
    .toArray();

  const userIds = adminDocs.map((a) => a.user_id || String(a._id));
  const authUsers = await db
    .collection("auth_users")
    .find({
      $or: [{ id: { $in: userIds } }, { _id: { $in: userIds } }],
    } as any)
    .toArray();

  const authUserMap = new Map<string, any>();
  for (const u of authUsers) {
    if (u.id) authUserMap.set(String(u.id), u);
    if (u._id) authUserMap.set(String(u._id), u);
  }

  const admins: AdminUserItem[] = adminDocs.map((doc) => {
    const uid = String(doc.user_id || doc._id);
    const auth = authUserMap.get(uid);
    return {
      id: String(doc.id || doc._id),
      user_id: uid,
      name: doc.name || auth?.raw_user_meta_data?.name || auth?.email?.split("@")[0] || "Admin",
      email: auth?.email || "-",
      created_at: doc.created_at || (auth?.created_at ? new Date(auth.created_at).toISOString() : new Date().toISOString()),
    };
  });

  return (
    <AdminUsersClient
      admins={admins}
      currentUserId={currentUser.id}
    />
  );
}

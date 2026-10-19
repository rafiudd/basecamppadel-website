"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guard, str, int } from "@/lib/server/action";

/** Public booking action */
export async function bookClass(prevState: any, fd: FormData): Promise<{ error?: string; success?: boolean }> {
  const classId = str(fd, "class_id");
  const scheduleId = str(fd, "schedule_id");
  const name = str(fd, "name");
  const phone = str(fd, "phone");
  const slug = str(fd, "slug");

  if (!classId || !scheduleId || !name || !phone) {
    return { error: "Nama dan nomor WhatsApp wajib diisi" };
  }

  const res = await guard(async () => {
    const supabase = await createClient();

    // Check if slot still available
    const { data: schedule } = await supabase
      .from("class_schedules")
      .select("custom_capacity, classes (capacity)")
      .eq("id", scheduleId)
      .single();

    const cap = schedule?.custom_capacity || (schedule?.classes as any)?.capacity || 4;

    const { count } = await supabase
      .from("class_participants")
      .select("*", { count: "exact", head: true })
      .eq("schedule_id", scheduleId);

    if ((count || 0) >= cap) {
      throw new Error("Maaf, kuota untuk jadwal ini sudah penuh.");
    }

    const { error } = await supabase.from("class_participants").insert({
      class_id: classId,
      schedule_id: scheduleId,
      name,
      phone,
      payment_status: "pending",
    });

    if (error) throw error;

    revalidatePath(`/kelas/${slug}`);
    revalidatePath("/kelas");
  });

  if (res && res.error) {
    return res;
  }

  return { success: true };
}

/** Public comment submission */
export async function postClassComment(prevState: any, fd: FormData): Promise<{ error?: string; success?: boolean }> {
  const classId = str(fd, "class_id");
  const authorName = str(fd, "author_name") || "Tamu";
  const comment = str(fd, "comment");
  const slug = str(fd, "slug");

  if (!classId || !comment) {
    return { error: "Pertanyaan atau komentar tidak boleh kosong" };
  }

  const res = await guard(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("class_comments").insert({
      class_id: classId,
      author_name: authorName,
      comment,
    });
    if (error) throw error;

    revalidatePath(`/kelas/${slug}`);
  });

  if (res && res.error) return res;
  return { success: true };
}

/** Public review submission */
export async function postClassReview(prevState: any, fd: FormData): Promise<{ error?: string; success?: boolean }> {
  const classId = str(fd, "class_id");
  const authorName = str(fd, "author_name");
  const rating = int(fd, "rating", 5);
  const content = str(fd, "content");
  const slug = str(fd, "slug");

  if (!classId || !authorName || !content) {
    return { error: "Nama dan isi ulasan wajib diisi" };
  }

  const res = await guard(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("class_reviews").insert({
      class_id: classId,
      author_name: authorName,
      rating,
      content,
    });
    if (error) throw error;

    revalidatePath(`/kelas/${slug}`);
    revalidatePath("/kelas");
  });

  if (res && res.error) return res;
  return { success: true };
}

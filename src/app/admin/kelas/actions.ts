"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { guard, str, int, intOrNull } from "@/lib/server/action";
import type { ClassCategory } from "@/lib/database.types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Create or update a class */
export async function saveClass(prevState: any, fd: FormData) {
  const id = str(fd, "id");
  const title = str(fd, "title");
  const category = (str(fd, "category") || "teknik") as ClassCategory;
  const description = str(fd, "description");
  const suitablePins = fd.getAll("pins").map(String);
  const totalSessions = int(fd, "total_sessions", 1);
  const durationPerSession = int(fd, "duration_per_session", 90);
  const capacity = int(fd, "capacity", 4);
  const price = int(fd, "price", 300000);
  const defaultCoachId = str(fd, "default_coach_id") || null;
  const minParticipants = int(fd, "min_participants", 2);
  const videoUrl = str(fd, "video_url") || null;
  const published = fd.get("published") === "on" || fd.get("published") === "true";

  // Dynamic learning points
  const learningPoints = fd.getAll("learning_points").map(String).filter((p) => p.trim() !== "");

  // Dynamic sessions breakdown
  const sessionTitles = fd.getAll("session_title").map(String);
  const sessionDescs = fd.getAll("session_desc").map(String);
  const sessionsBreakdown = sessionTitles.map((st, idx) => ({
    session: idx + 1,
    title: st.trim(),
    desc: (sessionDescs[idx] || "").trim(),
  }));

  if (!title) {
    return { error: "Nama kelas wajib diisi" };
  }

  let finalId = id;
  const res = await guard(async () => {
    const supabase = await createClient();
    const slug = slugify(title);

    const payload = {
      title,
      slug,
      category,
      description,
      suitable_pins: suitablePins,
      total_sessions: totalSessions,
      duration_per_session: durationPerSession,
      capacity,
      price,
      default_coach_id: defaultCoachId,
      min_participants: minParticipants,
      video_url: videoUrl,
      learning_points: learningPoints,
      sessions_breakdown: sessionsBreakdown,
      published,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabase.from("classes").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("classes").insert(payload).select("id").single();
      if (error) throw error;
      if (data) finalId = data.id;
    }

    revalidatePath("/admin/kelas");
    revalidatePath(`/admin/kelas/${finalId}`);
    revalidatePath("/kelas");
  });

  if (res && res.error) {
    return res;
  }

  redirect(`/admin/kelas/${finalId}`);
}

/** Add a new schedule to a class */
export async function addClassSchedule(prevState: any, fd: FormData) {
  const classId = str(fd, "class_id");
  const datesLabel = str(fd, "dates_label");
  const timeRange = str(fd, "time_range");
  const coachId = str(fd, "coach_id") || null;
  const venueId = str(fd, "venue_id") || null;
  const startDate = str(fd, "start_date") || new Date().toISOString().slice(0, 10);
  const customCapacity = intOrNull(fd, "custom_capacity");

  if (!classId || !datesLabel || !timeRange) {
    return { error: "Data jadwal belum lengkap" };
  }

  return await guard(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("class_schedules").insert({
      class_id: classId,
      dates_label: datesLabel,
      time_range: timeRange,
      coach_id: coachId,
      venue_id: venueId,
      start_date: startDate,
      custom_capacity: customCapacity,
      status: "active",
    });
    if (error) throw error;

    revalidatePath(`/admin/kelas/${classId}`);
    revalidatePath("/kelas");
  });
}

/** Update attendance for a participant */
export async function updateParticipantAttendance(fd: FormData) {
  const participantId = str(fd, "participant_id");
  const sessionNum = str(fd, "session_num");
  const attended = fd.get("attended") === "true";
  const classId = str(fd, "class_id");

  if (!participantId || !sessionNum) return { error: "Data peserta tidak valid" };

  return await guard(async () => {
    const supabase = await createClient();
    const { data: p } = await supabase
      .from("class_participants")
      .select("attendance")
      .eq("id", participantId)
      .single();

    const curr = (p?.attendance as Record<string, boolean>) || {};
    curr[sessionNum] = attended;

    const { error } = await supabase
      .from("class_participants")
      .update({ attendance: curr })
      .eq("id", participantId);

    if (error) throw error;
    if (classId) revalidatePath(`/admin/kelas/${classId}`);
  });
}

/** Reply to comment as coach */
export async function replyClassComment(prevState: any, fd: FormData) {
  const classId = str(fd, "class_id");
  const parentId = str(fd, "parent_id");
  const replyText = str(fd, "comment");
  const coachName = str(fd, "coach_name") || "Coach";

  if (!classId || !parentId || !replyText) {
    return { error: "Balasan tidak boleh kosong" };
  }

  return await guard(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("class_comments").insert({
      class_id: classId,
      parent_id: parentId,
      author_name: coachName,
      comment: replyText,
      is_coach_reply: true,
    });
    if (error) throw error;

    revalidatePath(`/admin/kelas/${classId}`);
    revalidatePath("/kelas");
  });
}

/** Hide / Moderate comment */
export async function toggleHideComment(fd: FormData) {
  const commentId = str(fd, "comment_id");
  const classId = str(fd, "class_id");

  return await guard(async () => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("class_comments")
      .update({ hidden: true })
      .eq("id", commentId);
    if (error) throw error;

    if (classId) revalidatePath(`/admin/kelas/${classId}`);
  });
}

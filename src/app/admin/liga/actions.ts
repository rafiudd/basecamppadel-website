"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/actionState";
import { guard, int, str, type Supa } from "@/lib/server/action";
import { presetPoints } from "@/lib/events";
import type { PointPresetRules } from "@/lib/database.types";
import { DEFAULT_LEAGUE_POINTS } from "@/lib/leagues";

function slugify(s: string) {
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "liga"}-${Math.random().toString(36).slice(2, 6)}`;
}

function revalidateLeague() {
  revalidatePath("/admin/liga");
  revalidatePath("/admin/liga/[id]", "page");
  revalidatePath("/liga");
  revalidatePath("/liga/[slug]", "page");
}

/** League points copied from a preset (later preset edits don't change the league until it's saved again). */
async function readPresetPoints(supabase: Supa, presetId: string | null) {
  if (!presetId) return DEFAULT_LEAGUE_POINTS;
  const { data: preset } = await supabase.from("point_presets").select("rules").eq("id", presetId).maybeSingle();
  if (!preset) throw new Error("Preset poin tidak ditemukan.");
  return preset.rules ? presetPoints(preset.rules as PointPresetRules).points : DEFAULT_LEAGUE_POINTS;
}

export async function createLeague(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();

    const name = str(fd, "name");
    if (!name) throw new Error("Nama liga wajib diisi.");

    const organizer = str(fd, "organizer");
    const description = str(fd, "description");
    const totalVolumes = Math.min(10, Math.max(1, int(fd, "total_volumes", 3)));
    const presetId = str(fd, "point_preset_id") || null;

    const points = await readPresetPoints(supabase, presetId);

    const slug = slugify(name);
    const { data: league, error: lErr } = await supabase
      .from("leagues")
      .insert({
        name,
        slug,
        organizer,
        description,
        total_volumes: totalVolumes,
        point_preset_id: presetId,
        points,
        published: true,
      })
      .select("id")
      .single();

    if (lErr || !league) throw new Error(lErr?.message ?? "Gagal membuat liga.");

    // Create volume slots
    const volumeInserts = [];
    for (let v = 1; v <= totalVolumes; v++) {
      volumeInserts.push({
        league_id: league.id,
        volume_number: v,
        is_final: v === totalVolumes,
        approx_date: "",
      });
    }

    const { error: vErr } = await supabase.from("league_volumes").insert(volumeInserts);
    if (vErr) {
      // No transactions here: drop the half-made league so a retry doesn't leave a volume-less duplicate.
      await supabase.from("leagues").delete().eq("id", league.id);
      throw new Error(vErr.message);
    }

    revalidateLeague();
    redirect(`/admin/liga/${league.id}`);
  });
}

export async function updateLeague(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();

    const id = str(fd, "league_id");
    const name = str(fd, "name");
    if (!id) throw new Error("ID liga tidak valid.");
    if (!name) throw new Error("Nama liga wajib diisi.");

    const organizer = str(fd, "organizer");
    const description = str(fd, "description");
    const published = fd.getAll("published").includes("on");
    const totalVolumes = Math.min(10, Math.max(1, int(fd, "total_volumes", 1)));
    const presetId = str(fd, "point_preset_id") || null;
    // standings are computed from league.points, so a new preset re-scores every volume right away
    const points = await readPresetPoints(supabase, presetId);

    await resizeVolumes(supabase, id, totalVolumes);

    const { error } = await supabase
      .from("leagues")
      .update({
        name,
        organizer,
        description,
        published,
        total_volumes: totalVolumes,
        point_preset_id: presetId,
        points,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidateLeague();
  });
}

/**
 * Makes the league have exactly volumes 1..total: adds missing slots, removes empty ones above
 * `total`, and moves the Final flag to the last volume. A volume that already has an event is never removed.
 */
async function resizeVolumes(supabase: Supa, leagueId: string, total: number) {
  const { data: volumes, error } = await supabase
    .from("league_volumes")
    .select("id, volume_number, event_id")
    .eq("league_id", leagueId);
  if (error) throw new Error(error.message);

  const extra = (volumes ?? []).filter((v) => v.volume_number > total);
  const withEvent = extra.filter((v) => v.event_id).map((v) => v.volume_number);
  if (withEvent.length) {
    throw new Error(`Vol. ${withEvent.join(", ")} sudah punya event. Hapus event-nya secara manual dulu sebelum mengurangi volume.`);
  }
  if (extra.length) {
    const { error: dErr } = await supabase.from("league_volumes").delete().in("id", extra.map((v) => v.id));
    if (dErr) throw new Error(dErr.message);
  }

  // also refills gaps (e.g. a slot lost to the old cascade bug)
  const have = new Set((volumes ?? []).map((v) => v.volume_number));
  const missing = [];
  for (let n = 1; n <= total; n++) {
    if (!have.has(n)) missing.push({ league_id: leagueId, volume_number: n, is_final: false, approx_date: "" });
  }
  if (missing.length) {
    const { error: iErr } = await supabase.from("league_volumes").insert(missing);
    if (iErr) throw new Error(iErr.message);
  }

  await supabase.from("league_volumes").update({ is_final: false }).eq("league_id", leagueId).neq("volume_number", total);
  await supabase.from("league_volumes").update({ is_final: true }).eq("league_id", leagueId).eq("volume_number", total);
}

export async function deleteLeague(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();

    const id = str(fd, "league_id");
    if (!id) throw new Error("ID liga tidak valid.");

    const { error } = await supabase.from("leagues").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidateLeague();
    revalidatePath("/admin/events");
    redirect("/admin/liga");
  });
}

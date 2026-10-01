"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { PointPreset, PointPresetRules } from "@/lib/database.types";

export async function getPointPresets(): Promise<PointPreset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("point_presets")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching point presets:", error);
    return [];
  }

  return (data ?? []) as PointPreset[];
}

export async function getPointPresetById(idOrName: string): Promise<PointPreset | null> {
  if (!idOrName) return null;
  const supabase = await createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
  if (isUuid) {
    const { data } = await supabase
      .from("point_presets")
      .select("*")
      .eq("id", idOrName)
      .maybeSingle();

    if (data) return data as PointPreset;
  }

  const normalized = idOrName.replace(/[-_]/g, " ").trim();
  const { data } = await supabase
    .from("point_presets")
    .select("*")
    .ilike("name", normalized)
    .maybeSingle();

  if (data) return data as PointPreset;
  return null;
}

export async function savePointPresetRules(
  id: string,
  rules: PointPresetRules
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("point_presets")
      .update({
        rules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/point");
    revalidatePath("/admin/points");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan preset";
    return { success: false, error: message };
  }
}

export async function createPointPreset(
  name: string,
  rules: PointPresetRules
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await requireAdmin();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Nama preset wajib diisi" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("point_presets")
      .insert({
        name: trimmedName,
        is_default: false,
        rules,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/admin/point");
    revalidatePath("/admin/points");
    return { success: true, id: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat preset";
    return { success: false, error: message };
  }
}

export async function updatePointPreset(
  id: string,
  name: string,
  rules: PointPresetRules
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Nama preset wajib diisi" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("point_presets")
      .update({
        name: trimmedName,
        rules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/point");
    revalidatePath("/admin/points");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengupdate preset";
    return { success: false, error: message };
  }
}

export async function deletePointPreset(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("point_presets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/point");
    revalidatePath("/admin/points");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus preset";
    return { success: false, error: message };
  }
}

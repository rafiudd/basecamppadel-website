"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function upsertSkillAction(data: {
  id?: string;
  type: "teknik" | "in_game";
  category: string;
  name: string;
  active?: boolean;
}) {
  await requireAdmin();
  const supabase = await createClient();

  if (data.id) {
    const { error } = await supabase
      .from("coaching_skills")
      .update({
        type: data.type,
        category: data.category.trim(),
        name: data.name.trim(),
        active: data.active ?? true,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  } else {
    // Get max sort_order
    const { data: maxRow } = await supabase
      .from("coaching_skills")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (maxRow?.sort_order ?? 0) + 1;

    const { error } = await supabase
      .from("coaching_skills")
      .insert({
        type: data.type,
        category: data.category.trim(),
        name: data.name.trim(),
        sort_order: sortOrder,
        active: true,
      });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/coaching");
  return { success: true };
}

export async function toggleSkillActiveAction(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("coaching_skills")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/coaching");
  return { success: true };
}

export async function reorderSkillsAction(orderedIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("coaching_skills")
      .update({ sort_order: i + 1 })
      .eq("id", orderedIds[i]);
  }
  revalidatePath("/admin/coaching");
  revalidatePath("/admin/coaching/skills");
  return { success: true };
}

export async function deleteSkillAction(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("coaching_skills").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/coaching");
  revalidatePath("/admin/coaching/skills");
  return { success: true };
}

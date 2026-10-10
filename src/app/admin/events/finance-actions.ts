"use server";

import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/actionState";
import { guard, str, type Supa } from "./_shared";
import { revalidateEvent } from "./_shared";
import { createClient } from "@/lib/supabase/server";

/** Manual expense/income line items on an event's Keuangan tab (the court-rental and registration
 *  lines are computed on the fly in KeuanganTab, not stored here — see src/lib/venuePricing.ts). */

export async function addEventTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase: Supa = await createClient();
    const eventId = str(fd, "event_id");
    const type = str(fd, "type") === "income" ? "income" : "expense";
    const label = str(fd, "label");
    const amount = Math.max(0, Number(str(fd, "amount")) || 0);
    if (!label) throw new Error("Isi nama pengeluaran/pemasukan.");
    const { error } = await supabase.from("event_transactions").insert({ event_id: eventId, type, label, amount });
    if (error) throw new Error(error.message);
    revalidateEvent(eventId);
  });
}

export async function deleteEventTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase: Supa = await createClient();
    const id = str(fd, "id");
    const { data: row } = await supabase.from("event_transactions").select("event_id").eq("id", id).maybeSingle();
    const { error } = await supabase.from("event_transactions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    if (row?.event_id) revalidateEvent(row.event_id);
  });
}

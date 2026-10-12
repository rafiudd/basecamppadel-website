"use server";

import { redirect } from "next/navigation";
import { str } from "@/lib/server/action";
import { ACCOUNT_DEMO } from "@/lib/config";
import type { ActionState } from "@/lib/actionState";

/** Demo stand-ins for the account actions: nothing is saved, they only walk through the flow. */

export async function demoSaveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!ACCOUNT_DEMO) return { error: "Mode demo tidak aktif." };
  redirect(str(fd, "mode") === "setup" ? "/akun-demo/sambungkan" : "/akun-demo");
}

export async function demoChoosePlayer(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!ACCOUNT_DEMO) return { error: "Mode demo tidak aktif." };
  redirect(str(fd, "player_id") ? "/akun-demo?klaim=1" : "/akun-demo");
}

export async function demoDeleteAccount(): Promise<ActionState> {
  return { error: "Mode demo: akun contoh tidak bisa dihapus." };
}

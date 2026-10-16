import { NextResponse } from "next/server";
import { ACCOUNT_DEMO } from "@/lib/config";
import { COACHING_SKILLS } from "@/lib/coachingSkills";
import { demoProfile, demoReports } from "@/lib/demoAccount";
import { raporResponse } from "@/lib/rapor";

/** Demo rapor (D.6) for the sample player. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = demoReports.find((r) => r.id === id);
  if (!ACCOUNT_DEMO || !report) return new NextResponse("Rapor tidak ditemukan.", { status: 404 });
  return raporResponse(demoProfile.nickname, report, COACHING_SKILLS, demoReports);
}

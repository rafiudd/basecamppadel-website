import { STAGE_LABEL } from "@/lib/competition";
import type {
  CompEvent,
  EventPoints,
  GenFormat,
  MabarPoints,
  PointCategoryItem,
  PointPresetRules,
  ScoreMode,
} from "@/lib/database.types";

export const MABAR_FORMAT_LABEL: Record<GenFormat, string> = {
  americano: "Americano",
  mexicano: "Mexicano",
  fixed_americano: "Fixed partner Americano",
  fixed_mexicano: "Fixed partner Mexicano",
};

/** The "Format" box on the public Info tab, mode-specific: a target count means something different each way. */
export function scoreModeBox(mode: ScoreMode, target: number): { val: string; label: string } {
  if (mode === "best_of") return { val: `Best of ${target}`, label: "Cara menang" };
  if (mode === "race_to") return { val: `Race to ${target}`, label: "Cara menang" };
  return { val: String(target), label: "Poin per game" };
}

export const isFixedFormat = (f: GenFormat | null | undefined) => f === "fixed_americano" || f === "fixed_mexicano";
/** Americano formats plan every round up front; Mexicano builds each round from the table. */
export const isAmericanoFormat = (f: GenFormat | null | undefined) => f === "americano" || f === "fixed_americano";

export function eventFormatLabel(e: Pick<CompEvent, "type" | "mabar_format" | "ko_start">): string {
  if (e.type === "mabar") return e.mabar_format ? MABAR_FORMAT_LABEL[e.mabar_format] : "Mabar";
  return `Fase grup + ${STAGE_LABEL[e.ko_start].toLowerCase()}`;
}

export const DEFAULT_EVENT_POINTS: EventPoints = { champion: 80, runner_up: 50, sf: 30, qf: 15, r16: 10, group: 5 };
export const DEFAULT_MABAR_POINTS: MabarPoints = { ranks: [30, 20, 10], participant: 5 };

const pts = (c: PointCategoryItem) => (c.checked && typeof c.points === "number" ? c.points : 0);

export function presetToEventPoints(items: PointCategoryItem[]): EventPoints {
  const out: EventPoints = { champion: 0, runner_up: 0, sf: 0, qf: 0, r16: 0, group: 0 };
  for (const c of items) {
    const n = c.name.toLowerCase().trim();
    if (n === "juara" || n === "champion") out.champion = pts(c);
    else if (n.startsWith("runner")) out.runner_up = pts(c);
    else if (n.startsWith("semifinal")) out.sf = pts(c);
    else if (n.includes("fase grup") || n.includes("partisipasi") || n.includes("peserta")) out.group = pts(c);
    else {
      if (n.includes("8 besar") || n.includes("quarter")) out.qf = pts(c);
      if (n.includes("16 besar") || n.includes("lolos grup")) out.r16 = pts(c);
    }
  }
  return out;
}

export function presetToMabarPoints(items: PointCategoryItem[]): MabarPoints {
  const ranks: number[] = [];
  let participant = 0;
  for (const c of items) {
    const n = c.name.toLowerCase().trim();
    const m = n.match(/^juara\s*(\d+)$/);
    if (m) ranks[Number(m[1]) - 1] = pts(c);
    else if (n.startsWith("ikut")) participant = pts(c);
  }
  return { ranks: Array.from(ranks, (v) => v ?? 0), participant };
}

export function presetPoints(rules: PointPresetRules | null | undefined) {
  return {
    points: rules ? presetToEventPoints(rules.kompetisi ?? []) : DEFAULT_EVENT_POINTS,
    mabar_points: rules ? presetToMabarPoints(rules.mabar ?? []) : DEFAULT_MABAR_POINTS,
  };
}

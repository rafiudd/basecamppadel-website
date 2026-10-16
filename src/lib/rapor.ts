import {
  averageLabel,
  averageScore,
  previousReport,
  raporCoaches,
  raporCompare,
  raporEventLabel,
  raporFileName,
  reportHighlights,
  scoreLabel,
  type CoachReport,
  type SkillDef,
} from "@/lib/coachingRules";
import { raporHtml } from "@/lib/raporTemplate";

/**
 * D.6: one coaching report as the printable rapor page (opens the print dialog on load). `reports`
 * are all the player's sent ones: from the second rapor on it compares with the previous session.
 * `photoUrl` is the player's photo for the header (none: the header without a photo).
 */
export function raporResponse(name: string, report: CoachReport, skills: SkillDef[], reports: CoachReport[] = [report], photoUrl: string | null = null): Response {
  const SKILL_BY_KEY = new Map(skills.map((s) => [s.key, s]));
  const position = previousReport(reports, report.id);
  const prevScore = new Map((position.previous?.ratings ?? []).map((r) => [r.skill_key, Number(r.score)]));
  const rated = report.ratings
    .map((r) => ({
      label: SKILL_BY_KEY.get(r.skill_key)?.label ?? r.skill_key,
      sort: SKILL_BY_KEY.get(r.skill_key)?.sort ?? 999,
      score: r.score,
      prev: prevScore.get(r.skill_key) ?? null,
    }))
    .sort((a, b) => a.sort - b.sort);
  const average = averageScore(rated);
  const { best, weakest } = reportHighlights(rated);

  const html = raporHtml({
    fileName: raporFileName(name, report.session.session_date),
    eventLabel: raporEventLabel(report.session.title),
    name,
    date: report.session.session_date,
    coaches: raporCoaches(report.session),
    photoUrl,
    average,
    averageLabel: average === null ? "" : averageLabel(average),
    best: best.map((r) => r.label),
    weakest: weakest.map((r) => r.label),
    ratings: rated.map((r) => ({ label: r.label, score: r.score, scoreLabel: scoreLabel(r.score), prev: r.prev })),
    evaluation: report.evaluation,
    nextPractice: report.next_practice,
    compare: raporCompare(rated, position),
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

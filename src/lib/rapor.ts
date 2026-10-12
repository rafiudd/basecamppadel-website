import { averageLabel, averageScore, raporFileName, reportHighlights, scoreLabel, type CoachReport } from "@/lib/coachingRules";
import { COACHING_SKILLS } from "@/lib/coachingSkills";
import { raporHtml } from "@/lib/raporTemplate";

/** D.6: one coaching report as the printable rapor page (opens the print dialog on load). */
const SKILL_BY_KEY = new Map(COACHING_SKILLS.map((s) => [s.key, s]));

export function raporResponse(name: string, report: CoachReport): Response {
  const rated = report.ratings
    .map((r) => ({ label: SKILL_BY_KEY.get(r.skill_key)?.label ?? r.skill_key, sort: SKILL_BY_KEY.get(r.skill_key)?.sort ?? 999, score: r.score }))
    .sort((a, b) => a.sort - b.sort);
  const average = averageScore(rated) ?? 0;
  const { best, weakest } = reportHighlights(rated);

  const html = raporHtml({
    fileName: raporFileName(name, report.session.session_date),
    name,
    date: report.session.session_date,
    coaches: report.session.coach_name ? [report.session.coach_name] : [],
    average,
    averageLabel: averageLabel(average),
    best: best.map((r) => r.label),
    weakest: weakest.map((r) => r.label),
    ratings: rated.map((r) => ({ label: r.label, score: r.score, scoreLabel: scoreLabel(r.score) })),
    evaluation: report.evaluation,
    nextPractice: report.next_practice,
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

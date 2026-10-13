import { averageLabel, averageScore, raporFileName, reportHighlights, scoreLabel, type CoachReport, type SkillDef } from "@/lib/coachingRules";
import { raporHtml } from "@/lib/raporTemplate";

/** D.6: one coaching report as the printable rapor page (opens the print dialog on load). */
export function raporResponse(name: string, report: CoachReport, skills: SkillDef[]): Response {
  const SKILL_BY_KEY = new Map(skills.map((s) => [s.key, s]));
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

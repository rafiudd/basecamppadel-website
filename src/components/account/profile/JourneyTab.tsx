import Link from "next/link";
import { LEVEL_DEFINITIONS } from "@/lib/coaching";
import type { NextSession, SkillBoard } from "@/lib/coachingRules";
import {
  PIN_JOURNEY_LEVELS,
  PIN_JOURNEY_PIN,
  PIN_MISSIONS,
  PIN_LEARNING_POINTS,
  evaluateMissions,
  closestMission,
  nextPinLevel,
  type PlayerLevelName,
} from "@/lib/pinJourney";
import { primaryButton } from "@/components/account/styles";
import { card, cardTitle } from "./SideCards";

function isJourneyLevel(name: string): name is PlayerLevelName {
  return (PIN_JOURNEY_LEVELS as string[]).includes(name);
}

/** Every skill's latest score by name, across both boards — what evaluateMissions reads. */
function flattenScores(boards: SkillBoard[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const board of boards) {
    for (const group of board.groups) {
      for (const item of group.items) out[item.label] = item.score;
    }
  }
  return out;
}

function PinDot({ level, size = 16 }: { level: PlayerLevelName; size?: number }) {
  const def = LEVEL_DEFINITIONS[level];
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, background: def.color, boxShadow: "inset 0 0 0 1.5px rgb(23 21 31 / 0.15)" }}
      className="rounded-full inline-block flex-none"
    />
  );
}

/**
 * "Journey pin": a forward-looking, DRAFT progress view — see src/lib/pinJourney.ts. Nothing here
 * decides the player's real level; that still comes from computePlayerLevel's average score.
 */
export function JourneyTab({
  level,
  boards,
  sessionsCount,
  nextSession,
}: {
  level: { name: string; color: string } | null | undefined;
  boards: SkillBoard[];
  sessionsCount: number;
  nextSession?: NextSession | null;
}) {
  const current: PlayerLevelName = level && isJourneyLevel(level.name) ? level.name : "Rookie";
  const currentIndex = PIN_JOURNEY_LEVELS.indexOf(current);
  const next = nextPinLevel(current);
  const missions = PIN_MISSIONS[current];
  const scores = flattenScores(boards);
  const statuses = evaluateMissions(missions, scores, sessionsCount);
  const doneCount = statuses.filter((s) => s.done).length;
  const tip = closestMission(statuses);

  if (!level) {
    return (
      <section className={card}>
        <h2 className={cardTitle}>Journey pin</h2>
        <p className="m-0 text-sm text-ink/70">
          Journey kamu mulai setelah sesi Mabar with Coach pertama. Belum ada penilaian coach buat akun ini.
        </p>
        {nextSession && (
          <Link href={nextSession.href} className={`${primaryButton} self-start mt-1`}>Daftar Mabar with Coach</Link>
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Progress toward the next pin */}
      <section className="bg-indigo text-snow rounded-2xl p-5 md:p-7 flex flex-col md:flex-row gap-5 md:gap-7 md:items-center relative overflow-hidden">
        <div className="absolute -right-15 -top-15 w-55 h-55 rounded-full bg-volt/8" aria-hidden />
        <div className="flex items-center gap-4 flex-none relative">
          <PinDot level={current} size={56} />
          <div>
            <div className="text-xs tracking-[0.14em] font-bold text-snow/70">PIN KAMU SEKARANG</div>
            <div className="font-display font-bold text-[28px] leading-tight">Pin {PIN_JOURNEY_PIN[current]}</div>
            <div className="text-sm text-snow/75 mt-0.5">{currentIndex + 1} dari {PIN_JOURNEY_LEVELS.length} pin</div>
          </div>
        </div>
        {next ? (
          <div className="flex-grow flex flex-col gap-2.5 relative min-w-0">
            <div className="flex justify-between items-baseline gap-2 flex-wrap">
              <span className="font-bold text-sm">Menuju Pin {PIN_JOURNEY_PIN[next]}</span>
              <span className="font-display font-bold text-lg text-volt">{doneCount}/{statuses.length} misi</span>
            </div>
            <div
              role="img"
              aria-label={`Progres ${Math.round((doneCount / Math.max(statuses.length, 1)) * 100)} persen`}
              className="h-4.5 rounded-full bg-snow/14 overflow-hidden shadow-[inset_0_0_0_2px_rgb(251_247_241/0.08)]"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-volt to-[#FF9F1C]"
                style={{ width: `${Math.round((doneCount / Math.max(statuses.length, 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between gap-2 text-sm text-snow/75 flex-wrap">
              <span>{statuses.length - doneCount > 0 ? `${statuses.length - doneCount} misi lagi buat naik pin 🔓` : "Semua misi selesai 🎉"}</span>
              <span className="flex items-center gap-1.5"><PinDot level={next} size={18} /> Pin {PIN_JOURNEY_PIN[next]}</span>
            </div>
          </div>
        ) : (
          <div className="flex-grow text-sm font-semibold text-snow/90 relative">
            Udah di pin tertinggi — Hitam 🎉 Terus asah skill biar makin konsisten.
          </div>
        )}
      </section>

      {/* Stepper */}
      <section className={card}>
        <div className="flex justify-between items-baseline gap-2">
          <h2 className={cardTitle}>Journey pin</h2>
          <span className="text-caption text-ink/60">Putih → Hitam</span>
        </div>
        <div className="relative flex justify-between pt-2 overflow-x-auto">
          <div aria-hidden className="absolute left-7 right-7 top-9 h-1.5 rounded-full bg-ink/10" />
          {currentIndex > 0 && (
            <div
              aria-hidden
              className="absolute left-7 top-9 h-1.5 rounded-full bg-win"
              style={{ width: `calc((100% - 56px) * ${currentIndex / (PIN_JOURNEY_LEVELS.length - 1)})` }}
            />
          )}
          {PIN_JOURNEY_LEVELS.map((lvl, i) => (
            <div key={lvl} className="flex flex-col items-center gap-2 w-28 flex-none relative z-10">
              <span className={`rounded-full flex bg-snow ${i === currentIndex ? "shadow-[0_0_0_5px_rgb(255_212_59/0.35)]" : ""}`}>
                <PinDot level={lvl} size={i === currentIndex ? 52 : 40} />
              </span>
              <div className="font-display font-bold text-sm text-center">Pin {PIN_JOURNEY_PIN[lvl]}</div>
              <div className="text-xs font-bold text-center">
                {i < currentIndex && <span className="text-[#23794A]">✓ Selesai</span>}
                {i === currentIndex && <span className="text-coral">● Kamu di sini</span>}
                {i > currentIndex && <span className="text-ink/45">Terkunci</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {next && (
        <div className="grid md:grid-cols-[3fr_2fr] gap-5 items-start">
          {/* Missions */}
          <section className={card}>
            <div className="flex justify-between items-baseline gap-2 -mb-1">
              <h2 className={cardTitle}>Misi ke Pin {PIN_JOURNEY_PIN[next]}</h2>
              <span className="text-caption text-ink/60">dinilai coach tiap sesi</span>
            </div>
            <div>
              {statuses.map((s) => (
                <div key={s.label} className="grid grid-cols-[22px_1fr_auto] gap-2.5 items-center py-2.5 border-t border-ink/7">
                  <span
                    aria-hidden
                    className={`w-5.5 h-5.5 rounded-md flex items-center justify-center text-xs font-extrabold ${
                      s.done ? "bg-win text-white" : "shadow-[inset_0_0_0_2px_rgb(23_21_31/0.2)] text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <div className="min-w-0">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-bold truncate">{s.label}</span>
                      <span className="text-ink/60 whitespace-nowrap">{s.detail}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink/8 mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.done ? "bg-win" : "bg-volt"}`}
                        style={{ width: `${Math.round(s.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ${s.done ? "text-[#23794A]" : "text-coral"}`}>
                    {s.done ? "✓" : s.gapLabel}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Tip + CTA */}
          <section className="bg-volt/18 rounded-2xl p-5 md:p-7 flex flex-col gap-2">
            <div className="text-caption tracking-[0.14em] font-bold text-coral">TIPS DARI COACH</div>
            {tip ? (
              <>
                <div className="font-display font-bold text-lg leading-tight">Fokus ke {tip.label} dulu</div>
                <div className="text-sm text-ink/75 leading-copy">
                  {tip.gapLabel === "belum dinilai"
                    ? "Belum pernah dinilai di skill ini — minta coach nilai di sesi berikutnya."
                    : tip.gapLabel?.endsWith("sesi lagi")
                      ? `${tip.gapLabel} buat lolos misi ini.`
                      : `Tinggal ${tip.gapLabel?.replace("kurang ", "")} lagi buat lolos misi ini.`}
                </div>
              </>
            ) : (
              <div className="text-sm text-ink/75 leading-copy">Semua misi udah lolos, tinggal nunggu dinilai coach di sesi berikutnya.</div>
            )}
            {nextSession && (
              <Link href={nextSession.href} className={`${primaryButton} self-start mt-1`}>Ikut Mabar with Coach</Link>
            )}
          </section>
        </div>
      )}

      {/* Curriculum overview */}
      <section className={card}>
        <h2 className={cardTitle}>Yang dipelajari di tiap pin</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {PIN_JOURNEY_LEVELS.map((lvl, i) => (
            <div
              key={lvl}
              className="rounded-xl p-3.5"
              style={{
                background: i === currentIndex ? "color-mix(in srgb, var(--color-volt) 16%, transparent)" : "rgb(23 21 31 / 0.03)",
                boxShadow: `inset 0 3px 0 ${i <= currentIndex ? LEVEL_DEFINITIONS[lvl].color : "rgb(23 21 31 / 0.15)"}`,
                opacity: i <= currentIndex ? 1 : 0.55,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <PinDot level={lvl} size={20} />
                <span className="font-display font-bold text-sm">Pin {PIN_JOURNEY_PIN[lvl]}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {PIN_LEARNING_POINTS[lvl].map((topic) => (
                  <span key={topic} className="inline-block rounded-lg px-2 py-1 text-xs font-semibold bg-ink/5">{topic}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

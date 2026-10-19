import Link from "next/link";
import type { NextSession, SkillScore } from "@/lib/coachingRules";
import { formatSessionDay } from "@/lib/format";
import { primaryButton } from "@/components/account/styles";

export const card = "bg-white border border-ink/8 rounded-2xl p-5 md:p-6 flex flex-col gap-3 text-ink";
export const cardTitle = "font-display font-bold text-xl m-0";

/** The player's pin, as shown on the header and the "Pin kamu" card. */
export type ProfilePin = { name: string; color: string };

/** "Sesi berikutnya": the nearest open coaching session, with a way to sign up. */
export function NextSessionCard({ session }: { session: NextSession | null | undefined }) {
  if (!session) return null;
  return (
    <section className="bg-indigo text-snow rounded-2xl p-5 md:p-6 flex flex-col gap-2.5 items-start">
      <div className="text-xs tracking-[0.14em] font-bold text-volt">SESI BERIKUTNYA</div>
      <div className="font-display font-bold text-[22px] leading-tight">{session.title}</div>
      <div className="text-sm text-snow/75">{[formatSessionDay(session.date), session.venue].filter(Boolean).join(" · ")}</div>
      <Link href={session.href} className={`${primaryButton} mt-1.5`}>Daftar sekarang</Link>
    </section>
  );
}

/** "Sering dibahas coach": skills that keep scoring low, and in how many sessions. */
export function RecurringCard({ items }: { items: { label: string; sessions: number; total: number }[] }) {
  if (!items.length) return null;
  return (
    <section className={card}>
      <h2 className={cardTitle}>Sering dibahas coach</h2>
      <p className="m-0 text-caption text-ink/65 -mt-1">Hal yang berulang di penilaian kamu. Fokus di sini dulu.</p>
      <div>
        {items.map((x) => (
          <div key={x.label} className="flex justify-between gap-3 py-2.5 border-t border-ink/7 text-sm">
            <span className="font-semibold">{x.label}</span>
            <span className="text-ink/60 whitespace-nowrap">{x.sessions} dari {x.total} sesi</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tag({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-lg px-2.5 py-1 font-bold text-caption ${tone === "good" ? "bg-[#E8F5EC] text-[#166534]" : "bg-[#FFE9E4] text-[#B83A22]"}`}>
      {children}
    </span>
  );
}

/** "Pin kamu" with the best and weakest skill under it. */
export function PinCard({ pin, best, weakest }: { pin: ProfilePin | null | undefined; best: SkillScore | null; weakest: SkillScore | null }) {
  if (!pin && !best && !weakest) return null;
  return (
    <section className={card}>
      <h2 className={cardTitle}>{pin ? "Pin kamu" : "Skill kamu"}</h2>
      {pin && (
        <>
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="w-12 h-12 rounded-full flex-none border-[1.5px] border-[#2E2E33] box-border"
              style={{ background: pin.color }}
            />
            <div>
              <div className="font-display font-bold text-[26px] text-indigo leading-tight">{pin.name}</div>
              <div className="text-caption text-ink/65 leading-copy">Pakai pin ini tiap sesi, biar coach tahu grupmu.</div>
            </div>
          </div>
          {(best || weakest) && <div className="h-px bg-ink/8 my-1" />}
        </>
      )}
      {best && (
        <div>
          <div className="text-caption text-ink/60 mb-1">Paling bagus</div>
          <Tag tone="good">{best.label}</Tag>
        </div>
      )}
      {weakest && (
        <div>
          <div className="text-caption text-ink/60 mb-1">Perlu dilatih</div>
          <Tag tone="bad">{weakest.label}</Tag>
        </div>
      )}
    </section>
  );
}

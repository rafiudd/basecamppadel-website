import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import type { Profile } from "@/lib/database.types";
import {
  eventHistory,
  filterReports,
  reportFilterOptions,
  reportSummaries,
  sessionAverages,
  skillBoards,
  type AwardRow,
  type CoachReport,
  type EventRow,
  type HistoryRow,
} from "@/lib/coachingRules";
import { COACHING_SKILLS } from "@/lib/coachingSkills";
import { StatsTab } from "./StatsTab";
import { NotesTab } from "./NotesTab";
import { HistoryTab } from "./HistoryTab";
import { InitialsAvatar } from "../InitialsAvatar";

const HAND = { R: "Tangan kanan", L: "Tangan kiri" } as const;
const POSITION = { right: "Posisi kanan", left: "Posisi kiri", both: "Posisi bebas" } as const;
const TABS = [
  { id: "statistik", label: "Statistik" },
  { id: "catatan", label: "Catatan coach" },
  { id: "riwayat", label: "Riwayat event" },
] as const;
export type ProfileTab = (typeof TABS)[number]["id"];

export function parseTab(tab: string | undefined): ProfileTab {
  return TABS.some((t) => t.id === tab) ? (tab as ProfileTab) : "statistik";
}

/** Outline pill on the indigo header ("Edit profil"). */
const headerButton =
  "inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-11 px-4 rounded-full border border-snow/35 bg-transparent text-snow font-semibold text-sm no-underline whitespace-nowrap hover:border-volt hover:text-volt";

/** Quiet "Keluar" in the header's bottom-right corner. */
export const signOutButton =
  "inline-flex items-center gap-1.5 min-h-10 px-1 bg-transparent border-none text-snow/70 font-semibold text-sm no-underline whitespace-nowrap hover:text-volt";

export function SignOutLabel() {
  return (
    <>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Keluar
    </>
  );
}

/**
 * Level color next to the name (D.1). The color rule is not decided yet (pins vs players.level), so
 * nothing is passed and the badge stays hidden.
 */
function LevelBadge({ color, label }: { color: string | null; label: string }) {
  if (!color) return null;
  return <span role="img" aria-label={label} title={label} className="w-5 h-5 rounded-full flex-none shadow-[inset_0_0_0_2px_rgb(251_247_241/0.5)]" style={{ background: color }} />;
}

/** The player profile (D.1–D.5), shared by /akun (real data) and /akun-demo (sample data). */
export function ProfileView({
  profile,
  tab,
  coach,
  year,
  tersambung,
  claimedName,
  reports,
  history,
  wins,
  losses,
  basePath,
  banner,
  signOut,
}: {
  profile: Pick<Profile, "nickname" | "full_name" | "gender" | "region" | "dominant_hand" | "position" | "photo_url" | "player_id" | "claim_player_id">;
  tab: ProfileTab;
  coach?: string;
  year?: string;
  tersambung?: boolean;
  claimedName?: string | null;
  reports: CoachReport[];
  history: { history: HistoryRow[]; awards: AwardRow[]; events: EventRow[] };
  wins: number;
  losses: number;
  basePath: string;
  banner?: React.ReactNode;
  /** "Keluar", next to "Edit profil" (a server-action form, or a plain link in the demo). */
  signOut: React.ReactNode;
}) {
  const boards = skillBoards(COACHING_SKILLS, reports);
  const averages = sessionAverages(reports);
  const latest = filterReports(reports, {})[0] ?? null;
  const events = eventHistory(history.history, history.awards, history.events);

  const displayName = profile.full_name || profile.nickname; // the design's header shows the full name
  const chips = [
    profile.gender === "F" ? "Women" : "Men",
    profile.region,
    profile.dominant_hand && HAND[profile.dominant_hand],
    profile.position && POSITION[profile.position],
  ].filter(Boolean) as string[];
  const stats = [
    { label: "Rata-rata", value: averages.at(-1)?.avg ?? "–" },
    { label: "Sesi coaching", value: reports.length },
    { label: "Event", value: events.length },
  ];

  return (
    <PublicShell>
      {banner}
      {/* D.1 header */}
      <section className="bg-indigo text-snow px-4 md:px-12 py-7 md:py-10">
        <div className="max-w-276 mx-auto flex flex-col gap-4 md:gap-4.5">
          <div className="flex items-center gap-4 md:gap-6">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar from Supabase Storage
              <img src={profile.photo_url} alt="" className="w-18 h-18 md:w-24 md:h-24 rounded-full object-cover flex-none bg-volt border-4 border-snow/20" />
            ) : (
              <InitialsAvatar name={displayName} className="w-18 h-18 md:w-24 md:h-24 text-2xl md:text-[34px] border-4 border-snow/20" />
            )}
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <div className="text-caption tracking-[0.12em] font-bold text-volt">PROFIL SAYA</div>
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="font-display font-bold text-[28px] md:text-5xl leading-none m-0 truncate">{displayName}</h1>
                <LevelBadge color={null} label="Level" />
              </div>
            </div>
            <Link href={`${basePath}/edit`} className={`${headerButton} hidden! md:inline-flex!`}>
              Edit profil
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {chips.map((c) => (
              <span key={c} className="rounded-full px-3 py-1.5 text-caption font-bold bg-snow/12">{c}</span>
            ))}
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-135">
              {stats.map((s) => (
                <div key={s.label} className="bg-snow/8 rounded-tile px-3 py-2.5 md:px-3.5 md:py-3 min-w-0">
                  <div className="text-2xs uppercase tracking-tag text-snow/70 truncate">{s.label}</div>
                  <div className="font-display font-bold text-title mt-1">{s.value}</div>
                </div>
              ))}
            </div>
            <Link href={`${basePath}/edit`} className={`${headerButton} md:hidden`}>
              Edit profil
            </Link>
            {/* bottom-right corner of the header */}
            <div className="self-end flex-none">{signOut}</div>
          </div>
        </div>
      </section>

      <nav aria-label="Profil" className="bg-white border-b border-ink/8 px-4 md:px-12 sticky top-14 md:top-[88px] z-20">
        <div className="max-w-276 mx-auto flex overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === "statistik" ? basePath : `${basePath}?tab=${t.id}`}
              scroll={false}
              aria-current={tab === t.id ? "page" : undefined}
              className={`no-underline py-3.5 px-1 mr-6 md:mr-7 font-bold text-input whitespace-nowrap border-b-3 ${
                tab === t.id ? "text-indigo border-coral" : "text-ink/60 border-transparent hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="px-4 md:px-12 py-6 md:py-8">
        <div className="max-w-276 mx-auto flex flex-col gap-5 text-ink">
          {tersambung && profile.player_id && (
            <div role="status" className="rounded-xl bg-win/12 text-[#23794A] px-4 py-3 text-sm font-semibold">
              Akun kamu tersambung ke data pemain lama. Poin, riwayat, dan catatannya sudah muncul di sini.
            </div>
          )}
          {profile.claim_player_id && (
            <div role="status" className="rounded-xl bg-volt/30 px-4 py-3 text-sm leading-copy">
              <b>Menunggu verifikasi admin.</b> Kamu mengaku sebagai <b>{claimedName ?? "pemain lama"}</b>. Setelah disetujui,
              poin, riwayat, dan catatannya langsung muncul di akun ini.
            </div>
          )}

          {tab === "statistik" && <StatsTab boards={boards} averages={averages} latest={latest} basePath={basePath} />}
          {tab === "catatan" && (
            <NotesTab
              shown={filterReports(reports, { coach, year })}
              newestId={latest?.id ?? null}
              summaries={reportSummaries(COACHING_SKILLS, reports)}
              {...reportFilterOptions(reports)}
              coach={coach}
              year={year}
              basePath={basePath}
            />
          )}
          {tab === "riwayat" && <HistoryTab entries={events} wins={wins} losses={losses} />}

        </div>
      </div>
    </PublicShell>
  );
}

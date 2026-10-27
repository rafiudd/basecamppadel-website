import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { ActionForm } from "@/components/admin/ActionForm";
import type { ActionState } from "@/lib/actionState";
import type { Profile } from "@/lib/database.types";
import { profilePhoto } from "@/lib/accountRules";
import {
  categoryAverages,
  eventHistory,
  filterReports,
  recurringWeakSkills,
  reportFilterOptions,
  reportSummaries,
  sessionAverages,
  skillBoards,
  strongestAndWeakest,
  type AwardRow,
  type CoachReport,
  type EventRow,
  type HistoryRow,
  type NextSession,
  type SkillDef,
} from "@/lib/coachingRules";
import { LEVEL_PIN, type PlayerLevelName } from "@/lib/coaching";
import { StatsTab } from "./StatsTab";
import { NotesTab } from "./NotesTab";
import { HistoryTab } from "./HistoryTab";
import { ProfileAvatar } from "../ProfileAvatar";
import type { ProfilePin } from "./SideCards";

const HAND = { R: "Tangan kanan", L: "Tangan kiri" } as const;
const POSITION = { right: "Posisi kanan", left: "Posisi kiri", both: "Posisi bebas" } as const;
const TABS = [
  { id: "statistik", label: "Statistik" },
  { id: "catatan", label: "Catatan coach" },
  { id: "riwayat", label: "Riwayat event" },
] as const;
export type ProfileTab = (typeof TABS)[number]["id"];

export function parseTab(tab: string | undefined): ProfileTab {
  if (tab === "notes") return "catatan";
  return TABS.some((t) => t.id === tab) ? (tab as ProfileTab) : "statistik";
}


/** Outline pill on the indigo header ("Edit profil"). */
const headerButton =
  "inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-11 px-4 rounded-full border border-snow/35 bg-transparent text-snow font-semibold text-sm no-underline whitespace-nowrap hover:border-volt hover:text-volt";

/** Quiet "Keluar" in the header's bottom-right corner. */
const signOutButton =
  "inline-flex items-center gap-1.5 min-h-10 px-1 bg-transparent border-none text-snow/70 font-semibold text-sm no-underline whitespace-nowrap hover:text-volt";

function SignOutLabel() {
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

/** Header tile value: the pin's color and its name ("Kuning"), or a dash before the first level. */
function PinValue({ pin }: { pin: ProfilePin | null }) {
  if (!pin) return <>–</>;
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span
        aria-hidden
        className="w-4 h-4 rounded-full flex-none shadow-[inset_0_0_0_1.5px_rgb(251_247_241/0.5)]"
        style={{ background: pin.color }}
      />
      <span className="truncate">{pin.name}</span>
    </span>
  );
}

/** Level set by the coaching assessments (players.level / level_color). */
export type ProfileLevel = { name: string; color: string };

/** The player profile (D.1–D.5), shared by /akun (real data) and /akun-demo (sample data). */
export function ProfileView({
  profile,
  googleAvatar,
  tab,
  coach,
  year,
  tersambung,
  claimedName,
  skills,
  reports,
  level,
  history,
  nextSession,
  points,
  wins,
  losses,
  playerName,
  basePath,
  banner,
  signOutAction,
}: {
  profile: Pick<Profile, "nickname" | "full_name" | "gender" | "region" | "dominant_hand" | "position" | "photo_url" | "photo_source" | "player_id" | "claim_player_id">;
  /** Google account picture: shown while no photo is saved, unless the player chose no photo (profilePhoto). */
  googleAvatar?: string | null;
  tab: ProfileTab;
  coach?: string;
  year?: string;
  tersambung?: boolean;
  claimedName?: string | null;
  skills: SkillDef[];
  reports: CoachReport[];
  level?: ProfileLevel | null;
  history: { history: HistoryRow[]; awards: AwardRow[]; events: EventRow[] };
  /** The nearest open coaching session ("Sesi berikutnya"). */
  nextSession?: NextSession | null;
  /** The leaderboard's numbers (players.points / wins / losses). */
  points: number;
  wins: number;
  losses: number;
  /** players.name, to tell the player's teammate apart in team names ("Nadia / Salsa"). */
  playerName?: string | null;
  basePath: string;
  banner?: React.ReactNode;
  /** "Keluar", next to "Edit profil" (a server-action form, or a plain link in the demo). */
  /** Signs the player out ("Keluar" asks to confirm first); the demo passes a stand-in. */
  signOutAction: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const boards = skillBoards(skills, reports);
  const { best, weakest } = strongestAndWeakest(boards);
  const pin: ProfilePin | null = level ? { name: LEVEL_PIN[level.name as PlayerLevelName] ?? level.name, color: level.color } : null;
  const averages = sessionAverages(reports);
  const latest = filterReports(reports, {})[0] ?? null;
  const events = eventHistory(history.history, history.awards, history.events, {
    ownName: playerName ?? profile.nickname,
    coaching: reports,
  });

  const displayName = profile.full_name || profile.nickname; // the design's header shows the full name
  const chips = [
    profile.gender === "F" ? "Women" : "Men",
    profile.region,
    profile.dominant_hand && HAND[profile.dominant_hand],
    profile.position && POSITION[profile.position],
  ].filter(Boolean) as string[];
  const stats = [
    { label: "Pin", value: <PinValue pin={pin} /> },
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
            <ProfileAvatar
              name={displayName}
              photoUrl={profilePhoto(profile, googleAvatar ?? null)}
              className="w-18 h-18 md:w-24 md:h-24 text-2xl md:text-[34px] border-4 border-snow/20"
            />
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <div className="text-caption tracking-[0.12em] font-bold text-volt">PROFIL SAYA</div>
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="font-display font-bold text-[28px] md:text-5xl leading-none m-0 truncate">{displayName}</h1>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full max-w-180">
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
            <ActionForm
              action={signOutAction}
              successText={false}
              confirmText="Yakin mau keluar dari akun Basecamp Padel?"
              confirmLabel="Ya, keluar"
              className="self-end flex-none"
            >
              <button type="submit" className={signOutButton}>
                <SignOutLabel />
              </button>
            </ActionForm>
          </div>
        </div>
      </section>

      <nav aria-label="Profil" className="bg-white border-b border-ink/8 px-4 md:px-12 sticky top-[calc(3.5rem+env(safe-area-inset-top))] md:top-[88px] z-20">
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

          {tab === "statistik" && (
            <StatsTab
              boards={boards}
              radar={categoryAverages(boards, reports)}
              averages={averages}
              latest={latest}
              nextSession={nextSession}
              basePath={basePath}
            />
          )}
          {tab === "catatan" && (
            <NotesTab
              shown={filterReports(reports, { coach, year })}
              newestId={latest?.id ?? null}
              summaries={reportSummaries(skills, reports)}
              {...reportFilterOptions(reports)}
              coach={coach}
              year={year}
              recurring={recurringWeakSkills(boards, reports)}
              pin={pin}
              best={best}
              weakest={weakest}
              nextSession={nextSession}
              basePath={basePath}
            />
          )}
          {tab === "riwayat" && (
            <HistoryTab entries={events} points={points} wins={wins} losses={losses} coachingSessions={reports.length} nextSession={nextSession} basePath={basePath} />
          )}

        </div>
      </div>
    </PublicShell>
  );
}

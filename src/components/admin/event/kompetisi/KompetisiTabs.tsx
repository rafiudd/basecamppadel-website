import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { BracketIcon, ChartIcon, FormatIcon, ListIcon } from "@/components/ui/icons";
import { finishCompetition } from "@/app/admin/events/match-actions";
import { courtNameOf, teamNameOf, type CompetitionData } from "@/lib/compData";
import type { CompScoreLog } from "@/lib/database.types";
import type { PlayerSummary } from "@/components/admin/event/types";
import { FormatTab } from "./FormatTab";
import { MatchTab } from "./MatchTab";
import { KlasemenTab } from "./KlasemenTab";
import { PlayoffTab } from "./PlayoffTab";

export type CompTab = "format" | "match" | "klasemen" | "playoff";

export const validCompTab = (v?: string): CompTab => (v === "match" || v === "klasemen" || v === "playoff" ? v : "format");

const TABS: { id: CompTab; label: string; icon: React.ReactNode }[] = [
  { id: "format", label: "Format", icon: <FormatIcon /> },
  { id: "match", label: "Match", icon: <ListIcon /> },
  { id: "klasemen", label: "Klasemen", icon: <ChartIcon /> },
  { id: "playoff", label: "Playoff", icon: <BracketIcon /> },
];

/** Kompetisi event page body: tab bar (one tab per URL ?tab=), warnings, and the active tab. */
export function KompetisiTabs({
  data,
  players,
  tab,
  presetName,
  scoreLog,
}: {
  data: CompetitionData;
  players: PlayerSummary[];
  tab: CompTab;
  presetName: string | null;
  scoreLog: CompScoreLog[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <TabNav eventId={data.event.id} tab={tab} />
      <ConflictsAlert data={data} />
      <FinishBanner data={data} />
      {tab === "format" && <FormatTab data={data} players={players} presetName={presetName} />}
      {tab === "match" && <MatchTab data={data} scoreLog={scoreLog} />}
      {tab === "klasemen" && <KlasemenTab data={data} />}
      {tab === "playoff" && <PlayoffTab data={data} />}
    </div>
  );
}

function TabNav({ eventId, tab }: { eventId: string; tab: CompTab }) {
  return (
    <nav className="flex gap-1.5 md:gap-2" aria-label="Bagian event">
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Link
            key={t.id}
            href={`/admin/events/${eventId}?tab=${t.id}`}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`no-underline flex-1 basis-0 md:flex-none md:basis-auto justify-center px-1.5 md:px-4 text-caption md:text-sm flex items-center gap-2 rounded-full min-h-11 box-border font-bold ${
              on ? "bg-volt text-indigo" : "bg-ink-3 text-snow/85"
            }`}
          >
            <span className="hidden md:inline-flex">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ConflictsAlert({ data }: { data: CompetitionData }) {
  if (!data.conflicts.length) return null;
  return (
    <div role="alert" className="bg-loss/15 rounded-card px-4.5 py-3.5 flex flex-col gap-1 text-sm">
      <div className="font-bold text-coral-soft">Ada bentrok jadwal court / tim</div>
      {data.conflicts.map((c, i) => {
        const a = data.matches.find((m) => m.id === c.a);
        return (
          <div key={i} className="text-caption text-snow/80">
            {c.kind === "court"
              ? `${courtNameOf(data.courts, a?.court_id ?? null)} terjadwal untuk dua match di jam yang sama.`
              : `${teamNameOf(data.teams, a?.team_a_id ?? null)} terjadwal main di dua match di jam yang sama.`}
          </div>
        );
      })}
    </div>
  );
}

function FinishBanner({ data }: { data: CompetitionData }) {
  const final = data.matches.find((m) => m.stage === "final");
  if (data.event.status === "finished" || final?.status !== "finished") return null;
  return (
    <div className="bg-win/20 rounded-card px-4.5 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="font-display font-bold text-lg">Final sudah selesai</div>
        <p className="text-sm text-snow/80 m-0">Selesaikan event untuk mengunci tahap akhir tiap tim dan membagikan poin leaderboard.</p>
      </div>
      <ActionForm action={finishCompetition} confirmLabel="Ya, selesaikan" confirmText="Selesaikan event ini? Poin leaderboard langsung ditambahkan ke semua pemain.">
        <input type="hidden" name="event_id" value={data.event.id} />
        <button type="submit" className="btn btn-volt">Selesaikan event</button>
      </ActionForm>
    </div>
  );
}

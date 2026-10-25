"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { ChipTabs, SegmentedTabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { rescheduleAuto } from "@/app/admin/events/match-actions";
import { STAGE_LABEL, type KoStage } from "@/lib/competition";
import { koShort } from "@/lib/compLabels";
import type { CompetitionData } from "@/lib/compData";
import type { CompEvent, CompScoreLog, Match } from "@/lib/database.types";
import { card, sectionTitle } from "@/components/admin/event/types";
import { MatchRow } from "./MatchRow";
import { ScoreModal } from "./ScoreModal";
import { ScoreLog } from "./ScoreLog";

type Mode = "grp" | "ko";

/** Matches of one group or one knockout round, each with inline court/time and its next action. */
export function MatchTab({ data, scoreLog }: { data: CompetitionData; scoreLog: CompScoreLog[] }) {
  const { event, matches, groups, ko } = data;
  const [mode, setMode] = useState<Mode>(groups.some((g) => !g.complete) || !ko.length ? "grp" : "ko");
  const groupMatches = matches.filter((m) => m.stage === "group");
  // Round tab = this match's position in its own group's court queue (1st match on that court,
  // 2nd, ...), not `round_no` (the round-robin pairing round). With 4 teams per group a
  // round-robin round already has 2 simultaneous pairs, which bundled 2 matches per group into
  // one tab — only the court queue position is actually simultaneous across groups, since every
  // group's court advances one match at a time on the same shared time grid.
  const slotByMatchId = new Map<string, number>();
  const byGroupLabel = new Map<string, typeof groupMatches>();
  for (const m of groupMatches) {
    const key = m.group_label ?? "";
    if (!byGroupLabel.has(key)) byGroupLabel.set(key, []);
    byGroupLabel.get(key)!.push(m);
  }
  for (const list of byGroupLabel.values()) {
    list.sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
    list.forEach((m, i) => slotByMatchId.set(m.id, i + 1));
  }
  const slotOf = (m: Match) => slotByMatchId.get(m.id) ?? m.round_no ?? 0;
  const rounds = [...new Set(groupMatches.map(slotOf))].sort((a, b) => a - b);
  const [roundStr, setRoundStr] = useState(
    String(rounds.find((r) => groupMatches.some((m) => slotOf(m) === r && m.status !== "finished")) ?? rounds[0] ?? 0),
  );
  const roundNo = Number(roundStr);
  const [stage, setStage] = useState<KoStage | "">(ko.find((r) => r.matches.some((m) => m.status !== "finished"))?.stage ?? ko[0]?.stage ?? "");
  const [editing, setEditing] = useState<Match | null>(null);

  const koRound = mode === "ko" ? ko.find((r) => r.stage === stage) : null;
  const list =
    mode === "grp"
      ? groupMatches.filter((m) => slotOf(m) === roundNo).sort((a, b) => (a.group_label ?? "").localeCompare(b.group_label ?? ""))
      : (koRound?.matches.filter((m) => !m.is_bye) ?? []);
  const title = mode === "grp" ? `Ronde ${roundNo}` : koRound ? STAGE_LABEL[koRound.stage] : "";

  return (
    <div className="flex flex-col gap-4">
      <div className={sectionTitle}>Daftar match</div>
      <SegmentedTabs<Mode>
        className="md:max-w-115"
        value={mode}
        onChange={setMode}
        options={[
          { value: "grp", label: "Fase grup", count: matches.filter((m) => m.stage === "group").length },
          { value: "ko", label: "Knockout", count: matches.filter((m) => m.stage !== "group" && !m.is_bye).length },
        ]}
      />
      {mode === "grp" ? (
        <ChipTabs<string>
          value={roundStr}
          onChange={setRoundStr}
          options={rounds.map((r) => ({ value: String(r), label: `Ronde ${r}`, count: groupMatches.filter((m) => slotOf(m) === r).length }))}
        />
      ) : (
        <ChipTabs<KoStage | "">
          value={stage}
          onChange={setStage}
          options={ko.map((r) => ({ value: r.stage, label: STAGE_LABEL[r.stage], count: r.matches.filter((m) => !m.is_bye).length }))}
        />
      )}

      {list.length ? (
        <div className={`${card} px-4.5 pt-3.5 pb-1`}>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="font-display font-bold text-title-sm">{title}</div>
            <div className="text-caption text-snow/70">{sectionSummary(list)}</div>
          </div>
          {list.map((m) => (
            <MatchRow key={m.id} m={m} label={m.stage === "group" ? `Grup ${m.group_label ?? ""}` : koShort(m)} data={data} onEditScore={() => setEditing(m)} />
          ))}
        </div>
      ) : (
        <EmptyState>
          {mode === "grp" ? "Belum ada jadwal fase grup. Buat jadwal di tab Format." : "Bracket knockout dibuat setelah fase grup selesai, dari tab Playoff."}
        </EmptyState>
      )}

      {matches.length > 0 && <ScheduleCard event={event} />}
      <ScoreLog log={scoreLog} matches={matches} />
      {editing && <ScoreModal m={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** "3 match · selesai", "1 berjalan · 1 siap", "Menunggu babak sebelumnya". */
function sectionSummary(list: Match[]) {
  const done = list.filter((m) => m.status === "finished").length;
  if (done === list.length) return `${list.length} match · selesai`;
  const live = list.filter((m) => m.status === "live").length;
  const ready = list.filter((m) => m.status === "scheduled" && m.team_a_id && m.team_b_id).length;
  if (!live && !ready) return "Menunggu babak sebelumnya";
  return [live && `${live} berjalan`, ready && `${ready} siap`, done && `${done} selesai`].filter(Boolean).join(" · ");
}

function ScheduleCard({ event }: { event: CompEvent }) {
  const start = event.start_time?.slice(0, 5);
  return (
    <div className="bg-ink-3 rounded-card px-4.5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex flex-col gap-0.5">
        <div className="font-bold text-sm">Jadwal court</div>
        <div className="text-caption text-snow/75">
          {event.court_ids.length || 1} court{start ? ` · mulai ${start}` : ""} · {event.match_minutes} menit per match. Court &amp; jam tiap match bisa diubah manual.
        </div>
      </div>
      <ActionForm action={rescheduleAuto} successText="Jadwal disusun ulang" confirmLabel="Ya, susun ulang" confirmText="Susun ulang court dan jam semua match yang belum dimainkan?">
        <input type="hidden" name="event_id" value={event.id} />
        <button type="submit" className="btn min-h-10 px-4.5 tracking-button whitespace-nowrap">Susun ulang otomatis</button>
      </ActionForm>
    </div>
  );
}

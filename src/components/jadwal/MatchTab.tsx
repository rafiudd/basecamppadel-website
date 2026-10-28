"use client";

import { useState } from "react";
import { YOUTUBE_URL } from "@/lib/config";
import type { EventItem, EventMatchesData } from "@/lib/events";
import { UnitScheduleModal } from "@/components/jadwal/UnitScheduleModal";
import { TeamScheduleModal } from "@/components/jadwal/TeamScheduleModal";

export function MatchTab({
  event,
  matches,
}: {
  event: EventItem;
  matches: EventMatchesData | null;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState("");
  const openUnit = openKey ? matches?.unitSchedules?.[openKey] : null;
  const openTeam = openKey ? matches?.teamSchedules?.[openKey] : null;
  const hasMatches =
    (matches?.rounds && matches.rounds.length > 0) ||
    (matches?.knockout && matches.knockout.length > 0) ||
    (matches?.quarterfinals && matches.quarterfinals.length > 0) ||
    (matches?.groupMatches && matches.groupMatches.length > 0);

  if (!hasMatches) {
    return (
      <section className="border-2 border-dashed border-ink/20 rounded-2xl p-9 md:p-12 text-center text-ink flex flex-col gap-2 items-center bg-white/40">
        <div className="font-display font-bold text-[19px]">Jadwal match belum keluar</div>
        <p className="text-[15px] leading-relaxed text-ink/70 max-w-lg m-0">
          Pembagian grup dan jadwal match diumumkan setelah pendaftaran tutup. Setelah itu skor tiap match bisa dipantau langsung di sini.
        </p>
      </section>
    );
  }

  // Americano rounds if present (Mabar)
  if (matches?.rounds && matches.rounds.length > 0) {
    const pairOptions =
      matches.groups?.[0]?.rows
        .filter((row) => row.key && matches.unitSchedules?.[row.key])
        .map((row) => ({ key: row.key!, name: row.team })) ?? [];

    const filtered = filterKey ? matches.rounds.filter((r) => r.p1Key === filterKey || r.p2Key === filterKey) : matches.rounds;

    // Courts in first-seen order, so the same court always lands in the same grid slot (left/right)
    // and — for "Mabar with Coach", which runs two separate groups side by side, each locked to its
    // own court — always gets the same color, instead of swapping sides/colors round to round.
    const courtOrder = new Map<string, number>();
    for (const r of matches.rounds) {
      if (r.courtId && !courtOrder.has(r.courtId)) courtOrder.set(r.courtId, courtOrder.size);
    }
    const isCoachMabar = /mabar with coach/i.test(event.title);
    const COURT_COLORS = ["#FFD43B", "#7C9CFF"]; // court 1 (volt), court 2 (periwinkle); more courts just go borderless
    const courtColor = new Map<string, string>();
    if (isCoachMabar) {
      for (const [courtId, idx] of courtOrder) courtColor.set(courtId, COURT_COLORS[idx % COURT_COLORS.length]);
    }

    // Group consecutive rows that share a round label (one per court) into one block, each block's
    // rows sorted into the same court order every time.
    const groups: { round: string; rows: typeof filtered }[] = [];
    for (const r of filtered) {
      const last = groups.at(-1);
      if (last && last.round === r.round) last.rows.push(r);
      else groups.push({ round: r.round, rows: [r] });
    }
    for (const g of groups) {
      g.rows.sort((a, b) => (courtOrder.get(a.courtId ?? "") ?? 0) - (courtOrder.get(b.courtId ?? "") ?? 0));
    }

    const name = (label: string, key: string | undefined) =>
      key && matches.unitSchedules?.[key] ? (
        <button type="button" onClick={() => setOpenKey(key)} className="truncate text-left hover:underline underline-offset-2">
          {label}
        </button>
      ) : (
        <span className="truncate">{label}</span>
      );

    return (
      <div className="flex flex-col gap-6">
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 text-ink shadow-xs">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-display font-bold text-[19px] m-0">Hasil match Americano</h2>
            <span className="text-[13px] text-ink/60">
              {matches.roundsTotal != null ? `${matches.roundsDone ?? 0} dari ${matches.roundsTotal} ronde selesai` : null}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap pb-1">
            <label className="text-xs font-semibold text-ink/55" htmlFor="pair-filter">
              Jadwal saya:
            </label>
            <select
              id="pair-filter"
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="text-sm font-semibold rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-ink max-w-[220px]"
            >
              <option value="">Semua pasangan</option>
              {pairOptions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
            {filterKey && <span className="text-[13px] text-ink/50">{filtered.length} match</span>}
          </div>

          {groups.length === 0 && <div className="text-sm text-ink/55 py-4 text-center">Belum ada match untuk pasangan ini.</div>}

          {groups.map((g, i) => {
            const allFinished = g.rows.every((r) => r.status === "finished");
            const anyFinished = g.rows.some((r) => r.status === "finished");
            return (
              <div key={i} className="pt-3 border-t border-ink/7 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="text-xs font-bold text-ink/60">{g.round}</div>
                  <div className="text-[11px] font-semibold text-ink/40">
                    {allFinished ? "Selesai" : anyFinished ? "Sebagian selesai" : "Belum main"}
                  </div>
                </div>
                <div className={`grid gap-2.5 ${g.rows.length > 1 ? "sm:grid-cols-2" : ""}`}>
                  {g.rows.map((r, j) => {
                    const finished = r.status === "finished";
                    const aWin = finished && r.s1 > r.s2;
                    const bWin = finished && r.s2 > r.s1;
                    // When a pair is picked, color the whole card by their result instead of the
                    // generic winner-row highlight: blue win (green is already the winner-row color
                    // inside every card), red loss, gray draw, white if not played.
                    const mySide = filterKey ? (r.p1Key === filterKey ? "a" : r.p2Key === filterKey ? "b" : null) : null;
                    const myResult = !finished || !mySide ? null : mySide === "a" ? (aWin ? "W" : bWin ? "L" : "D") : bWin ? "W" : aWin ? "L" : "D";
                    const cardClass = mySide
                      ? myResult === "W"
                        ? "border-blue-400/50 bg-blue-500/8"
                        : myResult === "L"
                        ? "border-loss/40 bg-loss/8"
                        : myResult === "D"
                        ? "border-ink/20 bg-ink/5"
                        : "border-ink/8"
                      : "border-ink/8";
                    const dot = r.courtId ? courtColor.get(r.courtId) : undefined;
                    return (
                      <div
                        key={j}
                        className={`rounded-lg border p-2.5 flex flex-col gap-1 ${cardClass}`}
                        style={dot ? { borderLeft: `3px solid ${dot}` } : undefined}
                      >
                        {g.rows.length > 1 && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink/35 uppercase tracking-wide">
                            {dot && <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: dot }} />}
                            {r.time}
                          </div>
                        )}
                        <div className={`flex items-center justify-between gap-2.5 min-h-[28px] px-1.5 rounded-md ${aWin ? "bg-[#2f9e5c]/12" : ""}`}>
                          <span className={`text-sm truncate ${aWin ? "font-bold text-ink" : bWin ? "font-semibold text-ink/50" : "font-semibold text-ink"}`}>
                            {name(r.p1, r.p1Key)}
                          </span>
                          <span className={`font-display font-bold text-base ${aWin ? "text-[#23794A]" : "text-ink"}`}>{finished ? r.s1 : "—"}</span>
                        </div>
                        <div className={`flex items-center justify-between gap-2.5 min-h-[28px] px-1.5 rounded-md ${bWin ? "bg-[#2f9e5c]/12" : ""}`}>
                          <span className={`text-sm truncate ${bWin ? "font-bold text-ink" : aWin ? "font-semibold text-ink/50" : "font-semibold text-ink"}`}>
                            {name(r.p2, r.p2Key)}
                          </span>
                          <span className={`font-display font-bold text-base ${bWin ? "text-[#23794A]" : "text-ink"}`}>{finished ? r.s2 : "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
        {openUnit && <UnitScheduleModal name={openUnit.name} rows={openUnit.rows} onClose={() => setOpenKey(null)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Knockout section */}
      {matches?.knockout && matches.knockout.length > 0 && (
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-bold text-[19px] m-0">Knockout</h2>
            <span className="text-[13px] text-ink/60">
              {event.status === "live" ? "1 live · 2 tersisa" : "Selesai"}
            </span>
          </div>

          <div className={`grid gap-2.5 ${matches.knockout.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {matches.knockout.map((m, idx) => (
              <MatchCard key={idx} title={m.round} subtitle={m.court} status={m.status} streamUrl={m.streamUrl} team1={m.team1} team2={m.team2} onTeamClick={setOpenKey} />
            ))}
          </div>
        </section>
      )}

      {/* 8 Besar (Quarterfinals) */}
      {matches?.quarterfinals && matches.quarterfinals.length > 0 && (
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-bold text-[19px] m-0">8 besar</h2>
            <span className="text-[13px] text-ink/60">Selesai</span>
          </div>

          <div className={`grid gap-2.5 ${matches.quarterfinals.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {matches.quarterfinals.map((q, idx) => (
              <MatchCard key={idx} title={q.round} subtitle={q.court} status={q.status} streamUrl={q.streamUrl} team1={q.team1} team2={q.team2} onTeamClick={setOpenKey} />
            ))}
          </div>
        </section>
      )}

      {/* Fase Grup matches — one section per round, so matches running in parallel (one per group/court) are easy to scan together */}
      {matches?.groupMatches && matches.groupMatches.length > 0 && (() => {
        const byRound = new Map<number, typeof matches.groupMatches>();
        for (const g of matches.groupMatches) {
          if (!byRound.has(g.round)) byRound.set(g.round, []);
          byRound.get(g.round)!.push(g);
        }
        return [...byRound.entries()].sort(([a], [b]) => a - b).map(([round, rows]) => (
          <section key={round} className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display font-bold text-[19px] m-0">Fase grup · Ronde {round}</h2>
              <span className="text-[13px] text-ink/60">
                {rows.every((r) => r.status === "finished") ? "Selesai" : rows.some((r) => r.status === "live") ? "Berlangsung" : "Belum main"}
              </span>
            </div>

            <div className={`grid gap-2.5 ${rows.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {rows.map((g, idx) => (
                <MatchCard key={idx} title={g.group} subtitle={g.court} status={g.status} team1={g.team1} team2={g.team2} onTeamClick={setOpenKey} />
              ))}
            </div>
          </section>
        ));
      })()}
      {openTeam && <TeamScheduleModal name={openTeam.name} rows={openTeam.rows} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

/** One match, styled the same as an Americano round card: bordered tile, label header, winner row highlighted green. */
function MatchCard({
  title,
  subtitle,
  status,
  streamUrl,
  team1,
  team2,
  onTeamClick,
}: {
  title: string;
  subtitle?: string;
  status: "live" | "next" | "waiting" | "finished";
  streamUrl?: string;
  team1: { id?: string; name: string; score: string; winner?: boolean };
  team2: { id?: string; name: string; score: string; winner?: boolean };
  onTeamClick?: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-ink/8 p-2.5 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-ink/35 uppercase tracking-wide truncate">{title}</div>
          {subtitle && <div className="text-[10px] font-normal text-ink/35 truncate">{subtitle}</div>}
        </div>
        <StatusBadge status={status} streamUrl={streamUrl} />
      </div>
      <TeamRow id={team1.id} name={team1.name} score={team1.score} winner={team1.winner} loserDim={!!team2.winner} onClick={onTeamClick} />
      <TeamRow id={team2.id} name={team2.name} score={team2.score} winner={team2.winner} loserDim={!!team1.winner} onClick={onTeamClick} />
    </div>
  );
}

function TeamRow({
  id,
  name,
  score,
  winner,
  loserDim,
  onClick,
}: {
  id?: string;
  name: string;
  score: string;
  winner?: boolean;
  loserDim?: boolean;
  onClick?: (id: string) => void;
}) {
  const nameClass = `text-sm truncate ${winner ? "font-bold text-ink" : loserDim ? "font-semibold text-ink/50" : "font-semibold text-ink"}`;
  return (
    <div className={`flex items-center justify-between gap-2.5 min-h-[28px] px-1.5 rounded-md ${winner ? "bg-[#2f9e5c]/12" : ""}`}>
      {id && onClick ? (
        <button type="button" onClick={() => onClick(id)} className={`${nameClass} text-left hover:underline underline-offset-2`}>
          {name}
        </button>
      ) : (
        <span className={nameClass}>{name}</span>
      )}
      <span className={`font-display font-bold text-base ${winner ? "text-[#23794A]" : loserDim ? "text-ink/50" : "text-ink"}`}>
        {score || "—"}
      </span>
    </div>
  );
}

function StatusBadge({ status, streamUrl }: { status: "live" | "next" | "waiting" | "finished"; streamUrl?: string }) {
  if (status === "live") {
    return (
      <a
        href={streamUrl || YOUTUBE_URL}
        target="_blank"
        rel="noopener"
        className="flex-none no-underline inline-flex items-center gap-1 rounded-full py-1 px-2 text-[10px] font-bold bg-coral text-ink whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-ink" />
        LIVE
      </a>
    );
  }
  const label = status === "next" ? "Berikutnya" : status === "waiting" ? "Menunggu" : "Selesai";
  const tone = status === "next" ? "text-ink/65" : status === "waiting" ? "text-ink/50" : "text-ink/55";
  return <span className={`flex-none text-[10px] font-bold ${tone} whitespace-nowrap`}>{label}</span>;
}

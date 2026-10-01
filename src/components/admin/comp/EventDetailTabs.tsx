"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import {
  Bracket,
  MatchStatus,
  StandingsTable,
  feederLabel,
  seedMap,
} from "@/components/comp/CompViews";
import {
  addTeam,
  clearGroupSchedule,
  correctScore,
  finishCompetition,
  generateBracket,
  generateGroupSchedule,
  goLive,
  removeTeam,
  rescheduleAuto,
  shuffleGroups,
  swapBracketTeams,
  updateMatchSlot,
} from "@/app/admin/events/actions";
import {
  FINAL_STAGE_LABEL,
  STAGE_LABEL,
  type KoStage,
} from "@/lib/competition";
import { isoToWibTime, type CompetitionData } from "@/lib/compData";
import type { Match, Player } from "@/lib/database.types";

type PlayerSummary = Pick<Player, "id" | "name" | "gender" | "level">;

export function EventDetailTabs({
  data,
  availablePlayers,
  initialTab = "format",
}: {
  data: CompetitionData;
  availablePlayers: PlayerSummary[];
  initialTab?: string;
}) {
  const validTab = (value?: string): "format" | "match" | "klasemen" | "playoff" => {
    return value === "match" || value === "klasemen" || value === "playoff" ? value : "format";
  };

  const [tab, setTab] = useState<"format" | "match" | "klasemen" | "playoff">(
    validTab(initialTab)
  );
  const [matchSubtab, setMatchSubtab] = useState<"grup" | "knockout">("grup");

  // Edit score modal state
  const [editingScoreMatch, setEditingScoreMatch] = useState<Match | null>(null);

  // Edit slot modal state
  const [editingSlotMatch, setEditingSlotMatch] = useState<Match | null>(null);

  // Add team form toggle
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newP1, setNewP1] = useState("");
  const [newP2, setNewP2] = useState("");

  const { event, teams, matches, groups, ko, conflicts, courtName, teamName } = data;
  const isDraft = event.status === "draft" && matches.length === 0;
  const hasGroupSchedule = matches.some((m) => m.stage === "group");
  const hasMatchesPlayed = matches.some((m) => m.status !== "scheduled" && !m.is_bye);

  // Knockout seeds and feeder labels
  const seeds = seedMap(groups);
  const waitingLabel = feederLabel(matches);

  // Filter matches
  const groupMatches = matches.filter((m) => m.stage === "group");
  const koMatches = matches.filter((m) => m.stage !== "group");

  // Used player IDs in existing teams
  const usedPlayerIds = new Set(teams.flatMap((t) => t.players.map((p) => p.id)));

  // Check if final match is finished
  const finalMatch = matches.find((m) => m.stage === "final");
  const canFinishEvent = event.status !== "finished" && finalMatch?.status === "finished";

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-snow/10 pb-2 overflow-x-auto">
        {[
          { id: "format", label: "Format" },
          { id: "match", label: `Match (${matches.filter((m) => !m.is_bye).length})` },
          { id: "klasemen", label: "Klasemen" },
          { id: "playoff", label: "Playoff (Bracket)" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(validTab(t.id))}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-none transition-colors ${
              tab === t.id ? "bg-indigo text-snow" : "bg-transparent text-snow/60 hover:text-snow"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conflicts warning */}
      {conflicts.length > 0 && (
        <div className="bg-loss/15 border border-loss/30 text-snow rounded-xl p-4 flex flex-col gap-1 text-sm">
          <div className="font-bold text-loss flex items-center gap-2">
            <span>⚠️</span>
            <span>Perhatian: Ada bentrok jadwal court / tim</span>
          </div>
          {conflicts.map((c, i) => {
            const aMatch = matches.find((m) => m.id === c.a);
            const bMatch = matches.find((m) => m.id === c.b);
            const courtId = aMatch?.court_id ?? bMatch?.court_id ?? null;
            const teamId = aMatch?.team_a_id ?? bMatch?.team_a_id ?? null;

            return (
              <div key={i} className="text-xs text-snow/80">
                {c.kind === "court"
                  ? `Court "${courtName(courtId)}" terjadwal untuk dua match di waktu yang overlap.`
                  : `Tim "${teamName(teamId)}" terjadwal main di dua match pada waktu yang sama.`}
              </div>
            );
          })}
        </div>
      )}

      {/* Banner Selesaikan Event jika final selesai */}
      {canFinishEvent && (
        <div className="bg-win/20 border border-win/40 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-display font-bold text-lg text-snow">Match Final Telah Selesai! 🎉</div>
            <p className="text-sm text-snow/80 m-0">
              Selesaikan event ini untuk mengunci tahap akhir setiap tim dan mendistribusikan poin leaderboard.
            </p>
          </div>
          <ActionForm
            action={finishCompetition}
            confirmText="Selesaikan event ini sekarang? Poin leaderboard akan otomatis ditambahkan ke seluruh pemain."
          >
            <input type="hidden" name="event_id" value={event.id} />
            <button type="submit" className="btn btn-volt font-bold text-ink px-5 py-2.5">
              🏆 Selesaikan Event & Bagikan Poin
            </button>
          </ActionForm>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: FORMAT */}
      {/* ========================================================================= */}
      {tab === "format" && (
        <div className="flex flex-col gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-ink-3 rounded-xl p-4 border border-snow/5">
              <span className="text-xs text-snow/50 block">Jumlah Tim</span>
              <span className="font-display font-bold text-2xl text-snow">
                {teams.length} / {event.num_teams}
              </span>
            </div>
            <div className="bg-ink-3 rounded-xl p-4 border border-snow/5">
              <span className="text-xs text-snow/50 block">Fase Grup</span>
              <span className="font-display font-bold text-2xl text-snow">
                {event.num_groups} Grup
              </span>
            </div>
            <div className="bg-ink-3 rounded-xl p-4 border border-snow/5">
              <span className="text-xs text-snow/50 block">Lolos per Grup</span>
              <span className="font-display font-bold text-2xl text-snow">
                Top {event.advance_per_group}
              </span>
            </div>
            <div className="bg-ink-3 rounded-xl p-4 border border-snow/5">
              <span className="text-xs text-snow/50 block">Mulai Knockout</span>
              <span className="font-display font-bold text-2xl text-volt">
                {STAGE_LABEL[event.ko_start]}
              </span>
            </div>
          </div>

          {/* Roster Tim & Grup */}
          <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-display font-bold text-lg">Daftar Tim & Penempatan Grup</div>
                <p className="text-xs text-snow/60 m-0">
                  {isDraft
                    ? "Susun pasangan tim dan bagikan ke dalam grup sebelum membuat jadwal."
                    : "Jadwal sudah dibuat. Roster tim terkunci."}
                </p>
              </div>

              {isDraft && (
                <div className="flex items-center gap-2">
                  <ActionForm action={shuffleGroups}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <button type="submit" className="btn px-3 py-1.5 text-xs bg-snow/10 hover:bg-snow/20">
                      🎲 Acak Grup
                    </button>
                  </ActionForm>
                  {teams.length < event.num_teams && (
                    <button
                      type="button"
                      onClick={() => setShowAddTeam(!showAddTeam)}
                      className="btn btn-coral px-3 py-1.5 text-xs"
                    >
                      {showAddTeam ? "Batal" : "+ Tambah Tim"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Form Tambah Tim (jika draft) */}
            {isDraft && showAddTeam && (
              <ActionForm
                action={addTeam}
                className="bg-ink-2 rounded-xl p-4 flex flex-col md:flex-row items-end gap-3 border border-coral/30"
              >
                <input type="hidden" name="event_id" value={event.id} />
                <div className="flex-1 w-full">
                  <div className="label">Pemain 1</div>
                  <select
                    name="p1"
                    value={newP1}
                    onChange={(e) => setNewP1(e.target.value)}
                    required
                    className="field text-xs py-2"
                  >
                    <option value="">Pilih pemain 1...</option>
                    {availablePlayers.map((p) => (
                      <option key={p.id} value={p.id} disabled={usedPlayerIds.has(p.id)}>
                        {p.name} ({p.gender} · {p.level})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <div className="label">Pemain 2</div>
                  <select
                    name="p2"
                    value={newP2}
                    onChange={(e) => setNewP2(e.target.value)}
                    required
                    className="field text-xs py-2"
                  >
                    <option value="">Pilih pemain 2...</option>
                    {availablePlayers.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={usedPlayerIds.has(p.id) || p.id === newP1}
                      >
                        {p.name} ({p.gender} · {p.level})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-coral text-xs py-2 px-4 whitespace-nowrap">
                  Simpan Pasangan
                </button>
              </ActionForm>
            )}

            {/* List Tim */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map((t, idx) => (
                <div
                  key={t.id}
                  className="bg-ink-2 rounded-xl p-3 flex items-center justify-between gap-3 border border-snow/5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-indigo text-volt text-xs font-bold flex items-center justify-center flex-none">
                      {t.group_label ? `G${t.group_label}` : `#${idx + 1}`}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-snow truncate">{t.name}</div>
                      <div className="text-[11px] text-snow/50">
                        {t.final_stage ? FINAL_STAGE_LABEL[t.final_stage] : "Peserta Aktif"}
                      </div>
                    </div>
                  </div>

                  {isDraft && (
                    <ActionForm action={removeTeam} confirmText={`Hapus tim "${t.name}"?`}>
                      <input type="hidden" name="event_id" value={event.id} />
                      <input type="hidden" name="team_id" value={t.id} />
                      <button
                        type="submit"
                        className="btn px-2.5 py-1 text-xs bg-transparent text-snow/40 hover:text-loss border-none"
                      >
                        ✕
                      </button>
                    </ActionForm>
                  )}
                </div>
              ))}
              {teams.length === 0 && (
                <div className="col-span-2 text-center py-6 text-sm text-snow/40">
                  Belum ada tim terdaftar. Tambahkan pasangan tim terlebih dahulu.
                </div>
              )}
            </div>

            {/* Generate Jadwal Button */}
            {isDraft && teams.length >= 3 && (
              <div className="pt-4 border-t border-snow/10 flex justify-end">
                <ActionForm
                  action={generateGroupSchedule}
                  confirmText="Generate jadwal fase grup round-robin sekarang? Tim akan otomatis dijadwalkan pada court dan jam yang tersedia."
                >
                  <input type="hidden" name="event_id" value={event.id} />
                  <button type="submit" className="btn btn-coral py-2.5 px-5 font-bold">
                    🚀 Generate Jadwal Fase Grup
                  </button>
                </ActionForm>
              </div>
            )}

            {/* Clear Schedule Button (if no matches played) */}
            {hasGroupSchedule && !hasMatchesPlayed && (
              <div className="pt-4 border-t border-snow/10 flex justify-end">
                <ActionForm
                  action={clearGroupSchedule}
                  confirmText="Hapus seluruh jadwal dan kembalikan event ke draft? Posisi tim dan grup tidak akan hilang."
                >
                  <input type="hidden" name="event_id" value={event.id} />
                  <button
                    type="submit"
                    className="btn px-4 py-2 text-xs bg-loss/15 text-loss hover:bg-loss/25 border-none"
                  >
                    Hapus Jadwal (Reset ke Draft)
                  </button>
                </ActionForm>
              </div>
            )}
          </div>

          {/* Preset Poin Info */}
          <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-3">
            <div className="font-display font-bold text-lg">Poin Leaderboard Event Ini</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
              {[
                { label: "Juara", pts: event.points?.champion ?? 80 },
                { label: "Runner-up", pts: event.points?.runner_up ?? 50 },
                { label: "Semifinal", pts: event.points?.sf ?? 30 },
                { label: "8 Besar", pts: event.points?.qf ?? 15 },
                { label: "16 Besar", pts: event.points?.r16 ?? 10 },
                { label: "Grup", pts: event.points?.group ?? 5 },
              ].map((item, i) => (
                <div key={i} className="bg-ink-2 rounded-xl p-2.5 border border-snow/5">
                  <div className="text-snow/60">{item.label}</div>
                  <div className="font-display font-bold text-volt text-base mt-1">
                    +{item.pts} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MATCH */}
      {/* ========================================================================= */}
      {tab === "match" && (
        <div className="flex flex-col gap-5">
          {/* Sub-tab Grup vs Knockout & Action Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMatchSubtab("grup")}
                className={`px-4 py-2 rounded-full text-xs font-bold border-none transition-colors ${
                  matchSubtab === "grup" ? "bg-indigo text-snow" : "bg-ink-3 text-snow/60"
                }`}
              >
                Fase Grup ({groupMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setMatchSubtab("knockout")}
                className={`px-4 py-2 rounded-full text-xs font-bold border-none transition-colors ${
                  matchSubtab === "knockout" ? "bg-indigo text-snow" : "bg-ink-3 text-snow/60"
                }`}
              >
                Knockout ({koMatches.filter((m) => !m.is_bye).length})
              </button>
            </div>

            {matches.length > 0 && (
              <ActionForm
                action={rescheduleAuto}
                confirmText="Susun ulang waktu match yang belum dimainkan secara berurutan?"
              >
                <input type="hidden" name="event_id" value={event.id} />
                <button type="submit" className="btn px-3 py-1.5 text-xs bg-snow/10 hover:bg-snow/20">
                  ⏱ Susun Ulang Otomatis
                </button>
              </ActionForm>
            )}
          </div>

          {/* List Match */}
          <div className="flex flex-col gap-3">
            {(matchSubtab === "grup" ? groupMatches : koMatches).map((m) => {
              const isFinished = m.status === "finished";
              const timeStr = isoToWibTime(m.starts_at);
              const courtStr = courtName(m.court_id);
              const labelStage =
                m.stage === "group"
                  ? `Grup ${m.group_label}`
                  : m.stage === "final"
                  ? "Final"
                  : `${STAGE_LABEL[m.stage as KoStage]} · Match ${m.bracket_pos}`;

              return (
                <div
                  key={m.id}
                  className={`bg-ink-3 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border ${
                    m.is_live
                      ? "border-coral shadow-[0_0_20px_rgba(255,90,60,0.2)]"
                      : "border-snow/5"
                  }`}
                >
                  {/* Info Match */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-[100px] flex-none text-xs text-snow/60">
                      <span className="font-bold text-snow block">{timeStr || "TBD"}</span>
                      <span className="truncate block">{courtStr || "Tanpa Court"}</span>
                    </div>

                    <div className="h-9 w-px bg-snow/10 flex-none" />

                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-volt/90 mb-1 uppercase tracking-wide">
                        {labelStage}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            m.winner_team_id === m.team_a_id ? "font-bold text-volt" : "text-snow"
                          }`}
                        >
                          {m.team_a_name}
                        </span>
                        <span className="font-display font-bold text-base px-2 py-0.5 rounded bg-ink-2 text-snow">
                          {isFinished ? `${m.team_a_games} – ${m.team_b_games}` : "vs"}
                        </span>
                        <span
                          className={`text-sm truncate ${
                            m.winner_team_id === m.team_b_id ? "font-bold text-volt" : "text-snow"
                          }`}
                        >
                          {m.team_b_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 flex-none self-end md:self-auto">
                    <MatchStatus m={m} />

                    {/* Tombol Live-kan */}
                    {!isFinished && !m.is_bye && (
                      <ActionForm action={goLive}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <input type="hidden" name="match_id" value={m.id} />
                        <button
                          type="submit"
                          disabled={m.is_live}
                          className={`btn px-3 py-1.5 text-xs font-bold ${
                            m.is_live
                              ? "bg-coral text-snow cursor-default"
                              : "bg-snow/10 hover:bg-snow/20"
                          }`}
                        >
                          {m.is_live ? "● ON AIR" : "Live-kan"}
                        </button>
                      </ActionForm>
                    )}

                    {/* Buka Skor Live di Admin */}
                    <Link
                      href={`/admin/live?match=${m.id}`}
                      className="btn px-3 py-1.5 text-xs no-underline bg-snow/10 hover:bg-snow/20"
                    >
                      Buka Skor
                    </Link>

                    {/* Edit Skor Button */}
                    {!m.is_bye && (
                      <button
                        type="button"
                        onClick={() => setEditingScoreMatch(m)}
                        className="btn px-2.5 py-1.5 text-xs bg-snow/10 hover:bg-snow/20"
                        title="Edit / Selesaikan Skor"
                      >
                        ✏️ Skor
                      </button>
                    )}

                    {/* Ubah Slot Court & Waktu */}
                    <button
                      type="button"
                      onClick={() => setEditingSlotMatch(m)}
                      className="btn px-2.5 py-1.5 text-xs bg-snow/10 hover:bg-snow/20"
                      title="Ubah Court & Jam"
                    >
                      🕒 Slot
                    </button>
                  </div>
                </div>
              );
            })}

            {matches.length === 0 && (
              <div className="text-center py-10 bg-ink-3 rounded-2xl text-snow/50 text-sm">
                Belum ada match yang di-generate. Silakan generate jadwal di tab <b>Format</b>.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KLASEMEN */}
      {/* ========================================================================= */}
      {tab === "klasemen" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {groups.map((g) => (
              <StandingsTable
                key={g.label}
                group={g}
                advance={event.advance_per_group}
              />
            ))}
          </div>

          {groups.length === 0 && (
            <div className="text-center py-10 bg-ink-3 rounded-2xl text-snow/50 text-sm">
              Klasemen akan muncul setelah tim dikelompokkan ke dalam grup.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PLAYOFF (BRACKET) */}
      {/* ========================================================================= */}
      {tab === "playoff" && (
        <div className="flex flex-col gap-6">
          {/* Bracket Stale Warning */}
          {event.bracket_stale && (
            <div className="bg-coral/20 border border-coral text-snow rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-bold text-coral">⚠️ Bracket Perlu Diperbarui!</div>
                <div className="text-xs text-snow/80">
                  Skor di fase grup telah dikoreksi setelah bracket terbentuk. Susunan tim playoff mungkin perlu diperbarui.
                </div>
              </div>
              <ActionForm
                action={generateBracket}
                confirmText="Generate ulang bracket sekarang? Seluruh susunan match playoff yang belum dimainkan akan diperbarui."
              >
                <input type="hidden" name="event_id" value={event.id} />
                <button type="submit" className="btn btn-coral py-2 px-4 text-xs font-bold">
                  Generate Ulang Bracket
                </button>
              </ActionForm>
            </div>
          )}

          {/* Tombol Generate Bracket (jika fase grup selesai tapi bracket belum ada) */}
          {!event.bracket_generated && (
            <div className="bg-ink-3 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
              <div className="font-display font-bold text-xl">Bracket Knockout Playoff</div>
              <p className="text-sm text-snow/70 max-w-md m-0">
                {data.groupStageComplete
                  ? "Semua match fase grup telah selesai! Anda sekarang dapat membuat bracket knockout playoff dengan seeding silang otomatis."
                  : "Bracket akan dibuka secara otomatis setelah seluruh pertandingan di fase grup selesai dimainkan."}
              </p>
              {data.groupStageComplete && (
                <ActionForm action={generateBracket}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <button type="submit" className="btn btn-coral py-2.5 px-6 font-bold">
                    🏆 Buat Bracket Knockout Sekarang
                  </button>
                </ActionForm>
              )}
            </div>
          )}

          {/* Bracket Visualizer */}
          {event.bracket_generated && ko.length > 0 && (
            <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-display font-bold text-lg">Bagan Playoff Knockout</div>
                <span className="text-xs text-snow/50">Pemenang otomatis maju ke babak berikutnya</span>
              </div>

              <Bracket rounds={ko} seeds={seeds} waitingLabel={waitingLabel} />

              {/* Fitur Swap Posisi Tim sebelum KO dimulai */}
              {!data.koStarted && ko[0]?.matches.length > 0 && (
                <div className="pt-4 border-t border-snow/10 flex flex-col gap-2">
                  <span className="text-xs font-bold text-snow/70">
                    Tukar Posisi Tim Babak Pertama (Sebelum Knockout Dimulai):
                  </span>
                  <ActionForm
                    action={swapBracketTeams}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <input type="hidden" name="event_id" value={event.id} />
                    <select name="team_x" required className="field text-xs py-1.5 w-[200px]">
                      <option value="">Pilih Tim 1...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-snow/50 text-xs">↔</span>
                    <select name="team_y" required className="field text-xs py-1.5 w-[200px]">
                      <option value="">Pilih Tim 2...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn px-3 py-1.5 text-xs bg-snow/10 hover:bg-snow/20">
                      Tukar Posisi
                    </button>
                  </ActionForm>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SKOR MATCH */}
      {/* ========================================================================= */}
      {editingScoreMatch && (
        <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4">
          <ActionForm
            action={async (state, fd) => {
              const res = await correctScore(state, fd);
              if (!res?.error) setEditingScoreMatch(null);
              return res;
            }}
            className="bg-indigo rounded-2xl p-6 flex flex-col gap-4 w-[min(90vw,440px)] text-snow shadow-2xl border border-snow/10"
          >
            <input type="hidden" name="match_id" value={editingScoreMatch.id} />
            <div className="flex items-center justify-between">
              <div className="font-display font-bold text-lg">Input / Edit Skor Match</div>
              <button
                type="button"
                onClick={() => setEditingScoreMatch(null)}
                className="text-snow/60 hover:text-snow text-xl border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-snow/60">
              Pertandingan diselesaikan berdasarkan <b>jumlah game terbanyak</b>. Skor tidak boleh seri.
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-semibold truncate text-snow">
                  {editingScoreMatch.team_a_name}
                </span>
                <input
                  type="number"
                  name="games_a"
                  defaultValue={editingScoreMatch.team_a_games}
                  min={0}
                  className="field text-center font-display font-bold text-2xl py-2"
                />
              </div>
              <span className="font-display font-bold text-xl text-snow/40 pt-4">–</span>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-semibold truncate text-snow">
                  {editingScoreMatch.team_b_name}
                </span>
                <input
                  type="number"
                  name="games_b"
                  defaultValue={editingScoreMatch.team_b_games}
                  min={0}
                  className="field text-center font-display font-bold text-2xl py-2"
                />
              </div>
            </div>

            <div>
              <div className="label">Opsi Walkover (WO)</div>
              <select name="wo" defaultValue="" className="field text-xs">
                <option value="">Pertandingan Normal (Bukan WO)</option>
                <option value="A">Tim A Menang WO ({editingScoreMatch.team_a_name})</option>
                <option value="B">Tim B Menang WO ({editingScoreMatch.team_b_name})</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-snow/10">
              <button
                type="button"
                onClick={() => setEditingScoreMatch(null)}
                className="btn text-xs py-2 px-3"
              >
                Batal
              </button>
              <button type="submit" className="btn btn-coral text-xs py-2 px-4 font-bold">
                Simpan &amp; Selesaikan Match
              </button>
            </div>
          </ActionForm>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SLOT COURT & JAM */}
      {/* ========================================================================= */}
      {editingSlotMatch && (
        <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4">
          <ActionForm
            action={async (state, fd) => {
              const res = await updateMatchSlot(state, fd);
              if (!res?.error) setEditingSlotMatch(null);
              return res;
            }}
            className="bg-indigo rounded-2xl p-6 flex flex-col gap-4 w-[min(90vw,400px)] text-snow shadow-2xl border border-snow/10"
          >
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="match_id" value={editingSlotMatch.id} />

            <div className="flex items-center justify-between">
              <div className="font-display font-bold text-lg">Ubah Slot Court &amp; Jam</div>
              <button
                type="button"
                onClick={() => setEditingSlotMatch(null)}
                className="text-snow/60 hover:text-snow text-xl border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="label">Court</div>
              <select
                name="court_id"
                defaultValue={editingSlotMatch.court_id ?? ""}
                className="field text-sm"
              >
                <option value="">Tanpa Court</option>
                {data.courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Jam Mulai (WIB)</div>
              <input
                type="time"
                name="time"
                defaultValue={isoToWibTime(editingSlotMatch.starts_at)}
                className="field"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-snow/10">
              <button
                type="button"
                onClick={() => setEditingSlotMatch(null)}
                className="btn text-xs py-2 px-3"
              >
                Batal
              </button>
              <button type="submit" className="btn btn-coral text-xs py-2 px-4 font-bold">
                Simpan Perubahan
              </button>
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}

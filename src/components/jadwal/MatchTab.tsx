"use client";

import { useState } from "react";
import { YOUTUBE_URL } from "@/lib/config";
import type { EventItem, EventMatchesData } from "@/lib/events";
import { UnitScheduleModal } from "@/components/jadwal/UnitScheduleModal";

export function MatchTab({
  event,
  matches,
}: {
  event: EventItem;
  matches: EventMatchesData | null;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openUnit = openKey ? matches?.unitSchedules?.[openKey] : null;
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
    return (
      <div className="flex flex-col gap-6">
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-bold text-[19px] m-0">Hasil match Americano</h2>
            <span className="text-[13px] text-ink/60">
              {matches.roundsTotal != null ? `${matches.roundsDone ?? 0} dari ${matches.roundsTotal} ronde selesai` : null}
            </span>
          </div>

          {matches.rounds.map((r, i) => {
            const finished = r.status === "finished";
            const aWin = finished && r.s1 > r.s2;
            const bWin = finished && r.s2 > r.s1;
            const name = (label: string, key: string | undefined) =>
              key && matches.unitSchedules?.[key] ? (
                <button type="button" onClick={() => setOpenKey(key)} className="truncate text-left hover:underline underline-offset-2">
                  {label}
                </button>
              ) : (
                <span className="truncate">{label}</span>
              );
            return (
              <div key={i} className="flex items-center gap-4 py-3 border-t border-ink/7">
                <div className="flex-none w-28 text-xs font-bold text-ink/60 leading-tight">
                  {r.round}<br />
                  <span className="font-normal">{r.time}</span>
                </div>
                <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                  <div className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${aWin ? "bg-[#2f9e5c]/12" : ""}`}>
                    <span className={`text-sm truncate ${aWin ? "font-bold text-ink" : bWin ? "font-semibold text-ink/50" : "font-semibold text-ink"}`}>
                      {name(r.p1, r.p1Key)}
                    </span>
                    <span className={`font-display font-bold text-base ${aWin ? "text-[#23794A]" : "text-ink"}`}>{finished ? r.s1 : "—"}</span>
                  </div>
                  <div className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${bWin ? "bg-[#2f9e5c]/12" : ""}`}>
                    <span className={`text-sm truncate ${bWin ? "font-bold text-ink" : aWin ? "font-semibold text-ink/50" : "font-semibold text-ink"}`}>
                      {name(r.p2, r.p2Key)}
                    </span>
                    <span className={`font-display font-bold text-base ${bWin ? "text-[#23794A]" : "text-ink"}`}>{finished ? r.s2 : "—"}</span>
                  </div>
                </div>
                <div className="flex-none w-20 flex justify-end">
                  <span className={`text-xs font-bold ${finished ? "text-ink/55" : "text-ink/40"}`}>{finished ? "Selesai" : "Belum main"}</span>
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

          {matches.knockout.map((m, idx) => (
            <div key={idx} className="flex items-center gap-4 py-3 border-t border-ink/7">
              <div className="flex-none w-28 text-xs font-bold text-ink/60 leading-tight">
                {m.round}<br />
                <span className="font-normal">{m.court}</span>
              </div>
              <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                <div
                  className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${
                    m.team1.winner ? "bg-[#2f9e5c]/12" : ""
                  }`}
                >
                  <span
                    className={`text-sm truncate ${
                      m.team1.winner
                        ? "font-bold text-ink"
                        : m.team2.winner
                        ? "font-semibold text-ink/50"
                        : "font-semibold text-ink"
                    }`}
                  >
                    {m.team1.name}
                  </span>
                  <span
                    className={`font-display font-bold text-base ${
                      m.team1.winner ? "text-[#23794A]" : "text-ink"
                    }`}
                  >
                    {m.team1.score}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${
                    m.team2.winner ? "bg-[#2f9e5c]/12" : ""
                  }`}
                >
                  <span
                    className={`text-sm truncate ${
                      m.team2.winner
                        ? "font-bold text-ink"
                        : m.team1.winner
                        ? "font-semibold text-ink/50"
                        : "font-semibold text-ink"
                    }`}
                  >
                    {m.team2.name}
                  </span>
                  <span
                    className={`font-display font-bold text-base ${
                      m.team2.winner ? "text-[#23794A]" : "text-ink"
                    }`}
                  >
                    {m.team2.score}
                  </span>
                </div>
              </div>
              <div className="flex-none w-28 flex justify-end">
                {m.status === "live" ? (
                  <a
                    href={m.streamUrl || YOUTUBE_URL}
                    target="_blank"
                    rel="noopener"
                    className="no-underline inline-flex items-center gap-1.5 rounded-full py-1.5 px-3 text-xs font-bold bg-coral text-ink whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                    LIVE · Tonton
                  </a>
                ) : m.status === "next" ? (
                  <span className="text-xs font-bold text-ink/65">Berikutnya</span>
                ) : m.status === "waiting" ? (
                  <span className="text-xs font-bold text-ink/50">Menunggu</span>
                ) : (
                  <span className="text-xs font-bold text-ink/55">Selesai</span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 8 Besar (Quarterfinals) */}
      {matches?.quarterfinals && matches.quarterfinals.length > 0 && (
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-bold text-[19px] m-0">8 besar</h2>
            <span className="text-[13px] text-ink/60">Selesai</span>
          </div>

          {matches.quarterfinals.map((q, idx) => (
            <div key={idx} className="flex items-center gap-4 py-3 border-t border-ink/7">
              <div className="flex-none w-28 text-xs font-bold text-ink/60 leading-tight">
                {q.round}<br />
                <span className="font-normal">{q.court}</span>
              </div>
              <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                <div
                  className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${
                    q.team1.winner ? "bg-[#2f9e5c]/12" : ""
                  }`}
                >
                  <span
                    className={`text-sm truncate ${
                      q.team1.winner ? "font-bold text-ink" : "font-semibold text-ink/50"
                    }`}
                  >
                    {q.team1.name}
                  </span>
                  <span
                    className={`font-display font-bold text-base ${
                      q.team1.winner ? "text-[#23794A]" : "text-ink/50"
                    }`}
                  >
                    {q.team1.score}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${
                    q.team2.winner ? "bg-[#2f9e5c]/12" : ""
                  }`}
                >
                  <span
                    className={`text-sm truncate ${
                      q.team2.winner ? "font-bold text-ink" : "font-semibold text-ink/50"
                    }`}
                  >
                    {q.team2.name}
                  </span>
                  <span
                    className={`font-display font-bold text-base ${
                      q.team2.winner ? "text-[#23794A]" : "text-ink/50"
                    }`}
                  >
                    {q.team2.score}
                  </span>
                </div>
              </div>
              <div className="flex-none w-20 flex justify-end">
                <span className="text-xs font-bold text-ink/55">Selesai</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Fase Grup matches */}
      {matches?.groupMatches && matches.groupMatches.length > 0 && (
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-bold text-[19px] m-0">Fase grup · Grup A</h2>
            <span className="text-[13px] text-ink/60">+ 7 match di Grup B–D</span>
          </div>

          {matches.groupMatches.map((g, idx) => (
            <div key={idx} className="flex items-center gap-4 py-3 border-t border-ink/7">
              <div className="flex-none w-28 text-xs font-bold text-ink/60 leading-tight">
                {g.group}<br />
                <span className="font-normal">{g.court}</span>
              </div>
              <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                <div
                  className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${
                    g.team1.winner ? "bg-[#2f9e5c]/12" : ""
                  }`}
                >
                  <span
                    className={`text-sm truncate ${
                      g.team1.winner ? "font-bold text-ink" : "font-semibold text-ink/50"
                    }`}
                  >
                    {g.team1.name}
                  </span>
                  <span
                    className={`font-display font-bold text-base ${
                      g.team1.winner ? "text-[#23794A]" : "text-ink/50"
                    }`}
                  >
                    {g.team1.score}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between gap-2.5 min-h-[30px] px-2 rounded-md ${
                    g.team2.winner ? "bg-[#2f9e5c]/12" : ""
                  }`}
                >
                  <span
                    className={`text-sm truncate ${
                      g.team2.winner ? "font-bold text-ink" : "font-semibold text-ink/50"
                    }`}
                  >
                    {g.team2.name}
                  </span>
                  <span
                    className={`font-display font-bold text-base ${
                      g.team2.winner ? "text-[#23794A]" : "text-ink/50"
                    }`}
                  >
                    {g.team2.score}
                  </span>
                </div>
              </div>
              <div className="flex-none w-20 flex justify-end">
                <span className="text-xs font-bold text-ink/55">Selesai</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

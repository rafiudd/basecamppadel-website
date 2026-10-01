"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { createCompetition } from "@/app/admin/events/actions";
import { groupLabel, planFormat, splitIntoGroups } from "@/lib/competition";
import type { Court, Player, Venue } from "@/lib/database.types";

type PlayerSummary = Pick<Player, "id" | "name" | "gender" | "level">;

type TeamSlot = {
  p1: string;
  p2: string;
  group: string;
};

export function NewEventWizard({
  players,
  venues,
  courts,
}: {
  players: PlayerSummary[];
  venues: Venue[];
  courts: Court[];
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [eventType, setEventType] = useState<"kompetisi" | "mabar">("kompetisi");

  // Format state
  const [numTeams, setNumTeams] = useState(6);
  const [numGroups, setNumGroups] = useState(2);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);

  // Teams state
  const [teams, setTeams] = useState<TeamSlot[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      p1: "",
      p2: "",
      group: groupLabel(i % 2),
    }))
  );

  // Details state
  const [title, setTitle] = useState("Basecamp Padel Cup");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [published, setPublished] = useState(true);

  // Points state
  const [points] = useState({
    champion: 80,
    runner_up: 50,
    sf: 30,
    qf: 15,
    r16: 10,
    group: 5,
  });

  // Calculate format plan
  const plan = useMemo(
    () => planFormat({ teams: numTeams, groups: numGroups, advance: advancePerGroup }),
    [numTeams, numGroups, advancePerGroup]
  );

  // Keep teams array aligned when numTeams or numGroups changes
  const handleNumTeamsChange = (n: number) => {
    const val = Math.max(3, Math.min(32, n));
    setNumTeams(val);
    setTeams((prev) => {
      const next: TeamSlot[] = [];
      for (let i = 0; i < val; i++) {
        next.push(
          prev[i] ?? {
            p1: "",
            p2: "",
            group: groupLabel(i % numGroups),
          }
        );
      }
      return next;
    });
  };

  const handleNumGroupsChange = (g: number) => {
    const val = Math.max(1, Math.min(8, g));
    setNumGroups(val);
    setTeams((prev) =>
      prev.map((t, i) => ({
        ...t,
        group: groupLabel(i % val),
      }))
    );
  };

  // Courts available for the selected venue
  const availableCourts = useMemo(
    () => courts.filter((c) => !venueId || c.venue_id === venueId),
    [courts, venueId]
  );

  // Auto pairing
  const handleAutoPair = () => {
    const usedIds = new Set<string>();
    const availablePlayers = players.filter((p) => !usedIds.has(p.id));

    let pIdx = 0;
    const updated = teams.map((slot, i) => {
      let p1 = slot.p1;
      let p2 = slot.p2;
      if (!p1 && pIdx < availablePlayers.length) {
        p1 = availablePlayers[pIdx++].id;
      }
      if (!p2 && pIdx < availablePlayers.length) {
        p2 = availablePlayers[pIdx++].id;
      }
      return {
        ...slot,
        p1,
        p2,
        group: groupLabel(i % numGroups),
      };
    });
    setTeams(updated);
  };

  // Shuffle team groups evenly across the selected group count.
  const handleShuffleGroups = () => {
    const filledIndexes = teams
      .map((team, index) => (team.p1 && team.p2 ? index : null))
      .filter((index): index is number => index !== null);

    if (filledIndexes.length === 0) return;

    const grouped = splitIntoGroups(filledIndexes, numGroups);
    const updated = teams.map((team) => ({ ...team }));

    grouped.forEach((indexes, groupIndex) => {
      const label = groupLabel(groupIndex);
      indexes.forEach((teamIndex) => {
        updated[teamIndex] = { ...updated[teamIndex], group: label };
      });
    });

    setTeams(updated);
  };

  // Validation
  const chosenPlayerIds = teams.flatMap((t) => [t.p1, t.p2]).filter(Boolean);
  const hasDuplicatePlayer = new Set(chosenPlayerIds).size !== chosenPlayerIds.length;
  const isStep2Valid = plan.errors.length === 0;

  const filledTeams = teams.filter((t) => t.p1 && t.p2);
  const playerNameMap = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);
  const groupedTeams = useMemo(
    () =>
      Array.from({ length: numGroups }, (_, groupIndex) => {
        const label = groupLabel(groupIndex);
        const members = teams
          .map((team, teamIndex) => ({ teamIndex, team }))
          .filter(({ team }) => team.p1 && team.p2 && team.group === label)
          .map(({ teamIndex, team }) => ({
            id: `team-${teamIndex + 1}`,
            seed: `A${teamIndex + 1}`,
            label: `${teamIndex + 1}`,
            name: `${playerNameMap.get(team.p1) ?? "Pemain 1"} / ${playerNameMap.get(team.p2) ?? "Pemain 2"}`,
          }));

        return {
          label,
          members,
        };
      }),
    [numGroups, playerNameMap, teams]
  );

  return (
    <div className="flex flex-col gap-6 max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/events" className="text-sm text-snow/60 no-underline hover:text-volt">
          ← Kembali ke Daftar Event
        </Link>
        <span className="text-xs text-snow/40 font-mono">Langkah {step} dari 4</span>
      </div>

      <div>
        <h1 className="font-display font-bold text-[28px] m-0">Buat Event</h1>
      </div>

      {/* Stepper Bar */}
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-snow/10 bg-ink-3 p-2">
        {[
          { num: 1, label: "Tipe" },
          { num: 2, label: "Format" },
          { num: 3, label: "Peserta" },
          { num: 4, label: "Detail & poin" },
        ].map((s) => {
          const isDone = step > s.num;
          const isActive = step === s.num;

          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step || (s.num === 3 && isStep2Valid) || s.num === 1) {
                  setStep(s.num as 1 | 2 | 3 | 4);
                }
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition-colors ${
                isActive
                  ? "border-snow/10 bg-ink-2 text-snow shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                  : isDone
                    ? "border-snow/10 bg-transparent text-snow/70"
                    : "border-snow/10 bg-transparent text-snow/40"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive || isDone
                    ? "bg-volt text-ink"
                    : "border border-snow/15 bg-ink-2 text-snow/45"
                }`}
              >
                {isDone ? "✓" : s.num}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: TIPE */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-snow/80">Tipe event</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setEventType("mabar");
                setStep(2);
              }}
              aria-pressed={eventType === "mabar"}
              className={`text-left border-none rounded-2xl p-5 transition-all flex gap-3 items-start ${
                eventType === "mabar"
                  ? "bg-volt/10 shadow-[inset_0_0_0_2px_rgba(255,212,59,1)]"
                  : "bg-ink-3 shadow-[inset_0_0_0_1px_rgba(251,247,241,0.12)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[2px] ${
                  eventType === "mabar" ? "border-volt bg-volt" : "border-snow/50 bg-transparent"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-ink" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-display font-bold text-[19px]">Mabar</span>
                <span className="text-sm leading-5 text-snow/75">
                  Main bareng santai. Pairing diacak per ronde, klasemen individu atau per pasangan.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEventType("kompetisi");
                setStep(2);
              }}
              aria-pressed={eventType === "kompetisi"}
              className={`text-left border-none rounded-2xl p-5 transition-all flex gap-3 items-start ${
                eventType === "kompetisi"
                  ? "bg-volt/10 shadow-[inset_0_0_0_2px_rgba(255,212,59,1)]"
                  : "bg-ink-3 shadow-[inset_0_0_0_1px_rgba(251,247,241,0.12)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[2px] ${
                  eventType === "kompetisi" ? "border-volt bg-volt" : "border-snow/50 bg-transparent"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-ink" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-display font-bold text-[19px]">Kompetisi</span>
                <span className="text-sm leading-5 text-snow/75">
                  Tim tetap. Fase grup round robin, lalu knockout sampai final.
                </span>
              </span>
            </button>
          </div>

          <div className="flex justify-end mt-4">
            <button type="button" onClick={() => setStep(2)} className="btn btn-yellow">
              Lanjut ke Format →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FORMAT */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-5 border border-snow/10">
            <div>
              <div className="font-display font-bold text-xl">Format</div>
              <div className="mt-1 text-sm text-snow/70">Pilihan menyesuaikan tipe event</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="label uppercase">Jumlah tim</div>
                <div className="flex items-center gap-2 rounded-xl bg-ink-2 p-1">
                  <button type="button" onClick={() => handleNumTeamsChange(numTeams - 1)} className="btn w-11 h-11 px-0 text-xl font-bold">
                    –
                  </button>
                  <div className="flex-1 text-center font-display font-bold text-[20px]">{numTeams}</div>
                  <button type="button" onClick={() => handleNumTeamsChange(numTeams + 1)} className="btn w-11 h-11 px-0 text-xl font-bold">
                    +
                  </button>
                </div>
              </div>

              <div>
                <div className="label uppercase">Jumlah grup</div>
                <div className="flex items-center gap-2 rounded-xl bg-ink-2 p-1">
                  <button type="button" onClick={() => handleNumGroupsChange(numGroups - 1)} className="btn w-11 h-11 px-0 text-xl font-bold">
                    –
                  </button>
                  <div className="flex-1 text-center font-display font-bold text-[20px]">{numGroups}</div>
                  <button type="button" onClick={() => handleNumGroupsChange(numGroups + 1)} className="btn w-11 h-11 px-0 text-xl font-bold">
                    +
                  </button>
                </div>
              </div>

              <div>
                <div className="label uppercase">Lolos per grup</div>
                <div className="flex items-center gap-2 rounded-xl bg-ink-2 p-1">
                  <button type="button" onClick={() => setAdvancePerGroup(Math.max(1, advancePerGroup - 1))} className="btn w-11 h-11 px-0 text-xl font-bold">
                    –
                  </button>
                  <div className="flex-1 text-center font-display font-bold text-[20px]">{advancePerGroup}</div>
                  <button type="button" onClick={() => setAdvancePerGroup(advancePerGroup + 1)} className="btn w-11 h-11 px-0 text-xl font-bold">
                    +
                  </button>
                </div>
              </div>

              <div>
                <div className="label uppercase">Knockout mulai dari</div>
                <div className="flex items-center h-[52px] rounded-xl bg-ink-2 px-4 text-left text-sm font-semibold text-snow/80">
                  {Math.max(1, Math.min(4, numGroups))}
                  <span className="ml-2 text-xs text-snow/60">otomatis</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="label uppercase">Format fase grup</div>
                <select className="field w-full" aria-label="Format fase grup">
                  <option>Round robin (semua ketemu semua)</option>
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-snow/10 bg-ink-2 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-snow/70">Alur kompetisi</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-volt">
                  {isStep2Valid ? "Update otomatis" : "Tinjau ulang"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {plan.flow.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-ink-3 px-3 py-1.5 text-xs font-semibold text-snow/80">
                      {item}
                    </span>
                    {index < plan.flow.length - 1 && <span className="text-snow/40">→</span>}
                  </div>
                ))}
              </div>

              <div className="text-sm text-snow/75">
                {plan.groupMatches} match grup, {plan.qualifiers} tim lolos, {plan.slots} slot playoff, {plan.byes} bye.
              </div>

              {plan.errors.length > 0 && (
                <div className="text-xs text-amber-200">{plan.errors.join(" ")}</div>
              )}
            </div>

            <label className="inline-flex items-center gap-2.5 text-sm text-snow/80">
              <input type="checkbox" className="h-4 w-4 accent-volt" />
              Ada perebutan juara 3
            </label>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn">
              ← Kembali
            </button>
            <button
              type="button"
              disabled={!isStep2Valid}
              onClick={() => setStep(3)}
              className="btn btn-yellow"
            >
              Lanjut ke Peserta →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PESERTA */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-4 border border-snow/10">
            <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-snow/10">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-snow/45">Peserta</div>
                <div className="font-display font-bold text-xl">Atur pasangan tim, lalu bagi ke grup</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
              <div className="rounded-xl border border-snow/10 bg-ink-2 p-3">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div>
                    <div className="font-display font-bold text-base">Pasangan tim</div>
                    <div className="mt-1 text-xs text-snow/60">Pilih pemain 1 &amp; 2 langsung dari daftar pemain · {teams.length} tim</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoPair}
                    className="btn px-3 py-1.5 text-[11px] bg-snow/10 hover:bg-snow/20"
                  >
                    Pasangkan otomatis
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[430px] overflow-y-auto pr-1">
                  {teams.map((t, idx) => (
                    <div key={idx} className="rounded-lg border border-snow/10 bg-ink-3 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-display font-bold text-sm">Tim {idx + 1}</div>
                        <button
                          type="button"
                          onClick={() =>
                            setTeams((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, p1: "", p2: "", group: item.group } : item
                              )
                            )
                          }
                          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-snow/50 hover:text-loss transition-colors"
                        >
                          Hapus
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-snow/50 mb-1">Pemain 1</div>
                          <select
                            value={t.p1}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTeams((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, p1: val } : item))
                              );
                            }}
                            className="field text-xs py-2"
                          >
                            <option value="">Pilih pemain</option>
                            {players.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={chosenPlayerIds.includes(p.id) && t.p1 !== p.id}
                              >
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-snow/50 mb-1">Pemain 2</div>
                          <select
                            value={t.p2}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTeams((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, p2: val } : item))
                              );
                            }}
                            className="field text-xs py-2"
                          >
                            <option value="">Pilih pemain</option>
                            {players.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={chosenPlayerIds.includes(p.id) && t.p2 !== p.id}
                              >
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setTeams((prev) => [...prev, { p1: "", p2: "", group: groupLabel(prev.length % numGroups) }])
                  }
                  className="mt-3 w-full btn px-3 py-2 text-xs bg-snow/5 hover:bg-snow/10"
                >
                  + Tambah Tim
                </button>
              </div>

              <div className="rounded-xl border border-snow/10 bg-ink-2 p-3">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div>
                    <div className="font-display font-bold text-base">Pembagian grup &amp; seed</div>
                    <div className="mt-1 text-xs text-snow/60">Acak grup sesuai format turnamen</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleShuffleGroups}
                    className="btn px-2.5 py-1.5 text-[11px] bg-volt text-ink hover:opacity-90"
                  >
                    Shuffle grup
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {groupedTeams.map((group) => (
                    <div key={group.label} className="rounded-lg border border-snow/10 bg-ink-3 p-2.5">
                      <div className="font-display font-bold text-xs uppercase tracking-[0.12em] opacity-80 mb-2">
                        Grup {group.label}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {group.members.length === 0 ? (
                          <div className="text-xs text-snow/35 italic">Belum ada tim</div>
                        ) : (
                          group.members.map((member) => (
                            <div key={member.id} className="flex items-center gap-2 rounded-md bg-ink-2 px-2 py-1.5 text-[11px] text-snow/80">
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-volt/20 px-1.5 font-bold text-volt">
                                {group.label}{member.label}
                              </span>
                              <span className="truncate">{member.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {hasDuplicatePlayer && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                Ada pemain yang dipilih di lebih dari satu tim. Setiap pemain hanya boleh masuk ke satu tim.
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1 text-xs text-snow/50">
              <span>
                Terisi: <b className="text-snow">{filledTeams.length}</b> dari {numTeams} tim
              </span>
              <span>Tim belum lengkap bisa diisi di tahap berikutnya.</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(2)} className="btn">
              ← Kembali
            </button>
            <button
              type="button"
              disabled={hasDuplicatePlayer}
              onClick={() => setStep(4)}
              className="btn btn-yellow"
            >
              Lanjut ke Detail &amp; Poin →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DETAIL & POIN */}
      {step === 4 && (
        <ActionForm action={createCompetition} className="flex flex-col gap-5">
          <input type="hidden" name="event_type" value={eventType} />
          <input type="hidden" name="num_teams" value={numTeams} />
          <input type="hidden" name="num_groups" value={numGroups} />
          <input type="hidden" name="advance_per_group" value={advancePerGroup} />
          <input type="hidden" name="teams" value={JSON.stringify(teams)} />
          {(
            [
              ["champion", points.champion],
              ["runner_up", points.runner_up],
              ["sf", points.sf],
              ["qf", points.qf],
              ["r16", points.r16],
              ["group", points.group],
            ] as const
          ).map(([key, value]) => (
            <input key={key} type="hidden" name={`points_${key}`} value={value} />
          ))}

          <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-5 border border-snow/10">
            <div className="font-display font-bold text-xl">Detail &amp; poin</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="label uppercase">Nama event</div>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="field font-semibold"
                />
              </div>

              <div>
                <div className="label uppercase">Tanggal</div>
                <input
                  type="date"
                  name="event_date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <div className="label uppercase">Jam</div>
                <input
                  type="time"
                  name="start_time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <div className="label uppercase">Venue</div>
                <select
                  name="venue_id"
                  value={venueId}
                  onChange={(e) => {
                    setVenueId(e.target.value);
                    setSelectedCourts([]);
                  }}
                  className="field"
                >
                  <option value="">Pilih venue...</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="label uppercase">Court dipakai</div>
                <div className="flex gap-2 flex-wrap mt-1">
                  {availableCourts.map((c) => {
                    const checked = selectedCourts.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCourts((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className={`px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
                          checked ? "bg-volt text-ink border-volt" : "bg-ink-2 text-snow/75 border-snow/10"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                  {availableCourts.length === 0 && (
                    <span className="text-xs text-snow/40 italic">Pilih venue yang memiliki court terlebih dahulu.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 md:items-end">
              <div>
                <div className="label uppercase">Preset poin leaderboard</div>
                <select aria-label="Preset poin" className="field w-full">
                  <option>Kompetisi standar</option>
                </select>
                <a href="/admin/points" className="mt-2 inline-block text-xs text-volt hover:text-volt/90 no-underline">
                  Atur preset di menu Poin →
                </a>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-snow/80 cursor-pointer mb-1">
                <input
                  type="checkbox"
                  name="published"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-snow/20 bg-ink-2 text-volt"
                />
                Tampilkan di halaman Jadwal publik
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(3)} className="btn">
              ← Kembali
            </button>
            <button type="submit" className="btn btn-yellow py-3 px-6 text-ink font-bold">
              Buat Event
            </button>
          </div>
        </ActionForm>
      )}
    </div>
  );
}

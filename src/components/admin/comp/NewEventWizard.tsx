"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { createCompetition } from "@/app/admin/events/actions";
import { groupLabel, planFormat, splitIntoGroups } from "@/lib/competition";
import type { Court, Player, Venue } from "@/lib/database.types";

type EventType = "kompetisi" | "mabar";
type MabarFormat = "americano" | "mexicano" | "fixed_americano" | "fixed_mexicano";
type PlayerSummary = Pick<Player, "id" | "name" | "gender" | "level">;

type TeamSlot = {
  p1: string;
  p2: string;
  group: string;
};

type StepperItem = {
  num: 1 | 2 | 3 | 4;
  label: string;
};

const STEP_ITEMS: StepperItem[] = [
  { num: 1, label: "Tipe" },
  { num: 2, label: "Format" },
  { num: 3, label: "Peserta" },
  { num: 4, label: "Detail & poin" },
];

const MABAR_FORMAT_OPTIONS: Array<{
  key: MabarFormat;
  title: string;
  description: string;
}> = [
  { key: "americano", title: "Americano", description: "Partner acak tiap ronde. Poin dihitung per pemain." },
  { key: "mexicano", title: "Mexicano", description: "Partner acak, di-seed dari ranking sementara." },
  { key: "fixed_americano", title: "Fixed partner Americano", description: "Partner tetap, lawan ganti acak." },
  { key: "fixed_mexicano", title: "Fixed partner Mexicano", description: "Partner tetap, lawan di-seed dari ranking." },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Stepper({
  step,
  isStep2Valid,
  onStepSelect,
}: {
  step: 1 | 2 | 3 | 4;
  isStep2Valid: boolean;
  onStepSelect: (nextStep: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border border-snow/10 bg-[#1c1d2c] p-2">
      {STEP_ITEMS.map((item) => {
        const isDone = step > item.num;
        const isActive = step === item.num;

        return (
          <button
            key={item.num}
            type="button"
            onClick={() => {
              if (item.num < step || (item.num === 3 && isStep2Valid) || item.num === 1) {
                onStepSelect(item.num);
              }
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition-colors",
              isActive
                ? "border-[#f6d24c] bg-[#f4d647] text-[#17151f] shadow-[inset_0_0_0_1px_rgba(23,21,31,0.08)]"
                : isDone
                  ? "border-snow/10 bg-[#2c2a38] text-snow/80"
                  : "border-snow/10 bg-[#2c2a38] text-snow/50"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                isActive || isDone ? "bg-[#17151f] text-[#f4d647]" : "border border-snow/15 bg-[#1e1d2b] text-snow/45"
              )}
            >
              {isDone ? "✓" : item.num}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TypeOptionCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-5 text-left transition-all",
        selected
          ? "border-[#f6d24c] bg-[#302b25] shadow-[0_0_0_1px_rgba(246,210,76,0.35)]"
          : "border-[#2d2a39] bg-[#201d2b]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[2px]",
          selected ? "border-[#f6d24c] bg-[#f6d24c]" : "border-snow/60 bg-transparent"
        )}
      >
        <span className={cn("h-2.5 w-2.5 rounded-full", selected ? "bg-[#17151f]" : "bg-transparent")} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-display font-bold text-[19px] text-snow">{title}</span>
        <span className="text-sm leading-5 text-snow/70">{description}</span>
      </span>
    </button>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (nextValue: number) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-snow/70">{label}</div>
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-ink-2 p-1">
        <button type="button" onClick={() => onChange(clamp(value - 1, min, max))} className="btn w-11 h-11 px-0 text-xl font-bold">
          –
        </button>
        <div className="flex-1 text-center font-display font-bold text-[20px]">{value}</div>
        <button type="button" onClick={() => onChange(clamp(value + 1, min, max))} className="btn w-11 h-11 px-0 text-xl font-bold">
          +
        </button>
      </div>
    </div>
  );
}

function MabarFormatOption({
  option,
  selected,
  onSelect,
}: {
  option: (typeof MABAR_FORMAT_OPTIONS)[number];
  selected: boolean;
  onSelect: (value: MabarFormat) => void;
}) {
  return (
    <button
      key={option.key}
      type="button"
      onClick={() => onSelect(option.key)}
      className={cn(
        "rounded-2xl border p-5 text-left transition-all",
        selected ? "border-[#f6d24c] bg-[#302b25] shadow-[0_0_0_1px_rgba(246,210,76,0.35)]" : "border-[#2d2a39] bg-[#201d2b]"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[2px]",
            selected ? "border-[#f6d24c] bg-[#f6d24c]" : "border-snow/60 bg-transparent"
          )}
        >
          <span className={cn("h-2.5 w-2.5 rounded-full", selected ? "bg-[#17151f]" : "bg-transparent")} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display font-bold text-[19px] text-snow">{option.title}</span>
          <span className="text-sm leading-5 text-snow/70">{option.description}</span>
        </div>
      </div>
    </button>
  );
}

function TeamEditorRow({
  team,
  teamIndex,
  players,
  chosenPlayerIds,
  onChange,
  onClear,
}: {
  team: TeamSlot;
  teamIndex: number;
  players: PlayerSummary[];
  chosenPlayerIds: string[];
  onChange: (teamIndex: number, field: "p1" | "p2", value: string) => void;
  onClear: (teamIndex: number) => void;
}) {
  return (
    <div className="rounded-lg border border-snow/10 bg-ink-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-display font-bold text-sm">Tim {teamIndex + 1}</div>
        <button
          type="button"
          onClick={() => onClear(teamIndex)}
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-snow/50 hover:text-loss transition-colors"
        >
          Hapus
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-snow/50 mb-1">Pemain 1</div>
          <select value={team.p1} onChange={(e) => onChange(teamIndex, "p1", e.target.value)} className="field text-xs py-2">
            <option value="">Pilih pemain</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={chosenPlayerIds.includes(p.id) && team.p1 !== p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-snow/50 mb-1">Pemain 2</div>
          <select value={team.p2} onChange={(e) => onChange(teamIndex, "p2", e.target.value)} className="field text-xs py-2">
            <option value="">Pilih pemain</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={chosenPlayerIds.includes(p.id) && team.p2 !== p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function GroupSummaryCard({
  groupLabelName,
  members,
}: {
  groupLabelName: string;
  members: Array<{ id: string; label: string; name: string }>;
}) {
  return (
    <div className="rounded-lg border border-snow/10 bg-ink-3 p-2.5">
      <div className="font-display font-bold text-xs uppercase tracking-[0.12em] opacity-80 mb-2">Grup {groupLabelName}</div>
      <div className="flex flex-col gap-1.5">
        {members.length === 0 ? (
          <div className="text-xs text-snow/35 italic">Belum ada tim</div>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 rounded-md bg-ink-2 px-2 py-1.5 text-[11px] text-snow/80">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-volt/20 px-1.5 font-bold text-volt">
                {groupLabelName}
                {member.label}
              </span>
              <span className="truncate">{member.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
  const [eventType, setEventType] = useState<EventType>("mabar");

  const [numTeams, setNumTeams] = useState(6);
  const [numGroups, setNumGroups] = useState(2);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);
  const [mabarFormat, setMabarFormat] = useState<MabarFormat>("americano");
  const [targetPoints, setTargetPoints] = useState(24);
  const [rounds, setRounds] = useState(7);

  const [teams, setTeams] = useState<TeamSlot[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      p1: "",
      p2: "",
      group: groupLabel(i % 2),
    }))
  );

  const [title, setTitle] = useState("Basecamp Padel Cup");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [published, setPublished] = useState(true);

  const [points] = useState({
    champion: 80,
    runner_up: 50,
    sf: 30,
    qf: 15,
    r16: 10,
    group: 5,
  });

  const plan = useMemo(
    () => planFormat({ teams: numTeams, groups: numGroups, advance: advancePerGroup }),
    [numTeams, numGroups, advancePerGroup]
  );

  const handleNumTeamsChange = (nextValue: number) => {
    const val = clamp(nextValue, 3, 32);
    setNumTeams(val);
    setTeams((prev) => {
      const next: TeamSlot[] = [];
      for (let i = 0; i < val; i++) {
        next.push(prev[i] ?? { p1: "", p2: "", group: groupLabel(i % numGroups) });
      }
      return next;
    });
  };

  const handleNumGroupsChange = (nextValue: number) => {
    const val = clamp(nextValue, 1, 8);
    setNumGroups(val);
    setTeams((prev) => prev.map((team, i) => ({ ...team, group: groupLabel(i % val) })));
  };

  const availableCourts = useMemo(
    () => courts.filter((court) => !venueId || court.venue_id === venueId),
    [courts, venueId]
  );

  const handleAutoPair = () => {
    const usedIds = new Set<string>();
    const availablePlayers = players.filter((player) => !usedIds.has(player.id));

    let playerIndex = 0;
    const updated = teams.map((slot, index) => {
      let p1 = slot.p1;
      let p2 = slot.p2;

      if (!p1 && playerIndex < availablePlayers.length) {
        p1 = availablePlayers[playerIndex++].id;
      }
      if (!p2 && playerIndex < availablePlayers.length) {
        p2 = availablePlayers[playerIndex++].id;
      }

      return {
        ...slot,
        p1,
        p2,
        group: groupLabel(index % numGroups),
      };
    });

    setTeams(updated);
  };

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

  const chosenPlayerIds = teams.flatMap((team) => [team.p1, team.p2]).filter(Boolean);
  const hasDuplicatePlayer = new Set(chosenPlayerIds).size !== chosenPlayerIds.length;
  const isStep2Valid = plan.errors.length === 0;

  const filledTeams = teams.filter((team) => team.p1 && team.p2);
  const playerNameMap = useMemo(() => new Map(players.map((player) => [player.id, player.name])), [players]);

  const groupedTeams = useMemo(
    () =>
      Array.from({ length: numGroups }, (_, groupIndex) => {
        const label = groupLabel(groupIndex);
        const members = teams
          .map((team, teamIndex) => ({ teamIndex, team }))
          .filter(({ team }) => team.p1 && team.p2 && team.group === label)
          .map(({ teamIndex, team }) => ({
            id: `team-${teamIndex + 1}`,
            label: `${teamIndex + 1}`,
            name: `${playerNameMap.get(team.p1) ?? "Pemain 1"} / ${playerNameMap.get(team.p2) ?? "Pemain 2"}`,
          }));

        return { label, members };
      }),
    [numGroups, playerNameMap, teams]
  );

  const handlePlayerChange = (teamIndex: number, field: "p1" | "p2", value: string) => {
    setTeams((prev) => prev.map((team, index) => (index === teamIndex ? { ...team, [field]: value } : team)));
  };

  const handleClearTeam = (teamIndex: number) => {
    setTeams((prev) => prev.map((team, index) => (index === teamIndex ? { ...team, p1: "", p2: "" } : team)));
  };

  const pushTeam = () => {
    setTeams((prev) => [...prev, { p1: "", p2: "", group: groupLabel(prev.length % numGroups) }]);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/events" className="text-sm text-snow/60 no-underline hover:text-volt">
          ← Kembali ke Daftar Event
        </Link>
        <span className="text-xs text-snow/40 font-mono">Langkah {step} dari 4</span>
      </div>

      <div>
        <h1 className="font-display font-bold text-[28px] m-0">Buat Event</h1>
      </div>

      <Stepper step={step} isStep2Valid={isStep2Valid} onStepSelect={setStep} />

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[16px] font-bold text-[#f6d24c]">Tipe event</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TypeOptionCard
              title="Mabar"
              description="Main bareng santai. Pairing diacak per ronde, klasemen individu atau per pasangan."
              selected={eventType === "mabar"}
              onClick={() => {
                setEventType("mabar");
                setStep(2);
              }}
            />
            <TypeOptionCard
              title="Kompetisi"
              description="Tim tetap. Fase grup round robin, lalu knockout sampai final."
              selected={eventType === "kompetisi"}
              onClick={() => {
                setEventType("kompetisi");
                setStep(2);
              }}
            />
          </div>

          <div className="flex justify-end mt-2">
            <button type="button" onClick={() => setStep(2)} className="btn btn-yellow px-6 py-3 text-[18px] font-bold">
              Lanjut →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-5 border border-snow/10">
            <div>
              <div className="font-display font-bold text-[28px] text-snow">Format</div>
              <div className="mt-1 text-sm text-snow/70">Pilihan menyesuaikan tipe event</div>
            </div>

            {eventType === "mabar" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MABAR_FORMAT_OPTIONS.map((option) => (
                    <MabarFormatOption
                      key={option.key}
                      option={option}
                      selected={mabarFormat === option.key}
                      onSelect={setMabarFormat}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Counter label="Target poin per match" value={targetPoints} min={8} max={60} onChange={setTargetPoints} />
                  <Counter label="Jumlah ronde" value={rounds} min={1} max={20} onChange={setRounds} />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Counter label="Jumlah tim" value={numTeams} min={3} max={32} onChange={handleNumTeamsChange} />
                  <Counter label="Jumlah grup" value={numGroups} min={1} max={8} onChange={handleNumGroupsChange} />
                  <Counter label="Lolos per grup" value={advancePerGroup} min={1} max={8} onChange={setAdvancePerGroup} />
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

                  {plan.errors.length > 0 && <div className="text-xs text-amber-200">{plan.errors.join(" ")}</div>}
                </div>

                <label className="inline-flex items-center gap-2.5 text-sm text-snow/80">
                  <input type="checkbox" className="h-4 w-4 accent-volt" />
                  Ada perebutan juara 3
                </label>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn rounded-xl border border-snow/10 bg-[#2a2b39] px-4 py-2.5 text-sm font-semibold text-snow">
              ← Kembali
            </button>
            <button type="button" onClick={() => setStep(3)} className="btn btn-yellow px-5 py-3 text-[18px] font-bold">
              Lanjut →
            </button>
          </div>
        </div>
      )}

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
                  <button type="button" onClick={handleAutoPair} className="btn px-3 py-1.5 text-[11px] bg-snow/10 hover:bg-snow/20">
                    Pasangkan otomatis
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[430px] overflow-y-auto pr-1">
                  {teams.map((team, index) => (
                    <TeamEditorRow
                      key={index}
                      team={team}
                      teamIndex={index}
                      players={players}
                      chosenPlayerIds={chosenPlayerIds}
                      onChange={handlePlayerChange}
                      onClear={handleClearTeam}
                    />
                  ))}
                </div>

                <button type="button" onClick={pushTeam} className="mt-3 w-full btn px-3 py-2 text-xs bg-snow/5 hover:bg-snow/10">
                  + Tambah Tim
                </button>
              </div>

              <div className="rounded-xl border border-snow/10 bg-ink-2 p-3">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div>
                    <div className="font-display font-bold text-base">Pembagian grup &amp; seed</div>
                    <div className="mt-1 text-xs text-snow/60">Acak grup sesuai format turnamen</div>
                  </div>
                  <button type="button" onClick={handleShuffleGroups} className="btn px-2.5 py-1.5 text-[11px] bg-volt text-ink hover:opacity-90">
                    Shuffle grup
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {groupedTeams.map((group) => (
                    <GroupSummaryCard key={group.label} groupLabelName={group.label} members={group.members} />
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
            <button type="button" disabled={hasDuplicatePlayer} onClick={() => setStep(4)} className="btn btn-yellow">
              Lanjut ke Detail &amp; Poin →
            </button>
          </div>
        </div>
      )}

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
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="label uppercase">Court dipakai</div>
                <div className="flex gap-2 flex-wrap mt-1">
                  {availableCourts.map((court) => {
                    const checked = selectedCourts.includes(court.id);
                    return (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => {
                          setSelectedCourts((prev) =>
                            prev.includes(court.id) ? prev.filter((id) => id !== court.id) : [...prev, court.id]
                          );
                        }}
                        className={cn(
                          "px-3 py-2 rounded-full text-xs font-semibold border transition-colors",
                          checked ? "bg-volt text-ink border-volt" : "bg-ink-2 text-snow/75 border-snow/10"
                        )}
                      >
                        {court.name}
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

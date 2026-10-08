"use client";

import { useMemo, useState } from "react";
import { groupLabel, planFormat, shuffle, splitIntoGroups, STAGE_LABEL } from "@/lib/competition";
import { isAmericanoFormat, isFixedFormat } from "@/lib/events";
import { previewRoundOne } from "@/lib/mabar";
import { courtLabel } from "@/lib/format";
import type { Court, EventType, GenFormat, ScoreMode } from "@/lib/database.types";
import type { PlayerSummary } from "@/components/admin/event/types";

export type Step = 1 | 2 | 3 | 4;
export type TeamSlot = { p1: string; p2: string; group: string };
export type PresetSummary = { id: string; name: string };
type Issue = { message: string; fields: string[] };

/** Which format counters a planFormat() message is about. */
function planErrorFields(message: string) {
  if (message.includes("minimal 3 tim")) return ["numTeams", "numGroups"];
  if (message.includes("grup.") && message.startsWith("Minimal 1 grup")) return ["numGroups"];
  if (message.includes("lolos per grup")) return ["advance"];
  return ["numGroups", "advance"]; // too few / too many teams in the knockout
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const emptyTeam = (i: number, groups: number): TeamSlot => ({ p1: "", p2: "", group: groupLabel(i % Math.max(1, groups)) });

/**
 * All state of the Buat Event wizard, plus what each step derives from it. Every field starts empty,
 * and steps are passed in order: "Lanjut" only moves on when the current step is complete.
 */
export function useEventWizard({ players, courts }: { players: PlayerSummary[]; courts: Court[] }) {
  const [step, setStep] = useState<Step>(1);
  const [showErrors, setShowErrors] = useState(false);
  const [type, setType] = useState<EventType | null>(null);
  const isMabar = type === "mabar";

  // ---- kompetisi format (null until set)
  const [numTeams, setNumTeams] = useState<number | null>(null);
  const [numGroups, setNumGroups] = useState<number | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const plan = useMemo(
    () => (numTeams && numGroups && advance ? planFormat({ teams: numTeams, groups: numGroups, advance }) : null),
    [numTeams, numGroups, advance],
  );
  const flow = plan?.sizes.length ? [plan.flow[0], `Top ${advance} lolos → ${plan.qualifiers} tim`, ...plan.koStages.map((s) => STAGE_LABEL[s])] : [];
  const flowSummary = plan ? `${plan.groupMatches} match fase grup · ${plan.koMatches} match knockout${plan.byes ? ` · ${plan.byes} tim dapat bye di babak pertama` : ""}` : "";

  // ---- mabar format
  const [mabarFormat, setMabarFormat] = useState<GenFormat | null>(null);
  const [rounds, setRounds] = useState("");
  const [quota, setQuota] = useState("");
  const [scoreMode, setScoreMode] = useState<ScoreMode>("points");
  const [scoreTarget, setScoreTarget] = useState("24");
  /** Default target for each mode, used when switching modes so the field isn't left stale. */
  const SCORE_MODE_DEFAULT: Record<ScoreMode, string> = { best_of: "3", race_to: "4", points: "24" };
  const changeScoreMode = (m: ScoreMode) => {
    setScoreMode(m);
    setScoreTarget(SCORE_MODE_DEFAULT[m]);
  };
  /** Mabar quota in players (null = no limit); fixed partner fills it with pairs. */
  const maxPlayers = isMabar && Number(quota) >= 4 ? Number(quota) : null;
  const fixed = isMabar && isFixedFormat(mabarFormat);
  const usesPairs = !isMabar || fixed;
  const maxPairs = fixed && maxPlayers !== null ? Math.floor(maxPlayers / 2) : null;

  // ---- teams (kompetisi + fixed-partner mabar)
  const [teams, setTeams] = useState<TeamSlot[]>([]);
  const groupCount = numGroups ?? 1;
  const chosen = teams.flatMap((t) => [t.p1, t.p2]).filter(Boolean);
  const filledTeams = teams.filter((t) => t.p1 && t.p2);

  const setTeamCount = (n: number) => {
    const v = clamp(n, 3, 32);
    setNumTeams(v);
    setNumGroups((g) => (g == null ? g : clamp(g, 1, Math.max(1, Math.floor(v / 2)))));
    setTeams((prev) => {
      if (v >= prev.length) return [...prev, ...Array.from({ length: v - prev.length }, (_, i) => emptyTeam(prev.length + i, groupCount))];
      // drop empty rows from the end first, never a filled team
      const out = [...prev];
      for (let i = out.length - 1; i >= 0 && out.length > v; i--) if (!out[i].p1 && !out[i].p2) out.splice(i, 1);
      return out;
    });
  };
  const setGroupCount = (n: number) => {
    const v = clamp(n, 1, Math.max(1, Math.floor((numTeams ?? 2) / 2)));
    setNumGroups(v);
    setTeams((prev) => prev.map((t, i) => ({ ...t, group: groupLabel(i % v) })));
  };
  const teamActions = {
    setPlayer: (i: number, k: "p1" | "p2", v: string) => setTeams((prev) => prev.map((t, j) => (j === i ? { ...t, [k]: v } : t))),
    setGroup: (i: number, g: string) => setTeams((prev) => prev.map((t, j) => (j === i ? { ...t, group: g } : t))),
    remove: (i: number) => setTeams((prev) => prev.filter((_, j) => j !== i)),
    add: () => setTeams((prev) => (maxPairs !== null && prev.length >= maxPairs ? prev : [...prev, emptyTeam(prev.length, groupCount)])),
    /**
     * Fill every empty slot with a random unused player. Without rows yet (fixed-partner mabar),
     * pair all unused players. The result is computed here, not in a state updater: updaters must be
     * pure (React runs them twice in development) and this one consumes a shuffled list.
     */
    autoPair: () => {
      const used = new Set(chosen);
      const free = shuffle(players.filter((p) => !used.has(p.id)).map((p) => p.id));
      const take = () => free.shift() ?? "";
      const rows = teams.length
        ? teams
        : Array.from({ length: Math.min(Math.floor(free.length / 2), maxPairs ?? Infinity) }, (_, i) => emptyTeam(i, groupCount));
      setTeams(rows.map((t) => ({ ...t, p1: t.p1 || take(), p2: t.p2 || take() })));
    },
    shuffleGroups: () => {
      const idx = teams.map((t, i) => (t.p1 && t.p2 ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return;
      const next = teams.map((t) => ({ ...t }));
      splitIntoGroups(idx, groupCount).forEach((members, gi) => members.forEach((i) => (next[i].group = groupLabel(gi))));
      setTeams(next);
    },
  };

  // ---- details
  const courtsOf = (venueId: string) => courts.filter((c) => c.venue_id === venueId);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [venueId, setVenueIdRaw] = useState("");
  const [courtIds, setCourtIds] = useState<string[]>([]);
  const [presetId, setPresetId] = useState("");
  const [published, setPublished] = useState(false);
  const setVenueId = (id: string) => {
    setVenueIdRaw(id);
    setCourtIds(courtsOf(id).map((c) => c.id)); // a new venue starts with all of its courts
  };
  const toggleCourt = (id: string) => setCourtIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ---- mabar players + round 1 preview
  const [picked, setPicked] = useState<string[]>([]);
  const [pairSeed, setPairSeed] = useState(0);
  const round1 = previewRoundOne({
    seed: pairSeed,
    players: picked,
    pairs: fixed ? filledTeams.map((t) => [t.p1, t.p2]) : null,
    courts: Math.max(1, courtIds.length),
  });
  const nameOf = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);
  const courtName = (i: number) => (courtIds[i] ? courtLabel(courts.find((c) => c.id === courtIds[i])?.name) : `Court ${i + 1}`);

  // ---- validation + navigation
  // Each issue names the fields to outline. A step can move on once it has no issues.
  const issues = (n: Step): Issue[] => {
    const list: Issue[] = [];
    const add = (when: unknown, message: string, ...fields: string[]) => when && list.push({ message, fields });
    if (n === 1) add(!type, "Pilih tipe event dulu.", "type");
    if (n === 2 && isMabar) {
      add(!mabarFormat, "Pilih format mabar.", "mabarFormat");
      add(!isAmericanoFormat(mabarFormat) && Number(rounds) < 1, "Isi jumlah ronde (minimal 1).", "rounds");
      add(quota && Number(quota) < 4, "Kuota minimal 4 pemain.", "quota");
      add(Number(scoreTarget) < 1, "Isi target skor.", "scoreTarget");
    }
    if (n === 2 && !isMabar) {
      add(!numTeams, "Isi jumlah tim.", "numTeams");
      add(!numGroups, "Isi jumlah grup.", "numGroups");
      add(!advance, "Isi jumlah tim lolos per grup.", "advance");
      for (const e of plan?.errors ?? []) add(true, e, ...planErrorFields(e));
    }
    if (n === 3 && usesPairs) {
      const dupes = chosen.filter((id, i) => chosen.indexOf(id) !== i);
      add(
        dupes.length,
        "Ada pemain yang dipilih di lebih dari satu tim.",
        ...teams.flatMap((t, i) => (["p1", "p2"] as const).filter((k) => dupes.includes(t[k])).map((k) => `team:${i}:${k}`)),
      );
      add(fixed && filledTeams.length < 2, "Minimal 2 pasangan untuk fixed partner.", "teams");
      if (!isMabar && filledTeams.length) {
        // same rule the server applies when the group schedule is made
        const sizes = Array.from({ length: groupCount }, (_, g) => filledTeams.filter((t) => t.group === groupLabel(g)).length);
        const used = sizes.filter((n) => n > 0); // an empty group is simply not used by the schedule
        add(
          Math.max(...used) - Math.min(...used) > 1,
          `Jumlah tim antar grup harus rata, selisih maksimal 1 (sekarang ${sizes.map((n, g) => (n ? `${groupLabel(g)} ${n}` : null)).filter(Boolean).join(" · ")}).`,
          "groups",
        );
      }
    }
    if (n === 3 && fixed && maxPairs !== null) {
      add(filledTeams.length > maxPairs, `Pasangan (${filledTeams.length}) melebihi kuota ${maxPlayers} pemain (maks ${maxPairs} pasangan).`, "teams");
    }
    if (n === 3 && !usesPairs) {
      add(picked.length < 4, "Pilih minimal 4 pemain.", "players");
      add(quota && picked.length > Number(quota), `Peserta (${picked.length}) melebihi kuota (${quota}).`, "players");
    }
    if (n === 4) {
      add(!title.trim(), "Isi nama event.", "title");
      add(!eventDate, "Isi tanggal.", "eventDate");
      add(!startTime, "Isi jam.", "startTime");
      add(!venueId, "Pilih venue.", "venueId");
      add(!courtIds.length, "Pilih minimal 1 court.", "courts");
      add(!presetId, "Pilih preset poin.", "presetId");
    }
    return list;
  };
  const current = issues(step);

  /** "Lanjut": only when the current step is complete, otherwise outline what is missing. */
  const next = () => {
    if (current.length) return setShowErrors(true);
    setShowErrors(false);
    setStep((step + 1) as Step);
  };
  /** Back to an earlier step (the stepper can't jump ahead). */
  const back = (n: Step) => {
    if (n >= step) return;
    setShowErrors(false);
    setStep(n);
  };
  /** Final submit guard: false (and the missing fields outlined) while step 4 is incomplete. */
  const canSubmit = () => {
    if (current.length) setShowErrors(true);
    return !current.length;
  };

  return {
    step,
    next,
    back,
    canSubmit,
    /** After a failed "Lanjut": what is missing on this step (all messages), and whether a field gets outlined. */
    stepErrors: showErrors ? [...new Set(current.map((i) => i.message))] : [],
    invalid: (field: string) => showErrors && current.some((i) => i.fields.includes(field)),
    type,
    setType,
    isMabar,
    fixed,
    usesPairs,
    kompetisi: { numTeams, numGroups, advance, plan, flow, flowSummary, groupCount, setTeamCount, setGroupCount, setAdvance: (n: number) => setAdvance(clamp(n, 1, 8)) },
    mabar: {
      format: mabarFormat,
      setFormat: setMabarFormat,
      rounds,
      setRounds,
      quota,
      setQuota,
      scoreMode,
      setScoreMode: changeScoreMode,
      scoreTarget,
      setScoreTarget,
      picked,
      setPicked,
      maxPlayers,
      maxPairs,
      round1,
      reshuffle: () => setPairSeed((s) => s + 1),
    },
    teams: { list: teams, chosen, filled: filledTeams, ...teamActions },
    details: { title, setTitle, eventDate, setEventDate, startTime, setStartTime, venueId, setVenueId, venueCourts: courtsOf(venueId), courtIds, toggleCourt, presetId, setPresetId, published, setPublished },
    nameOf,
    courtName,
  };
}

export type EventWizard = ReturnType<typeof useEventWizard>;

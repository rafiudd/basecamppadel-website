"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { unwrap } from "@/lib/actionState";
import { toast } from "@/components/ui/Toast";
import { PIN_JOURNEY_LEVELS, PIN_JOURNEY_PIN, nextPinLevel, type PinMission, type PlayerLevelName } from "@/lib/pinJourney";
import { savePinMissionsAction, resetPinMissionsAction } from "./actions";

type Row = { skill: string; minScore: string } | { sessions: string };

function toRows(missions: PinMission[]): Row[] {
  return missions.map((m) => ("sessions" in m ? { sessions: String(m.sessions) } : { skill: m.skill, minScore: String(m.minScore) }));
}

function toMissions(rows: Row[]): PinMission[] | null {
  const out: PinMission[] = [];
  for (const r of rows) {
    if ("sessions" in r) {
      const n = Number(r.sessions);
      if (!Number.isFinite(n) || n <= 0) return null;
      out.push({ sessions: n });
    } else {
      const name = r.skill.trim();
      const min = Number(r.minScore);
      if (!name || !Number.isFinite(min) || min <= 0) return null;
      out.push({ skill: name, minScore: min });
    }
  }
  return out;
}

/** One transition's editable mission list ("Putih → Kuning", …), saved independently of the others. */
function TransitionCard({
  level,
  initialMissions,
  isOverridden,
}: {
  level: PlayerLevelName;
  initialMissions: PinMission[];
  isOverridden: boolean;
}) {
  const next = nextPinLevel(level)!;
  const [rows, setRows] = useState<Row[]>(toRows(initialMissions));
  const [overridden, setOverridden] = useState(isOverridden);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);

  const skillRows = rows
    .map((r, idx) => ({ r, idx }))
    .filter((x): x is { r: { skill: string; minScore: string }; idx: number } => !("sessions" in x.r));
  const sessionsRow = rows.find((r): r is { sessions: string } => "sessions" in r);

  const updateSkill = (i: number, patch: Partial<{ skill: string; minScore: string }>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i && !("sessions" in r) ? { ...r, ...patch } : r)));
  const removeSkill = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const addSkill = () => setRows((prev) => [...prev.filter((r) => !("sessions" in r)), { skill: "", minScore: "" }, ...prev.filter((r) => "sessions" in r)]);
  const updateSessions = (value: string) =>
    setRows((prev) => {
      const without = prev.filter((r) => !("sessions" in r));
      return [...without, { sessions: value }];
    });

  const save = () => {
    const missions = toMissions(rows);
    if (!missions) {
      toast.error("Cek lagi — nama skill & angka minimal harus diisi, minimal harus lebih dari 0.");
      return;
    }
    setBusy("save");
    startTransition(async () => {
      try {
        unwrap(await savePinMissionsAction(level, missions));
        setOverridden(true);
        toast.success(`Misi ${PIN_JOURNEY_PIN[level]} → ${PIN_JOURNEY_PIN[next]} disimpan.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
      } finally {
        setBusy(null);
      }
    });
  };

  const reset = () => {
    if (!confirm(`Reset misi ${PIN_JOURNEY_PIN[level]} → ${PIN_JOURNEY_PIN[next]} ke default bawaan?`)) return;
    setBusy("reset");
    startTransition(async () => {
      try {
        unwrap(await resetPinMissionsAction(level));
        toast.success("Direset ke default.");
        location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal reset.");
        setBusy(null);
      }
    });
  };

  return (
    <section className="bg-[#1F1C2B] rounded-2xl border border-[#FBF7F1]/5 p-5 flex flex-col gap-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h2 className="font-display font-bold text-lg m-0">
          {PIN_JOURNEY_PIN[level]} <span className="text-[#FBF7F1]/40">→</span> {PIN_JOURNEY_PIN[next]}
        </h2>
        <span
          className={`text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            overridden ? "bg-[#FFD43B]/18 text-[#FFD43B]" : "bg-[#FBF7F1]/10 text-[#FBF7F1]/60"
          }`}
        >
          {overridden ? "Custom" : "Default"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {skillRows.map(({ r, idx }) => {
          return (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={r.skill}
                onChange={(e) => updateSkill(idx, { skill: e.target.value })}
                placeholder="Nama skill (persis coaching_skills.name)"
                className="flex-1 bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-sm text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
              />
              <input
                value={r.minScore}
                onChange={(e) => updateSkill(idx, { minScore: e.target.value })}
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="Min"
                className="w-20 bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-sm text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
              />
              <button
                type="button"
                onClick={() => removeSkill(idx)}
                aria-label={`Hapus ${r.skill || "skill ini"}`}
                className="flex-none w-9 h-9 rounded-lg bg-transparent hover:bg-coral/15 text-[#FBF7F1]/50 hover:text-coral border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addSkill}
          className="self-start text-xs font-bold text-[#FFD43B] bg-transparent border-0 cursor-pointer hover:underline"
        >
          + Tambah skill
        </button>
      </div>

      <label className="flex items-center gap-2.5 text-sm pt-1 border-t border-[#FBF7F1]/8">
        <span className="text-[#FBF7F1]/70 pt-3">Mabar with Coach — minimal</span>
        <input
          value={sessionsRow?.sessions ?? ""}
          onChange={(e) => updateSessions(e.target.value)}
          type="number"
          min="1"
          className="w-16 bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-sm text-snow mt-2.5 focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
        />
        <span className="text-[#FBF7F1]/70 pt-3">sesi</span>
      </label>

      <div className="flex justify-end gap-2 pt-1">
        {overridden && (
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            data-loading={busy === "reset" || undefined}
            className="border-0 rounded-lg px-4 py-2 font-bold text-sm bg-transparent text-[#FBF7F1]/60 hover:bg-[#FBF7F1]/10 disabled:opacity-50"
          >
            Reset ke default
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          data-loading={busy === "save" || undefined}
          className="border-0 rounded-lg px-5 py-2 font-bold text-sm bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 disabled:opacity-50"
        >
          Simpan
        </button>
      </div>
    </section>
  );
}

export function PinJourneyConfigClient({
  missionsByLevel,
  overriddenLevels,
}: {
  missionsByLevel: Record<PlayerLevelName, PinMission[]>;
  overriddenLevels: PlayerLevelName[];
}) {
  const editable = PIN_JOURNEY_LEVELS.filter((l) => nextPinLevel(l));
  return (
    <div className="flex flex-col gap-6 text-[#FBF7F1] w-full">
      <div className="pb-2 border-b border-[#FBF7F1]/10">
        <Link href="/admin/coaching" className="text-sm text-[#FBF7F1]/70 hover:text-[#FFD43B] no-underline inline-flex items-center gap-1.5 mb-2">
          ← Kembali ke Catatan Coaching
        </Link>
        <h1 className="font-display font-bold text-2xl lg:text-[28px] m-0 leading-tight">Journey Pin — Misi per Level</h1>
        <p className="m-0 mt-1.5 text-sm text-[#FBF7F1]/70 max-w-2xl">
          Threshold skill &amp; jumlah sesi Mabar with Coach buat tiap transisi pin, yang tampil di tab &quot;Journey pin&quot;
          pemain. Belum dipakai buat nentuin level pemain yang sebenarnya — itu masih dari rata-rata skor seperti biasa.
          Nama skill harus persis sama dengan nama di Master Teknik.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {editable.map((level) => (
          <TransitionCard
            key={level}
            level={level}
            initialMissions={missionsByLevel[level]}
            isOverridden={overriddenLevels.includes(level)}
          />
        ))}
      </div>
    </div>
  );
}

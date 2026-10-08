import { Field, inputClass, invalidIf, labelClass } from "@/components/ui/Field";
import { STAGE_LABEL } from "@/lib/competition";
import { MABAR_FORMAT_LABEL, isAmericanoFormat } from "@/lib/events";
import type { GenFormat, ScoreMode } from "@/lib/database.types";
import type { EventWizard } from "./useEventWizard";
import { Counter, RadioCard, StepSection } from "./parts";

const MABAR_FORMATS: { key: GenFormat; desc: string }[] = [
  { key: "americano", desc: "Partner acak tiap ronde. Poin dihitung per pemain." },
  { key: "mexicano", desc: "Partner acak, di-seed dari ranking sementara." },
  { key: "fixed_americano", desc: "Partner tetap, lawan gantian acak." },
  { key: "fixed_mexicano", desc: "Partner tetap, lawan di-seed dari ranking." },
];

const SCORE_MODES: { key: ScoreMode; label: string; desc: string }[] = [
  { key: "best_of", label: "Best of", desc: "Menang N set (ganjil)." },
  { key: "race_to", label: "Race to", desc: "Siapa duluan sampai N poin/game." },
  { key: "points", label: "Poin (0–x)", desc: "Skor akumulasi biasa, bukan tenis." },
];
const SCORE_MODE_TARGETS: Record<Extract<ScoreMode, "best_of" | "race_to">, number[]> = {
  best_of: [3, 5, 7],
  race_to: [3, 4, 5, 6],
};

const digits = (v: string) => v.replace(/\D/g, "");

export function StepFormat({ w }: { w: EventWizard }) {
  return (
    <StepSection title="Format" sub="Pilihan menyesuaikan tipe event">
      {w.isMabar ? <MabarFormat w={w} /> : <KompetisiFormat w={w} />}
    </StepSection>
  );
}

function MabarFormat({ w }: { w: EventWizard }) {
  const { mabar } = w;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {MABAR_FORMATS.map((f) => (
          <RadioCard key={f.key} invalid={w.invalid("mabarFormat")} on={mabar.format === f.key} onClick={() => mabar.setFormat(f.key)} title={MABAR_FORMAT_LABEL[f.key]} desc={f.desc} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {isAmericanoFormat(mabar.format) ? (
          <div>
            <div className={labelClass}>Jumlah ronde</div>
            <div className="min-h-13 box-border flex items-center gap-2 bg-snow/6 rounded-tile px-3.5">
              <span className="font-display font-bold text-lg">1 putaran penuh</span>
              <span className="text-xs text-volt">otomatis</span>
            </div>
            <div className="text-xs text-snow/60 mt-1.5">
              Dihitung pas jadwal dibuat, dari {mabar.format === "americano" ? "pemain" : "pasangan"} yang sudah check-in — semua {mabar.format === "americano" ? "pemain" : "pasangan"} ketemu tepat sekali, nggak perlu diisi manual.
            </div>
          </div>
        ) : (
          <Field label="Jumlah ronde">
            <input inputMode="numeric" value={mabar.rounds} onChange={(e) => mabar.setRounds(digits(e.target.value))} aria-invalid={w.invalid("rounds")} className={`${inputClass} ${invalidIf(w.invalid("rounds"))}`} />
          </Field>
        )}
        <Field label="Kuota pemain">
          <input inputMode="numeric" value={mabar.quota} placeholder="Tanpa batas" onChange={(e) => mabar.setQuota(digits(e.target.value))} aria-invalid={w.invalid("quota")} className={`${inputClass} ${invalidIf(w.invalid("quota"))}`} />
        </Field>
      </div>

      <div>
        <div className={labelClass}>Cara menang</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {SCORE_MODES.map((m) => (
            <RadioCard key={m.key} on={mabar.scoreMode === m.key} onClick={() => mabar.setScoreMode(m.key)} title={m.label} desc={m.desc} />
          ))}
        </div>
        <div className="mt-2.5">
          {mabar.scoreMode === "points" ? (
            <Field label="Poin per game">
              <input
                inputMode="numeric"
                value={mabar.scoreTarget}
                onChange={(e) => mabar.setScoreTarget(digits(e.target.value))}
                aria-invalid={w.invalid("scoreTarget")}
                className={`${inputClass} ${invalidIf(w.invalid("scoreTarget"))} max-w-32`}
              />
            </Field>
          ) : (
            <div className={`flex gap-2 ${invalidIf(w.invalid("scoreTarget"))}`}>
              {SCORE_MODE_TARGETS[mabar.scoreMode].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => mabar.setScoreTarget(String(n))}
                  aria-pressed={Number(mabar.scoreTarget) === n}
                  className={`min-w-13 h-11 px-3 border-none rounded-lg font-display font-bold text-lg ${
                    Number(mabar.scoreTarget) === n ? "bg-volt text-indigo" : "bg-snow/8 text-snow"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KompetisiFormat({ w }: { w: EventWizard }) {
  const k = w.kompetisi;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Counter label="Jumlah tim" invalid={w.invalid("numTeams")} value={k.numTeams} min={3} onChange={k.setTeamCount} />
        <Counter label="Jumlah grup" invalid={w.invalid("numGroups")} value={k.numGroups} min={1} onChange={k.setGroupCount} />
        <Counter label="Lolos per grup" invalid={w.invalid("advance")} value={k.advance} min={1} display={`Top ${k.advance}`} onChange={k.setAdvance} />
        <div>
          <div className={labelClass}>Knockout mulai dari</div>
          <div className="min-h-13 box-border flex items-center gap-2 bg-snow/6 rounded-tile px-3.5">
            <span className="font-display font-bold text-lg">{k.plan?.koStart ? STAGE_LABEL[k.plan.koStart] : "—"}</span>
            <span className="text-xs text-snow/65">otomatis</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Format fase grup">
          <select className={inputClass} defaultValue="rr">
            <option value="rr">Round robin (semua ketemu semua)</option>
          </select>
        </Field>
      </div>
      <div className="bg-ink/35 rounded-xl p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold tracking-caps text-snow/70">ALUR KOMPETISI</div>
          <div className="text-xs text-volt font-bold">Update otomatis</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {k.flow.map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-caption font-semibold whitespace-nowrap ${i < 2 ? "bg-volt/16 text-volt" : "bg-snow/10 text-snow"}`}>{f}</span>
              {i < k.flow.length - 1 && <span className="text-snow/60">→</span>}
            </span>
          ))}
        </div>
        {!k.plan ? (
          <div className="text-caption text-snow/60">Isi jumlah tim, grup, dan lolos per grup untuk melihat alurnya.</div>
        ) : k.plan.errors.length ? (
          <div className="text-caption text-coral-soft font-semibold">{k.plan.errors[0]}</div>
        ) : (
          <div className="text-caption text-snow/75">{k.flowSummary}</div>
        )}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="text-caption text-coral-soft font-semibold">{children}</div>;
}

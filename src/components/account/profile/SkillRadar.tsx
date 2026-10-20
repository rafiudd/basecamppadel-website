import type { CategoryAverage } from "@/lib/coachingRules";
import { formatDayMonthYear } from "@/lib/format";

const CX = 170;
const CY = 156;
const R = 100; // radius of score 5
const LABEL_R = 122;

const point = (i: number, n: number, r: number) => {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};
const poly = (values: number[]) => values.map((v, i) => point(i, values.length, (R * v) / 5).map((n) => n.toFixed(1)).join(",")).join(" ");
const dayMonth = (iso: string) => formatDayMonthYear(iso).replace(/ \d{4}$/, "");

/**
 * "Peta skill": average per category on a 1–5 radar, now (volt) over the first session (dashed).
 * Needs three categories with a score to make a shape; fewer and it isn't shown.
 */
export function SkillRadar({ axes, nowDate, firstDate }: { axes: CategoryAverage[]; nowDate: string | null; firstDate: string | null }) {
  if (axes.length < 3 || !nowDate) return null;
  const n = axes.length;
  const compare = !!firstDate && axes.some((a) => a.first !== null);
  const summary = axes.map((a) => `${a.label} ${a.now}${compare && a.first !== null ? ` (sebelumnya ${a.first})` : ""}`).join(", ");

  return (
    <section className="bg-indigo text-snow rounded-2xl p-5 md:p-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-display font-bold text-xl m-0">Peta skill</h2>
        <span className="text-xs text-snow/60">Rata-rata per kategori · skala 1–5</span>
      </div>
      {compare && (
        <div className="flex gap-3.5 flex-wrap text-xs font-semibold text-snow/75">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-volt" />
            {dayMonth(nowDate)} (sekarang)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] border-[1.5px] border-dashed border-snow/70 box-border" />
            {dayMonth(firstDate!)} (sesi 1)
          </span>
        </div>
      )}
      <svg viewBox="-60 -10 460 330" className="block w-full max-w-110 mx-auto overflow-visible" role="img" aria-label={`Peta skill: ${summary}`}>
        {[1, 2, 3, 4, 5].map((s) => (
          <polygon
            key={s}
            points={poly(Array(n).fill(s))}
            fill={s === 5 ? "rgb(251 247 241 / 0.03)" : "none"}
            stroke={`rgb(251 247 241 / ${s === 5 ? 0.28 : 0.12})`}
            strokeWidth="1"
          />
        ))}
        {axes.map((_, i) => {
          const [x, y] = point(i, n, R);
          return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgb(251 247 241 / 0.12)" />;
        })}
        {compare && (
          <polygon
            points={poly(axes.map((a) => a.first ?? 0))}
            fill="rgb(251 247 241 / 0.08)"
            stroke="rgb(251 247 241 / 0.55)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}
        <polygon points={poly(axes.map((a) => a.now))} fill="rgb(255 212 59 / 0.35)" stroke="var(--color-volt)" strokeWidth="2.5" strokeLinejoin="round" />
        {axes.map((a, i) => {
          const [x, y] = point(i, n, (R * a.now) / 5);
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill="var(--color-volt)" />;
        })}
        {axes.map((a, i) => {
          const [x, y] = point(i, n, LABEL_R);
          const side = Math.abs(x - CX) < 8 ? "middle" : x > CX ? "start" : "end";
          const top = y < CY - R * 0.8; // the label above the top axis sits higher, its pills below it
          const ty = top ? y - 12 : y > CY + R * 0.5 ? y + 6 : y - 4;
          const pills = [{ v: a.now, now: true }, ...(compare && a.first !== null ? [{ v: a.first, now: false }] : [])];
          const pw = 30;
          const total = pills.length * pw + (pills.length - 1) * 4;
          const px0 = side === "middle" ? x - total / 2 : side === "start" ? x : x - total;
          return (
            <g key={a.label}>
              <text x={x.toFixed(1)} y={ty.toFixed(1)} textAnchor={side} fontSize="11" fontWeight="700" fill="var(--color-snow)" letterSpacing="0.04em">
                {a.label.toUpperCase()}
              </text>
              {pills.map((p, j) => (
                <g key={j}>
                  <rect x={(px0 + j * (pw + 4)).toFixed(1)} y={(ty + 5).toFixed(1)} width={pw} height="18" rx="4" fill={p.now ? "var(--color-volt)" : "rgb(251 247 241 / 0.16)"} />
                  <text
                    x={(px0 + j * (pw + 4) + pw / 2).toFixed(1)}
                    y={(ty + 18).toFixed(1)}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    className="font-display"
                    fill={p.now ? "var(--color-indigo)" : "rgb(251 247 241 / 0.75)"}
                  >
                    {p.v.toFixed(1)}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </section>
  );
}

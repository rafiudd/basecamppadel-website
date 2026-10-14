"use client";

import { useState } from "react";
import type { SessionAverage } from "@/lib/coachingRules";
import { formatDayMonthYear } from "@/lib/format";

const W = 320;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 26, left: 26 };
const Y_TICKS = [1, 2, 3, 4, 5];

/** D.3: average score per coaching session (one series, 1–5 scale), hover/tap a point for details. */
export function ProgressChart({ points }: { points: SessionAverage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - 1) / 4) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const shown = active !== null ? points[active] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block overflow-visible" role="img" aria-label="Grafik rata-rata nilai per sesi" onMouseLeave={() => setActive(null)}>
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-ink/8" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink/50 text-[10px]">{t}</text>
          </g>
        ))}
        {points.map((p, i) =>
          points.length <= 6 || i === 0 || i === points.length - 1 ? (
            <text key={p.reportId} x={x(i)} y={H - 6} textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-ink/50 text-[10px]">
              {formatDayMonthYear(p.date).replace(/ \d{4}$/, "")}
            </text>
          ) : null,
        )}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="currentColor" className="text-ink/20" strokeWidth={1} />}
        <path d={path} fill="none" stroke="var(--color-indigo)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.reportId} cx={x(i)} cy={y(p.avg)} r={active === i ? 5.5 : 4} fill="var(--color-indigo)" stroke="#fff" strokeWidth={2} />
        ))}
        {/* hit targets wider than the marks */}
        {points.map((p, i) => (
          <rect
            key={p.reportId}
            x={x(i) - step / 2}
            y={PAD.top}
            width={Math.max(step, 24)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
      </svg>
      {shown && active !== null && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-full bg-ink text-snow rounded-lg px-2.5 py-1.5 text-xs shadow-pop whitespace-nowrap"
          style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(shown.avg) / H) * 100}%`, marginTop: -10 }}
        >
          <div className="font-bold">Rata-rata {shown.avg}</div>
          <div className="text-snow/70">{shown.title} · {formatDayMonthYear(shown.date)}</div>
        </div>
      )}
      <table className="sr-only">
        <caption>Rata-rata nilai per sesi</caption>
        <thead>
          <tr><th>Tanggal</th><th>Sesi</th><th>Rata-rata</th></tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.reportId}><td>{formatDayMonthYear(p.date)}</td><td>{p.title}</td><td>{p.avg}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

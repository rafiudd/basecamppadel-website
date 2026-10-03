import type { EventStatus, EventType } from "@/lib/database.types";

const TONES = {
  coral: "bg-coral/18 text-coral-soft",
  volt: "bg-volt/16 text-volt",
  win: "bg-win/20 text-win-soft",
  muted: "bg-snow/10 text-snow/85",
  faint: "bg-snow/6 text-snow/65",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 text-xs font-bold whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "active") return <Badge tone="win">● Berjalan</Badge>;
  if (status === "finished") return <Badge tone="win">Selesai</Badge>;
  return <Badge tone="muted">Draft</Badge>;
}

export function EventTypeBadge({ type }: { type: EventType }) {
  return type === "mabar" ? <Badge tone="volt">Mabar</Badge> : <Badge tone="coral">Kompetisi</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="win">Aktif</Badge> : <Badge tone="faint">Nonaktif</Badge>;
}

export function GenderBadge({ gender }: { gender: "M" | "F" }) {
  return <Badge tone="faint">{gender === "F" ? "Women" : "Men"}</Badge>;
}

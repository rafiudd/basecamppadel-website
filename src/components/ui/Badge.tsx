import Link from "next/link";
import type { EventStatus, EventType } from "@/lib/database.types";
import { ArrowUpRightIcon } from "./icons";

const TONES = {
  coral: "bg-coral/18 text-coral-soft",
  volt: "bg-volt/16 text-volt",
  win: "bg-win/20 text-win-soft",
  muted: "bg-snow/10 text-snow/85",
  faint: "bg-snow/6 text-snow/65",
  blue: "bg-blue-500/18 text-blue-300",
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

/** Marks an event that belongs to a league; links to that league's page. */
export function LeagueBadge({ leagueId }: { leagueId: string }) {
  return (
    <Link href={`/admin/liga/${leagueId}`} title="Buka halaman liga" className="no-underline rounded-full hover:brightness-125 transition-[filter]">
      <Badge tone="blue">
        Liga
        <ArrowUpRightIcon className="-mr-0.5" />
      </Badge>
    </Link>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="win">Aktif</Badge> : <Badge tone="faint">Nonaktif</Badge>;
}

export function GenderBadge({ gender }: { gender: "M" | "F" }) {
  return <Badge tone="faint">{gender === "F" ? "Women" : "Men"}</Badge>;
}

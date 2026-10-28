import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { getEventByIdOrSlug, getEventMatches } from "@/lib/events";
import { EventDetailClient } from "@/components/jadwal/EventDetailClient";

export const revalidate = 30;

// Prerender nothing at build; each event page is generated on first visit, then cached and refreshed every 30s (ISR).
export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventByIdOrSlug(id);
  if (!event) return { title: "Event Tidak Ditemukan — Basecamp Padel" };
  return {
    title: `${event.title} — Basecamp Padel`,
    description: `${event.subtitle} di ${event.venue}. ${event.aboutText || ""}`.slice(0, 160),
  };
}

export default async function JadwalDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [event, matches] = await Promise.all([
    getEventByIdOrSlug(id),
    getEventMatches(id),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <PublicShell>
      <EventDetailClient
        event={event}
        matches={matches}
      />
    </PublicShell>
  );
}

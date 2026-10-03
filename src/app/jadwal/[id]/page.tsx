"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { EventHeader } from "@/components/jadwal/EventHeader";
import { LiveBanner } from "@/components/jadwal/LiveBanner";
import { EventTabs, type TabType } from "@/components/jadwal/EventTabs";
import { InfoTab } from "@/components/jadwal/InfoTab";
import { MatchTab } from "@/components/jadwal/MatchTab";
import { KlasemenTab } from "@/components/jadwal/KlasemenTab";
import { PlayoffBracket } from "@/components/jadwal/PlayoffBracket";
import {
  getEventByIdOrSlug,
  getEventMatches,
  type EventItem,
  type EventMatchesData,
} from "@/lib/events";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

function EventDetailContent({ rawId }: { rawId: string }) {
  const searchParams = useSearchParams();
  const queryTab = searchParams.get("tab") as TabType | null;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [matches, setMatches] = useState<EventMatchesData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("info");

  useEffect(() => {
    getEventByIdOrSlug(rawId).then((ev) => {
      if (ev) {
        setEvent(ev);
        const initial =
          queryTab && ev.availableTabs.includes(queryTab)
            ? queryTab
            : ev.defaultTab;
        setActiveTab(initial);
      }
    });

    getEventMatches(rawId).then((m) => {
      setMatches(m);
    });
  }, [rawId, queryTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  if (!event) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-snow">
        <div className="w-8 h-8 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <PublicShell>
      {/* Header section with consistent padding and container */}
      <EventHeader event={event} />

      {/* Main Content Area */}
      <section className="bg-snow px-6 md:px-12 pt-8 pb-[72px]">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-5">
          {/* Live Score Banner (only if live event) */}
          <LiveBanner event={event} />

          {/* Tab Navigation Buttons */}
          <EventTabs
            availableTabs={event.availableTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* TAB 1: INFO */}
          {activeTab === "info" && <InfoTab event={event} />}

          {/* TAB 2: MATCH */}
          {activeTab === "match" && (
            <MatchTab event={event} matches={matches} />
          )}

          {/* TAB 3: KLASEMEN */}
          {activeTab === "klasemen" && (
            <KlasemenTab event={event} matches={matches} />
          )}

          {/* TAB 4: PLAYOFF */}
          {activeTab === "playoff" && <PlayoffBracket event={event} />}
        </div>
      </section>
    </PublicShell>
  );
}

export default function JadwalDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center bg-snow">
          <div className="w-8 h-8 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
        </div>
      }
    >
      <EventDetailContent rawId={resolvedParams.id} />
    </Suspense>
  );
}

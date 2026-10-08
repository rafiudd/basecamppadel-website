"use client";

import { useState } from "react";
import { EventHeader } from "@/components/jadwal/EventHeader";
import { LiveBanner } from "@/components/jadwal/LiveBanner";
import { EventTabs, type TabType } from "@/components/jadwal/EventTabs";
import { InfoTab } from "@/components/jadwal/InfoTab";
import { MatchTab } from "@/components/jadwal/MatchTab";
import { KlasemenTab } from "@/components/jadwal/KlasemenTab";
import { PlayoffBracket } from "@/components/jadwal/PlayoffBracket";
import type { EventItem, EventMatchesData } from "@/lib/events";

export function EventDetailClient({
  event,
  matches,
  queryTab,
}: {
  event: EventItem;
  matches: EventMatchesData | null;
  queryTab?: TabType | null;
}) {
  const initialTab =
    queryTab && event.availableTabs.includes(queryTab)
      ? queryTab
      : event.defaultTab;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <>
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
          {activeTab === "playoff" && (
            <PlayoffBracket event={event} matches={matches} />
          )}
        </div>
      </section>
    </>
  );
}

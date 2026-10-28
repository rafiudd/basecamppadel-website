"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EventHeader } from "@/components/jadwal/EventHeader";
import { LiveBanner } from "@/components/jadwal/LiveBanner";
import { EventTabs, type TabType } from "@/components/jadwal/EventTabs";
import { InfoTab } from "@/components/jadwal/InfoTab";
import { MatchTab } from "@/components/jadwal/MatchTab";
import { KlasemenTab } from "@/components/jadwal/KlasemenTab";
import { PlayoffBracket } from "@/components/jadwal/PlayoffBracket";
import { LivestreamTab } from "@/components/jadwal/LivestreamTab";
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
  const searchParams = useSearchParams();
  const paramTab = (searchParams?.get("tab") as TabType | null) ?? null;
  const preferredTab = queryTab || paramTab;

  const initialTab =
    preferredTab && event.availableTabs.includes(preferredTab)
      ? preferredTab
      : event.defaultTab;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

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
      <section className="bg-snow px-6 md:px-12 pt-6 md:pt-8 pb-[72px]">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-6">
          {/* Live Score Banner (only if live event) */}
          <LiveBanner event={event} />

          {/* Sticky Tab Navigation Bar: Seamless sticky background without divider line across mobile & desktop */}
          <div
            ref={tabsContainerRef}
            className="sticky top-[calc(56px+env(safe-area-inset-top,0px))] md:top-[88px] z-20 -mx-6 px-6 md:-mx-12 md:px-12 py-2.5 bg-snow/95 backdrop-blur-md"
          >
            <div className="w-full max-w-[1440px] mx-auto">
              <EventTabs
                availableTabs={event.availableTabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            </div>
          </div>

          {/* TAB 1: INFO */}
          {activeTab === "info" && <InfoTab event={event} />}

          {/* TAB: LIVESTREAM */}
          {activeTab === "livestream" && <LivestreamTab event={event} />}

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

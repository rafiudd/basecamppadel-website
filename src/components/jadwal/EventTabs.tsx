"use client";

import { useEffect, useRef } from "react";

export type TabType = "info" | "match" | "klasemen" | "playoff" | "livestream";

export function EventTabs({
  availableTabs,
  activeTab,
  onTabChange,
}: {
  availableTabs: TabType[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case "info":
        return "Info";
      case "match":
        return "Match";
      case "klasemen":
        return "Klasemen";
      case "playoff":
        return "Playoff";
      case "livestream":
        return "Livestream";
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab="${activeTab}"]`);
    if (activeBtn) {
      const scrollTarget = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollTarget), behavior: "smooth" });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className="flex gap-2 items-center overflow-x-auto py-1 scrollbar-none"
    >
      {availableTabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            data-tab={tab}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onTabChange(tab);
            }}
            className={`flex-none rounded-full min-h-[42px] px-5 font-sans font-bold text-sm transition-all border-0 cursor-pointer select-none whitespace-nowrap active:scale-95 ${
              active
                ? "bg-indigo text-snow shadow-xs"
                : "bg-ink/6 text-ink/75 hover:bg-ink/10 hover:text-ink"
            }`}
          >
            {getTabLabel(tab)}
          </button>
        );
      })}
    </div>
  );
}

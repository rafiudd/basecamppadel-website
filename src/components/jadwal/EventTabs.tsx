export type TabType = "info" | "match" | "klasemen" | "playoff";

export function EventTabs({
  availableTabs,
  activeTab,
  onTabChange,
}: {
  availableTabs: TabType[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
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
    }
  };

  return (
    <div className="flex gap-1.5 items-center overflow-x-auto pb-1 scrollbar-none">
      {availableTabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`flex-none rounded-full min-h-[44px] px-5 font-sans font-bold text-sm transition-colors border-0 cursor-pointer whitespace-nowrap ${
              active ? "bg-indigo text-snow" : "bg-ink/6 text-ink hover:bg-ink/10"
            }`}
          >
            {getTabLabel(tab)}
          </button>
        );
      })}
    </div>
  );
}

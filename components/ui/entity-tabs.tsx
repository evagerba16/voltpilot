"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export type EntityTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type EntityTabsProps = {
  tabs: EntityTab[];
  defaultTabId?: string;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
};

export function EntityTabs({
  tabs,
  defaultTabId,
  activeTabId,
  onTabChange,
  className,
}: EntityTabsProps) {
  const [internalActiveId, setInternalActiveId] = useState(defaultTabId ?? tabs[0]?.id ?? "");
  const activeId = activeTabId ?? internalActiveId;

  if (tabs.length === 0) {
    return null;
  }

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  function selectTab(tabId: string) {
    if (!activeTabId) {
      setInternalActiveId(tabId);
    }

    onTabChange?.(tabId);
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div
        role="tablist"
        aria-label="Page sections"
        className="flex flex-wrap gap-2 border-b border-border pb-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{activeTab.content}</div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

export type TabDef = { id: string; label: string; content: React.ReactNode };

/** Header + tab bar stay pinned to the top while the content of ONLY the active tab scrolls underneath. The tab is kept in the URL hash. */
export function StickyTabs({ header, tabs }: { header: React.ReactNode; tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = () => { const h = window.location.hash.slice(1); if (tabs.some((t) => t.id === h)) setActive(h); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  // Keep the active tab visible inside the (horizontally scrollable) bar.
  useEffect(() => { bar.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }, [active]);

  const pick = (id: string) => {
    setActive(id);
    history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  };
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      {/* -mt-8 cancels the page's top padding so the pinned block sits flush at the top of the screen */}
      <div className="sticky top-0 z-30 -mx-5 -mt-8 bg-base px-5 pb-3 pt-4">
        {header}
        <div ref={bar} role="tablist" aria-label="Bagian aturan" className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5 text-sm font-semibold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={active === t.id} aria-controls={`panel-${t.id}`} onClick={() => pick(t.id)}
              className={`min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold leading-none transition ${active === t.id ? "border-cream bg-cream text-[#461F1A]" : "border-line bg-card text-cream"}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`} className="pt-5">{current.content}</div>
    </div>
  );
}

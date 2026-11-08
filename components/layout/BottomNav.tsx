"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const ITEMS = [
  { href: "/home", label: "Beranda", icon: icon(<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />) },
  { href: "/game", label: "Game", icon: icon(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>) },
  { href: "/statistics", label: "Statistik", icon: icon(<path d="M5 20V10M12 20V4M19 20v-7" />) },
  { href: "/guidebook", label: "Panduan", icon: icon(<path d="M12 6c-1.5-1.5-4-2-8-2v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2V4c-4 0-6.5.5-8 2zM12 6v14" />) },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:max-w-2xl" aria-label="Menu utama">
      <ul className="grid grid-cols-4">
        {ITEMS.map((i) => {
          const active = path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined}
                className={`flex min-h-[62px] flex-col items-center justify-center gap-1 text-xs ${active ? "font-bold text-cream" : "font-medium text-muted"}`}>
                {i.icon}{i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Admin side navigation. The current page is highlighted (and exposed as aria-current for screen readers). */
export function AdminNav({ items }: { items: [string, string][] }) {
  const path = usePathname() ?? "";
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
  return (
    <ul className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(([href, label]) => {
        const on = isActive(href);
        return (
          <li key={href}>
            <Link href={href} aria-current={on ? "page" : undefined}
              className={`block whitespace-nowrap rounded-xl px-3 py-2 font-semibold transition ${on ? "bg-cream text-base shadow-sm" : "text-muted hover:bg-base hover:text-cream"}`}>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

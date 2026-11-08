import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const NAV = [["/admin", "Dashboard"], ["/admin/tables", "Live Tables"], ["/admin/games", "Games"], ["/admin/players", "Players"], ["/admin/tv", "TV Display"], ["/admin/statistics", "Statistics"], ["/admin/settings", "Settings"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <div className="min-h-screen md:flex">
      <nav className="border-b border-line bg-card p-3 md:min-h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="mb-2 flex items-center gap-2 px-3"><LogoMark size="32px" /><p className="text-lg font-bold">Admin</p></div>
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map(([href, label]) => <li key={href}><Link href={href} className="block whitespace-nowrap rounded-xl px-3 py-2 font-semibold text-muted hover:bg-base hover:text-cream">{label}</Link></li>)}
        </ul>
        <p className="mt-4 hidden px-3 text-xs text-muted md:block">{profile?.display_name}</p>
      </nav>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

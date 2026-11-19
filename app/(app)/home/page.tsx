import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { GameCard, type GameCardData } from "@/components/game/GameCard";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();
  const t = getT();
  const { data: { user } } = await supabase.auth.getUser();
  const name: string = user?.user_metadata?.display_name || user?.email?.split("@")[0] || t("home.guest");
  const { data: prof } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const isAdmin = prof?.role === "ADMIN";

  // RLS limits both queries to games the user owns or has joined.
  const cols = "id, name, room_code, status, setup_complete, current_round_wind, starting_points, played_at, finished_at, game_players(player_name, current_score), game_hands(count)";
  const [{ data: live }, { data: done }] = await Promise.all([
    supabase.from("games").select(cols).neq("status", "finished").order("played_at", { ascending: false }).limit(3),
    supabase.from("games").select(cols).eq("status", "finished").order("finished_at", { ascending: false }).limit(2),
  ]);
  const liveGames = (live ?? []) as unknown as GameCardData[], doneGames = (done ?? []) as unknown as GameCardData[];

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5"><LogoMark size="36px" /><span className="text-sm font-bold">Lucky Cat Mahjong</span></div>
        <div className="flex items-center gap-2">
          {isAdmin && <Link href="/admin" className="rounded-full border border-warn px-3 py-1.5 text-xs font-bold text-warn">Admin</Link>}
          <AccountMenu name={name} email={user?.email} />
        </div>
      </header>

      <div>
        <h1 className="text-[1.75rem] leading-tight">{t("home.hello", { name })}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("home.ask")}</p>
      </div>

      {/* One primary action; the other two are clearly secondary. */}
      <section className="space-y-3" aria-label={t("home.start")}>
        <Link href="/game/join" className="btn-primary !min-h-[60px]">{t("home.join")}</Link>
        <div className={`grid gap-3 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
          <Link href="/quick-score" className="btn-secondary whitespace-nowrap text-center !px-2">{t("home.quick")}</Link>
          {isAdmin && <Link href="/admin/tables" className="btn-secondary whitespace-nowrap text-center !px-2 !border-warn !text-warn">{t("home.openTable")}</Link>}
        </div>
        <p className="text-xs text-muted">{t("home.hint")}</p>
      </section>

      <section aria-label={t("home.live")}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="section-label">{t("home.liveTitle")}</h2>
          <Link href="/game" className="text-xs font-semibold text-muted underline">{t("home.all")}</Link>
        </div>
        {liveGames.length ? <ul className="space-y-3">{liveGames.map((g) => <li key={g.id}><GameCard g={g} /></li>)}</ul>
          : <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">{t("home.noLive")}</p>}
      </section>

      <section aria-label={t("home.done")} className="mt-2">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="section-label">{t("home.doneTitle")}</h2><Link href="/game?tab=selesai" className="text-xs font-semibold text-muted underline">{t("home.seeAll")}</Link></div>
        {doneGames.length ? <ul className="space-y-2">{doneGames.map((g) => <li key={g.id}><GameCard g={g} /></li>)}</ul>
          : <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">{t("home.noDone")}</p>}
      </section>
    </main>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the (server-rendered) dashboard current without a manual reload: it re-fetches when a table, game, score or
 * hand changes, when the tab becomes visible again, and once a minute (time-based alerts such as overtime need that).
 * `updatedAt` is the time of the last server render, so it moves forward after every refresh.
 */
export function DashboardLive({ updatedAt }: { updatedAt: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const soon = () => { clearTimeout(t); t = setTimeout(refresh, 700); };
    const onVisible = () => { if (!document.hidden) refresh(); };
    const ch = supabase.channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_tables" }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players" }, soon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_hands" }, soon)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const every = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(t); clearInterval(every); document.removeEventListener("visibilitychange", onVisible); supabase.removeChannel(ch); };
  }, [router, supabase]);

  return (
    <p className="flex items-center gap-2 text-sm text-muted" role="status">
      <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${live ? "bg-pos motion-safe:animate-pulse" : "bg-line"}`} />
      {live ? "Live" : "Menyambung…"} · diperbarui {updatedAt}
    </p>
  );
}

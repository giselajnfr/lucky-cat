"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TV_SETTINGS, type LeaderRow, type TvSettings, type TvTable, type WinningHandEvent } from "./types";

/** Public, read-only feed for the TV. Broadcast = "something changed" (+ winning payload); views = the data. */
export function useTvFeed(onWin: (e: WinningHandEvent) => void) {
  const supabase = useMemo(() => createClient(), []);
  const [tables, setTables] = useState<TvTable[]>([]);
  const [settings, setSettings] = useState<TvSettings>(DEFAULT_TV_SETTINGS);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [online, setOnline] = useState(false);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const [t, s, l, w] = await Promise.all([
        supabase.from("tv_live_tables").select("*").order("table_number"),
        supabase.from("tv_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("tv_today_leaderboard").select("*"),
        supabase.from("tv_recent_wins").select("payload").order("created_at"),
      ]);
      if (!alive) return;
      if (t.data) setTables(t.data as TvTable[]);
      if (s.data) setSettings(s.data as TvSettings);
      if (l.data) setLeaders(l.data as LeaderRow[]);
      w.data?.forEach((r) => onWinRef.current(r.payload as WinningHandEvent)); // queue de-duplicates by eventId
    };
    const soon = () => { clearTimeout(timer); timer = setTimeout(load, 400); }; // collapse bursts into one refetch

    load();
    const ch = supabase.channel("tv:live", { config: { presence: { key: crypto.randomUUID() } } })
      .on("broadcast", { event: "*" }, (m) => {
        const p = (m.payload as { payload?: WinningHandEvent })?.payload;
        if (m.event === "WINNING_HAND" && p?.eventId) onWinRef.current(p);
        soon();
      })
      .subscribe(async (status) => {
        setOnline(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") { await ch.track({ role: "tv" }); load(); } // also re-syncs after a reconnect
      });
    const poll = setInterval(load, 15000); // safety net if a broadcast is ever missed
    return () => { alive = false; clearTimeout(timer); clearInterval(poll); supabase.removeChannel(ch); };
  }, [supabase]);

  return { tables, settings, leaders, online };
}

"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/ui/LogoMark";
import { WinningEventQueue } from "@/lib/tv/eventQueue";
import { createChime } from "@/lib/tv/chime";
import { useTvFeed } from "@/lib/tv/useTvFeed";
import { MEDALS, ROUND_NAME, STATUS_LABEL, WIND_NAME, seatWind, type LeaderRow, type TvTable, type WinningHandEvent } from "@/lib/tv/types";

const PER_PAGE = 8;
const ranked = (t: TvTable) => [...t.players].sort((a, b) => b.score - a.score);
const fmt = (n: number) => n.toLocaleString("en-US");

function TableCard({ t, big }: { t: TvTable; big: boolean }) {
  return (
    <div className="flex flex-col justify-between rounded-[1.5vw] border-[0.2vw] border-line bg-card p-[1.4vw]">
      <div className="flex items-baseline justify-between">
        <h3 className={`font-extrabold ${big ? "text-[2.6vw]" : "text-[1.9vw]"}`}>TABLE {String(t.table_number).padStart(2, "0")}</h3>
        <span className="text-[1.3vw] text-muted">{STATUS_LABEL[t.status]}</span>
      </div>
      <p className="text-[1.5vw] font-semibold text-muted">{t.round_wind ? ROUND_NAME[t.round_wind] : "Waiting for players"}</p>
      <ul className="mt-[0.8vw] space-y-[0.3vw]">
        {ranked(t).map((p, i) => (
          <li key={p.seat} className={`flex justify-between font-bold ${big ? "text-[2.2vw]" : "text-[1.6vw]"}`}>
            <span>{MEDALS[i]} {p.name}{p.seat === t.dealer_seat ? " 👑" : ""}</span><span>{fmt(p.score)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spotlight({ t }: { t: TvTable }) {
  const dealer = t.dealer_seat ?? 0;
  return (
    <div className="flex h-full flex-col justify-center gap-[2vw] px-[6vw]">
      <h2 className="text-[6vw] font-extrabold">TABLE {String(t.table_number).padStart(2, "0")} 🀄</h2>
      <p className="text-[3vw] font-bold text-muted">{t.round_wind ? ROUND_NAME[t.round_wind] : ""} · Hand {t.hand_number ?? "-"}</p>
      <div className="grid grid-cols-2 gap-[3vw]">
        <ul className="space-y-[1vw] text-[3.4vw] font-extrabold">
          {ranked(t).map((p, i) => <li key={p.seat} className="flex justify-between">{MEDALS[i]} {p.name}{p.seat === dealer ? " 👑" : ""}<span>{fmt(p.score)}</span></li>)}
        </ul>
        <ul className="space-y-[1vw] text-[2.6vw] font-bold text-muted">
          {[...t.players].sort((a, b) => a.seat - b.seat).map((p) => <li key={p.seat}>{WIND_NAME[seatWind(p.seat, dealer)].toUpperCase()} — <span className="text-cream">{p.name}</span></li>)}
        </ul>
      </div>
    </div>
  );
}

function Leaderboard({ rows, type }: { rows: LeaderRow[]; type: string }) {
  const sorted = [...rows].sort((a, b) => type === "most_wins" ? b.wins_today - a.wins_today : type === "highest_fan" ? b.best_fan_today - a.best_fan_today : b.score - a.score).slice(0, 8);
  const label = type === "most_wins" ? "Most Wins Today" : type === "highest_fan" ? "Highest Fan Today" : "Highest Score";
  const val = (r: LeaderRow) => type === "most_wins" ? `${r.wins_today} wins` : type === "highest_fan" ? `${r.best_fan_today} fan` : fmt(r.score);
  return (
    <div className="flex h-full flex-col justify-center gap-[1.5vw] px-[10vw]">
      <h2 className="text-[5vw] font-extrabold">🏆 TODAY&apos;S LEADERBOARD</h2>
      <p className="text-[2.2vw] font-semibold text-muted">{label}</p>
      <ol className="space-y-[0.8vw] text-[3vw] font-bold">
        {sorted.map((r, i) => <li key={r.name} className="flex justify-between rounded-[1vw] bg-card px-[1.5vw] py-[0.6vw]"><span>{MEDALS[i] ?? `${i + 1}.`} {r.name}</span><span>{val(r)}</span></li>)}
      </ol>
    </div>
  );
}

function Highlight({ e, animate, more }: { e: WinningHandEvent; animate: boolean; more: number }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[1.2vw] bg-base p-[3vw] text-center">
      <p className={`text-[4vw] font-extrabold ${animate ? "animate-pulse" : ""}`}>🎉 HU! 🎉</p>
      <h1 className="text-[8vw] font-extrabold leading-none">🀄 {e.winner.name.toUpperCase()} HU!</h1>
      <p className="text-[2.4vw] font-semibold text-muted">TABLE {String(e.tableNumber).padStart(2, "0")} · {ROUND_NAME[e.roundWind] ?? e.roundWind} · {e.winningMethod === "self_draw" ? "Self Draw" : "Discard Win"}</p>
      <div className="flex flex-wrap justify-center gap-[1.5vw] text-[3vw] font-bold">{e.detectedFan.map((f) => <span key={f.name}>🀄 {f.name} <span className="text-muted">{f.fan}</span></span>)}</div>
      <p className="text-[7vw] font-extrabold">{e.totalFan} FAN</p>
      <p className="text-[4vw] font-bold">+{fmt(e.points)} POINTS</p>
      <div className="flex flex-wrap justify-center gap-[0.4vw]">{e.handTiles.map((t, i) => <span key={i} className="rounded-[0.5vw] bg-cream px-[0.8vw] py-[0.3vw] text-[2vw] font-extrabold text-base">{t}</span>)}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {e.photoUrl && <img src={e.photoUrl} alt="Winning hand" className="max-h-[22vh] rounded-[1vw] border-[0.2vw] border-line" />}
      {more > 0 && <p className="absolute bottom-[1.5vw] right-[2vw] text-[1.5vw] text-muted">+{more} more winning hand{more > 1 ? "s" : ""} next</p>}
    </div>
  );
}

export function TvDisplay() {
  const queue = useRef(new WinningEventQueue<WinningHandEvent>());
  const chime = useRef(createChime());
  const [current, setCurrent] = useState<WinningHandEvent | null>(null);
  const [tick, setTick] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [slide, setSlide] = useState(0);

  const onWin = useCallback((e: WinningHandEvent) => { if (queue.current.enqueue(e)) setTick((n) => n + 1); }, []);
  const { tables, settings, leaders, online } = useTvFeed(onWin);

  // Idle -> pick the next queued winning hand.
  useEffect(() => { if (!current) { const n = queue.current.next(); if (n) setCurrent(n); } }, [tick, current]);
  // Show each event for the configured time; chain straight into the next one (no flicker back to the overview).
  useEffect(() => {
    if (!current) return;
    if (settings.sound_enabled) chime.current.play();
    const t = setTimeout(() => setCurrent(queue.current.next() ?? null), settings.highlight_duration_ms);
    return () => clearTimeout(t);
  }, [current, settings.highlight_duration_ms, settings.sound_enabled]);

  const active = useMemo(() => tables.filter((t) => t.status !== "WAITING" || t.players.length), [tables]);
  const pages = Math.max(1, Math.ceil(active.length / PER_PAGE));
  // Rotation: live pages -> each table spotlight -> leaderboard.
  const slides = useMemo(() => [
    ...Array.from({ length: pages }, (_, i) => ({ kind: "live" as const, page: i })),
    ...active.map((t) => ({ kind: "spot" as const, id: t.table_id })), { kind: "board" as const },
  ], [pages, active]);
  useEffect(() => {
    const m = settings.mode;
    if (m !== "rotate" && !(m === "live" && pages > 1)) return;
    const id = setInterval(() => setSlide((s) => s + 1), settings.rotation_interval_ms);
    return () => clearInterval(id);
  }, [settings.mode, settings.rotation_interval_ms, pages]);

  const grid = (list: TvTable[]) => (
    <div className={`grid h-full gap-[1.2vw] p-[2vw] ${list.length <= 4 ? "grid-cols-2 auto-rows-fr" : "grid-cols-4 auto-rows-fr"}`}>
      {list.map((t) => <TableCard key={t.table_id} t={t} big={list.length <= 4} />)}
    </div>
  );
  let body: React.ReactNode;
  const spot = (id?: string | null) => { const t = active.find((x) => x.table_id === id) ?? active[0]; return t ? <Spotlight t={t} /> : grid([]); };
  if (settings.mode === "leaderboard") body = <Leaderboard rows={leaders} type={settings.leaderboard_type} />;
  else if (settings.mode === "spotlight") body = spot(settings.spotlight_table_id);
  else if (settings.mode === "rotate") {
    const s = slides[slide % slides.length];
    body = s.kind === "live" ? grid(active.slice(s.page * PER_PAGE, (s.page + 1) * PER_PAGE)) : s.kind === "spot" ? spot(s.id) : <Leaderboard rows={leaders} type={settings.leaderboard_type} />;
  } else { const p = slide % pages; body = grid(active.slice(p * PER_PAGE, (p + 1) * PER_PAGE)); }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-base text-cream">
      <header className="flex h-[9vh] items-center justify-between px-[2.5vw]">
        <div className="flex items-center gap-[1.2vw]"><LogoMark size="6.5vh" /><h1 className="text-[2.6vw] font-bold">Lucky Cat Mahjong</h1></div>
        <div className="flex items-center gap-[1.5vw] text-[1.4vw] text-muted">
          {settings.sound_enabled && !soundOn && <button onClick={async () => setSoundOn(await chime.current.enable())} className="rounded-[0.8vw] border border-line bg-card px-[1.2vw] py-[0.4vw] font-bold text-cream">🔊 Enable sound</button>}
          <span>{online ? "🟢 Live" : "🔴 Reconnecting…"}</span>
        </div>
      </header>
      <main className="relative h-[91vh]">
        {active.length === 0 && settings.mode !== "leaderboard" ? <p className="flex h-full items-center justify-center text-[3vw] font-bold text-muted">No tables are playing right now</p> : body}
        {current && <Highlight e={current} animate={settings.animations_enabled} more={queue.current.size} />}
      </main>
    </div>
  );
}

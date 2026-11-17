"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtScore, scoreTone } from "@/lib/ui/score";
import { LogoMark } from "@/components/ui/LogoMark";
import { WinningEventQueue } from "@/lib/tv/eventQueue";
import { createChime } from "@/lib/tv/chime";
import { useTvFeed } from "@/lib/tv/useTvFeed";
import { MEDALS, ROUND_NAME, STATUS_LABEL, TV_MODE_LABEL, WIND_NAME, seatWind, type LeaderRow, type MainRow, type TvSettings, type TvTable, type WinningHandEvent } from "@/lib/tv/types";

const PER_PAGE = 8;       // tables per page (per-table mode)
const MAIN_COLS = 2;
const MAIN_ROWS = 6;      // rows per column on the main leaderboard -> 12 players per page (fewer, roomier cards)
const ranked = (t: TvTable) => [...t.players].sort((a, b) => b.score - a.score);
const fmt = (n: number) => n.toLocaleString("en-US");
const net = (n: number) => (n > 0 ? `+${fmtScore(n)}` : fmtScore(n));
const pad = (n: number) => String(n).padStart(2, "0");

/** Grid shape for n tables so the cards always fill the screen (never a half-empty row of tiny cards). */
const gridFor = (n: number) => (n <= 1 ? { cols: 1, rows: 1 } : n === 2 ? { cols: 2, rows: 1 } : n === 3 ? { cols: 3, rows: 1 } : n <= 4 ? { cols: 2, rows: 2 } : n <= 6 ? { cols: 3, rows: 2 } : { cols: 4, rows: 2 });
/** Type sizes per column count (literal class names so Tailwind generates them). */
const SIZE: Record<number, { title: string; sub: string; name: string; score: string; pill: string }> = {
  1: { title: "text-[4vw]", sub: "text-[2vw]", name: "text-[3.4vw]", score: "text-[3.6vw]", pill: "text-[1.6vw]" },
  2: { title: "text-[3vw]", sub: "text-[1.6vw]", name: "text-[2.6vw]", score: "text-[2.8vw]", pill: "text-[1.3vw]" },
  3: { title: "text-[2.4vw]", sub: "text-[1.3vw]", name: "text-[2vw]", score: "text-[2.2vw]", pill: "text-[1.1vw]" },
  4: { title: "text-[1.9vw]", sub: "text-[1.1vw]", name: "text-[1.6vw]", score: "text-[1.8vw]", pill: "text-[0.95vw]" },
};

function TableCard({ t, cols }: { t: TvTable; cols: number }) {
  const z = SIZE[cols] ?? SIZE[4];
  const start = t.starting_points ?? 0;
  return (
    <div className="flex min-h-0 flex-col rounded-[1.4vw] border-[0.18vw] border-line bg-card p-[1.4vw]">
      <div className="flex items-center justify-between gap-[1vw]">
        <h3 className={`font-extrabold ${z.title}`}>TABLE {pad(t.table_number)}</h3>
        <span className={`shrink-0 rounded-full bg-base/60 px-[1vw] py-[0.3vw] font-semibold ${z.pill}`}>{STATUS_LABEL[t.status]}</span>
      </div>
      <p className={`mt-[0.4vw] font-semibold text-muted ${z.sub}`}>{t.round_wind ? `${ROUND_NAME[t.round_wind]} · Hand ${t.hand_number ?? "-"}` : "Waiting for players"}</p>
      <ul className="mt-[1vw] flex min-h-0 flex-1 flex-col justify-evenly gap-[0.5vw]">
        {ranked(t).map((p, i) => (
          <li key={p.seat} className={`flex min-h-0 items-center justify-between gap-[1vw] rounded-[0.8vw] bg-base/40 px-[1vw] py-[0.5vw] font-bold ${z.name}`}>
            <span className="flex min-w-0 items-center gap-[0.8vw]"><span className="shrink-0">{MEDALS[i]}</span><span className="truncate">{p.name}</span>{p.seat === t.dealer_seat && <span className="shrink-0">👑</span>}</span>
            <span className={`shrink-0 tabular-nums ${z.score} ${scoreTone(p.score, false, start)}`}>{fmtScore(p.score)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TablesGrid({ list }: { list: TvTable[] }) {
  const { cols, rows } = gridFor(list.length);
  return (
    <div className="grid h-full gap-[1.2vw] px-[2vw] pb-[2vw] pt-[0.5vw]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
      {list.map((t) => <TableCard key={t.table_id} t={t} cols={cols} />)}
    </div>
  );
}

function Spotlight({ t }: { t: TvTable }) {
  const dealer = t.dealer_seat ?? 0, start = t.starting_points ?? 0;
  return (
    <div className="flex h-full flex-col justify-center gap-[2vw] px-[6vw]">
      <h2 className="text-[6vw] font-extrabold">TABLE {pad(t.table_number)} 🀄</h2>
      <p className="text-[3vw] font-bold text-muted">{t.round_wind ? ROUND_NAME[t.round_wind] : ""} · Hand {t.hand_number ?? "-"}</p>
      <div className="grid grid-cols-2 gap-[3vw]">
        <ul className="space-y-[1vw] text-[3.4vw] font-extrabold">
          {ranked(t).map((p, i) => <li key={p.seat} className="flex justify-between">{MEDALS[i]} {p.name}{p.seat === dealer ? " 👑" : ""}<span className={scoreTone(p.score, false, start)}>{fmtScore(p.score)}</span></li>)}
        </ul>
        <ul className="space-y-[1vw] text-[2.6vw] font-bold text-muted">
          {[...t.players].sort((a, b) => a.seat - b.seat).map((p) => <li key={p.seat}>{WIND_NAME[seatWind(p.seat, dealer)].toUpperCase()} — <span className="text-cream">{p.name}</span></li>)}
        </ul>
      </div>
    </div>
  );
}

/** Live main leaderboard: every player from every table, ranked by points won/lost against that table's starting points.
 *  Margins and heights use vh/vw so the spacing stays generous on any TV; the title sits on ONE line to give the player cards room. */
function MainBoard({ rows, page, pages }: { rows: MainRow[]; page: number; pages: number }) {
  const per = MAIN_COLS * MAIN_ROWS;
  const slice = rows.slice(page * per, (page + 1) * per);
  return (
    <div className="flex h-full flex-col px-[5vw] pb-[5vh] pt-[3vh]">
      <div className="mb-[4vh] flex items-baseline justify-between gap-[2vw]">
        <div className="flex items-baseline gap-[2vw]">
          <h2 className="text-[3vw] font-extrabold">🏆 MAIN LEADERBOARD</h2>
          <p className="text-[1.5vw] font-semibold text-muted">All players · all tables · live</p>
        </div>
        <p className="shrink-0 text-[1.5vw] font-semibold text-muted">{rows.length} players{pages > 1 ? ` · page ${page + 1}/${pages}` : ""}</p>
      </div>
      {rows.length === 0 ? <p className="flex flex-1 items-center justify-center text-[3vw] font-bold text-muted">No players yet</p> : (
        <ol className="grid min-h-0 flex-1 grid-flow-col gap-x-[3.5vw] gap-y-[2.6vh]" style={{ gridTemplateRows: `repeat(${MAIN_ROWS}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${MAIN_COLS}, minmax(0, 1fr))` }}>
          {slice.map((r, i) => {
            const rank = page * per + i, top = rank < 3;
            return (
              <li key={`${r.table}-${r.name}-${rank}`} className={`flex min-h-0 items-center gap-[1.4vw] rounded-[1.2vw] px-[1.8vw] py-[1.2vh] ${top ? "border-[0.15vw] border-cream/40 bg-card" : "bg-card/70"}`}>
                <span className="w-[3.6vw] shrink-0 text-center text-[1.9vw] font-extrabold leading-none text-muted">{MEDALS[rank] && rank < 3 ? MEDALS[rank] : rank + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[1.9vw] font-bold leading-none">{r.name}</span>
                <span className="shrink-0 rounded-full bg-base/60 px-[1.1vw] py-[0.6vh] text-[1.1vw] font-semibold leading-tight text-muted">Table {pad(r.table)}</span>
                <span className="w-[9vw] shrink-0 pl-[0.5vw] text-right">
                  <span className={`block text-[1.9vw] font-extrabold leading-none tabular-nums ${scoreTone(r.net, false, 0)}`}>{net(r.net)}</span>
                  {r.start > 0 && <span className="mt-[0.9vh] block text-[0.9vw] leading-none text-muted">total {fmtScore(r.score)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function StatsBoard({ rows, type }: { rows: LeaderRow[]; type: string }) {
  const sorted = [...rows].sort((a, b) => type === "most_wins" ? b.wins_today - a.wins_today : type === "highest_fan" ? b.best_fan_today - a.best_fan_today : b.score - a.score).slice(0, 8);
  const label = type === "most_wins" ? "Most Wins Today" : type === "highest_fan" ? "Highest Fan Today" : "Highest Score";
  const val = (r: LeaderRow) => type === "most_wins" ? `${r.wins_today} wins` : type === "highest_fan" ? `${r.best_fan_today} fan` : fmtScore(r.score);
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
      <p className="text-[2.4vw] font-semibold text-muted">TABLE {pad(e.tableNumber)} · {ROUND_NAME[e.roundWind] ?? e.roundWind} · {e.winningMethod === "self_draw" ? "Self Draw" : "Discard Win"}</p>
      <div className="flex flex-wrap justify-center gap-[1.5vw] text-[3vw] font-bold">{e.detectedFan.map((f) => <span key={f.name}>🀄 {f.name} <span className="text-muted">{f.fan}</span></span>)}</div>
      <p className="text-[7vw] font-extrabold">{e.totalFan > 0 ? `${e.totalFan} FAN` : `${e.points} POIN`}</p>
      <p className="text-[4vw] font-bold">+{fmt(e.points)} POINTS</p>
      <div className="flex flex-wrap justify-center gap-[0.4vw]">{e.handTiles.map((t, i) => <span key={i} className="rounded-[0.5vw] bg-cream px-[0.8vw] py-[0.3vw] text-[2vw] font-extrabold text-base">{t}</span>)}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {e.photoUrl && <img src={e.photoUrl} alt="Winning hand" className="max-h-[22vh] rounded-[1vw] border-[0.2vw] border-line" />}
      {more > 0 && <p className="absolute bottom-[1.5vw] right-[2vw] text-[1.5vw] text-muted">+{more} more winning hand{more > 1 ? "s" : ""} next</p>}
    </div>
  );
}

/** ?view=tables | main | spotlight | leaderboard | rotate overrides the admin mode for THIS screen only (e.g. two TVs). */
const VIEWS: Record<string, TvSettings["mode"]> = { tables: "live", live: "live", main: "main", spotlight: "spotlight", leaderboard: "leaderboard", rotate: "rotate" };

export function TvDisplay() {
  const queue = useRef(new WinningEventQueue<WinningHandEvent>());
  const chime = useRef(createChime());
  const [current, setCurrent] = useState<WinningHandEvent | null>(null);
  const [tick, setTick] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [slide, setSlide] = useState(0);
  const [override, setOverride] = useState<TvSettings["mode"] | null>(null);
  useEffect(() => { const v = new URLSearchParams(window.location.search).get("view"); setOverride(v && VIEWS[v] ? VIEWS[v] : null); }, []);

  const onWin = useCallback((e: WinningHandEvent) => { if (queue.current.enqueue(e)) setTick((n) => n + 1); }, []);
  const { tables, settings, leaders, online } = useTvFeed(onWin);
  const mode = override ?? settings.mode;

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
  const mainRows = useMemo<MainRow[]>(() => active.flatMap((t) => t.players.map((p) => ({ name: p.name, table: t.table_number, score: p.score, start: t.starting_points ?? 0, net: p.score - (t.starting_points ?? 0) })))
    .sort((a, b) => b.net - a.net || b.score - a.score || a.name.localeCompare(b.name)), [active]);
  const mainPages = Math.max(1, Math.ceil(mainRows.length / (MAIN_COLS * MAIN_ROWS)));
  // Rotation: table pages -> each table spotlight -> main leaderboard pages -> today's stats.
  const slides = useMemo(() => [
    ...Array.from({ length: pages }, (_, i) => ({ kind: "live" as const, page: i })),
    ...active.map((t) => ({ kind: "spot" as const, id: t.table_id })),
    ...Array.from({ length: mainPages }, (_, i) => ({ kind: "main" as const, page: i })),
    { kind: "board" as const },
  ], [pages, mainPages, active]);
  useEffect(() => {
    if (mode !== "rotate" && !(mode === "live" && pages > 1) && !(mode === "main" && mainPages > 1)) return;
    const id = setInterval(() => setSlide((s) => s + 1), settings.rotation_interval_ms);
    return () => clearInterval(id);
  }, [mode, settings.rotation_interval_ms, pages, mainPages]);

  const spot = (id?: string | null) => { const t = active.find((x) => x.table_id === id) ?? active[0]; return t ? <Spotlight t={t} /> : null; };
  const tablesPage = (p: number) => <TablesGrid list={active.slice(p * PER_PAGE, (p + 1) * PER_PAGE)} />;
  let body: React.ReactNode;
  if (mode === "leaderboard") body = <StatsBoard rows={leaders} type={settings.leaderboard_type} />;
  else if (mode === "main") body = <MainBoard rows={mainRows} page={slide % mainPages} pages={mainPages} />;
  else if (mode === "spotlight") body = spot(settings.spotlight_table_id);
  else if (mode === "rotate") {
    const s = slides[slide % slides.length];
    body = s.kind === "live" ? tablesPage(s.page) : s.kind === "spot" ? spot(s.id) : s.kind === "main" ? <MainBoard rows={mainRows} page={s.page} pages={mainPages} /> : <StatsBoard rows={leaders} type={settings.leaderboard_type} />;
  } else body = tablesPage(slide % pages);
  const needsTables = mode !== "leaderboard";

  return (
    // Explicit unitless line-height: the app's body line-height is a fixed length that would make vw-sized text overlap.
    <div className="fixed inset-0 z-50 overflow-hidden bg-base leading-[1.2] text-cream">
      <header className="flex h-[9vh] items-center justify-between px-[2.5vw]">
        <div className="flex items-center gap-[1.2vw]"><LogoMark size="6.5vh" /><h1 className="text-[2.6vw] font-bold">Lucky Cat Mahjong</h1></div>
        <div className="flex items-center gap-[1.5vw] text-[1.4vw] text-muted">
          <span className="rounded-full border border-line bg-card px-[1.2vw] py-[0.3vw] font-semibold text-cream">{TV_MODE_LABEL[mode]}</span>
          {settings.sound_enabled && !soundOn && <button onClick={async () => setSoundOn(await chime.current.enable())} className="rounded-[0.8vw] border border-line bg-card px-[1.2vw] py-[0.4vw] font-bold text-cream">🔊 Enable sound</button>}
          <span>{online ? "🟢 Live" : "🔴 Reconnecting…"}</span>
        </div>
      </header>
      <main className="relative h-[91vh]">
        {active.length === 0 && needsTables ? <p className="flex h-full items-center justify-center text-[3vw] font-bold text-muted">No tables are playing right now</p> : body}
        {current && <Highlight e={current} animate={settings.animations_enabled} more={queue.current.size} />}
      </main>
    </div>
  );
}

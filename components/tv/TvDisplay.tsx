"use client";
import { ruleName } from "@/lib/i18n/ruleNames";
import { currentLang } from "@/lib/i18n/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtScore, scoreTone } from "@/lib/ui/score";
import { LogoMark } from "@/components/ui/LogoMark";
import { Tile } from "@/components/mahjong/Tile";
import { WinningEventQueue } from "@/lib/tv/eventQueue";
import { createChime } from "@/lib/tv/chime";
import { useTvFeed } from "@/lib/tv/useTvFeed";
import { ROUND_NAME, TV_MODE_LABEL, WIND_NAME, seatWind, type LeaderRow, type MainRow, type TvSettings, type TvTable, type WinningHandEvent } from "@/lib/tv/types";

const PER_PAGE = 8;       // tables per page (per-table mode)
const DEFAULT_MAIN_ROWS = 8;   // players per page on the main leaderboard (admin setting, or ?rows=N on the screen)
/** Shared column template so the header row and every player row line up exactly. */
const SPOT_GRID = "grid-cols-[6vw_minmax(0,1fr)_13vw_15vw_14vw]";
const MAIN_GRID = "grid-cols-[5vw_minmax(0,1fr)_12vw_13vw_16vw]";
const TV_STATUS: Record<string, { label: string; dot: string }> = {
  WAITING: { label: "Waiting", dot: "bg-warn" }, PLAYING: { label: "Playing", dot: "bg-pos" },
  PAUSED: { label: "Paused", dot: "bg-warn" }, FINISHED: { label: "Finished", dot: "bg-muted" },
};
const netTone = (n: number) => (n > 0 ? "text-pos" : n < 0 ? "text-neg" : "text-cream");
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

function Dot({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-[0.8vw] w-[0.8vw] shrink-0 rounded-full ${className}`} />;
}
const Sep = () => <span className="mx-[0.9vw] inline-block h-[0.35vw] w-[0.35vw] rounded-full bg-line align-middle" />;

/** Rank marker: 1st is a solid cream disc, 2nd/3rd a soft cream disc, the rest a plain number. No emoji. */
function RankBadge({ rank, size = "2.9vw", text = "text-[1.7vw]", fs }: { rank: number; size?: string; text?: string; fs?: string }) {
  const tone = rank === 0 ? "bg-cream text-base" : rank === 1 ? "bg-cream/30 text-cream" : rank === 2 ? "bg-cream/15 text-cream" : "text-muted";
  return <span className={`flex shrink-0 items-center justify-center rounded-full font-extrabold leading-none tabular-nums ${text} ${tone}`} style={{ width: size, height: size, ...(fs ? { fontSize: fs } : {}) }}>{rank + 1}</span>;
}

function TableCard({ t, cols }: { t: TvTable; cols: number }) {
  const z = SIZE[cols] ?? SIZE[4];
  const start = t.starting_points ?? 0;
  return (
    <div className="flex min-h-0 flex-col rounded-[1.4vw] border-[0.18vw] border-line bg-card p-[1.4vw]">
      <div className="flex items-center justify-between gap-[1vw]">
        <h3 className={`font-extrabold ${z.title}`}>TABLE {pad(t.table_number)}</h3>
        <span className={`inline-flex shrink-0 items-center gap-[0.6vw] rounded-full bg-base/60 px-[1vw] py-[0.3vw] font-semibold ${z.pill}`}><Dot className={TV_STATUS[t.status].dot} />{TV_STATUS[t.status].label}</span>
      </div>
      <p className={`mt-[0.4vw] font-semibold text-muted ${z.sub}`}>{t.round_wind ? `${ROUND_NAME[t.round_wind]} · Hand ${t.hand_number ?? "-"}` : "Waiting for players"}</p>
      <ul className="mt-[1vw] flex min-h-0 flex-1 flex-col justify-evenly gap-[0.5vw]">
        {ranked(t).map((p, i) => (
          <li key={p.seat} className={`flex min-h-0 items-center justify-between gap-[1vw] rounded-[0.8vw] bg-base/40 px-[1vw] py-[0.5vw] font-bold ${z.name}`}>
            <span className="flex min-w-0 items-center gap-[0.8vw]"><RankBadge rank={i} size={cols >= 3 ? "2.2vw" : "2.8vw"} text={cols >= 3 ? "text-[1.2vw]" : "text-[1.5vw]"} /><span className="truncate">{p.name}</span>{p.seat === t.dealer_seat && <span className={`shrink-0 rounded-full border border-line px-[0.7vw] py-[0.1vw] font-bold uppercase tracking-[0.12em] text-muted ${z.pill}`}>Dealer</span>}</span>
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

/** One table, full screen: a single clear column (rank, player, seat wind, score, won/lost). */
function Spotlight({ t }: { t: TvTable }) {
  const dealer = t.dealer_seat ?? 0, start = t.starting_points ?? 0;
  const st = TV_STATUS[t.status];
  return (
    <div className="flex h-full flex-col px-[4vw] pb-[3.5vh] pt-[1vh]">
      <div className="flex items-end justify-between gap-[2vw] pb-[2.4vh]">
        <div>
          <p className="text-[1.1vw] font-bold uppercase tracking-[0.3em] text-muted">{t.round_wind ? `${ROUND_NAME[t.round_wind]} · Hand ${t.hand_number ?? "-"}` : "Waiting for players"}</p>
          <h2 className="mt-[0.8vh] text-[4.6vw] font-extrabold leading-none">TABLE {pad(t.table_number)}</h2>
        </div>
        <span className="inline-flex items-center gap-[0.7vw] rounded-full bg-card px-[1.4vw] py-[0.7vh] text-[1.5vw] font-bold"><Dot className={st.dot} />{st.label}</span>
      </div>
      <div className={`grid ${SPOT_GRID} items-center border-b border-line/70 px-[2vw] pb-[1.2vh] text-[1vw] font-bold uppercase tracking-[0.2em] text-muted`}>
        <span className="text-center">#</span><span>Player</span><span className="text-center">Seat</span><span className="text-right">Total</span><span className="text-right">Won / Lost</span>
      </div>
      <ol className="mt-[1.2vh] grid min-h-0 flex-1 gap-y-[1.4vh]" style={{ gridTemplateRows: `repeat(${Math.max(4, t.players.length)}, minmax(0, 1fr))` }}>
        {ranked(t).map((p, i) => {
          const top = i < 3, n = p.score - start;
          return (
            <li key={p.seat} className={`relative grid ${SPOT_GRID} min-h-0 items-center rounded-[1vw] px-[2vw] ${i === 0 ? "border border-cream/40 bg-card" : top ? "bg-card" : "bg-card/55"}`}>
              {top && <span className={`absolute left-0 top-[18%] h-[64%] w-[0.3vw] rounded-r-full ${i === 0 ? "bg-cream" : "bg-cream/50"}`} />}
              <span className="flex justify-center"><RankBadge rank={i} size="4vw" text="text-[2.2vw]" /></span>
              <span className="flex min-w-0 items-center gap-[1.2vw]">
                <span className={`min-w-0 truncate text-[3.2vw] leading-none ${top ? "font-extrabold" : "font-bold"}`}>{p.name}</span>
                {p.seat === dealer && <span className="shrink-0 rounded-full border border-line px-[1vw] py-[0.3vh] text-[1.2vw] font-bold uppercase tracking-[0.12em] text-muted">Dealer</span>}
              </span>
              <span className="justify-self-center rounded-full border border-line px-[1.2vw] py-[0.5vh] text-[1.3vw] font-bold uppercase leading-tight text-muted">{WIND_NAME[seatWind(p.seat, dealer)]}</span>
              <span className={`text-right text-[2.6vw] font-extrabold tabular-nums ${scoreTone(p.score, false, start)}`}>{fmtScore(p.score)}</span>
              <span className={`text-right text-[2vw] font-bold leading-none tabular-nums ${netTone(n)}`}>{net(n)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Live main leaderboard: every player from every table, ranked by points won/lost against that table's starting points.
 *  One clean column (rank, player, table, total, won/lost). All sizes use vw/vh so it scales to any TV. */
function MainBoard({ rows, page, pages, tables, perPage }: { rows: MainRow[]; page: number; pages: number; tables: number; perPage: number }) {
  const slice = rows.slice(page * perPage, (page + 1) * perPage);
  // Text scales with the row count so 12 or 16 rows still fit: each row gets ~64vh / perPage of height.
  const rh = 64 / perPage;
  const f = (vw: number, k: number) => `min(${vw}vw, ${(rh * k).toFixed(2)}vh)`;
  return (
    <div className="flex h-full flex-col px-[4vw] pb-[3.5vh] pt-[1vh]">
      <div className="flex items-end justify-between gap-[2vw] pb-[2vh]">
        <div>
          <p className="text-[1.1vw] font-bold uppercase tracking-[0.3em] text-muted">Live standings</p>
          <h2 className="mt-[0.8vh] text-[3.4vw] font-extrabold leading-none">Main Leaderboard</h2>
        </div>
        <p className="text-[1.4vw] font-semibold text-muted">{rows.length} players<Sep />{tables} tables{pages > 1 && <><Sep />Page {page + 1} of {pages}</>}</p>
      </div>
      {rows.length === 0 ? <p className="flex flex-1 items-center justify-center text-[3vw] font-bold text-muted">No players yet</p> : (
        <>
          <div className={`grid ${MAIN_GRID} items-center border-b border-line/70 px-[2vw] pb-[1vh] text-[1vw] font-bold uppercase tracking-[0.2em] text-muted`}>
            <span className="text-center">#</span><span>Player</span><span className="text-center">Table</span><span className="text-right">Total</span><span className="text-right">Won / Lost</span>
          </div>
          <ol className="mt-[1vh] grid min-h-0 flex-1 content-start gap-y-[0.9vh]" style={{ gridTemplateRows: `repeat(${perPage}, minmax(0, 1fr))` }}>
            {slice.map((r, i) => {
              const rank = page * perPage + i, top = rank < 3;
              return (
                <li key={`${r.table}-${r.name}-${rank}`} className={`relative grid ${MAIN_GRID} min-h-0 items-center rounded-[1vw] px-[2vw] ${rank === 0 ? "border border-cream/40 bg-card" : top ? "bg-card" : "bg-card/55"}`}>
                  {top && <span className={`absolute left-0 top-[18%] h-[64%] w-[0.3vw] rounded-r-full ${rank === 0 ? "bg-cream" : "bg-cream/50"}`} />}
                  <span className="flex justify-center"><RankBadge rank={rank} size={f(2.9, 0.66)} fs={f(1.7, 0.4)} /></span>
                  <span className={`min-w-0 truncate leading-none ${top ? "font-extrabold" : "font-bold"}`} style={{ fontSize: f(2.2, 0.52) }}>{r.name}</span>
                  <span className="justify-self-center rounded-full border border-line px-[1.1vw] py-[0.3vh] font-bold leading-tight text-muted" style={{ fontSize: f(1.15, 0.3) }}>Table {pad(r.table)}</span>
                  <span className="text-right font-semibold tabular-nums text-muted" style={{ fontSize: f(1.7, 0.4) }}>{fmtScore(r.score)}</span>
                  <span className={`text-right font-extrabold leading-none tabular-nums ${netTone(r.net)}`} style={{ fontSize: f(2.6, 0.62) }}>{net(r.net)}</span>
                </li>
              );
            })}
          </ol>
          {pages > 1 && <div className="mt-[1.6vh] flex justify-center gap-[0.7vw]">{Array.from({ length: pages }, (_, n) => <span key={n} className={`h-[0.7vh] rounded-full transition-all ${n === page ? "w-[3vw] bg-cream" : "w-[0.7vh] bg-line"}`} />)}</div>}
        </>
      )}
    </div>
  );
}

/** Today's stats: top players by score / wins / best faan. Same layout language as the main leaderboard; sizes follow the row count so it always fits. */
const STATS_GRID = "grid-cols-[6vw_minmax(0,1fr)_16vw_12vw_12vw]";
function StatsBoard({ rows, type, perPage }: { rows: LeaderRow[]; type: string; perPage: number }) {
  const sorted = [...rows].sort((a, b) => type === "most_wins" ? b.wins_today - a.wins_today : type === "highest_fan" ? b.best_fan_today - a.best_fan_today : b.score - a.score).slice(0, perPage);
  const label = type === "most_wins" ? "Most wins today" : type === "highest_fan" ? "Highest faan today" : "Highest score";
  const rh = 64 / perPage;
  const f = (vw: number, k: number) => `min(${vw}vw, ${(rh * k).toFixed(2)}vh)`;
  // The column that is being ranked is bright; the others are supporting numbers.
  const hi = (col: "score" | "wins" | "fan") => (type === "most_wins" ? "wins" : type === "highest_fan" ? "fan" : "score") === col;
  const cell = (col: "score" | "wins" | "fan") => `text-right tabular-nums ${hi(col) ? "font-extrabold text-cream" : "font-semibold text-muted"}`;
  const head = (col: "score" | "wins" | "fan") => `text-right ${hi(col) ? "text-cream" : ""}`;
  return (
    <div className="flex h-full flex-col px-[4vw] pb-[3.5vh] pt-[1vh]">
      <div className="flex items-end justify-between gap-[2vw] pb-[2vh]">
        <div>
          <p className="text-[1.1vw] font-bold uppercase tracking-[0.3em] text-muted">{label}</p>
          <h2 className="mt-[0.8vh] text-[3.4vw] font-extrabold leading-none">Today&apos;s Leaderboard</h2>
        </div>
        <p className="text-[1.4vw] font-semibold text-muted">{rows.length} players today</p>
      </div>
      {sorted.length === 0 ? <p className="flex flex-1 items-center justify-center text-[3vw] font-bold text-muted">No games played today yet</p> : (
        <>
          <div className={`grid ${STATS_GRID} items-center border-b border-line/70 px-[2vw] pb-[1vh] text-[1vw] font-bold uppercase tracking-[0.2em] text-muted`}>
            <span className="text-center">#</span><span>Player</span><span className={head("score")}>Score</span><span className={head("wins")}>Wins</span><span className={head("fan")}>Best faan</span>
          </div>
          <ol className="mt-[1vh] grid min-h-0 flex-1 content-start gap-y-[0.9vh]" style={{ gridTemplateRows: `repeat(${perPage}, minmax(0, 1fr))` }}>
            {sorted.map((r, i) => {
              const top = i < 3;
              return (
                <li key={r.name} className={`relative grid ${STATS_GRID} min-h-0 items-center rounded-[1vw] px-[2vw] ${i === 0 ? "border border-cream/40 bg-card" : top ? "bg-card" : "bg-card/55"}`}>
                  {top && <span className={`absolute left-0 top-[18%] h-[64%] w-[0.3vw] rounded-r-full ${i === 0 ? "bg-cream" : "bg-cream/50"}`} />}
                  <span className="flex justify-center"><RankBadge rank={i} size={f(2.9, 0.66)} fs={f(1.7, 0.4)} /></span>
                  <span className={`min-w-0 truncate leading-none ${top ? "font-extrabold" : "font-bold"}`} style={{ fontSize: f(2.2, 0.52) }}>{r.name}</span>
                  <span className={cell("score")} style={{ fontSize: f(hi("score") ? 2.6 : 1.7, hi("score") ? 0.62 : 0.4) }}>{fmtScore(r.score)}</span>
                  <span className={cell("wins")} style={{ fontSize: f(hi("wins") ? 2.6 : 1.7, hi("wins") ? 0.62 : 0.4) }}>{r.wins_today}</span>
                  <span className={cell("fan")} style={{ fontSize: f(hi("fan") ? 2.6 : 1.7, hi("fan") ? 0.62 : 0.4) }}>{r.best_fan_today}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}

function Highlight({ e, animate, more }: { e: WinningHandEvent; animate: boolean; more: number }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-base/95 px-[4vw] py-[3vh]">
      <section className="relative flex max-h-[88vh] w-full max-w-[88vw] flex-col items-center overflow-hidden rounded-[2vw] border-[0.18vw] border-line bg-card px-[4vw] py-[3vh] text-center shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-[0.65vh] bg-cream/80" />
        <div className="flex w-full flex-wrap items-center justify-between gap-[1vw] pt-[0.8vh]">
          <span className="rounded-full border border-line bg-base/70 px-[1.4vw] py-[0.7vh] text-[1.25vw] font-extrabold uppercase tracking-[0.18em] text-muted">Winning hand</span>
          <div className="flex flex-wrap justify-center gap-[0.7vw] text-[1.25vw] font-bold text-muted">
            <span className="rounded-full bg-base/70 px-[1.2vw] py-[0.7vh]">TABLE {pad(e.tableNumber)}</span>
            <span className="rounded-full bg-base/70 px-[1.2vw] py-[0.7vh]">{ROUND_NAME[e.roundWind] ?? e.roundWind}</span>
            <span className="rounded-full bg-base/70 px-[1.2vw] py-[0.7vh]">{e.winningMethod === "self_draw" ? "SELF DRAW" : "DISCARD WIN"}</span>
          </div>
        </div>
        <div className="my-[2.4vh] flex flex-col items-center">
          <p className={`mb-[1vh] text-[2vw] font-bold tracking-[0.28em] text-cream/70 ${animate ? "animate-pulse" : ""}`}>HU!</p>
          <h1 className="text-[5.2vw] font-black leading-[1.05] tracking-tight text-cream">{e.winner.name}</h1>
          <p className="mt-[1vh] text-[1.55vw] font-semibold text-muted">Winning player</p>
        </div>
        <div className="mb-[2.2vh] grid w-full max-w-[62vw] grid-cols-2 gap-[1vw]">
          <div className="rounded-[1.2vw] border border-line bg-base/55 px-[2vw] py-[1.5vh]"><p className="text-[1.1vw] font-bold uppercase tracking-[0.16em] text-muted">Total faan</p><p className="mt-[0.5vh] text-[3.2vw] font-black leading-none text-cream">{e.totalFan > 0 ? e.totalFan : "—"}</p></div>
          <div className="rounded-[1.2vw] border border-line bg-base/55 px-[2vw] py-[1.5vh]"><p className="text-[1.1vw] font-bold uppercase tracking-[0.16em] text-muted">Points won</p><p className="mt-[0.5vh] text-[3.2vw] font-black leading-none text-cream">+{fmt(e.points)}</p></div>
        </div>
        {e.detectedFan.length > 0 && <div className="mb-[2vh] w-full max-w-[76vw]"><p className="mb-[1vh] text-[1.05vw] font-extrabold uppercase tracking-[0.2em] text-muted">Winning patterns</p><div className="flex flex-wrap justify-center gap-[0.7vw]">{e.detectedFan.map((f) => <span key={f.name} className="inline-flex items-center gap-[0.65vw] rounded-full border border-line bg-base/60 px-[1.2vw] py-[0.8vh] text-[1.25vw] font-semibold text-cream">{ruleName(currentLang(), f.name)}<span className="rounded-full bg-cream px-[0.65vw] py-[0.25vh] text-[1vw] font-extrabold text-base">{f.fan}F</span></span>)}</div></div>}
        {e.handTiles.length > 0 && <div className="mb-[1.8vh] w-full"><p className="mb-[1.2vh] text-[1.05vw] font-extrabold uppercase tracking-[0.2em] text-muted">Winning hand</p><div className="flex flex-wrap items-center justify-center gap-[0.65vw]">{e.handTiles.map((t, i) => <div key={`${t}-${i}`} className="w-[4.6vw] shrink-0 drop-shadow-md"><Tile t={t} fluid /></div>)}</div></div>}
        {e.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.photoUrl} alt="Winning hand" className="max-h-[19vh] max-w-[48vw] rounded-[1vw] border-[0.15vw] border-line object-contain" />
        )}
        {more > 0 && <p className="mt-[1.4vh] text-[1.05vw] font-semibold text-muted">+{more} more winning hand{more > 1 ? "s" : ""} in queue</p>}
      </section>
    </div>
  );
}

/** ?view=tables | main | spotlight | leaderboard | rotate overrides the admin mode for THIS screen only (e.g. two TVs). */
const VIEWS: Record<string, TvSettings["mode"]> = { tables: "live", live: "live", main: "main", spotlight: "spotlight", leaderboard: "leaderboard", rotate: "rotate" };

export function TvDisplay({ view }: { view?: string } = {}) {
  const queue = useRef(new WinningEventQueue<WinningHandEvent>());
  const chime = useRef(createChime());
  const [current, setCurrent] = useState<WinningHandEvent | null>(null);
  const [tick, setTick] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [slide, setSlide] = useState(0);
  const [override, setOverride] = useState<TvSettings["mode"] | null>(null);
  const [rowsOverride, setRowsOverride] = useState<number | null>(null);
  useEffect(() => { const v = view ?? new URLSearchParams(window.location.search).get("view"); setOverride(v && VIEWS[v] ? VIEWS[v] : null); const r = Number(new URLSearchParams(window.location.search).get("rows")); setRowsOverride(r >= 4 && r <= 20 ? Math.round(r) : null); }, [view]);

  const onWin = useCallback((e: WinningHandEvent) => { if (queue.current.enqueue(e)) setTick((n) => n + 1); }, []);
  const { tables, settings, leaders, online } = useTvFeed(onWin);
  const mode = override ?? settings.mode;
  const perPage = Math.min(20, Math.max(4, rowsOverride ?? settings.main_rows ?? DEFAULT_MAIN_ROWS));

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
  const mainRows = useMemo<MainRow[]>(() => active.flatMap((t) => t.players.map((p) => ({ name: p.name, table: t.table_number, roomCode: t.room_code, score: p.score, start: t.starting_points ?? 0, net: p.score - (t.starting_points ?? 0) })))
    .sort((a, b) => b.net - a.net || b.score - a.score || a.name.localeCompare(b.name)), [active]);
  const mainPages = Math.max(1, Math.ceil(mainRows.length / perPage));
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
  if (mode === "leaderboard") body = <StatsBoard rows={leaders} type={settings.leaderboard_type} perPage={perPage} />;
  else if (mode === "main") body = <MainBoard rows={mainRows} page={slide % mainPages} pages={mainPages} tables={active.length} perPage={perPage} />;
  else if (mode === "spotlight") body = spot(settings.spotlight_table_id);
  else if (mode === "rotate") {
    const s = slides[slide % slides.length];
    body = s.kind === "live" ? tablesPage(s.page) : s.kind === "spot" ? spot(s.id) : s.kind === "main" ? <MainBoard rows={mainRows} page={s.page} pages={mainPages} tables={active.length} perPage={perPage} /> : <StatsBoard rows={leaders} type={settings.leaderboard_type} perPage={perPage} />;
  } else body = tablesPage(slide % pages);
  const needsTables = mode !== "leaderboard";

  return (
    // Explicit unitless line-height: the app's body line-height is a fixed length that would make vw-sized text overlap.
    <div className="fixed inset-0 z-50 overflow-hidden bg-base leading-[1.2] text-cream">
      <header className="flex h-[9vh] items-center justify-between px-[4vw]">
        <div className="flex items-center gap-[1.2vw]"><LogoMark size="6.5vh" /><h1 className="text-[2.2vw] font-extrabold tracking-tight">Lucky Cat Mahjong</h1></div>
        <div className="flex items-center gap-[1.5vw] text-[1.4vw] text-muted">
          <span className="rounded-full border border-line px-[1.2vw] py-[0.3vw] text-[1.2vw] font-bold uppercase tracking-[0.16em] text-muted">{TV_MODE_LABEL[mode]}</span>
          {settings.sound_enabled && !soundOn && <button onClick={async () => setSoundOn(await chime.current.enable())} className="rounded-[0.8vw] border border-line bg-card px-[1.2vw] py-[0.4vw] font-bold text-cream">Enable sound</button>}
          <span className="inline-flex items-center gap-[0.7vw] font-bold uppercase tracking-[0.16em]"><Dot className={online ? "bg-pos" : "animate-pulse bg-neg"} />{online ? "Live" : "Reconnecting"}</span>
        </div>
      </header>
      <main className="relative h-[91vh]">
        {active.length === 0 && needsTables ? <p className="flex h-full items-center justify-center text-[3vw] font-bold text-muted">No tables are playing right now</p> : body}
        {current && <Highlight e={current} animate={settings.animations_enabled} more={queue.current.size} />}
      </main>
    </div>
  );
}

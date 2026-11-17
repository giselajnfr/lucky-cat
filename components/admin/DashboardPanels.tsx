import Link from "next/link";
import { SessionClock } from "@/components/game/SessionClock";
import { fmtScore, scoreTone } from "@/lib/ui/score";
import { MEDALS, ROUND_NAME } from "@/lib/tv/types";
import { fmtTime, tableState, whenLabel, type ActivityItem, type Attention, type DashTable, type TableState, type TodayHand } from "@/lib/admin/dashboard";
import type { handsPerHour, todaySummary } from "@/lib/admin/dashboard";

/** Section heading with an optional link on the right. */
export function SectionHead({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {href && link && <Link href={href} className="text-sm font-semibold text-muted underline-offset-4 hover:text-cream hover:underline">{link}</Link>}
    </div>
  );
}

// ---------------------------------------------------------------- attention

const BAR = { high: "bg-neg", mid: "bg-warn", low: "bg-line" } as const;

export function AttentionPanel({ items, hasTables }: { items: Attention[]; hasTables: boolean }) {
  if (items.length === 0)
    return hasTables ? (
      <p className="flex items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm" role="status">
        <span aria-hidden className="h-2 w-2 rounded-full bg-pos" /> Semua meja berjalan normal. Tidak ada yang perlu ditindak.
      </p>
    ) : null;
  return (
    <section aria-labelledby="attn-h">
      <h2 id="attn-h" className="mb-2 text-lg font-bold">Perlu perhatian <span className="ml-1 rounded-full bg-warn px-2 py-0.5 text-sm font-extrabold text-base">{items.length}</span></h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        {items.map((a) => (
          <li key={a.id} className="flex items-stretch">
            <span aria-hidden className={`w-1.5 shrink-0 ${BAR[a.level]}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="font-bold">{a.title}</p>
                <p className="text-sm text-muted">{a.detail}</p>
              </div>
              <Link href={a.href} className="btn-secondary btn-sm self-start whitespace-nowrap sm:self-center">{a.cta}</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- KPI strip

export type Kpi = { label: string; value: string; sub: string; bar?: number };

/** One panel with four columns divided by hairlines (not four separate cards). */
export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className="bg-card p-4">
          <dt className="text-sm text-muted">{k.label}</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">{k.value}</dd>
          {k.bar !== undefined && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-well"><div className="h-full rounded-full bg-cream" style={{ width: `${Math.round(k.bar * 100)}%` }} /></div>}
          <dd className="mt-1.5 text-xs text-muted">{k.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- table board

const STATE_UI: Record<TableState, { label: string; chip: string }> = {
  empty: { label: "Kosong", chip: "bg-base text-muted" },
  setup: { label: "Menunggu pemain", chip: "bg-warn/20 text-warn" },
  playing: { label: "Berlangsung", chip: "bg-pos/20 text-pos" },
  paused: { label: "Dijeda", chip: "bg-warn/20 text-warn" },
  finished: { label: "Selesai", chip: "bg-base text-muted" },
};

function TableTile({ t }: { t: DashTable }) {
  const g = t.games, state = tableState(t), ui = STATE_UI[state];
  const players = g ? [...g.game_players].sort((a, b) => b.current_score - a.current_score) : [];
  return (
    <article className="card space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold leading-tight">Meja {String(t.table_number).padStart(2, "0")}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ui.chip}`}>{ui.label}</span>
      </header>

      {state === "empty" && (<>
        <p className="text-sm text-muted">Belum ada ruang yang dibuka.</p>
        <Link href={`/admin/tables/open?table=${t.id}`} className="btn-secondary btn-sm">Buka ruang</Link>
      </>)}

      {g && state === "setup" && <p className="text-sm text-muted">Ruang <b className="tracking-widest text-cream">{g.room_code}</b> sudah dibuka. Menunggu pemain mengisi nama dan aturan.</p>}
      {g && state === "finished" && <p className="text-sm text-muted">Game sudah selesai. Lepas meja agar bisa dipakai lagi.</p>}

      {g && (state === "playing" || state === "paused") && (<>
        <p className="text-sm leading-relaxed text-muted">{ROUND_NAME[g.current_round_wind] ?? g.current_round_wind} · Tangan {(g.game_hands?.[0]?.count ?? 0) + 1} · Kode <span className="tracking-widest">{g.room_code}</span></p>
        <ul className="grid grid-cols-2 gap-1.5">
          {players.map((p, i) => (
            <li key={`${p.seat_position}-${p.player_name}`} className="flex items-center justify-between gap-2 rounded-lg bg-base px-2.5 py-1.5 text-sm">
              <span className="min-w-0 truncate font-semibold">{MEDALS[i]} {p.player_name}{p.seat_position === g.current_dealer_seat ? " 👑" : ""}</span>
              <span className={`font-bold tabular-nums ${scoreTone(p.current_score, false, g.starting_points)}`}>{fmtScore(p.current_score)}</span>
            </li>
          ))}
        </ul>
      </>)}

      {g && state !== "empty" && state !== "finished" && (g.session_minutes
        ? <SessionClock startedAt={g.session_started_at} minutes={g.session_minutes} compact />
        : <p className="text-xs text-muted">Tanpa jam bermain.</p>)}

      {g && state !== "empty" && <Link href={state === "finished" ? `/admin/games/${g.id}/history` : `/admin/games/${g.id}`} className="inline-block text-sm font-semibold text-muted underline underline-offset-4 hover:text-cream">{state === "finished" ? "Lihat hasil" : "Buka game"}</Link>}
    </article>
  );
}

export function TableBoard({ tables }: { tables: DashTable[] }) {
  if (tables.length === 0) return <p className="card text-sm text-muted">Belum ada meja. Tambahkan meja pertama di Live Tables.</p>;
  return <div className="grid gap-3 md:grid-cols-2">{tables.map((t) => <TableTile key={t.id} t={t} />)}</div>;
}

// ---------------------------------------------------------------- today's highlights

type Summary = ReturnType<typeof todaySummary>;

export function TodayHighlights({ s, tableByGame }: { s: Summary; tableByGame: Record<string, number> }) {
  const b = s.best as TodayHand | null;
  const maxPattern = Math.max(1, ...s.patterns.map((p) => p.count));
  const where = b ? (tableByGame[b.game_id] ? `Meja ${tableByGame[b.game_id]}` : b.games?.room_code ? `Ruang ${b.games.room_code}` : "") : "";
  return (
    <div className="card divide-y divide-line !p-0">
      <section className="space-y-2 p-4">
        <h3 className="text-sm font-semibold text-muted">Tangan tertinggi hari ini</h3>
        {b ? (<>
          <p className="text-3xl font-extrabold tabular-nums">{b.total_fan} faan</p>
          <p className="text-sm">{b.winner?.player_name}{where && ` · ${where}`} · {fmtTime(b.created_at)}</p>
          {s.bestPatterns.length > 0 && <ul className="flex flex-wrap gap-1.5">{s.bestPatterns.map((n) => <li key={n} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{n}</li>)}</ul>}
        </>) : <p className="text-sm text-muted">Belum ada tangan menang hari ini.</p>}
      </section>

      <section className="space-y-2 p-4">
        <h3 className="text-sm font-semibold text-muted">Pemenang terbanyak</h3>
        {s.topPlayers.length ? (
          <ol className="space-y-1.5">
            {s.topPlayers.map((p, i) => (
              <li key={p.name} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold">{MEDALS[i]} {p.name}</span>
                <span className="shrink-0 text-muted"><b className="text-cream">{p.wins}</b> menang · terbaik {p.bestFan} faan</span>
              </li>))}
          </ol>) : <p className="text-sm text-muted">Belum ada pemenang.</p>}
      </section>

      <section className="space-y-2 p-4">
        <h3 className="text-sm font-semibold text-muted">Pola paling sering</h3>
        {s.patterns.length ? (
          <ul className="space-y-2">
            {s.patterns.map((p) => (
              <li key={p.name} className="text-sm">
                <div className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate">{p.name}</span><span className="font-bold tabular-nums">{p.count}×</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-well"><div className="h-full rounded-full bg-cream/80" style={{ width: `${(p.count / maxPattern) * 100}%` }} /></div>
              </li>))}
          </ul>) : <p className="text-sm text-muted">Belum ada pola tercatat.</p>}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- hands per hour

export function HourlyChart({ data }: { data: ReturnType<typeof handsPerHour> }) {
  const pad = (h: number) => String(h).padStart(2, "0");
  const summary = data.peak ? `Jam tersibuk ${pad(data.peak.hour)}.00 dengan ${data.peak.count} tangan.` : "Belum ada tangan tercatat hari ini.";
  return (
    <div className="card">
      <p className="mb-3 text-sm text-muted">{summary}</p>
      <ol className="flex h-32 items-end gap-1.5" role="img" aria-label={`Tangan per jam. ${summary}`}>
        {data.hours.map((h) => {
          const now = h.hour === data.currentHour;
          return (
            <li key={h.hour} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center" title={`${pad(h.hour)}.00: ${h.count} tangan`}>
              <span className="text-[11px] font-bold tabular-nums">{h.count > 0 ? h.count : ""}</span>
              <span className={`mt-0.5 block w-full rounded-t ${now ? "bg-cream" : "bg-cream/55"}`} style={{ height: h.count > 0 ? `${Math.max(6, (h.count / data.max) * 82)}%` : "3px", opacity: h.count > 0 ? 1 : 0.35 }} />
              <span className={`mt-1 text-[11px] tabular-nums ${now ? "font-bold text-cream" : "text-muted"}`}>{pad(h.hour)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------- activity

export function ActivityFeed({ items, now }: { items: ActivityItem[]; now: number }) {
  if (items.length === 0) return <p className="card text-sm text-muted">Belum ada aktivitas.</p>;
  return (
    <ol className="card space-y-4 !pb-2">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3">
          <span aria-hidden className="mt-0.5 w-5 shrink-0 text-center">{a.kind === "win" ? "🏆" : <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-line" />}</span>
          <div className="min-w-0 pb-2">
            <p className="text-sm font-semibold">{a.text}</p>
            <p className="text-xs text-muted">{[a.table ? `Meja ${a.table}` : null, whenLabel(a.at, now), a.by].filter(Boolean).join(" · ")}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

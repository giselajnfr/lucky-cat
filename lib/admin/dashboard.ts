import { ruleName } from "@/lib/i18n/ruleNames";
import { appLocale, currentLang } from "@/lib/i18n/locale";
/**
 * Admin dashboard logic. Pure functions only (no React, no database), so every rule is unit-tested.
 * Relative imports on purpose: vitest in this repo has no "@/" alias.
 */
import { clockState, fmtMinutes } from "../game/session";

export const TZ = "Asia/Jakarta";
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000, OFFSET = 7 * HOUR; // Jakarta = UTC+7, no daylight saving

/** Start of the Jakarta day that contains `now`, as epoch ms. */
export const dayStartMs = (now: number = Date.now()) => Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
/** 0..23, hour of day in Jakarta. */
export const jakartaHour = (t: number | string) => Math.floor((((new Date(t).getTime() + OFFSET) % DAY) + DAY) % DAY / HOUR);

const timeFmt = { format: (d: Date | number) => new Intl.DateTimeFormat(appLocale(), { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d) };
const dateFmt = { format: (d: Date | number) => new Intl.DateTimeFormat(appLocale(), { timeZone: TZ, day: "numeric", month: "short" }).format(d) };
export const fmtTime = (t: number | string | Date) => timeFmt.format(new Date(t));

/** "Hari ini 22.55", "Kemarin 08.23", "15 Nov 19.12". */
export function whenLabel(iso: string, now: number = Date.now()): string {
  const days = Math.round((dayStartMs(now) - dayStartMs(new Date(iso).getTime())) / DAY);
  const day = days <= 0 ? "Hari ini" : days === 1 ? "Kemarin" : dateFmt.format(new Date(iso));
  return `${day} ${fmtTime(iso)}`;
}

/** 45 minutes -> "45 menit"; 65 -> "1 jam 5 menit"; under a minute -> "kurang dari 1 menit". */
export function fmtDur(ms: number): string {
  const m = Math.round(Math.max(0, ms) / MIN);
  if (m < 1) return "kurang dari 1 menit";
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} jam ${r} menit` : `${h} jam`;
}

// ---------------------------------------------------------------- tables

export type DashPlayer = { player_name: string; seat_position: number; current_score: number };
export type DashGame = {
  id: string; room_code: string; status: string; current_round_wind: string; current_dealer_seat: number; setup_complete: boolean;
  starting_points: number; session_minutes: number | null; session_started_at: string;
  game_players: DashPlayer[]; game_hands: { count: number }[];
};
export type DashTable = { id: string; table_number: number; status: string; games: DashGame | null };
export type TableState = "empty" | "setup" | "playing" | "paused" | "finished";

export function tableState(t: DashTable): TableState {
  const g = t.games;
  if (!g) return "empty";
  if (g.status === "finished") return "finished";
  if (!g.setup_complete) return "setup";
  return g.status === "paused" ? "paused" : "playing";
}

export function tableCounts(tables: DashTable[]) {
  const c = { empty: 0, setup: 0, playing: 0, paused: 0, finished: 0 } as Record<TableState, number>;
  let players = 0;
  for (const t of tables) {
    const s = tableState(t);
    c[s]++;
    if (s === "playing" || s === "paused") players += t.games?.game_players.length ?? 0;
  }
  return { ...c, total: tables.length, occupied: c.setup + c.playing + c.paused, players };
}

// ---------------------------------------------------------------- attention

export type Attention = { id: string; level: "high" | "mid" | "low"; title: string; detail: string; href: string; cta: string };
export const SETUP_WAIT_MIN = 5;   // room opened but nobody has entered names/rules yet
export const IDLE_MIN = 30;        // no new hand for this long while the table is "playing"
const RANK = { high: 0, mid: 1, low: 2 } as const;

/**
 * What the cashier should look at NOW. `lastHandAt` maps game id -> ISO time of its newest hand (any game without
 * hands is judged from the moment the room was opened). `strayGames` = unfinished games that are not seated at a table.
 */
export function attentionItems(tables: DashTable[], strayGames: number, lastHandAt: Record<string, string>, now: number = Date.now()): Attention[] {
  const out: Attention[] = [];
  for (const t of tables) {
    const g = t.games, state = tableState(t), n = t.table_number;
    if (!g) continue;
    if (state === "finished") {
      out.push({ id: `fin-${t.id}`, level: "low", title: `Meja ${n} sudah selesai`, detail: "Lepas meja supaya bisa dipakai tamu berikutnya.", href: "/admin/tables", cta: "Lepas meja" });
      continue;
    }
    const opened = new Date(g.session_started_at).getTime();
    if (g.session_minutes) {
      const c = clockState({ startedAt: g.session_started_at, minutes: g.session_minutes }, now);
      if (c.over) out.push({ id: `over-${t.id}`, level: "high", title: `Meja ${n} lewat waktu ${fmtDur(c.overtimeMs)}`, detail: `Jatah ${fmtMinutes(g.session_minutes)} sudah habis. Tambah waktu atau tagih di kasir.`, href: "/admin/tables", cta: "Atur waktu" });
      else if (c.low) out.push({ id: `low-${t.id}`, level: "mid", title: `Meja ${n} sisa ${fmtDur(c.remainingMs)}`, detail: "Tawarkan tambahan waktu sebelum jatahnya habis.", href: "/admin/tables", cta: "Tambah waktu" });
    }
    if (state === "setup" && now - opened > SETUP_WAIT_MIN * MIN)
      out.push({ id: `setup-${t.id}`, level: "mid", title: `Meja ${n} menunggu pemain`, detail: `Ruang ${g.room_code} dibuka ${fmtDur(now - opened)} lalu, nama dan aturan belum diisi.`, href: "/admin/tables", cta: "Lihat meja" });
    if (state === "playing") {
      const last = Math.max(opened, lastHandAt[g.id] ? new Date(lastHandAt[g.id]).getTime() : 0);
      if (now - last > IDLE_MIN * MIN)
        out.push({ id: `idle-${t.id}`, level: "mid", title: `Meja ${n} belum ada tangan baru ${fmtDur(now - last)}`, detail: "Cek apakah pemain sudah selesai atau lupa mencatat.", href: `/admin/games/${g.id}`, cta: "Buka game" });
    }
    if (state === "paused")
      out.push({ id: `pause-${t.id}`, level: "low", title: `Meja ${n} sedang dijeda`, detail: "Permainan berhenti sampai dilanjutkan. Jam bermain tetap berjalan.", href: "/admin/tables", cta: "Lanjutkan" });
  }
  if (strayGames > 0)
    out.push({ id: "stray", level: "mid", title: `${strayGames} game tidak terhubung ke meja`, detail: "Masih berstatus berlangsung, tetapi mejanya sudah dilepas. Akhiri game-nya agar data tetap bersih.", href: "/admin/games?f=live", cta: "Tinjau game" });
  return out.sort((a, b) => RANK[a.level] - RANK[b.level]);
}

// ---------------------------------------------------------------- today's play

export type TodayHand = {
  id: string; game_id: string; winning_method: "self_draw" | "discard" | "draw"; total_fan: number; final_points: number; created_at: string;
  winner: { player_name: string } | null; games?: { room_code: string } | null; hand_fan_details: { fan_name: string; category: string | null }[];
};
const isWin = (h: TodayHand) => h.winning_method !== "draw" && !!h.winner;
const norm = (s: string) => s.trim().toLowerCase();

export function todaySummary(hands: TodayHand[]) {
  const wins = hands.filter(isWin);
  const byPlayer = new Map<string, { name: string; wins: number; bestFan: number; points: number }>();
  for (const h of wins) {
    const k = norm(h.winner!.player_name);
    const p = byPlayer.get(k) ?? { name: h.winner!.player_name.trim(), wins: 0, bestFan: 0, points: 0 };
    p.wins++; p.bestFan = Math.max(p.bestFan, h.total_fan); p.points += h.final_points;
    byPlayer.set(k, p);
  }
  const topPlayers = [...byPlayer.values()].sort((a, b) => b.wins - a.wins || b.bestFan - a.bestFan || a.name.localeCompare(b.name)).slice(0, 3);

  const best = wins.reduce<TodayHand | null>((b, h) => (!b || h.total_fan > b.total_fan || (h.total_fan === b.total_fan && h.created_at > b.created_at) ? h : b), null);
  const patternsOf = (h: TodayHand) => {
    const named = h.hand_fan_details.filter((f) => f.category === "pattern");
    return (named.length ? named : h.hand_fan_details).map((f) => f.fan_name);
  };

  const counts = new Map<string, number>();
  for (const h of wins) for (const name of new Set(patternsOf(h))) counts.set(name, (counts.get(name) ?? 0) + 1);
  const patterns = [...counts.entries()].map(([name, count]) => ({ name: ruleName(currentLang(), name), count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);

  return {
    total: hands.length, wins: wins.length, draws: hands.length - wins.length,
    selfDraw: wins.filter((h) => h.winning_method === "self_draw").length,
    topPlayers, best, bestPatterns: best ? patternsOf(best).slice(0, 4).map((n) => ruleName(currentLang(), n)) : [], patterns,
  };
}

/** Newest hand per game (input order does not matter). */
export function lastHandByGame(hands: Pick<TodayHand, "game_id" | "created_at">[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const h of hands) if (!m[h.game_id] || h.created_at > m[h.game_id]) m[h.game_id] = h.created_at;
  return m;
}

/** Hands per Jakarta hour for today. Always at least 8 columns, covering 10:00 and the current hour. */
export function handsPerHour(times: string[], now: number = Date.now()) {
  const start = dayStartMs(now), counts: number[] = Array(24).fill(0);
  for (const t of times) { const ms = new Date(t).getTime(); if (ms >= start && ms < start + DAY) counts[jakartaHour(ms)]++; }
  const nowH = jakartaHour(now), used = counts.flatMap((c, i) => (c > 0 ? [i] : []));
  let from = Math.min(10, nowH, ...used), to = Math.max(nowH, ...used);
  if (to - from + 1 < 8) to = Math.min(23, from + 7);
  if (to - from + 1 < 8) from = Math.max(0, to - 7);
  const hours = counts.slice(from, to + 1).map((count, i) => ({ hour: from + i, count }));
  const peak = hours.reduce((b, h) => (h.count > b.count ? h : b), { hour: -1, count: 0 });
  return { hours, currentHour: nowH, max: Math.max(1, ...hours.map((h) => h.count)), peak: peak.count > 0 ? peak : null };
}

/** Average length of games finished today (opened -> finished), or null with none. */
export function avgGameMs(games: { session_started_at: string; finished_at: string | null }[]): number | null {
  const ds = games.flatMap((g) => (g.finished_at ? [new Date(g.finished_at).getTime() - new Date(g.session_started_at).getTime()] : [])).filter((d) => d > 0);
  return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
}

/** Distinct players (by lowercase name) across games, ignoring blanks. */
export const distinctPlayers = (games: { game_players: { player_name: string }[] }[]) =>
  new Set(games.flatMap((g) => g.game_players.map((p) => norm(p.player_name)).filter(Boolean))).size;

// ---------------------------------------------------------------- activity feed

export type AuditRow = { id: string; admin_id: string; action: string; table_number: number | null; details: Record<string, unknown> | null; created_at: string };
export type WinEvent = { id: string; created_at: string; payload: { tableNumber?: number; winner?: { name?: string }; totalFan?: number; points?: number; winningMethod?: string } | null };
export type ActivityItem = { id: string; at: string; kind: "admin" | "win"; text: string; table: number | null; by: string | null };

const mins = (v: unknown) => (typeof v === "number" ? fmtDur(v * MIN) : "tanpa batas");

/** Plain-language line for an audit entry (the old dashboard printed raw JSON). */
export function describeAudit(action: string, d: Record<string, unknown> | null): string {
  const x = d ?? {};
  switch (action) {
    case "ADMIN_OPENED_ROOM": return `Membuka ruang ${x.room ?? ""} (${mins(x.minutes)})`.replace("  ", " ");
    case "ADMIN_ASSIGNED_GAME": return `Menghubungkan game ${x.room ?? ""}`.trim();
    case "ADMIN_CREATED_TABLE": return "Menambah meja";
    case "ADMIN_RELEASED_TABLE": return "Melepas meja";
    case "ADMIN_FINISHED_GAME": return "Mengakhiri game";
    case "ADMIN_PAUSED_GAME": return "Menjeda game";
    case "ADMIN_RESUMED_GAME": return "Melanjutkan game";
    case "ADMIN_SET_PLAY_TIME": return `Mengubah waktu bermain: ${mins(x.previous)} menjadi ${mins(x.new)}`;
    case "ADMIN_SCORE_CORRECTION": {
      const who = typeof x.player === "string" && x.player ? ` ${x.player}` : "";
      const why = typeof x.reason === "string" && x.reason.trim() ? `. Alasan: ${x.reason.trim()}` : "";
      return `Mengoreksi skor${who}: ${x.previous ?? "?"} menjadi ${x.new ?? "?"}${why}`;
    }
    default: return action.replace("ADMIN_", "").replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }
}

/** Admin actions and winning hands in ONE timeline, newest first. */
export function buildActivity(audit: AuditRow[], wins: WinEvent[], adminNames: Record<string, string>, limit = 10): ActivityItem[] {
  const a: ActivityItem[] = audit.map((r) => ({ id: `a-${r.id}`, at: r.created_at, kind: "admin", text: describeAudit(r.action, r.details), table: r.table_number, by: adminNames[r.admin_id] || null }));
  const w: ActivityItem[] = wins.map((e) => {
    const p = e.payload ?? {}, fan = p.totalFan ?? 0;
    const how = p.winningMethod === "self_draw" ? ", ambil sendiri" : "";
    return { id: `w-${e.id}`, at: e.created_at, kind: "win", text: `${p.winner?.name || "Pemain"} menang ${fan} faan${how}`, table: p.tableNumber ?? null, by: null };
  });
  return [...a, ...w].sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit);
}

import { describe, expect, it } from "vitest";
import { setRequestLang } from "@/lib/i18n/locale";
import {
  attentionItems, avgGameMs, buildActivity, dayStartMs, describeAudit, distinctPlayers, fmtDur, handsPerHour, lastHandByGame,
  tableCounts, tableState, todaySummary, whenLabel, type DashGame, type DashTable, type TodayHand,
} from "../dashboard";

// 17 Nov 2026, 14:00 Jakarta (= 07:00 UTC)
const NOW = Date.UTC(2026, 10, 17, 7, 0, 0);
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

const game = (o: Partial<DashGame> = {}): DashGame => ({
  id: "g1", room_code: "ABCD", status: "in_progress", current_round_wind: "east", current_dealer_seat: 0, setup_complete: true,
  starting_points: 1000, session_minutes: 120, session_started_at: ago(30),
  game_players: [0, 1, 2, 3].map((i) => ({ player_name: `P${i}`, seat_position: i, current_score: 1000 })), game_hands: [{ count: 3 }], ...o,
});
const table = (n: number, g: DashGame | null): DashTable => ({ id: `t${n}`, table_number: n, status: "PLAYING", games: g });

const hand = (o: Partial<TodayHand> = {}): TodayHand => ({
  id: "h", game_id: "g1", winning_method: "discard", total_fan: 3, final_points: 3, created_at: ago(10),
  winner: { player_name: "Budi" }, hand_fan_details: [], ...o,
});

describe("Jakarta day + labels", () => {
  it("starts the day at 00:00 Jakarta (17:00 UTC the evening before)", () => {
    expect(new Date(dayStartMs(NOW)).toISOString()).toBe("2026-11-16T17:00:00.000Z");
    expect(new Date(dayStartMs(Date.UTC(2026, 10, 16, 17, 30))).toISOString()).toBe("2026-11-16T17:00:00.000Z");
  });
  it("labels today, yesterday and older dates", () => {
    expect(whenLabel(ago(5), NOW)).toBe("Hari ini 13.55");
    expect(whenLabel(ago(60 * 20), NOW)).toBe("Kemarin 18.00");
    expect(whenLabel(ago(60 * 24 * 5), NOW)).toMatch(/^12 Nov/);
  });
  it("formats durations", () => {
    expect(fmtDur(20_000)).toBe("kurang dari 1 menit");
    expect(fmtDur(45 * 60_000)).toBe("45 menit");
    expect(fmtDur(125 * 60_000)).toBe("2 jam 5 menit");
    expect(fmtDur(120 * 60_000)).toBe("2 jam");
  });
});

describe("table state and counts", () => {
  it("derives one state per table", () => {
    expect(tableState(table(1, null))).toBe("empty");
    expect(tableState(table(1, game({ setup_complete: false })))).toBe("setup");
    expect(tableState(table(1, game()))).toBe("playing");
    expect(tableState(table(1, game({ status: "paused" })))).toBe("paused");
    expect(tableState(table(1, game({ status: "finished" })))).toBe("finished");
  });
  it("counts players only at running tables (not at released or unfinished stray games)", () => {
    const c = tableCounts([table(1, game()), table(2, game({ id: "g2", status: "paused" })), table(3, game({ id: "g3", setup_complete: false, game_players: [] })), table(4, null), table(5, game({ id: "g5", status: "finished" }))]);
    expect(c.players).toBe(8);
    expect(c).toMatchObject({ total: 5, occupied: 3, playing: 1, paused: 1, setup: 1, empty: 1, finished: 1 });
  });
});

describe("attention items", () => {
  it("is empty when everything is fine", () => {
    expect(attentionItems([table(1, game()), table(2, null)], 0, { g1: ago(5) }, NOW)).toEqual([]);
  });
  it("flags overtime as high, then low time, most urgent first", () => {
    const items = attentionItems([
      table(1, game({ id: "g1", session_minutes: 60, session_started_at: ago(52) })),
      table(2, game({ id: "g2", session_minutes: 60, session_started_at: ago(72) })),
    ], 0, { g1: ago(2), g2: ago(2) }, NOW);
    expect(items.map((i) => [i.level, i.title])).toEqual([["high", "Meja 2 lewat waktu 12 menit"], ["mid", "Meja 1 sisa 8 menit"]]);
  });
  it("flags a room nobody has set up, but not within the first minutes", () => {
    const fresh = game({ setup_complete: false, game_players: [], session_started_at: ago(2) });
    const old = game({ setup_complete: false, game_players: [], session_started_at: ago(12) });
    expect(attentionItems([table(1, fresh)], 0, {}, NOW)).toEqual([]);
    expect(attentionItems([table(1, old)], 0, {}, NOW)[0].title).toBe("Meja 1 menunggu pemain");
  });
  it("flags an idle table using the newest hand, else the room opening", () => {
    const g = game({ session_minutes: null, session_started_at: ago(200) });
    expect(attentionItems([table(1, g)], 0, { g1: ago(10) }, NOW)).toEqual([]);
    expect(attentionItems([table(1, g)], 0, { g1: ago(45) }, NOW)[0].title).toBe("Meja 1 belum ada tangan baru 45 menit");
    expect(attentionItems([table(1, g)], 0, {}, NOW)[0].id).toBe("idle-t1");
  });
  it("flags finished-but-seated tables, paused tables and stray games", () => {
    const items = attentionItems([table(1, game({ status: "finished" })), table(2, game({ id: "g2", status: "paused", session_minutes: null }))], 2, {}, NOW);
    expect(items.map((i) => i.id)).toEqual(["stray", "fin-t1", "pause-t2"]);
    expect(items[0].title).toBe("2 game tidak terhubung ke meja");
  });
});

describe("today's play", () => {
  const hands = [
    hand({ id: "1", winner: { player_name: "Budi" }, total_fan: 3, hand_fan_details: [{ fan_name: "All Pongs", category: "pattern" }, { fan_name: "Flower", category: "additional" }] }),
    hand({ id: "2", winner: { player_name: " budi " }, total_fan: 8, winning_method: "self_draw", final_points: 24, created_at: ago(5), hand_fan_details: [{ fan_name: "All Pongs", category: "pattern" }, { fan_name: "Full Flush", category: "pattern" }] }),
    hand({ id: "3", winner: { player_name: "Sari" }, total_fan: 5, hand_fan_details: [{ fan_name: "Full Flush", category: "pattern" }] }),
    hand({ id: "4", winner: null, winning_method: "draw", total_fan: 0, final_points: 0 }),
  ];
  // rule names are translated by the current language (Indonesian when nothing is set); these assertions use the English names
  const s = (() => { setRequestLang("en"); try { return todaySummary(hands); } finally { setRequestLang("id"); } })();
  it("separates wins from draws", () => expect([s.total, s.wins, s.draws, s.selfDraw]).toEqual([4, 3, 1, 1]));
  it("ranks players by wins, merging the same name typed differently", () => {
    expect(s.topPlayers[0]).toEqual({ name: "Budi", wins: 2, bestFan: 8, points: 27 });
    expect(s.topPlayers[1].name).toBe("Sari");
  });
  it("finds the best hand and counts patterns once per hand (patterns only, not bonus faan)", () => {
    expect(s.best?.id).toBe("2");
    expect(s.bestPatterns).toEqual(["All Pongs", "Full Flush"]);
    expect(s.patterns).toEqual([{ name: "All Pongs", count: 2 }, { name: "Full Flush", count: 2 }]);
  });
  it("handles a day without wins", () => {
    const e = todaySummary([hand({ winner: null, winning_method: "draw" })]);
    expect(e.best).toBeNull(); expect(e.topPlayers).toEqual([]); expect(e.bestPatterns).toEqual([]);
  });
  it("tracks the newest hand per game", () => expect(lastHandByGame([{ game_id: "a", created_at: "2026-01-01T10:00:00Z" }, { game_id: "a", created_at: "2026-01-01T12:00:00Z" }, { game_id: "b", created_at: "2026-01-01T09:00:00Z" }])).toEqual({ a: "2026-01-01T12:00:00Z", b: "2026-01-01T09:00:00Z" }));
});

describe("hands per hour", () => {
  it("buckets by Jakarta hour and finds the busiest one", () => {
    const h = handsPerHour([ago(5), ago(10), ago(70)], NOW);         // 13.55, 13.50, 12.50 Jakarta
    expect(h.hours.find((x) => x.hour === 13)?.count).toBe(2);
    expect(h.hours.find((x) => x.hour === 12)?.count).toBe(1);
    expect(h.peak).toEqual({ hour: 13, count: 2 });
    expect(h.currentHour).toBe(14);
    expect(h.hours[0].hour).toBe(10);
  });
  it("ignores yesterday and keeps at least 8 columns", () => {
    const h = handsPerHour([ago(60 * 20)], NOW);
    expect(h.peak).toBeNull();
    expect(h.hours.length).toBeGreaterThanOrEqual(8);
    expect(h.hours.every((x) => x.count === 0)).toBe(true);
  });
  it("starts earlier when the first hand was before 10:00", () => {
    const early = new Date(Date.UTC(2026, 10, 17, 1, 30)).toISOString();   // 08.30 Jakarta
    expect(handsPerHour([early], NOW).hours[0].hour).toBe(8);
  });
});

describe("games finished today", () => {
  it("averages duration and counts distinct players by name", () => {
    expect(avgGameMs([{ session_started_at: ago(180), finished_at: ago(60) }, { session_started_at: ago(100), finished_at: ago(40) }, { session_started_at: ago(5), finished_at: null }])).toBe(90 * 60_000);
    expect(avgGameMs([])).toBeNull();
    expect(distinctPlayers([{ game_players: [{ player_name: "Budi" }, { player_name: "sari" }] }, { game_players: [{ player_name: "budi " }, { player_name: "" }] }])).toBe(2);
  });
});

describe("activity feed", () => {
  it("writes admin actions in plain language", () => {
    expect(describeAudit("ADMIN_OPENED_ROOM", { room: "DHQ2", minutes: 120 })).toBe("Membuka ruang DHQ2 (2 jam)");
    expect(describeAudit("ADMIN_OPENED_ROOM", { room: "DHQ2", minutes: null })).toBe("Membuka ruang DHQ2 (tanpa batas)");
    expect(describeAudit("ADMIN_SET_PLAY_TIME", { previous: 74, new: 194 })).toBe("Mengubah waktu bermain: 1 jam 14 menit menjadi 3 jam 14 menit");
    expect(describeAudit("ADMIN_SET_PLAY_TIME", { previous: null, new: 60 })).toBe("Mengubah waktu bermain: tanpa batas menjadi 1 jam");
    expect(describeAudit("ADMIN_RELEASED_TABLE", {})).toBe("Melepas meja");
    expect(describeAudit("ADMIN_SCORE_CORRECTION", { player: "Budi", previous: 900, new: 1000, reason: "salah input" })).toBe("Mengoreksi skor Budi: 900 menjadi 1000. Alasan: salah input");
    expect(describeAudit("ADMIN_SOMETHING_NEW", null)).toBe("Something new");
  });
  it("merges admin actions and winning hands, newest first, with admin names", () => {
    const feed = buildActivity(
      [{ id: "1", admin_id: "u1", action: "ADMIN_FINISHED_GAME", table_number: 1, details: {}, created_at: ago(30) }],
      [{ id: "e1", created_at: ago(10), payload: { tableNumber: 2, winner: { name: "Sari" }, totalFan: 6, winningMethod: "self_draw" } }],
      { u1: "Gisela" },
    );
    expect(feed.map((f) => f.id)).toEqual(["w-e1", "a-1"]);
    expect(feed[0]).toMatchObject({ kind: "win", text: "Sari menang 6 faan, ambil sendiri", table: 2, by: null });
    expect(feed[1]).toMatchObject({ kind: "admin", text: "Mengakhiri game", table: 1, by: "Gisela" });
  });
  it("respects the limit", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: String(i), admin_id: "u", action: "ADMIN_PAUSED_GAME", table_number: 1, details: null, created_at: ago(i) }));
    expect(buildActivity(rows, [], {}, 3)).toHaveLength(3);
  });
});

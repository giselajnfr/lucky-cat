import { describe, expect, it } from "vitest";
import { gameSummary, keyOf, monthlyActivity, overall, patternCounts, playerStats, scoreProgression, winRateByPlayer, type SGame, type SHand, type SPlayer } from "../aggregate";

const g = (id: string, m: string): SGame => ({ id, played_at: `2026-${m}-05T10:00:00Z`, created_at: `2026-${m}-05T10:00:00Z`, finished_at: `2026-${m}-05T11:30:00Z`, starting_points: 0 });
const games = [g("g1", "09"), g("g2", "10")];
const P = (id: string, game: string, name: string, seat: number, score: number, pid: string | null): SPlayer => ({ id, game_id: game, player_id: pid, player_name: name, seat_position: seat, current_score: score, final_rank: null });
const players = [P("a1", "g1", "Ana", 0, 12, "A"), P("b1", "g1", "Budi", 1, -4, "B"), P("c1", "g1", "Tamu", 2, -4, null), P("d1", "g1", "Dedi", 3, -4, "D"),
  P("a2", "g2", "Ana", 0, 3, "A"), P("b2", "g2", "Budi", 1, 3, "B"), P("c2", "g2", "tamu ", 2, -3, null), P("d2", "g2", "Dedi", 3, -3, "D")];
const fan = (n: string, c: "pattern" | "additional") => ({ fan_name: n, fan_id: n, category: c });
const H = (id: string, game: string, n: number, winner: string | null, method: SHand["winning_method"], f: number, fans = [fan("All Pongs", "pattern")]): SHand =>
  ({ id, game_id: game, hand_number: n, winner_player_id: winner, winning_method: method, total_fan: f, final_points: f, created_at: "x", fans: winner ? fans : [] });
const hands = [H("h1", "g1", 1, "a1", "self_draw", 4, [fan("All Pongs", "pattern"), fan("Self Draw", "additional")]), H("h2", "g1", 2, null, "draw", 0), H("h3", "g1", 3, "a1", "discard", 8, [fan("Half Flush", "pattern")]),
  H("h4", "g2", 1, "b2", "discard", 3), H("h5", "g2", 2, "a2", "self_draw", 3, [fan("All Pongs", "pattern")])];

describe("statistics from recorded data", () => {
  it("overall totals exclude draws from wins and ignore unlisted games", () => {
    const o = overall(games, hands);
    expect(o).toMatchObject({ totalGames: 2, totalHands: 5, totalWins: 4, draws: 1, winRate: 80, totalPoints: 18, avgPointsPerWin: 4.5, selfDrawWins: 2, discardWins: 2 });
    expect(o.highestHand?.id).toBe("h3");
    expect(overall([games[0]], hands).totalGames).toBe(1);
    expect(overall([games[0]], hands).totalHands).toBe(3);
  });
  it("no games means zeros, not NaN", () => { const o = overall([], hands); expect(o.winRate).toBe(0); expect(o.avgPointsPerWin).toBe(0); });
  it("player stats", () => {
    const s = playerStats("A", games, players, hands);
    expect(s).toMatchObject({ gamesPlayed: 2, wins: 3, handsPlayed: 5, winPct: 60, totalWinPoints: 15, avgWinningPoints: 5, selfDrawPct: 66.7, netScore: 15 });
    expect(s.highestHand?.total_fan).toBe(8);
    expect(s.topPatterns[0]).toEqual({ name: "All Pongs", count: 2 });
    expect(s.performance.map((p) => p.cumulative)).toEqual([12, 15]);
  });
  it("guests are tracked by normalised name across games", () => {
    expect(keyOf(players[2])).toBe(keyOf(players[6]));
    expect(playerStats("guest:tamu", games, players, hands).gamesPlayed).toBe(2);
  });
  it("win rate by player", () => expect(winRateByPlayer(games, players, hands)[0].name).toBe("Ana"));
  it("pattern distribution counts hands, split by category", () => {
    expect(patternCounts(hands)[0]).toEqual({ name: "All Pongs", count: 3 });
    expect(patternCounts(hands, "additional")).toEqual([{ name: "Self Draw", count: 1 }]);
  });
  it("monthly activity", () => expect(monthlyActivity(games)).toEqual([{ month: "2026-09", count: 1 }, { month: "2026-10", count: 1 }]));
  it("score progression follows the transaction log", () => {
    const txs = [{ hand_id: "h1", player_id: "a1", points_change: 12 }, { hand_id: "h1", player_id: "b1", points_change: -4 }, { hand_id: "h1", player_id: "c1", points_change: -4 }, { hand_id: "h1", player_id: "d1", points_change: -4 }];
    const p = scoreProgression(games[0], players.filter((x) => x.game_id === "g1"), hands.filter((h) => h.game_id === "g1"), txs);
    expect(p.series[0].values).toEqual([0, 12, 12, 12]); expect(p.series[1].values).toEqual([0, -4, -4, -4]);
  });
  it("game summary ranks players, shares ties, and reports duration", () => {
    const s = gameSummary(games[0], players.filter((x) => x.game_id === "g1"), hands.filter((h) => h.game_id === "g1"));
    expect(s.rankings.map((r) => r.rank)).toEqual([1, 2, 2, 2]); expect(s.rankings[0].wins).toBe(2); expect(s.durationMinutes).toBe(90); expect(s.highestHand?.id).toBe("h3");
  });
});

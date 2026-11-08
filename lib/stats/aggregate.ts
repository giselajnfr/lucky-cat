/** Pure statistics over RECORDED data. Callers pass completed games only (abandoned/in-progress are excluded upstream). */
export type SGame = { id: string; played_at: string; created_at: string; finished_at: string | null; starting_points: number; name?: string | null };
export type SPlayer = { id: string; game_id: string; player_id: string | null; player_name: string; seat_position: number; current_score: number; final_rank: number | null };
export type SHand = {
  id: string; game_id: string; hand_number: number; winner_player_id: string | null; discard_player_id?: string | null;
  winning_method: "self_draw" | "discard" | "draw"; total_fan: number; final_points: number; created_at: string;
  fans: { fan_name: string; fan_id: string | null; category: "pattern" | "additional" | null }[];
};
export type STx = { hand_id: string; player_id: string; points_change: number };

/** Registered/rostered players are tracked by roster id; legacy rows fall back to a normalised name. */
export const keyOf = (p: Pick<SPlayer, "player_id" | "player_name">) => p.player_id ?? `guest:${p.player_name.trim().toLowerCase()}`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const wins = (hands: SHand[]) => hands.filter((h) => h.winner_player_id && h.winning_method !== "draw");

export function patternCounts(hands: SHand[], category: "pattern" | "additional" | "all" = "pattern") {
  const m = new Map<string, number>();
  for (const h of wins(hands)) for (const f of h.fans) if (category === "all" || f.category === category) m.set(f.fan_name, (m.get(f.fan_name) ?? 0) + 1);
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function overall(games: SGame[], hands: SHand[]) {
  const ids = new Set(games.map((g) => g.id));
  const hs = hands.filter((h) => ids.has(h.game_id));
  const w = wins(hs);
  const points = w.reduce((s, h) => s + h.final_points, 0);
  const best = w.reduce<SHand | null>((b, h) => (!b || h.total_fan > b.total_fan ? h : b), null);
  return {
    totalGames: games.length, totalHands: hs.length, totalWins: w.length, draws: hs.length - w.length, winRate: pct(w.length, hs.length),
    totalPoints: points, avgPointsPerWin: w.length ? Math.round((points / w.length) * 10) / 10 : 0, highestHand: best,
    selfDrawWins: w.filter((h) => h.winning_method === "self_draw").length, discardWins: w.filter((h) => h.winning_method === "discard").length,
  };
}

export function playerStats(key: string, games: SGame[], players: SPlayer[], hands: SHand[]) {
  const gameIds = new Set(games.map((g) => g.id));
  const mine = players.filter((p) => gameIds.has(p.game_id) && keyOf(p) === key);
  const myIds = new Set(mine.map((p) => p.id));
  const inMyGames = hands.filter((h) => mine.some((p) => p.game_id === h.game_id));
  const w = wins(inMyGames).filter((h) => myIds.has(h.winner_player_id!));
  const points = w.reduce((s, h) => s + h.final_points, 0);
  const gameById = new Map(games.map((g) => [g.id, g]));
  const history = mine.map((p) => ({ gameId: p.game_id, date: gameById.get(p.game_id)!.played_at, score: p.current_score, net: p.current_score - gameById.get(p.game_id)!.starting_points, rank: p.final_rank }))
    .sort((a, b) => a.date.localeCompare(b.date));
  let acc = 0;
  const best = w.reduce<SHand | null>((b, h) => (!b || h.total_fan > b.total_fan ? h : b), null);
  return {
    name: mine[0]?.player_name ?? "", gamesPlayed: mine.length, handsPlayed: inMyGames.length, wins: w.length, winPct: pct(w.length, inMyGames.length),
    avgWinningPoints: w.length ? Math.round((points / w.length) * 10) / 10 : 0, highestHand: best, totalWinPoints: points,
    netScore: history.reduce((s, h) => s + h.net, 0), selfDrawPct: pct(w.filter((h) => h.winning_method === "self_draw").length, w.length),
    topPatterns: patternCounts(w, "all").slice(0, 5), history, performance: history.map((h) => ({ date: h.date, cumulative: (acc += h.net) })),
  };
}

/** Everyone who appears in the given games, one row per player identity. */
export function playerDirectory(players: SPlayer[]) {
  const m = new Map<string, string>();
  for (const p of players) m.set(keyOf(p), p.player_name);
  return [...m.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function winRateByPlayer(games: SGame[], players: SPlayer[], hands: SHand[]) {
  return playerDirectory(players.filter((p) => games.some((g) => g.id === p.game_id)))
    .map((p) => { const s = playerStats(p.key, games, players, hands); return { name: p.name, value: s.winPct, wins: s.wins, hands: s.handsPlayed }; })
    .sort((a, b) => b.value - a.value);
}

export function monthlyActivity(games: SGame[]) {
  const m = new Map<string, number>();
  for (const g of games) { const k = g.played_at.slice(0, 7); m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
}

/** Per-game score progression from the immutable transaction log (hand 0 = starting score). */
export function scoreProgression(game: SGame, players: SPlayer[], hands: SHand[], txs: STx[]) {
  const ordered = [...hands].sort((a, b) => a.hand_number - b.hand_number);
  const run = new Map(players.map((p) => [p.id, game.starting_points]));
  const series = new Map(players.map((p) => [p.id, [game.starting_points]]));
  for (const h of ordered) {
    for (const t of txs.filter((x) => x.hand_id === h.id)) run.set(t.player_id, (run.get(t.player_id) ?? 0) + t.points_change);
    for (const p of players) series.get(p.id)!.push(run.get(p.id)!);
  }
  return { hands: ordered.length, series: players.map((p) => ({ id: p.id, name: p.player_name, values: series.get(p.id)! })) };
}

export function gameSummary(game: SGame, players: SPlayer[], hands: SHand[]) {
  const w = wins(hands);
  const best = w.reduce<SHand | null>((b, h) => (!b || h.total_fan > b.total_fan ? h : b), null);
  const rankings = [...players].sort((a, b) => b.current_score - a.current_score).map((p) => ({ ...p, rank: 1 + players.filter((q) => q.current_score > p.current_score).length, wins: w.filter((h) => h.winner_player_id === p.id).length }));
  const ms = game.finished_at ? new Date(game.finished_at).getTime() - new Date(game.created_at).getTime() : null;
  return { rankings, totalHands: hands.length, highestHand: best, patterns: patternCounts(hands, "all"), durationMinutes: ms == null ? null : Math.max(0, Math.round(ms / 60000)) };
}

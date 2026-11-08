export type TvPlayer = { name: string; seat: number; score: number };
export type TvTable = { table_id: string; table_number: number; status: "WAITING" | "PLAYING" | "PAUSED" | "FINISHED";
  round_wind: string | null; dealer_seat: number | null; hand_number: number | null; players: TvPlayer[] };
export type TvSettings = { mode: "live" | "spotlight" | "leaderboard" | "rotate"; spotlight_table_id: string | null;
  rotation_interval_ms: number; highlight_duration_ms: number; sound_enabled: boolean; animations_enabled: boolean;
  leaderboard_type: "highest_score" | "most_wins" | "highest_fan" };
export type LeaderRow = { name: string; score: number; wins_today: number; best_fan_today: number };
export type WinningHandEvent = { eventId: string; gameId?: string; tableNumber: number; winner: { id: string; name: string };
  roundWind: string; winningMethod: string; detectedFan: { name: string; fan: number }[]; totalFan: number; points: number;
  handTiles: string[]; photoUrl?: string | null; createdAt: string };

export const DEFAULT_TV_SETTINGS: TvSettings = { mode: "live", spotlight_table_id: null, rotation_interval_ms: 15000,
  highlight_duration_ms: 10000, sound_enabled: false, animations_enabled: true, leaderboard_type: "highest_score" };

export const WIND_NAME: Record<string, string> = { E: "East", S: "South", W: "West", N: "North" };
export const ROUND_NAME: Record<string, string> = { east: "East Round", south: "South Round", west: "West Round", north: "North Round" };
export const MEDALS = ["🥇", "🥈", "🥉", "4️⃣"];
export const STATUS_LABEL: Record<string, string> = { WAITING: "🟡 Waiting", PLAYING: "🟢 Playing", PAUSED: "🟠 Paused", FINISHED: "⚪ Finished" };

/** The dealer always sits East; the other winds follow the seat order. */
export const seatWind = (seat: number, dealerSeat: number) => ["E", "S", "W", "N"][(((seat - dealerSeat) % 4) + 4) % 4];

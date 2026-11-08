export type GameStatus = "in_progress" | "paused" | "finished";
export type GameRow = {
  id: string; room_code: string; owner_id: string; name: string | null; status: GameStatus;
  played_at: string; created_at: string; finished_at: string | null; starting_points: number;
  current_round_wind: "east" | "south" | "west" | "north"; current_dealer_seat: number; dealer_rotations: number;
  min_fan: number; last_round_wind: "east" | "south" | "west" | "north"; rules_id: string;
};
export type GamePlayerRow = {
  id: string; game_id: string; user_id: string | null; player_id: string | null; player_name: string;
  seat_position: number; current_score: number; final_rank: number | null;
};
export type FanDetailRow = { fan_name: string; fan_value: number; fan_id: string | null; category: "pattern" | "additional" | null };
export type HandDetail = {
  concealed: string[]; melds: { type: string; tiles: string[]; exposed: boolean }[]; winningTile: string; flowers: string[];
  seatWind: string; roundWind: string; isLastTile?: boolean; isRobbingKong?: boolean; reviewFlags?: string[]; game_over?: boolean;
};
export type HandRow = {
  id: string; game_id: string; hand_number: number; round_wind: string; dealer_player_id: string; winner_player_id: string | null;
  winning_method: "self_draw" | "discard" | "draw"; discard_player_id: string | null; total_fan: number; final_points: number;
  hand_tiles: string[] | null; hand_detail: HandDetail | null; created_at: string; hand_fan_details?: FanDetailRow[];
};
export type RosterPlayer = { id: string; name: string; user_id: string | null };

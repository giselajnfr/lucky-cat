import type { SupabaseClient } from "@supabase/supabase-js";

/** Call AFTER the hand + hand_fan_details rows are saved. The server builds the TV payload itself. */
export const publishWinningHand = (supabase: SupabaseClient, handId: string) =>
  supabase.rpc("publish_winning_hand", { p_hand: handId });

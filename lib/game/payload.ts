import { isBonus, isPlayTile } from "../scoring/tiles";
import type { BonusTile, Meld, PlayTile } from "../scoring/types";
import type { HandSubmission } from "../game-engine";

export type HandRequest =
  | { type: "draw"; requestId: string; expectedHand: number }
  | { type: "win"; requestId: string; expectedHand: number; hand: HandSubmission };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const tiles = (x: unknown, max: number): PlayTile[] | null =>
  Array.isArray(x) && x.length <= max && x.every((t) => typeof t === "string" && isPlayTile(t)) ? (x as PlayTile[]) : null;

/** Strict shape check of the untrusted request body. Scoring is validated afterwards by the shared engine. */
export function parseHandRequest(body: unknown): { ok: true; value: HandRequest } | { ok: false; error: string } {
  if (!isObj(body)) return { ok: false, error: "Invalid request" };
  const { requestId, expectedHand, type } = body;
  if (typeof requestId !== "string" || !UUID.test(requestId)) return { ok: false, error: "requestId must be a UUID" };
  if (!Number.isInteger(expectedHand) || (expectedHand as number) < 1) return { ok: false, error: "expectedHand must be a positive integer" };
  if (type === "draw") return { ok: true, value: { type: "draw", requestId, expectedHand: expectedHand as number } };
  if (type !== "win") return { ok: false, error: "type must be 'win' or 'draw'" };

  const { winnerId, discarderId, method, winningTile, flowers, isLastTile, isRobbingKong } = body;
  if (typeof winnerId !== "string" || !UUID.test(winnerId)) return { ok: false, error: "winnerId is required" };
  if (method !== "SELF_DRAW" && method !== "DISCARD") return { ok: false, error: "method must be SELF_DRAW or DISCARD" };
  if (discarderId !== undefined && discarderId !== null && (typeof discarderId !== "string" || !UUID.test(discarderId))) return { ok: false, error: "discarderId is invalid" };
  const concealed = tiles(body.concealedTiles, 14); if (!concealed) return { ok: false, error: "concealedTiles are invalid" };
  if (typeof winningTile !== "string" || !isPlayTile(winningTile)) return { ok: false, error: "winningTile is invalid" };
  if (!Array.isArray(flowers) || flowers.length > 8 || !flowers.every((f) => typeof f === "string" && isBonus(f))) return { ok: false, error: "flowers are invalid" };
  if (!Array.isArray(body.melds) || body.melds.length > 4) return { ok: false, error: "melds are invalid" };
  const melds: Meld[] = [];
  for (const m of body.melds) {
    if (!isObj(m) || !["CHOW", "PUNG", "KONG"].includes(m.type as string) || typeof m.exposed !== "boolean") return { ok: false, error: "meld is invalid" };
    const t = tiles(m.tiles, 4); if (!t) return { ok: false, error: "meld tiles are invalid" };
    melds.push({ type: m.type as Meld["type"], tiles: t, exposed: m.exposed });
  }
  // NOTE: no totals, fan or score changes are accepted from the client — the server derives them.
  return { ok: true, value: { type: "win", requestId, expectedHand: expectedHand as number, hand: {
    winnerId, discarderId: (discarderId as string | null | undefined) ?? undefined, method, concealedTiles: concealed, melds,
    winningTile, flowers: flowers as BonusTile[], isLastTile: isLastTile === true, isRobbingKong: isRobbingKong === true,
  } } };
}

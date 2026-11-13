import { HandView } from "./HandView";
import { Tile } from "./Tile";
import type { HandDetail } from "@/lib/game/types";

/** Tile pictures of a saved hand. Uses the full detail when there is one, otherwise the flat tile list. */
export function HandTiles({ detail, tiles, width = 30 }: { detail?: HandDetail | null; tiles?: string[] | null; width?: number }) {
  if (detail?.concealed?.length) return <HandView concealed={detail.concealed} melds={detail.melds as never} flowers={detail.flowers} width={width} balanced />;
  if (tiles?.length) return <div className="flex flex-wrap gap-0.5">{tiles.map((t, i) => <Tile key={i} t={t} width={width} />)}</div>;
  return null;
}

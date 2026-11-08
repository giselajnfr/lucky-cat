import { tileSvg } from "./tileArt";
import { tileName } from "@/lib/scoring/tiles";

type Props = { t: string; width?: number; fluid?: boolean; ring?: boolean; dim?: boolean; onClick?: () => void; disabled?: boolean; label?: string; badge?: number };

/** One Mahjong tile (SVG face). Becomes a button when onClick is given. */
export function Tile({ t, width = 34, fluid, ring, dim, onClick, disabled, label, badge }: Props) {
  const svg = <span className="block leading-none" dangerouslySetInnerHTML={{ __html: tileSvg(t, { width, fluid, ring, dim }) }} />;
  if (!onClick) return <span className="inline-block" style={fluid ? undefined : { width }} title={tileName(t)}>{svg}</span>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label ?? tileName(t)}
      className="relative block rounded-md transition active:scale-95 disabled:cursor-not-allowed" style={fluid ? undefined : { width }}>
      {svg}
      {badge ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cream px-1 text-[10px] font-bold text-base">{badge}</span> : null}
    </button>
  );
}

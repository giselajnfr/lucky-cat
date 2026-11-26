import { Tile } from "./Tile";
import { sortTiles } from "@/lib/scoring/tiles";
import type { Meld } from "@/lib/scoring/types";

type Props = { concealed: string[]; melds: Meld[]; winningTile?: string | null /* accepted for compatibility, no longer drawn apart */; flowers?: string[]; width?: number; /** wrap a long hand into two even rows (7 + 7) instead of one long row plus a few leftovers */ balanced?: boolean; /** one single row: tiles shrink to fit the available width (never wrap), capped at `width` per tile */ fit?: boolean; /** show the concealed tiles exactly in this order, one block per set/pair (no sorting). Used for rule examples. */ groups?: string[][]; onRemoveTile?: (t: string) => void; onRemoveMeld?: (i: number) => void };

/** The winning hand laid out like on the table: melds first, then ALL concealed tiles side by side (14 tiles in one row). The winning tile is not singled out. */
export function HandView({ concealed, melds, flowers = [], width = 30, balanced = false, fit = false, groups, onRemoveTile, onRemoveMeld }: Props) {
  const sorted = sortTiles(concealed);
  if (fit) {
    // Units = melds first, then the concealed groups. Each unit is one block of tiles that is never split across rows (unless it is the only one).
    const units: { tiles: string[]; meld: boolean }[] = [
      ...melds.map((m) => ({ tiles: m.tiles, meld: true })),
      ...(groups ?? [sorted]).map((g) => ({ tiles: g, meld: false })),
    ];
    const total = units.reduce((n, u) => n + u.tiles.length, 0);
    const GAP = 2, UGAP = 8, PAD = 8;   // gap between tiles, gap between blocks, extra width of a meld's padding (px)
    // One row when it fits comfortably; otherwise two rows with the tiles divided as evenly as possible.
    let rows: typeof units[] = [units];
    if (total > 9) {
      if (units.length === 1) { const t = units[0].tiles, h = Math.ceil(t.length / 2); rows = [[{ tiles: t.slice(0, h), meld: false }], [{ tiles: t.slice(h), meld: false }]]; }
      else {
        let best = 1, diff = Infinity, run = 0;
        for (let i = 0; i < units.length - 1; i++) { run += units[i].tiles.length; const d = Math.abs(total - 2 * run); if (d < diff) { diff = d; best = i + 1; } }
        rows = [units.slice(0, best), units.slice(best)];
      }
    }
    const cap = rows.length > 1 ? width + 4 : width;
    const maxTiles = Math.max(...rows.map((r) => r.reduce((n, u) => n + u.tiles.length, 0)));
    // Horizontal space that is NOT tiles in the widest row (gaps + meld padding), so tiles can be sized to always fit.
    const fixed = Math.max(...rows.map((r) => r.reduce((n, u) => n + (u.tiles.length - 1) * GAP + (u.meld ? PAD : 0), 0) + (r.length - 1) * UGAP));
    const tileW = `min(${cap}px, calc((100cqw - ${fixed}px) / ${maxTiles}))`;
    const tile = (t: string, k: string) => <div key={k} className="shrink-0 [&>span]:block" style={{ width: tileW }}><Tile t={t} fluid /></div>;
    const flowerW = `calc(${tileW} * 0.8)`;
    return (
      <div className="w-full max-w-full space-y-2 overflow-hidden" style={{ containerType: "inline-size" } as React.CSSProperties}>
        {rows.map((r, ri) => (
          <div key={ri} className="flex items-end" style={{ columnGap: UGAP }}>
            {r.map((u, ui) => <div key={ui} className={u.meld ? "flex rounded-lg bg-base/40 p-1" : "flex"} style={{ columnGap: GAP }}>{u.tiles.map((t, j) => tile(t, `${ri}-${ui}-${j}`))}</div>)}
          </div>
        ))}
        {flowers.length > 0 && <div className="flex flex-wrap opacity-90" style={{ gap: GAP }}>{flowers.map((t) => <div key={t} className="shrink-0 [&>span]:block" style={{ width: flowerW }}><Tile t={t} fluid /></div>)}</div>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {melds.map((m, i) => (
          <div key={i} className="flex gap-0.5 rounded-lg bg-base/40 p-1" aria-label={m.type === "KONG" ? "Gong" : m.type === "PUNG" ? "Pong" : "Chi"}>
            {m.tiles.map((t, j) => <Tile key={j} t={t} width={width} onClick={onRemoveMeld ? () => onRemoveMeld(i) : undefined} label={`Hapus set ${i + 1}`} />)}
          </div>
        ))}
        {groups ? groups.map((g, gi) => <div key={gi} className="flex gap-0.5">{g.map((t, i) => <Tile key={`${t}${i}`} t={t} width={width} />)}</div>) : (
        <div className="flex flex-wrap gap-0.5" style={balanced && sorted.length > 9 ? { maxWidth: Math.ceil(sorted.length / 2) * (width + 2) } : undefined}>
          {sorted.map((t, i) => <Tile key={`${t}${i}`} t={t} width={width} onClick={onRemoveTile ? () => onRemoveTile(t) : undefined} label={`Hapus ${t}`} />)}
        </div>)}
      </div>
      {flowers.length > 0 && <div className="flex flex-wrap gap-0.5 opacity-90">{flowers.map((t) => <Tile key={t} t={t} width={Math.round(width * 0.8)} />)}</div>}
    </div>
  );
}

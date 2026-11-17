import { Tile } from "./Tile";
import { sortTiles } from "@/lib/scoring/tiles";
import type { Meld } from "@/lib/scoring/types";

type Props = { concealed: string[]; melds: Meld[]; winningTile?: string | null /* accepted for compatibility, no longer drawn apart */; flowers?: string[]; width?: number; /** wrap a long hand into two even rows (7 + 7) instead of one long row plus a few leftovers */ balanced?: boolean; /** one single row: tiles shrink to fit the available width (never wrap), capped at `width` per tile */ fit?: boolean; /** show the concealed tiles exactly in this order, one block per set/pair (no sorting). Used for rule examples. */ groups?: string[][]; onRemoveTile?: (t: string) => void; onRemoveMeld?: (i: number) => void };

/** The winning hand laid out like on the table: melds first, then ALL concealed tiles side by side (14 tiles in one row). The winning tile is not singled out. */
export function HandView({ concealed, melds, flowers = [], width = 30, balanced = false, fit = false, groups, onRemoveTile, onRemoveMeld }: Props) {
  const sorted = sortTiles(concealed);
  if (fit) {
    const cell = (t: string, k: string) => <div key={k} className="min-w-0 flex-1 [&>span]:block" style={{ maxWidth: width }}><Tile t={t} fluid /></div>;
    const group = (n: number) => ({ flex: `${n} 1 0`, maxWidth: n * (width + 2), minWidth: 0 });
    return (
      <div className="space-y-2">
        <div className="flex w-full items-end gap-x-1.5">
          {melds.map((m, i) => <div key={i} className="flex gap-0.5 rounded-lg bg-base/40 p-1" style={group(m.tiles.length)}>{m.tiles.map((t, j) => cell(t, `m${i}-${j}`))}</div>)}
          {(groups ?? [sorted]).map((g, gi) => (
            <div key={gi} className="flex shrink-0">
              <div className="flex gap-0.5" style={group(g.length)}>{g.map((t, i) => cell(t, `${gi}-${t}${i}`))}</div>
            </div>
          ))}
        </div>
        {flowers.length > 0 && <div className="flex gap-0.5 opacity-90" style={{ maxWidth: flowers.length * (Math.round(width * 0.8) + 2) }}>{flowers.map((t) => <div key={t} className="min-w-0 flex-1 [&>span]:block"><Tile t={t} fluid /></div>)}</div>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {melds.map((m, i) => (
          <div key={i} className="flex gap-0.5 rounded-lg bg-base/40 p-1" aria-label={m.type === "KONG" ? "Kong" : m.type === "PUNG" ? "Pong" : "Chow"}>
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

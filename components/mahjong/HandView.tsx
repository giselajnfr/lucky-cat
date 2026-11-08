import { Tile } from "./Tile";
import { sortTiles } from "@/lib/scoring/tiles";
import type { Meld } from "@/lib/scoring/types";

type Props = { concealed: string[]; melds: Meld[]; winningTile?: string | null; flowers?: string[]; width?: number; onRemoveTile?: (t: string) => void; onRemoveMeld?: (i: number) => void };

/** The winning hand laid out like on the table: melds, concealed tiles, then the winning tile apart and ringed. */
export function HandView({ concealed, melds, winningTile, flowers = [], width = 30, onRemoveTile, onRemoveMeld }: Props) {
  const rest = [...concealed];
  if (winningTile) { const i = rest.indexOf(winningTile); if (i >= 0) rest.splice(i, 1); }
  const sorted = sortTiles(rest);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {melds.map((m, i) => (
          <div key={i} className="flex gap-0.5 rounded-lg bg-base/40 p-1" aria-label={`${m.type} ${m.exposed ? "terbuka" : "tertutup"}`}>
            {m.tiles.map((t, j) => <Tile key={j} t={t} width={width} dim={!m.exposed && m.type === "KONG" && (j === 0 || j === 3)} onClick={onRemoveMeld ? () => onRemoveMeld(i) : undefined} label={`Hapus set ${i + 1}`} />)}
          </div>
        ))}
        <div className="flex flex-wrap gap-0.5">
          {sorted.map((t, i) => <Tile key={`${t}${i}`} t={t} width={width} onClick={onRemoveTile ? () => onRemoveTile(t) : undefined} label={`Hapus ${t}`} />)}
        </div>
        {winningTile && concealed.includes(winningTile) && <div className="ml-1"><Tile t={winningTile} width={width} ring /></div>}
      </div>
      {flowers.length > 0 && <div className="flex flex-wrap gap-0.5 opacity-90">{flowers.map((t) => <Tile key={t} t={t} width={Math.round(width * 0.8)} />)}</div>}
    </div>
  );
}

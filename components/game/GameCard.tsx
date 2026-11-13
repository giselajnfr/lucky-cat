import Link from "next/link";

const ROUND = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" } as const;
type P = { player_name: string; current_score: number };
export type GameCardData = {
  id: string; name: string | null; room_code: string; status: string; setup_complete: boolean; starting_points: number;
  current_round_wind: string; played_at: string; finished_at?: string | null; game_players: P[]; game_hands?: { count: number }[] | null;
};
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted"><path d="M9 6l6 6-6 6" /></svg>
);

/**
 * One game on the home screen and the game list. Built to be read in a glance, so it shows almost no numbers:
 * which game, is it live, who is ahead. The scores themselves live on the game screen.
 *  LIVE      a pulsing green dot and "Berlangsung"
 *  PAUSED / WAITING   amber text
 *  FINISHED  flat and quiet, with the winner
 * The whole card is the button (a chevron says "open"); there is no second button inside it.
 */
export function GameCard({ g }: { g: GameCardData }) {
  const ps = [...g.game_players].sort((a, b) => b.current_score - a.current_score);
  const hands = g.game_hands?.[0]?.count ?? 0;
  const finished = g.status === "finished", paused = g.status === "paused", waiting = !finished && !g.setup_complete;
  const title = g.name || `Game ${g.room_code}`;
  const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

  if (finished) {
    return (
      <Link href={`/history/${g.id}`} className={`flex min-h-[64px] items-center gap-3 rounded-2xl bg-base/40 px-4 py-3 transition hover:bg-card/50 ${ring}`}>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-cream/90">{title}</p>
          <p className="text-xs text-muted">Selesai {shortDate(g.finished_at || g.played_at)}</p>
        </div>
        {ps[0] && <p className="max-w-[45%] truncate text-sm"><span aria-hidden>🏆 </span><span className="sr-only">Juara </span><b>{ps[0].player_name}</b></p>}
        <Chevron />
      </Link>
    );
  }

  const amber = paused || waiting;
  const status = waiting ? "Menunggu pemain" : paused ? "Dijeda" : "Berlangsung";
  const sub = waiting ? "Belum dimulai" : `Ronde ${ROUND[g.current_round_wind as keyof typeof ROUND]} · Tangan ${hands + 1}`;
  const names = ps.map((p) => p.player_name).join(", ");
  return (
    <Link href={`/game/${g.id}`} className={`flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-4 transition hover:bg-card/80 ${ring}`}>
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider ${amber ? "text-warn" : "text-pos"}`}>
          {amber ? <span className="h-2 w-2 rounded-full bg-warn" aria-hidden /> : (
            <span className="relative flex h-2 w-2" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-70 motion-reduce:animate-none" /><span className="relative inline-flex h-2 w-2 rounded-full bg-pos" /></span>)}
          {status}
        </p>
        <p className="mt-1.5 truncate text-lg font-extrabold">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
        {!waiting && names && <p className="mt-2 truncate text-sm text-muted">{names}</p>}
      </div>
      <Chevron />
    </Link>
  );
}

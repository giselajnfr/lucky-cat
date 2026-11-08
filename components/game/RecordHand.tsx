"use client";
import { useCallback, useMemo, useState } from "react";
import { HandCalculator, WIND_LABEL, type CalcPayload } from "@/components/calculator/HandCalculator";
import { ScoreCard } from "@/components/calculator/ScoreCard";
import { scoreHandForGame, seatWindOf, ROUND_TO_WIND, type SeatedPlayer } from "@/lib/game-engine";
import { configForGame, stateOfGame } from "@/lib/game/config";
import type { GamePlayerRow, GameRow } from "@/lib/game/types";
import type { WinMethod } from "@/lib/scoring";

type Props = { game: GameRow; players: GamePlayerRow[]; handsPlayed: number; onDone: () => void; onCancel: () => void };

/** Full-screen sheet: pick winner/method/discarder, enter tiles, preview faan + settlement, then record. */
export function RecordHand({ game, players, handsPlayed, onDone, onCancel }: Props) {
  const [kind, setKind] = useState<"win" | "draw" | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [method, setMethod] = useState<WinMethod | null>(null);
  const [discarderId, setDiscarderId] = useState<string | null>(null);
  const [payload, setPayload] = useState<CalcPayload | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());   // one id per attempt: a double tap cannot score twice
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = useMemo(() => configForGame(game), [game]);
  const state = useMemo(() => stateOfGame(game, handsPlayed), [game, handsPlayed]);
  const seated: SeatedPlayer[] = useMemo(() => players.map((p) => ({ id: p.id, seat: p.seat_position, name: p.player_name, score: p.current_score })), [players]);
  const bySeat = [...players].sort((a, b) => a.seat_position - b.seat_position);
  const winner = players.find((p) => p.id === winnerId);
  const onChange = useCallback((p: CalcPayload | null) => setPayload(p), []);

  const preview = useMemo(() => {
    if (!payload || !winner || !method) return null;
    const r = scoreHandForGame(state, seated, { winnerId: winner.id, discarderId: method === "DISCARD" ? discarderId ?? undefined : undefined, method,
      concealedTiles: payload.input.concealedTiles, melds: payload.input.melds, winningTile: payload.input.winningTile, flowers: payload.input.flowers,
      isLastTile: payload.input.isLastTile, isRobbingKong: payload.input.isRobbingKong }, cfg);
    return r;
  }, [payload, winner, method, discarderId, state, seated, cfg]);

  async function submit() {
    setBusy(true); setError(null);
    const base = { requestId, expectedHand: handsPlayed + 1 };
    const body = kind === "draw" ? { ...base, type: "draw" } : { ...base, type: "win", winnerId, discarderId: method === "DISCARD" ? discarderId : undefined, method,
      concealedTiles: payload!.input.concealedTiles, melds: payload!.input.melds, winningTile: payload!.input.winningTile, flowers: payload!.input.flowers,
      isLastTile: payload!.input.isLastTile, isRobbingKong: payload!.input.isRobbingKong };
    try {
      const res = await fetch(`/api/games/${game.id}/hands`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal mencatat tangan");
      onDone();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const chip = (on: boolean) => `min-h-[48px] rounded-xl border px-3 text-sm font-semibold ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;
  const playerBtn = (p: GamePlayerRow, on: boolean, pick: () => void, disabled = false) => (
    <button key={p.id} type="button" disabled={disabled} onClick={pick} className={chip(on) + (disabled ? " opacity-30" : "")}>
      {p.player_name}<span className="block text-[11px] font-medium opacity-70">{WIND_LABEL[seatWindOf(p.seat_position, game.current_dealer_seat)]}</span>
    </button>
  );
  const canSubmit = kind === "draw" || (kind === "win" && winner && method && (method === "SELF_DRAW" || discarderId) && preview && !("error" in preview));

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-base" role="dialog" aria-modal="true" aria-label="Catat tangan">
      <div className="mx-auto max-w-md space-y-4 px-5 pb-32 pt-6 md:max-w-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl">Tangan #{handsPlayed + 1}</h2><button type="button" className="text-sm underline" onClick={onCancel}>Batal</button></div>
        <p className="text-sm text-muted">Ronde {WIND_LABEL[ROUND_TO_WIND[game.current_round_wind]]} · Dealer {players.find((p) => p.seat_position === game.current_dealer_seat)?.player_name}</p>

        <section className="card space-y-2"><h3 className="section-label">Hasil tangan</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={chip(kind === "win")} onClick={() => setKind("win")}>Ada yang menang</button>
            <button type="button" className={chip(kind === "draw")} onClick={() => setKind("draw")}>Seri (tanpa pemenang)</button>
          </div>
          {kind === "draw" && <p className="text-sm text-muted">Tidak ada poin yang berpindah. Dealer tetap sama.</p>}
        </section>

        {kind === "win" && (
          <>
            <section className="card space-y-2"><h3 className="section-label">Pemenang</h3><div className="grid grid-cols-2 gap-2">{bySeat.map((p) => playerBtn(p, winnerId === p.id, () => { setWinnerId(p.id); if (discarderId === p.id) setDiscarderId(null); }))}</div></section>
            {winner && (
              <section className="card space-y-2"><h3 className="section-label">Cara menang</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className={chip(method === "SELF_DRAW")} onClick={() => { setMethod("SELF_DRAW"); setDiscarderId(null); }}>Menang sendiri</button>
                  <button type="button" className={chip(method === "DISCARD")} onClick={() => setMethod("DISCARD")}>Dari buangan</button>
                </div>
                {method === "DISCARD" && (<><h3 className="section-label pt-2">Siapa yang membuang?</h3><div className="grid grid-cols-3 gap-2">{bySeat.filter((p) => p.id !== winnerId).map((p) => playerBtn(p, discarderId === p.id, () => setDiscarderId(p.id)))}</div></>)}
              </section>
            )}
            {winner && method && (method === "SELF_DRAW" || discarderId) && (
              <>
                <HandCalculator key={`${winner.id}-${method}`} config={cfg} lockedMethod={method} onChange={onChange}
                  fixed={{ seatWind: seatWindOf(winner.seat_position, game.current_dealer_seat), roundWind: ROUND_TO_WIND[game.current_round_wind], seatLabel: WIND_LABEL[seatWindOf(winner.seat_position, game.current_dealer_seat)] }} />
                {payload && <ScoreCard payload={payload} winnerName={winner.player_name} title={game.name ?? "Lucky Cat Mahjong"} />}
                {preview && !("error" in preview) && (
                  <section className="card"><h3 className="section-label mb-2">Perubahan skor</h3>
                    <ul className="grid grid-cols-2 gap-2">{preview.changes.map((c) => { const p = players.find((x) => x.id === c.playerId)!; return (
                      <li key={c.playerId} className="flex justify-between rounded-xl bg-base/40 px-3 py-2 text-sm"><span>{p.player_name}</span><b className={c.change > 0 ? "text-cream" : c.change < 0 ? "text-red-300" : "text-muted"}>{c.change > 0 ? "+" : ""}{c.change}</b></li>); })}</ul></section>
                )}
              </>
            )}
          </>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-md md:max-w-2xl">
          {error && <p role="alert" className="mb-2 text-sm text-red-300">{error}</p>}
          <button className="btn-primary" disabled={!canSubmit || busy} onClick={submit}>{busy ? "Menyimpan…" : kind === "draw" ? "Catat seri" : "Catat kemenangan"}</button>
        </div>
      </div>
    </div>
  );
}

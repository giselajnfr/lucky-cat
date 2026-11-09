"use client";
import { useCallback, useMemo, useState } from "react";
import { HandCalculator, WIND_LABEL, type CalcInitial, type CalcPayload } from "@/components/calculator/HandCalculator";
import { ScoreCard } from "@/components/calculator/ScoreCard";
import { scoreHandForGame, seatWindOf, ROUND_TO_WIND, type SeatedPlayer } from "@/lib/game-engine";
import { configForGame, stateOfGame } from "@/lib/game/config";
import type { GamePlayerRow, GameRow, HandRow } from "@/lib/game/types";
import type { BonusTile, Meld, PlayTile, WinMethod } from "@/lib/scoring";

/** `edit`: open a saved hand for changes instead of recording a new one. */
type Props = { game: GameRow; players: GamePlayerRow[]; handsPlayed: number; edit?: HandRow; onDone: () => void; onCancel: () => void };

/** Full-screen sheet: pick winner/method/discarder, enter tiles, preview faan + settlement, then record. */
export function RecordHand({ game, players, handsPlayed, edit, onDone, onCancel }: Props) {
  const [kind, setKind] = useState<"win" | "draw" | null>(edit ? (edit.winning_method === "draw" ? "draw" : "win") : null);
  const [winnerId, setWinnerId] = useState<string | null>(edit?.winner_player_id ?? null);
  const [method, setMethod] = useState<WinMethod | null>(edit && edit.winning_method !== "draw" ? (edit.winning_method === "self_draw" ? "SELF_DRAW" : "DISCARD") : null);
  const [discarderId, setDiscarderId] = useState<string | null>(edit?.discard_player_id ?? null);
  const [payload, setPayload] = useState<CalcPayload | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());   // one id per attempt: a double tap cannot score twice
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When editing, the sheet shows the dealer and round of THAT hand, not the current ones.
  const editDealerSeat = edit ? players.find((p) => p.id === edit.dealer_player_id)?.seat_position : undefined;
  const viewGame = useMemo<GameRow>(() => edit
    ? { ...game, current_round_wind: edit.round_wind as GameRow["current_round_wind"], current_dealer_seat: editDealerSeat ?? game.current_dealer_seat, dealer_rotations: edit.state_before?.dealer_rotations ?? game.dealer_rotations }
    : game, [game, edit, editDealerSeat]);
  const cfg = useMemo(() => configForGame(game), [game]);
  const state = useMemo(() => stateOfGame(viewGame, edit ? edit.hand_number - 1 : handsPlayed), [viewGame, edit, handsPlayed]);
  const d = edit?.hand_detail;
  const calcInitial: CalcInitial | undefined = d?.concealed ? { concealed: d.concealed as PlayTile[], melds: d.melds as Meld[], flowers: d.flowers as BonusTile[], winningTile: d.winningTile as PlayTile, lastTile: !!d.isLastTile, robbing: !!d.isRobbingKong } : undefined;
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
    const base = { requestId, expectedHand: edit ? handsPlayed : handsPlayed + 1 };   // editing: the number of hands this screen shows
    const body = kind === "draw" ? { ...base, type: "draw" } : { ...base, type: "win", winnerId, discarderId: method === "DISCARD" ? discarderId : undefined, method,
      concealedTiles: payload!.input.concealedTiles, melds: payload!.input.melds, winningTile: payload!.input.winningTile, flowers: payload!.input.flowers,
      isLastTile: payload!.input.isLastTile, isRobbingKong: payload!.input.isRobbingKong };
    try {
      const res = await fetch(edit ? `/api/games/${game.id}/hands/${edit.id}` : `/api/games/${game.id}/hands`, { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal mencatat tangan");
      onDone();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const chip = (on: boolean) => `min-h-[48px] rounded-xl border px-3 text-sm font-semibold ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;
  const playerBtn = (p: GamePlayerRow, on: boolean, pick: () => void, disabled = false) => (
    <button key={p.id} type="button" disabled={disabled} onClick={pick} className={chip(on) + (disabled ? " opacity-30" : "")}>
      {p.player_name}<span className="block text-[11px] font-medium opacity-70">{WIND_LABEL[seatWindOf(p.seat_position, viewGame.current_dealer_seat)]}</span>
    </button>
  );
  const canSubmit = kind === "draw" || (kind === "win" && winner && method && (method === "SELF_DRAW" || discarderId) && preview && !("error" in preview));

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-base" role="dialog" aria-modal="true" aria-label="Catat tangan">
      <div className="mx-auto max-w-md space-y-4 px-5 pb-32 pt-6 md:max-w-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl">{edit ? `Ubah tangan #${edit.hand_number}` : `Tangan #${handsPlayed + 1}`}</h2><button type="button" className="text-sm underline" onClick={onCancel}>Batal</button></div>
        <p className="text-sm text-muted">Ronde {WIND_LABEL[ROUND_TO_WIND[viewGame.current_round_wind]]} · Dealer {players.find((p) => p.seat_position === viewGame.current_dealer_seat)?.player_name}</p>

        {edit && edit.hand_number < handsPlayed && <p className="card !border-warn text-sm"><b className="text-warn">Perhatian:</b> mengubah tangan ini menghitung ulang dealer, ronde, dan skor semua tangan sesudahnya.</p>}

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
                <HandCalculator key={`${winner.id}-${method}`} config={cfg} initial={calcInitial} lockedMethod={method} onChange={onChange}
                  fixed={{ seatWind: seatWindOf(winner.seat_position, viewGame.current_dealer_seat), roundWind: ROUND_TO_WIND[viewGame.current_round_wind], seatLabel: WIND_LABEL[seatWindOf(winner.seat_position, viewGame.current_dealer_seat)] }} />
                {payload && <ScoreCard payload={payload} winnerName={winner.player_name} title={game.name ?? "Lucky Cat Mahjong"} />}
                {preview && !("error" in preview) && (
                  <section className="card"><h3 className="section-label mb-2">Perubahan skor</h3>
                    <ul className="grid grid-cols-2 gap-2">{preview.changes.map((c) => { const p = players.find((x) => x.id === c.playerId)!; return (
                      <li key={c.playerId} className="flex justify-between rounded-xl bg-base/40 px-3 py-2 text-sm"><span>{p.player_name}</span><b className={c.change > 0 ? "text-pos" : c.change < 0 ? "text-neg" : "text-muted"}>{c.change > 0 ? "+" : ""}{c.change}</b></li>); })}</ul></section>
                )}
              </>
            )}
          </>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-md md:max-w-2xl">
          {error && <p role="alert" className="mb-2 text-sm font-semibold text-neg">{error}</p>}
          <button className="btn-primary" disabled={!canSubmit || busy} onClick={submit}>{busy ? "Menyimpan…" : edit ? "Simpan perubahan" : kind === "draw" ? "Catat seri" : "Catat kemenangan"}</button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { Tile } from "@/components/mahjong/Tile";
import { HandView } from "@/components/mahjong/HandView";
import { ALL_PLAY_TILES, BONUS_TILES, WINDS, calculateScore, countTiles, isNumbered, rankOf, suitOf } from "@/lib/scoring";
import type { BonusTile, GameConfig, Meld, PlayTile, ScoringResult, Wind, WinMethod, WinningHandInput } from "@/lib/scoring";

export type CalcPayload = { input: WinningHandInput; result: ScoringResult };
export const WIND_LABEL: Record<Wind, string> = { E: "Timur", S: "Selatan", W: "Barat", N: "Utara" };

type Mode = "hand" | "chow" | "pung" | "kong" | "ckong";
const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "hand", label: "Tangan", hint: "Ketuk kartu yang ada di tanganmu, termasuk kartu kemenangan." },
  { id: "chow", label: "Chow", hint: "Ketuk kartu terkecil dari urutan yang diambil (misal 3 untuk 3-4-5)." },
  { id: "pung", label: "Pong", hint: "Pong yang diambil dari buangan. Pong tertutup cukup dimasukkan ke Tangan." },
  { id: "kong", label: "Kong terbuka", hint: "Kong yang dibuka di meja (4 kartu)." },
  { id: "ckong", label: "Kong tertutup", hint: "Kong dari 4 kartu di tangan yang tidak dibuka." },
];
const SUIT_ROWS = [{ s: "m", label: "Karakter" }, { s: "s", label: "Bambu" }, { s: "p", label: "Lingkaran" }] as const;
const BONUS_LABEL = "Bunga & Musim (nomor sama dengan kursi = +1 faan)";

type Props = {
  config: GameConfig;
  /** In a game the seat and round winds come from the game state and cannot be changed here. */
  fixed?: { seatWind: Wind; roundWind: Wind; seatLabel: string };
  lockedMethod?: WinMethod;
  onChange: (p: CalcPayload | null) => void;
};

export function HandCalculator({ config, fixed, lockedMethod, onChange }: Props) {
  const [concealed, setConcealed] = useState<PlayTile[]>([]);
  const [melds, setMelds] = useState<Meld[]>([]);
  const [flowers, setFlowers] = useState<BonusTile[]>([]);
  const [winning, setWinning] = useState<PlayTile | null>(null);
  const [mode, setMode] = useState<Mode>("hand");
  const [method, setMethod] = useState<WinMethod>(lockedMethod ?? "DISCARD");
  const [seat, setSeat] = useState<Wind>("E");
  const [round, setRound] = useState<Wind>("E");
  const [lastTile, setLastTile] = useState(false);
  const [robbing, setRobbing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const effMethod = lockedMethod ?? method;
  const effSeat = fixed?.seatWind ?? seat, effRound = fixed?.roundWind ?? round;
  const used = useMemo(() => countTiles([...concealed, ...melds.flatMap((m) => m.tiles)]), [concealed, melds]);
  const avail = (t: string) => 4 - (used[t] ?? 0);
  const need = 3 * (4 - melds.length) + 2;
  const complete = concealed.length === need;
  const effWin = complete ? (winning && concealed.includes(winning) ? winning : concealed[concealed.length - 1]) : null;

  const payload = useMemo<CalcPayload | null>(() => {
    if (!complete || !effWin) return null;
    const input: WinningHandInput = {
      concealedTiles: concealed, melds, winningTile: effWin, flowers, winningMethod: effMethod, winnerSeatWind: effSeat, roundWind: effRound,
      isDealer: effSeat === "E", isLastTile: lastTile, isRobbingKong: robbing && effMethod === "DISCARD", gameConfig: config,
    };
    return { input, result: calculateScore(input) };
  }, [complete, effWin, concealed, melds, flowers, effMethod, effSeat, effRound, lastTile, robbing, config]);
  useEffect(() => onChange(payload), [payload, onChange]);

  const meldNeeds = (t: PlayTile): { ok: boolean; tiles?: PlayTile[] } => {
    if (mode === "hand") return { ok: concealed.length < need && avail(t) > 0 };
    if (melds.length >= 4) return { ok: false };
    if (mode === "chow") {
      if (!isNumbered(t) || rankOf(t) > 7) return { ok: false };
      const tiles = [0, 1, 2].map((d) => `${rankOf(t) + d}${suitOf(t)}`) as PlayTile[];
      return { ok: tiles.every((x) => avail(x) >= 1), tiles };
    }
    const n = mode === "pung" ? 3 : 4;
    return { ok: avail(t) >= n, tiles: Array(n).fill(t) as PlayTile[] };
  };

  function tap(t: PlayTile) {
    setNote(null);
    const r = meldNeeds(t);
    if (!r.ok) return;
    if (mode === "hand") { setConcealed([...concealed, t]); return; }
    if (concealed.length > 3 * (4 - melds.length - 1) + 2) { setNote("Hapus beberapa kartu dari tangan dulu sebelum menambah set."); return; }
    setMelds([...melds, { type: mode === "chow" ? "CHOW" : mode === "pung" ? "PUNG" : "KONG", tiles: r.tiles!, exposed: mode !== "ckong" }]);
  }
  const removeTile = (t: string) => { const i = concealed.indexOf(t as PlayTile); if (i >= 0) setConcealed(concealed.filter((_, k) => k !== i)); setNote(null); };
  const reset = () => { setConcealed([]); setMelds([]); setFlowers([]); setWinning(null); setLastTile(false); setRobbing(false); setNote(null); };
  const toggleFlower = (f: BonusTile) => setFlowers(flowers.includes(f) ? flowers.filter((x) => x !== f) : [...flowers, f]);

  const chip = (on: boolean) => `min-h-[40px] rounded-xl border px-3 text-sm font-semibold transition ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;
  const palette = (tiles: PlayTile[], cols: string) => (
    <div className={`grid ${cols} gap-1`}>
      {tiles.map((t) => <Tile key={t} t={t} fluid dim={!meldNeeds(t).ok} disabled={!meldNeeds(t).ok} onClick={() => tap(t)} badge={mode === "hand" && (used[t] ?? 0) > 0 ? used[t] : undefined} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="section-label">Konteks kemenangan</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["SELF_DRAW", "DISCARD"] as WinMethod[]).map((m) => (
            <button key={m} type="button" disabled={!!lockedMethod} onClick={() => setMethod(m)} className={chip(effMethod === m) + (lockedMethod && effMethod !== m ? " opacity-40" : "")}>
              {m === "SELF_DRAW" ? "Menang sendiri (Self Draw)" : "Dari buangan"}
            </button>
          ))}
        </div>
        {fixed ? (
          <p className="text-sm text-muted">Kursi <b className="text-cream">{fixed.seatLabel}</b> · Ronde <b className="text-cream">{WIND_LABEL[fixed.roundWind]}</b></p>
        ) : (
          <>
            <div><p className="mb-1.5 text-xs font-semibold text-muted">Angin kursi pemenang</p>
              <div className="grid grid-cols-4 gap-2">{WINDS.map((w) => <button key={w} type="button" onClick={() => setSeat(w)} className={chip(seat === w)}>{WIND_LABEL[w]}</button>)}</div></div>
            <div><p className="mb-1.5 text-xs font-semibold text-muted">Angin ronde</p>
              <div className="grid grid-cols-4 gap-2">{WINDS.map((w) => <button key={w} type="button" onClick={() => setRound(w)} className={chip(round === w)}>{WIND_LABEL[w]}</button>)}</div></div>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLastTile(!lastTile)} className={chip(lastTile)} aria-pressed={lastTile}>Kartu terakhir</button>
          <button type="button" disabled={effMethod !== "DISCARD"} onClick={() => setRobbing(!robbing)} className={chip(robbing && effMethod === "DISCARD") + (effMethod !== "DISCARD" ? " opacity-40" : "")} aria-pressed={robbing}>Rampas kong</button>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="section-label">Tangan kamu</h2>
          <span className={`text-sm font-bold ${complete ? "text-cream" : "text-muted"}`}>{concealed.length}/{need} kartu{melds.length ? ` + ${melds.length} set` : ""}</span>
        </div>
        {concealed.length || melds.length ? (
          <HandView concealed={concealed} melds={melds} winningTile={effWin} flowers={flowers} onRemoveTile={removeTile} onRemoveMeld={(i) => setMelds(melds.filter((_, k) => k !== i))} />
        ) : <p className="text-sm text-muted">Belum ada kartu. Ketuk kartu di bawah untuk menyusun tangan menang.</p>}
        {concealed.length > 0 && <p className="text-xs text-muted">Ketuk kartu atau set untuk menghapusnya.</p>}
        {note && <p role="alert" className="text-sm text-red-300">{note}</p>}
        {complete && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Kartu kemenangan (yang menyelesaikan tangan)</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(concealed)].map((t) => <Tile key={t} t={t} width={30} ring={t === effWin} onClick={() => setWinning(t)} label={`Kartu kemenangan ${t}`} />)}
            </div>
          </div>
        )}
        {(concealed.length > 0 || melds.length > 0 || flowers.length > 0) && <button type="button" className="btn-secondary !min-h-[40px]" onClick={reset}>Ulangi dari awal</button>}
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap gap-2">{MODES.map((m) => <button key={m.id} type="button" onClick={() => setMode(m.id)} className={chip(mode === m.id)}>{m.label}</button>)}</div>
        <p className="text-xs text-muted">{MODES.find((m) => m.id === mode)!.hint}</p>
        {SUIT_ROWS.map((r) => (
          <div key={r.s}><p className="mb-1 text-xs font-semibold text-muted">{r.label}</p>{palette(ALL_PLAY_TILES.filter((t) => t.endsWith(r.s) && isNumbered(t)), "grid-cols-9")}</div>
        ))}
        <div><p className="mb-1 text-xs font-semibold text-muted">Angin & Naga</p>{palette(ALL_PLAY_TILES.filter((t) => !isNumbered(t)), "grid-cols-7")}</div>
      </section>

      <section className="card space-y-2">
        <p className="text-xs font-semibold text-muted">{BONUS_LABEL}</p>
        <div className="grid grid-cols-8 gap-1">
          {BONUS_TILES.map((f) => <Tile key={f} t={f} fluid ring={flowers.includes(f)} onClick={() => toggleFlower(f)} label={`Bunga ${f}`} />)}
        </div>
        <p className="text-xs text-muted">Bunga: Plum 1 · Anggrek 2 · Krisan 3 · Bambu 4. Musim: Semi 1 · Panas 2 · Gugur 3 · Dingin 4. Tanpa bunga sama sekali = +1 faan.</p>
      </section>
    </div>
  );
}

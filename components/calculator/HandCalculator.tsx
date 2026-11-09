"use client";
import { useEffect, useMemo, useState } from "react";
import { Tile } from "@/components/mahjong/Tile";
import { HandView } from "@/components/mahjong/HandView";
import { ADDITIONAL_RULES, ALL_PLAY_TILES, BONUS_TILES, WINDS, calculateScore, countTiles, isNumbered, rankOf, suitOf } from "@/lib/scoring";
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

/** Starting values, used when an existing hand is opened for editing. */
export type CalcInitial = { concealed: PlayTile[]; melds: Meld[]; flowers: BonusTile[]; winningTile: PlayTile | null; lastTile: boolean; robbing: boolean };

// Extra points ("poin tambahan"). Some are worked out from the tiles; two can only be known by the players and are ticked by hand.
const EXTRA_TEXT: Record<string, { title: string; hint: string }> = {
  "self-draw": { title: "Menang sendiri (Self Draw)", hint: "Kartu kemenangan diambil sendiri dari tumpukan" },
  "last-tile": { title: "Kartu terakhir (Last Tile)", hint: "Menang dengan kartu terakhir" },
  "robbing-kong": { title: "Merampas kong (Robbing Kong)", hint: "Menang dari kartu yang dipakai lawan untuk menambah kong. Hanya untuk menang dari buangan" },
  "concealed-hand": { title: "Tangan tertutup (Concealed Hand)", hint: "Tidak ada set yang dibuka" },
  "seat-wind": { title: "Pong angin kursi (Seat Wind)", hint: "Pong/kong angin yang sama dengan kursi pemenang" },
  "round-wind": { title: "Pong angin ronde (Round Wind)", hint: "Pong/kong angin yang sama dengan ronde" },
  "dragon-pong": { title: "Pong naga (Dragon Pong/Kong)", hint: "Pong/kong naga merah, hijau, atau putih" },
  "suitable-flower": { title: "Bunga/musim sesuai kursi", hint: "Nomor sama dengan kursi, dihitung per kartu" },
  "no-flower": { title: "Tanpa bunga (No Flower)", hint: "Tidak punya kartu bunga atau musim" },
};

type Props = {
  config: GameConfig;
  initial?: CalcInitial;
  /** In a game the seat and round winds come from the game state and cannot be changed here. */
  fixed?: { seatWind: Wind; roundWind: Wind; seatLabel: string };
  lockedMethod?: WinMethod;
  onChange: (p: CalcPayload | null) => void;
};

export function HandCalculator({ config, initial, fixed, lockedMethod, onChange }: Props) {
  const [concealed, setConcealed] = useState<PlayTile[]>(initial?.concealed ?? []);
  const [melds, setMelds] = useState<Meld[]>(initial?.melds ?? []);
  const [flowers, setFlowers] = useState<BonusTile[]>(initial?.flowers ?? []);
  const [winning, setWinning] = useState<PlayTile | null>(initial?.winningTile ?? null);
  const [mode, setMode] = useState<Mode>("hand");
  const [method, setMethod] = useState<WinMethod>(lockedMethod ?? "DISCARD");
  const [seat, setSeat] = useState<Wind>("E");
  const [round, setRound] = useState<Wind>("E");
  const [lastTile, setLastTile] = useState(initial?.lastTile ?? false);
  const [robbing, setRobbing] = useState(initial?.robbing ?? false);
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

      <section className="card space-y-2" aria-label="Poin tambahan">
        <div><h2 className="section-label">Poin tambahan</h2><p className="mt-1 text-xs text-muted">Yang bertanda <b className="text-cream">Otomatis</b> dihitung dari kartu. Centang sisanya jika terjadi di tangan ini.</p></div>
        <ul className="space-y-2">
          {ADDITIONAL_RULES.map((rule) => {
            const text = EXTRA_TEXT[rule.id] ?? { title: rule.name, hint: rule.summary };
            const hit = payload?.result.detectedFan.find((f) => f.id === rule.id);
            const manual = rule.id === "last-tile" || rule.id === "robbing-kong" || (rule.id === "self-draw" && !lockedMethod);
            const blocked = rule.id === "robbing-kong" && effMethod !== "DISCARD";
            const on = rule.id === "last-tile" ? lastTile : rule.id === "robbing-kong" ? robbing && !blocked : rule.id === "self-draw" && manual ? effMethod === "SELF_DRAW" : !!hit;
            const toggle = () => { if (rule.id === "last-tile") setLastTile(!lastTile); else if (rule.id === "robbing-kong") setRobbing(!robbing); else setMethod(effMethod === "SELF_DRAW" ? "DISCARD" : "SELF_DRAW"); };
            const fan = hit ? hit.fan : rule.fan;
            const body = (<>
              <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-cream bg-cream text-base" : "border-line bg-well"}`}>{on && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span>
              <span className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold">{text.title}</span><span className="block text-xs text-muted">{blocked ? "Hanya untuk menang dari buangan" : text.hint}</span></span>
              <span className="shrink-0 text-right"><b className={`block text-sm ${on ? "text-pos" : "text-muted"}`}>+{fan}</b>{!manual && <span className="block text-[10px] uppercase tracking-wide text-muted">Otomatis</span>}</span>
            </>);
            const cls = `flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 ${on ? "border-cream/60 bg-cream/10" : "border-line bg-card"}`;
            return (<li key={rule.id}>{manual
              ? <button type="button" role="checkbox" aria-checked={on} disabled={blocked} onClick={toggle} className={`${cls} transition active:scale-[0.99] ${blocked ? "opacity-40" : ""}`}>{body}</button>
              : <div role="checkbox" aria-checked={on} aria-readonly className={`${cls} ${on ? "" : "opacity-70"}`}>{body}</div>}</li>);
          })}
        </ul>
      </section>
    </div>
  );
}

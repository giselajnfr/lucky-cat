"use client";
import { useEffect, useMemo, useState } from "react";
import { Tile } from "@/components/mahjong/Tile";
import { HandView } from "@/components/mahjong/HandView";
import { FAN_TABLE, MANUAL_FAN_IDS, ALL_PLAY_TILES, BONUS_TILES, WINDS, calculateScore, countTiles, flattenHand, isNumbered, maxTilesFor, meldCandidates } from "@/lib/scoring";
import type { BonusTile, GameConfig, Meld, PlayTile, ScoringResult, Wind, WinMethod, WinningHandInput } from "@/lib/scoring";

export type CalcPayload = { input: WinningHandInput; result: ScoringResult };
export const WIND_LABEL: Record<Wind, string> = { E: "Timur", S: "Selatan", W: "Barat", N: "Utara" };

const SUIT_ROWS = [{ s: "m", label: "Karakter" }, { s: "s", label: "Bambu" }, { s: "p", label: "Lingkaran" }] as const;
const BONUS_LABEL = "Bunga & Musim (nomor sama dengan kursi = +1 faan)";

/** Starting values, used when an existing hand is opened for editing. */
export type CalcInitial = { concealed: PlayTile[]; melds: Meld[]; flowers: BonusTile[]; winningTile: PlayTile | null; lastTile: boolean; robbing: boolean; openMelds?: boolean; manualFan?: string[] };

// Extra points ("poin tambahan"). Some are worked out from the tiles; two can only be known by the players and are ticked by hand.
const EXTRA_TEXT: Record<string, { title: string; hint: string }> = {
  "self-draw": { title: "Menang sendiri (Self Draw)", hint: "Kartu kemenangan diambil sendiri dari tumpukan" },
  "last-tile": { title: "Kartu terakhir (Last Tile)", hint: "Menang dengan kartu terakhir" },
  "robbing-kong": { title: "Merampas kong (Robbing Kong)", hint: "Menang dari kartu yang dipakai lawan untuk menambah kong. Hanya untuk menang dari buangan" },
  "concealed-hand": { title: "Tangan tertutup (Concealed Hand)", hint: "Menang dari buangan tanpa ada set yang diambil dari buangan. Hilangkan centang jika ada chow, pong, atau kong yang kamu ambil dari buangan." },
  "seat-wind": { title: "Pong angin kursi (Seat Wind)", hint: "Pong/kong angin yang sama dengan kursi pemenang" },
  "round-wind": { title: "Pong angin ronde (Round Wind)", hint: "Pong/kong angin yang sama dengan ronde" },
  "heavenly-hand": { title: "Heavenly Hand (天胡)", hint: "Dong menang dengan tangan awalnya" },
  "earthly-hand": { title: "Earthly Hand (地胡)", hint: "Pemain non-dong menang dari buangan pertama dong" },
  "fully-exposed": { title: "Fully Exposed (全求人)", hint: "Semua set dibuka, menang dari buangan untuk melengkapi pasangan" },
  "three-concealed-pungs": { title: "Three Concealed Pungs (三暗刻)", hint: "Tiga pong/kong tertutup. Pong yang diselesaikan kartu buangan dihitung terbuka" },
  "dragon-pong": { title: "Pong naga (Dragon Pong/Kong)", hint: "Pong/kong naga merah, hijau, atau putih" },
  "suitable-flower": { title: "Bunga/musim sesuai kursi", hint: "Nomor sama dengan kursi, dihitung per kartu" },
  "no-flower": { title: "Tanpa bunga (No Flower)", hint: "Tidak punya kartu bunga atau musim" },
};

/** Rows of the checklist: everything the players have to tick themselves. Wind, dragon and flower faan are worked out from the tiles and are not listed. */
const CHECKABLE = ["last-tile", "robbing-kong", "concealed-hand", ...MANUAL_FAN_IDS];

type Props = {
  config: GameConfig;
  initial?: CalcInitial;
  /** In a game the seat and round winds come from the game state and cannot be changed here. */
  fixed?: { seatWind: Wind; roundWind: Wind; seatLabel: string };
  lockedMethod?: WinMethod;
  onChange: (p: CalcPayload | null) => void;
};

export function HandCalculator({ config, initial, fixed, lockedMethod, onChange }: Props) {
  // ONE flat list of tiles. Chows and pongs are found by the scoring engine; a kong is recognised from the tile count
  // (14 tiles = no kong, 15 = one four-of-a-kind is a kong, 16 = two ...).
  const [tiles, setTiles] = useState<PlayTile[]>(() => (initial ? flattenHand(initial.concealed, initial.melds) : []));
  const [flowers, setFlowers] = useState<BonusTile[]>(initial?.flowers ?? []);
  const [winning, setWinning] = useState<PlayTile | null>(initial?.winningTile ?? null);
  const [opened, setOpened] = useState(initial?.openMelds ?? false);   // a set was taken from a discard: no Concealed Hand
  const [method, setMethod] = useState<WinMethod>(lockedMethod ?? "DISCARD");
  const [seat, setSeat] = useState<Wind>("E");
  const [round, setRound] = useState<Wind>("E");
  const [lastTile, setLastTile] = useState(initial?.lastTile ?? false);
  const [robbing, setRobbing] = useState(initial?.robbing ?? false);
  const [manual, setManual] = useState<string[]>(initial?.manualFan ?? []);   // heavenly / earthly / fully exposed / three concealed pungs
  const [note, setNote] = useState<string | null>(null);

  const effMethod = lockedMethod ?? method;
  const effSeat = fixed?.seatWind ?? seat, effRound = fixed?.roundWind ?? round;
  const used = useMemo(() => countTiles(tiles), [tiles]);
  const avail = (t: string) => 4 - (used[t] ?? 0);
  const maxTiles = maxTilesFor(tiles);
  const candidates = useMemo(() => meldCandidates(tiles), [tiles]);
  const complete = candidates.length > 0;

  // Every way to read the tiles (which four-of-a-kind groups are the kongs) is scored; the best reading is used.
  const best = useMemo(() => {
    let top: { c: (typeof candidates)[number]; input: WinningHandInput; result: ScoringResult; win: PlayTile } | null = null;
    for (const c of candidates) {
      const win = winning && c.concealed.includes(winning) ? winning : c.concealed[c.concealed.length - 1];
      if (!win) continue;
      const input: WinningHandInput = {
        concealedTiles: c.concealed, melds: c.melds, winningTile: win, flowers, winningMethod: effMethod, winnerSeatWind: effSeat, roundWind: effRound,
        isDealer: effSeat === "E", isLastTile: lastTile, isRobbingKong: robbing && effMethod === "DISCARD", hasOpenMelds: opened, manualFan: manual, gameConfig: config,
      };
      const result = calculateScore(input);
      const better = !top || (result.valid && !top.result.valid) || (result.valid === top.result.valid && result.totalFan > top.result.totalFan);
      if (better) top = { c, input, result, win };
    }
    return top;
  }, [candidates, winning, flowers, effMethod, effSeat, effRound, lastTile, robbing, opened, manual, config]);

  const payload = useMemo<CalcPayload | null>(() => (best ? { input: best.input, result: best.result } : null), [best]);
  const effWin = best?.win ?? null;
  const shownConcealed = best ? best.c.concealed : tiles;
  const shownMelds = best ? best.c.melds : [];
  useEffect(() => onChange(payload), [payload, onChange]);

  function tap(t: PlayTile) {
    setNote(null);
    if (avail(t) <= 0) return;
    if (tiles.length >= maxTiles) { setNote(tiles.length >= 14 ? "Kartu ke-15 dan seterusnya hanya untuk kong: butuh empat kartu yang sama di tangan." : null); return; }
    setTiles([...tiles, t]);
  }
  const removeTile = (t: string) => { const i = tiles.indexOf(t as PlayTile); if (i >= 0) setTiles(tiles.filter((_, k) => k !== i)); setNote(null); };
  const removeKong = (t: PlayTile) => { setTiles(tiles.filter((x) => x !== t)); setNote(null); };
  const reset = () => { setTiles([]); setFlowers([]); setWinning(null); setOpened(false); setLastTile(false); setRobbing(false); setManual([]); setNote(null); };
  const toggleFlower = (f: BonusTile) => setFlowers(flowers.includes(f) ? flowers.filter((x) => x !== f) : [...flowers, f]);

  const chip = (on: boolean) => `min-h-[40px] rounded-xl border px-3 text-sm font-semibold transition ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;
  const palette = (list: PlayTile[], cols: string) => (
    <div className={`grid ${cols} gap-1`}>
      {list.map((t) => { const off = avail(t) <= 0 || tiles.length >= maxTiles; return <Tile key={t} t={t} fluid dim={off} disabled={off} onClick={() => tap(t)} badge={(used[t] ?? 0) > 0 ? used[t] : undefined} />; })}
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="section-label">Tangan kamu</h2>
          <span className={`text-sm font-bold ${complete ? "text-cream" : "text-muted"}`}>{tiles.length < 14 ? `${tiles.length}/14 kartu` : `${tiles.length} kartu${shownMelds.length ? ` · ${shownMelds.length} kong` : ""}`}</span>
        </div>
        {tiles.length ? (
          <HandView concealed={shownConcealed} melds={shownMelds.map((m) => ({ ...m, exposed: true }))} winningTile={effWin} flowers={flowers} onRemoveTile={removeTile} onRemoveMeld={(i) => removeKong(shownMelds[i].tiles[0])} />
        ) : <p className="text-sm text-muted">Belum ada kartu. Ketuk kartu di bawah untuk menyusun tangan menang.</p>}
        {tiles.length > 0 && <p className="text-xs text-muted">Ketuk kartu untuk menghapusnya.</p>}
        {note && <p role="alert" className="text-sm text-red-300">{note}</p>}
        {complete && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Kartu kemenangan (yang menyelesaikan tangan)</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(shownConcealed)].map((t) => <Tile key={t} t={t} width={30} ring={t === effWin} onClick={() => setWinning(t)} label={`Kartu kemenangan ${t}`} />)}
            </div>
          </div>
        )}
        {(tiles.length > 0 || flowers.length > 0) && <button type="button" className="btn-secondary !min-h-[40px]" onClick={reset}>Ulangi dari awal</button>}
      </section>

      <section className="card space-y-3">
        <p className="text-xs text-muted">Ketuk semua kartu di tanganmu, termasuk kartu kemenangan. Chow dan pong dikenali otomatis. Kong: tiap kong menambah satu kartu, jadi 15 kartu dengan empat kartu yang sama berarti ada satu kong.</p>
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

      <section className="card space-y-2" aria-label="Poin tambahan">
        <div><h2 className="section-label">Poin tambahan</h2><p className="mt-1 text-xs text-muted">Centang yang terjadi di tangan ini. Faan angin, naga, dan bunga dihitung otomatis dari kartu.</p></div>
        <ul className="space-y-2">
          {(config.fanTable ?? FAN_TABLE).filter((r) => r.category === "additional" && r.enabled && (CHECKABLE.includes(r.id) || (r.id === "self-draw" && !lockedMethod))).map((rule) => {
            const text = EXTRA_TEXT[rule.id] ?? { title: rule.name, hint: rule.summary };
            const flag = (MANUAL_FAN_IDS as readonly string[]).includes(rule.id);
            const blocked = ((rule.id === "robbing-kong" || rule.id === "concealed-hand" || rule.id === "fully-exposed") && effMethod !== "DISCARD")
              || (rule.id === "heavenly-hand" && effSeat !== "E") || (rule.id === "earthly-hand" && (effSeat === "E" || effMethod !== "DISCARD"));
            const blockedHint = rule.id === "concealed-hand" ? "Hanya untuk menang dari buangan (menang sendiri dihitung Self Draw)" : rule.id === "heavenly-hand" ? "Hanya untuk dong (kursi Timur)"
              : rule.id === "earthly-hand" ? "Hanya untuk pemain non-dong yang menang dari buangan" : "Hanya untuk menang dari buangan";
            const on = flag ? manual.includes(rule.id) && !blocked : rule.id === "last-tile" ? lastTile : rule.id === "robbing-kong" ? robbing && !blocked : rule.id === "concealed-hand" ? !opened && !blocked : effMethod === "SELF_DRAW";
            const toggle = () => { if (flag) setManual(manual.includes(rule.id) ? manual.filter((x) => x !== rule.id) : [...manual, rule.id]); else if (rule.id === "last-tile") setLastTile(!lastTile); else if (rule.id === "robbing-kong") setRobbing(!robbing); else if (rule.id === "concealed-hand") setOpened(!opened); else setMethod(effMethod === "SELF_DRAW" ? "DISCARD" : "SELF_DRAW"); };
            return (<li key={rule.id}>
              <button type="button" role="checkbox" aria-checked={on} disabled={blocked} onClick={toggle} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition active:scale-[0.99] ${on ? "border-cream/60 bg-cream/10" : "border-line bg-card"} ${blocked ? "opacity-40" : ""}`}>
                <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-cream bg-cream text-base" : "border-line bg-well"}`}>{on && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span>
                <span className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold">{text.title}</span><span className="block text-xs text-muted">{blocked ? blockedHint : text.hint}</span></span>
                <b className={`shrink-0 text-sm ${on ? "text-pos" : "text-muted"}`}>+{rule.fan}</b>
              </button></li>);
          })}
        </ul>
      </section>
    </div>
  );
}

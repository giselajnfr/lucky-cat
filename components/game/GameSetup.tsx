"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HK18_RULES } from "@/lib/scoring";
import { CAP_CHOICES, MAX_START_POINTS, PRESETS, START_POINT_CHOICES, digits } from "@/lib/game/presets";
import type { RosterPlayer, RulePreset } from "@/lib/game/types";

const ROUNDS = ["east", "south", "west", "north"] as const;
const ROUND_LABEL = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" };
// Seats 0..3 are East, South, West, North. Placed around the table the way people sit: West on top, North left, South right, East at the bottom.
const SEATS = [
  { seat: 0, char: "東", letter: "E", name: "Timur" },
  { seat: 1, char: "南", letter: "S", name: "Selatan" },
  { seat: 2, char: "西", letter: "W", name: "Barat" },
  { seat: 3, char: "北", letter: "N", name: "Utara" },
];
type Seat = { playerId: string | null; name: string };
const fmtNum = (n: number) => n.toLocaleString("id-ID");

/** The first thing players see after joining with the room code: names, rule book, starting points, faan cap, then start. */
export function GameSetup({ gameId, onDone }: { gameId: string; onDone: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [seats, setSeats] = useState<Seat[]>(() => SEATS.map(() => ({ playerId: null, name: "" })));
  const [active, setActive] = useState<number | null>(null);
  const [preset, setPreset] = useState<Exclude<RulePreset, "custom"> | null>(null);
  const [startChoice, setStartChoice] = useState<number | "other">(0);
  const [startOther, setStartOther] = useState("");
  const [capOn, setCapOn] = useState(false);
  const [capChoice, setCapChoice] = useState<number | "other">(CAP_CHOICES[1]);
  const [capOther, setCapOther] = useState("");
  const [round, setRound] = useState<(typeof ROUNDS)[number]>("east");
  const [last, setLast] = useState<(typeof ROUNDS)[number]>(HK18_RULES.progression.lastRoundWind);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("players").select("id, name, user_id").eq("owner_id", user.id).order("name");
      setRoster((data ?? []) as RosterPlayer[]);
    })();
  }, [supabase]);

  const labelOf = (s: Seat) => (s.playerId ? roster.find((r) => r.id === s.playerId)?.name ?? "…" : s.name);
  const set = (i: number, s: Seat) => setSeats(seats.map((x, k) => (k === i ? s : x)));
  const names = seats.map((s) => labelOf(s).trim().toLowerCase());
  const dupe = names.some((n, i) => n && names.indexOf(n) !== i);
  const namesOk = names.every(Boolean) && !dupe;

  const minFan = PRESETS.find((p) => p.id === preset)?.minFan ?? 0;
  const startPoints = startChoice === "other" ? Number(startOther || "0") : startChoice;
  const startOk = startPoints >= 0 && startPoints <= MAX_START_POINTS;
  const chicken = preset === "chicken";   // Chicken Hand has no faan, so no cap
  const capValue = !capOn || chicken ? null : capChoice === "other" ? Number(capOther || "0") : capChoice;
  const capOk = capValue === null || (capValue >= Math.max(1, minFan) && capValue <= 99);
  const ready = namesOk && preset !== null && startOk && capOk;

  const typed = active !== null ? labelOf(seats[active]).trim().toLowerCase() : "";
  const taken = new Set(seats.map((s) => s.playerId).filter(Boolean));
  const suggestions = active === null ? [] : roster.filter((r) => (!taken.has(r.id) || r.id === seats[active].playerId) && r.name.toLowerCase() !== typed && r.name.toLowerCase().includes(typed)).slice(0, 6);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!ready || !preset) return;
    setBusy(true); setError(null);
    const { error } = await supabase.rpc("setup_game", {
      p_game: gameId, p_preset: preset, p_max_fan: capValue, p_starting_points: startPoints, p_round_wind: round, p_last_round_wind: last,
      p_players: seats.map((s, seat) => (s.playerId ? { seat, player_id: s.playerId } : { seat, name: s.name.trim() })),
    });
    if (error) {
      if (/already been set up/i.test(error.message)) { onDone(); return; }   // another player at the table was faster: just show their setup
      setError(error.message); setBusy(false); return;
    }
    onDone();
  }

  const chip = (on: boolean) => `min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;
  const seatCard = (i: number) => {
    const s = SEATS[i]; const east = i === 0;
    return (
      <div className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2 ${east ? "border-warn bg-warn/15" : "border-line bg-card"}`}>
        <div className="flex flex-col items-center leading-none">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl font-bold ${east ? "bg-warn text-base" : "bg-cream/90 text-base"}`} aria-hidden="true">{s.char}</span>
          <span className="mt-1 text-[10px] font-bold text-muted">{s.letter}</span>
        </div>
        <label htmlFor={`seat${i}`} className="sr-only">Pemain kursi {s.name}{east ? " (dealer pertama)" : ""}</label>
        <input id={`seat${i}`} value={labelOf(seats[i])} maxLength={40} autoComplete="off" autoCapitalize="words" enterKeyHint="next" placeholder="Nama"
          onFocus={() => setActive(i)} onChange={(e) => set(i, { playerId: null, name: e.target.value })}
          className="min-h-[44px] w-full min-w-0 rounded-lg border border-line bg-well px-1.5 text-center text-base text-cream placeholder:text-muted/60 focus:border-cream focus:outline-none focus:ring-2 focus:ring-cream/25" />
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card space-y-4">
        <div>
          <h2 className="text-lg">Mulai meja ini</h2>
          <p className="mt-1 text-sm text-muted">Ketik nama pemain di setiap kursi, sesuai posisi duduk. Timur membagi kartu pertama. Semua orang di meja ini bisa melihat skor yang sama di ponsel masing-masing.</p>
        </div>

        <div className="grid grid-cols-[1fr_9.5rem_1fr] items-center gap-2">
          <div className="col-start-2 row-start-1">{seatCard(2)}</div>
          <div className="col-start-1 row-start-2">{seatCard(3)}</div>
          <div className="col-start-2 row-start-2 mx-auto flex aspect-square w-24 items-center justify-center rounded-2xl border border-line bg-well text-4xl" aria-hidden="true">🀄</div>
          <div className="col-start-3 row-start-2">{seatCard(1)}</div>
          <div className="col-start-2 row-start-3">{seatCard(0)}</div>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Pernah main:</span>
            {suggestions.map((r) => <button type="button" key={r.id} className={chip(false)} onMouseDown={(e) => e.preventDefault()} onClick={() => { set(active!, { playerId: r.id, name: "" }); setActive(null); }}>{r.name}{r.user_id ? "" : " (tamu)"}</button>)}
          </div>)}
        {dupe && <p role="alert" className="text-sm text-neg">Satu pemain tidak boleh duduk di dua kursi.</p>}
      </section>

      <section className="card space-y-3">
        <h2 className="section-label">Buku aturan meja ini</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Buku aturan">
          {PRESETS.map((p) => (
            <button type="button" key={p.id} role="radio" aria-checked={preset === p.id} onClick={() => { setPreset(p.id); if (capOn && capChoice !== "other" && capChoice < Math.max(1, p.minFan)) setCapChoice(CAP_CHOICES.find((c) => c >= p.minFan) ?? "other"); }}
              className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition ${preset === p.id ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`}>
              <span className="text-sm font-bold leading-tight">{p.label}</span>
              <span className={`mt-0.5 text-[11px] ${preset === p.id ? "text-base/70" : "text-muted"}`}>{p.short}</span>
            </button>))}
        </div>
        <p className="text-xs text-muted">{preset ? PRESETS.find((p) => p.id === preset)!.hint : "Pilih buku aturan yang dipakai meja ini."}</p>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="section-label mb-2">Skor awal</h2>
          <div className="flex flex-wrap gap-2">
            {START_POINT_CHOICES.map((n) => <button type="button" key={n} className={chip(startChoice === n)} onClick={() => setStartChoice(n)}>{fmtNum(n)}</button>)}
            <button type="button" className={chip(startChoice === "other")} onClick={() => setStartChoice("other")}>Lainnya</button>
          </div>
          {startChoice === "other" && (
            <div className="mt-2">
              <label htmlFor="sp" className="sr-only">Skor awal</label>
              <input id="sp" inputMode="numeric" pattern="[0-9]*" autoFocus placeholder="Contoh: 2000" className="input" value={startOther} onFocus={(e) => e.target.select()} onChange={(e) => setStartOther(digits(e.target.value, 8))} />
              {!startOk && <p role="alert" className="mt-1 text-xs text-neg">Maksimal {fmtNum(MAX_START_POINTS)}.</p>}
            </div>)}
          <p className="mt-2 text-xs text-muted">Setiap pemain mulai dari {fmtNum(startPoints)} poin.</p>
        </div>

        {chicken ? <p className="rounded-xl border border-line bg-base/30 p-3 text-xs text-muted">Chicken Hand tidak memakai faan, jadi tidak ada batas faan. Setiap kemenangan bernilai 1 poin.</p> : <div>
          <h2 className="section-label mb-2">Batas faan (cap)</h2>
          <div className="seg" role="radiogroup" aria-label="Batas faan">
            <button type="button" role="radio" aria-checked={!capOn} className={`seg-item ${!capOn ? "seg-on" : ""}`} onClick={() => setCapOn(false)}>Tanpa batas</button>
            <button type="button" role="radio" aria-checked={capOn} className={`seg-item ${capOn ? "seg-on" : ""}`} onClick={() => setCapOn(true)}>Pakai batas</button>
          </div>
          {capOn && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {CAP_CHOICES.map((n) => <button type="button" key={n} disabled={n < minFan} className={`${chip(capChoice === n)} disabled:opacity-40`} onClick={() => setCapChoice(n)}>{n} faan</button>)}
                <button type="button" className={chip(capChoice === "other")} onClick={() => setCapChoice("other")}>Lainnya</button>
              </div>
              {capChoice === "other" && (<>
                <label htmlFor="cap" className="sr-only">Batas faan</label>
                <input id="cap" inputMode="numeric" pattern="[0-9]*" autoFocus placeholder="Contoh: 15" className="input" value={capOther} onFocus={(e) => e.target.select()} onChange={(e) => setCapOther(digits(e.target.value, 2))} />
              </>)}
              {!capOk && <p role="alert" className="text-xs text-neg">Batas harus antara {Math.max(1, minFan)} dan 99 faan.</p>}
            </div>)}
          <p className="mt-2 text-xs text-muted">{capValue ? `Tangan bernilai lebih dari ${capValue} faan tetap dibayar sebagai ${capValue} faan.` : "Faan dibayar penuh, berapa pun nilainya."}</p>
        </div>}

        <details className="rounded-xl border border-line bg-base/30 p-3">
          <summary className="cursor-pointer text-sm font-semibold">Opsi lanjutan: ronde</summary>
          <div className="mt-3 space-y-3">
            <div><p className="mb-1.5 text-xs font-semibold text-muted">Ronde awal</p><div className="grid grid-cols-4 gap-2">{ROUNDS.map((r) => <button type="button" key={r} className={chip(round === r)} onClick={() => setRound(r)}>{ROUND_LABEL[r]}</button>)}</div></div>
            <div><p className="mb-1.5 text-xs font-semibold text-muted">Game berakhir setelah ronde</p><div className="grid grid-cols-4 gap-2">{ROUNDS.map((r) => <button type="button" key={r} className={chip(last === r)} onClick={() => setLast(r)}>{ROUND_LABEL[r]}</button>)}</div></div>
          </div>
        </details>
      </section>

      {error && <p role="alert" className="text-sm font-semibold text-neg">{error}</p>}
      <button className="btn-primary" disabled={!ready || busy}>{busy ? "Memulai…" : "Mulai sesi"}</button>
      {!ready && !busy && <p className="text-center text-xs text-muted">{!namesOk ? "Isi nama keempat pemain." : preset === null ? "Pilih buku aturan." : "Periksa skor awal dan batas faan."}</p>}
    </form>
  );
}

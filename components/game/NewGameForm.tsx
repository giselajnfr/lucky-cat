"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WIND_LABEL } from "@/components/calculator/HandCalculator";
import { HK18_RULES } from "@/lib/scoring";
import type { RosterPlayer } from "@/lib/game/types";

type Seat = { playerId: string | null; name: string };
const SEATS = ["E", "S", "W", "N"] as const;
const ROUNDS = ["east", "south", "west", "north"] as const;
const ROUND_LABEL = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" };
const pad = (n: number) => String(n).padStart(2, "0");
const localNow = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function NewGameForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [seats, setSeats] = useState<Seat[]>([0, 1, 2, 3].map(() => ({ playerId: null, name: "" })));
  const [name, setName] = useState("");
  const [when, setWhen] = useState(localNow());
  const [start, setStart] = useState(0);
  const [round, setRound] = useState<(typeof ROUNDS)[number]>("east");
  const [last, setLast] = useState<(typeof ROUNDS)[number]>(HK18_RULES.progression.lastRoundWind);
  const [minFan, setMinFan] = useState(HK18_RULES.minimumFan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(""); const [found, setFound] = useState<{ id: string; display_name: string }[]>([]);
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: me }, { data: list }] = await Promise.all([supabase.rpc("ensure_self_player"), supabase.from("players").select("id, name, user_id").order("name")]);
      setRoster((list ?? []) as RosterPlayer[]);
      if (me) setSeats((s) => (s[0].playerId || s[0].name ? s : [{ playerId: me as string, name: "" }, ...s.slice(1)]));
    })();
  }, [supabase]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => { const { data } = await supabase.rpc("search_profiles", { q }); setFound((data ?? []) as { id: string; display_name: string }[]); }, 250);
    return () => clearTimeout(t);
  }, [q, supabase]);

  const taken = new Set(seats.map((s) => s.playerId).filter(Boolean));
  const labelOf = (s: Seat) => (s.playerId ? roster.find((r) => r.id === s.playerId)?.name ?? "…" : s.name);
  const names = seats.map((s) => labelOf(s).trim().toLowerCase());
  const dupe = names.some((n, i) => n && names.indexOf(n) !== i);
  const ready = seats.every((s) => labelOf(s).trim()) && !dupe;
  const set = (i: number, s: Seat) => setSeats(seats.map((x, k) => (k === i ? s : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!ready) return; setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("create_game", {
      p_name: name, p_played_at: new Date(when).toISOString(), p_starting_points: start, p_round_wind: round, p_min_fan: minFan, p_last_round_wind: last,
      p_players: seats.map((s, seat) => (s.playerId ? { seat, player_id: s.playerId } : { seat, name: s.name.trim() })),
    });
    if (error) { setError(error.message); setBusy(false); return; }
    router.push(`/game/${data}`); router.refresh();
  }
  const chip = (on: boolean) => `min-h-[40px] rounded-xl border px-3 text-sm font-semibold ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <section className="card space-y-3">
        <label className="block text-xs font-semibold" htmlFor="gname">Nama game (opsional)</label>
        <input id="gname" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Malam Minggu" maxLength={60} />
        <label className="block text-xs font-semibold" htmlFor="gwhen">Tanggal & waktu</label>
        <input id="gwhen" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Pemain & kursi</h2>
        {seats.map((s, i) => (
          <div key={i} className="card space-y-2">
            <div className="flex items-center justify-between"><b>Kursi {WIND_LABEL[SEATS[i]]}</b>{i === 0 && <span className="text-xs text-muted">Dealer awal</span>}</div>
            {s.playerId || s.name ? (
              <div className="flex items-center justify-between rounded-xl border border-line bg-base/40 px-3 py-2"><span className="font-semibold">{labelOf(s)}</span>
                <button type="button" className="text-xs underline" onClick={() => set(i, { playerId: null, name: "" })}>Ganti</button></div>
            ) : target === i ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">{roster.filter((r) => !taken.has(r.id)).map((r) => <button type="button" key={r.id} className={chip(false)} onClick={() => { set(i, { playerId: r.id, name: "" }); setTarget(null); }}>{r.name}{r.user_id ? "" : " (tamu)"}</button>)}</div>
                <input className="input" placeholder="Nama tamu baru" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { set(i, { playerId: null, name: v }); setTarget(null); } } }} />
                <input className="input" placeholder="Cari pemain terdaftar…" value={q} onChange={(e) => setQ(e.target.value)} />
                {found.map((f) => <button type="button" key={f.id} className={chip(false) + " mr-2"} onClick={async () => {
                  const { data: ps } = await supabase.from("players").select("id").eq("user_id", f.id).maybeSingle();
                  if (ps) set(i, { playerId: ps.id, name: "" }); else { const { data: ins } = await supabase.from("players").insert({ name: f.display_name, user_id: f.id, owner_id: (await supabase.auth.getUser()).data.user!.id }).select("id, name, user_id").single(); if (ins) { setRoster((r) => [...r, ins as RosterPlayer]); set(i, { playerId: ins.id, name: "" }); } }
                  setTarget(null); setQ("");
                }}>{f.display_name}</button>)}
              </div>
            ) : <button type="button" className="btn-secondary !min-h-[44px]" onClick={() => setTarget(i)}>Pilih pemain atau tambah tamu</button>}
          </div>
        ))}
        {dupe && <p role="alert" className="text-sm text-red-300">Satu pemain tidak boleh duduk di dua kursi.</p>}
        <p className="text-xs text-muted">Pemain tamu tidak perlu akun. Tekan Enter setelah mengetik nama tamu.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-label">Aturan</h2>
        <div><p className="mb-1.5 text-xs font-semibold text-muted">Ronde awal</p><div className="grid grid-cols-4 gap-2">{ROUNDS.map((r) => <button type="button" key={r} className={chip(round === r)} onClick={() => setRound(r)}>{ROUND_LABEL[r]}</button>)}</div></div>
        <div><p className="mb-1.5 text-xs font-semibold text-muted">Game berakhir setelah ronde</p><div className="grid grid-cols-4 gap-2">{ROUNDS.map((r) => <button type="button" key={r} className={chip(last === r)} onClick={() => setLast(r)}>{ROUND_LABEL[r]}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-xs font-semibold" htmlFor="mf">Minimum faan</label><input id="mf" type="number" min={1} max={99} className="input" value={minFan} onChange={(e) => setMinFan(Math.max(1, Number(e.target.value) || 1))} /></div>
          <div><label className="mb-1.5 block text-xs font-semibold" htmlFor="sp">Skor awal</label><input id="sp" type="number" className="input" value={start} onChange={(e) => setStart(Number(e.target.value) || 0)} /></div>
        </div>
        <p className="text-xs text-muted">Aturan rumah: HK18 (minimum {HK18_RULES.minimumFan} faan, poin = faan).</p>
      </section>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button className="btn-primary" disabled={!ready || busy}>{busy ? "Membuat…" : "Mulai game"}</button>
    </form>
  );
}

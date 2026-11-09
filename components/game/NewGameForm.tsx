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

/** Admin only: opens a game for a cafe table. Players then join with the room code. */
export function NewGameForm({ tableId }: { tableId?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [seats, setSeats] = useState<Seat[]>([0, 1, 2, 3].map(() => ({ playerId: null, name: "" })));
  const [name, setName] = useState("");
  const [when, setWhen] = useState(localNow());
  const [start, setStart] = useState("0");
  const [round, setRound] = useState<(typeof ROUNDS)[number]>("east");
  const [last, setLast] = useState<(typeof ROUNDS)[number]>(HK18_RULES.progression.lastRoundWind);
  const [minFan, setMinFan] = useState(String(HK18_RULES.minimumFan));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ id: string; display_name: string }[]>([]);
  const [active, setActive] = useState<number | null>(null); // seat whose name field is being edited
  const labelOf = (s: Seat) => (s.playerId ? roster.find((r) => r.id === s.playerId)?.name ?? "…" : s.name);
  const typed = active !== null ? labelOf(seats[active]).trim() : "";

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: list } = await supabase.from("players").select("id, name, user_id").eq("owner_id", user!.id).order("name");
      setRoster((list ?? []) as RosterPlayer[]);
    })();
  }, [supabase]);
  useEffect(() => {
    if (typed.length < 2) { setFound([]); return; }
    const t = setTimeout(async () => { const { data } = await supabase.rpc("search_profiles", { q: typed }); setFound((data ?? []) as { id: string; display_name: string }[]); }, 250);
    return () => clearTimeout(t);
  }, [typed, supabase]);

  const taken = new Set(seats.map((s) => s.playerId).filter(Boolean));
  const names = seats.map((s) => labelOf(s).trim().toLowerCase());
  const dupe = names.some((n, i) => n && names.indexOf(n) !== i);
  const ready = seats.every((s) => labelOf(s).trim()) && !dupe;
  const set = (i: number, s: Seat) => setSeats(seats.map((x, k) => (k === i ? s : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!ready) return; setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("create_game", {
      p_name: name, p_played_at: new Date(when).toISOString(), p_starting_points: Number(start || "0"), p_round_wind: round, p_min_fan: Math.min(99, Math.max(1, Number(minFan) || 1)), p_last_round_wind: last,
      p_players: seats.map((s, seat) => (s.playerId ? { seat, player_id: s.playerId } : { seat, name: s.name.trim() })),
    });
    if (error) { setError(error.message); setBusy(false); return; }
    if (tableId) {   // seat the new game at its cafe table, then show the room code on the table card
      const { data: g } = await supabase.from("games").select("room_code").eq("id", data).single();
      const { error: e2 } = await supabase.rpc("admin_assign_game", { p_table: tableId, p_code: g?.room_code });
      if (e2) { setError(e2.message); setBusy(false); return; }
      router.push("/admin/tables"); router.refresh(); return;
    }
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
        {seats.map((s, i) => {
          const text = labelOf(s); const t = text.trim().toLowerCase();
          const sugg = active === i ? roster.filter((r) => (!taken.has(r.id) || r.id === s.playerId) && r.name.toLowerCase() !== t && r.name.toLowerCase().includes(t)).slice(0, 6) : [];
          const profiles = active === i ? found.filter((f) => !roster.some((r) => r.user_id === f.id)) : [];
          const pick = (playerId: string) => { set(i, { playerId, name: "" }); setActive(null); };
          return (
            <div key={i} className="card space-y-2">
              <div className="flex items-center justify-between"><label htmlFor={`p${i}`} className="font-bold">Kursi {WIND_LABEL[SEATS[i]]}</label>{i === 0 && <span className="text-xs text-muted">Dealer awal</span>}</div>
              <input id={`p${i}`} className="input" value={text} placeholder="Ketik nama pemain" maxLength={40} autoComplete="off" autoCapitalize="words" enterKeyHint="next"
                onFocus={() => setActive(i)} onChange={(e) => set(i, { playerId: null, name: e.target.value })} />
              {(sugg.length > 0 || profiles.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {sugg.map((r) => <button type="button" key={r.id} className={chip(false)} onClick={() => pick(r.id)}>{r.name}{r.user_id ? "" : " (tamu)"}</button>)}
                  {profiles.map((f) => <button type="button" key={f.id} className={chip(false)} onClick={async () => {
                    const { data: ps } = await supabase.from("players").select("id").eq("user_id", f.id).maybeSingle();
                    if (ps) { pick(ps.id); return; }
                    const { data: ins } = await supabase.from("players").insert({ name: f.display_name, user_id: f.id, owner_id: (await supabase.auth.getUser()).data.user!.id }).select("id, name, user_id").single();
                    if (ins) { setRoster((r) => [...r, ins as RosterPlayer]); pick(ins.id); }
                  }}>{f.display_name}</button>)}
                </div>)}
            </div>);
        })}
        {dupe && <p role="alert" className="text-sm text-red-300">Satu pemain tidak boleh duduk di dua kursi.</p>}
        <p className="text-xs text-muted">Ketik nama pemain di tiap kursi. Pilih dari saran jika sudah pernah main; pemain tamu tidak perlu akun.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-label">Aturan</h2>
        <div><p className="mb-1.5 text-xs font-semibold text-muted">Ronde awal</p><div className="grid grid-cols-4 gap-2">{ROUNDS.map((r) => <button type="button" key={r} className={chip(round === r)} onClick={() => setRound(r)}>{ROUND_LABEL[r]}</button>)}</div></div>
        <div><p className="mb-1.5 text-xs font-semibold text-muted">Game berakhir setelah ronde</p><div className="grid grid-cols-4 gap-2">{ROUNDS.map((r) => <button type="button" key={r} className={chip(last === r)} onClick={() => setLast(r)}>{ROUND_LABEL[r]}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-xs font-semibold" htmlFor="mf">Minimum faan</label><input id="mf" inputMode="numeric" pattern="[0-9]*" maxLength={2} className="input" value={minFan} onFocus={(e) => e.target.select()} onChange={(e) => setMinFan(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))} /></div>
          <div><label className="mb-1.5 block text-xs font-semibold" htmlFor="sp">Skor awal</label><input id="sp" inputMode="numeric" pattern="[0-9]*" placeholder="0" className="input" value={start} onFocus={(e) => e.target.select()} onChange={(e) => setStart(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))} /></div>
        </div>
        <p className="text-xs text-muted">Aturan rumah: HK18 (minimum {HK18_RULES.minimumFan} faan, poin = faan).</p>
      </section>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button className="btn-primary" disabled={!ready || busy}>{busy ? "Membuat…" : "Mulai game"}</button>
    </form>
  );
}

"use client";
import { useMemo, useState } from "react";
import { BarList, Columns, LineChart, Split } from "@/components/charts/Charts";
import { monthlyActivity, overall, patternCounts, playerDirectory, playerStats, winRateByPlayer, type SGame, type SHand, type SPlayer } from "@/lib/stats/aggregate";

const RANGES = [{ id: "all", label: "Semua" }, { id: "30", label: "30 hari" }, { id: "90", label: "90 hari" }, { id: "year", label: "Tahun ini" }] as const;
const stat = (label: string, v: string | number) => (<div className="card !p-3"><p className="text-[11px] text-muted">{label}</p><p className="text-xl font-extrabold">{v}</p></div>);

export function StatsView({ games, players, hands }: { games: SGame[]; players: SPlayer[]; hands: SHand[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("all");
  const [who, setWho] = useState<string>("");   // "" = everyone
  const filtered = useMemo(() => {
    const now = Date.now();
    return games.filter((g) => range === "all" || (range === "year" ? new Date(g.played_at).getFullYear() === new Date().getFullYear() : now - new Date(g.played_at).getTime() <= Number(range) * 864e5));
  }, [games, range]);
  const ids = new Set(filtered.map((g) => g.id));
  const dir = useMemo(() => playerDirectory(players.filter((p) => ids.has(p.game_id))), [players, filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const o = useMemo(() => overall(filtered, hands), [filtered, hands]);
  const ps = useMemo(() => (who ? playerStats(who, filtered, players, hands) : null), [who, filtered, players, hands]);
  const scopeHands = hands.filter((h) => ids.has(h.game_id));
  const chip = (on: boolean) => `shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold ${on ? "border-cream bg-cream text-base" : "border-line bg-card"}`;

  if (!games.length) return <p className="card mt-4 text-sm text-muted">Belum ada game selesai. Statistik muncul setelah kamu mengakhiri game pertama. Game yang masih berjalan tidak dihitung.</p>;
  return (
    <div className="mt-4 space-y-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Rentang tanggal">{RANGES.map((r) => <button key={r.id} className={chip(range === r.id)} onClick={() => setRange(r.id)}>{r.label}</button>)}</div>
      <div><label htmlFor="who" className="mb-1.5 block text-xs font-semibold text-muted">Pemain</label>
        <select id="who" className="input" value={who} onChange={(e) => setWho(e.target.value)}><option value="">Semua pemain</option>{dir.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></div>

      {ps ? (
        <>
          <section className="grid grid-cols-2 gap-3">{stat("Game dimainkan", ps.gamesPlayed)}{stat("Menang", ps.wins)}{stat("Persentase menang", `${ps.winPct}%`)}{stat("Rata-rata poin menang", ps.avgWinningPoints)}
            {stat("Tangan terbaik", ps.highestHand ? `${ps.highestHand.total_fan} faan` : "—")}{stat("Total poin menang", ps.totalWinPoints)}{stat("Skor bersih", ps.netScore)}{stat("Self Draw", `${ps.selfDrawPct}%`)}</section>
          <section className="card"><h2 className="section-label mb-3">Pola paling sering</h2><BarList data={ps.topPatterns.map((p) => ({ name: p.name, value: p.count }))} empty="Belum ada kemenangan." /></section>
          <section className="card"><h2 className="section-label mb-3">Performa dari waktu ke waktu (skor bersih kumulatif)</h2>
            <LineChart series={[{ name: ps.name, values: ps.performance.map((p) => p.cumulative) }]} xLabels={ps.performance.length ? [ps.performance[0].date.slice(0, 10), ps.performance[ps.performance.length - 1].date.slice(0, 10)] : undefined} /></section>
          <section><h2 className="section-label mb-2">Riwayat game</h2><ul className="space-y-2">{[...ps.history].reverse().map((h) => (<li key={h.gameId}><a className="card flex justify-between !p-3 text-sm" href={`/history/${h.gameId}`}><span>{new Date(h.date).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span><b>{h.score} poin{h.rank ? ` · #${h.rank}` : ""}</b></a></li>))}</ul></section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3">{stat("Game selesai", o.totalGames)}{stat("Tangan dimainkan", o.totalHands)}{stat("Total menang", o.totalWins)}{stat("Win rate", `${o.winRate}%`)}
            {stat("Total poin", o.totalPoints)}{stat("Rata-rata per menang", o.avgPointsPerWin)}{stat("Tangan tertinggi", o.highestHand ? `${o.highestHand.total_fan} faan` : "—")}{stat("Seri", o.draws)}</section>
          <section className="card"><h2 className="section-label mb-3">Self Draw vs dari buangan</h2><Split a={o.selfDrawWins} b={o.discardWins} aLabel="Self Draw" bLabel="Dari buangan" /></section>
          <section className="card"><h2 className="section-label mb-3">Win rate per pemain</h2><BarList unit="%" data={winRateByPlayer(filtered, players, hands).map((p) => ({ name: p.name, value: p.value, note: `${p.wins}/${p.hands}` }))} /></section>
          <section className="card"><h2 className="section-label mb-3">Distribusi pola menang</h2><BarList data={patternCounts(scopeHands).slice(0, 8).map((p) => ({ name: p.name, value: p.count }))} empty="Belum ada pola tercatat." /></section>
          <section className="card"><h2 className="section-label mb-3">Aktivitas bulanan</h2><Columns data={monthlyActivity(filtered).map((m) => ({ label: m.month.slice(2), value: m.count }))} /></section>
        </>
      )}
    </div>
  );
}

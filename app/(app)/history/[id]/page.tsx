import Link from "next/link";
import { notFound } from "next/navigation";
import { LineChart, BarList } from "@/components/charts/Charts";
import { HandView } from "@/components/mahjong/HandView";
import { gameSummary, scoreProgression, type SGame, type SHand, type SPlayer } from "@/lib/stats/aggregate";
import { createClient } from "@/lib/supabase/server";
import type { HandDetail } from "@/lib/game/types";

export const dynamic = "force-dynamic";
const METHOD = { self_draw: "Self Draw", discard: "Dari buangan", draw: "Seri" } as const;

export default async function Page({ params }: { params: { id: string } }) {
  const s = createClient();
  const [g, p, h, t] = await Promise.all([
    s.from("games").select("*").eq("id", params.id).maybeSingle(),
    s.from("game_players").select("*").eq("game_id", params.id).order("seat_position"),
    s.from("game_hands").select("*, hand_fan_details(fan_name, fan_value, fan_id, category)").eq("game_id", params.id).order("hand_number"),
    s.from("score_transactions").select("hand_id, player_id, points_change").eq("game_id", params.id),
  ]);
  if (!g.data) notFound();
  const game = g.data as SGame & { status: string; room_code: string };
  const players = (p.data ?? []) as SPlayer[];
  const rows = (h.data ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const hands: SHand[] = rows.map((x) => ({ ...x, fans: x.hand_fan_details ?? [] }));
  const sum = gameSummary(game, players, hands);
  const prog = scoreProgression(game, players, hands, t.data ?? []);
  const name = (id: string | null) => players.find((x) => x.id === id)?.player_name ?? "—";

  return (
    <main className="space-y-5">
      <div><Link href="/history" className="text-xs underline">← Riwayat</Link><h1 className="mt-1 text-[1.6rem]">{(game as { name?: string | null }).name || `Game ${game.room_code}`}</h1>
        <p className="text-xs text-muted">{new Date(game.played_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}{sum.durationMinutes != null ? ` · ${sum.durationMinutes} menit` : ""} · {sum.totalHands} tangan · {game.status === "finished" ? "Selesai" : "Belum selesai"}</p></div>
      <section className="card"><h2 className="section-label mb-3">Peringkat akhir</h2>
        <ol className="space-y-2">{sum.rankings.map((r) => (<li key={r.id} className="flex items-center justify-between rounded-xl bg-base/40 px-3 py-2.5"><span><b className="mr-2">{r.rank}</b>{r.player_name}<span className="ml-2 text-xs text-muted">{r.wins} menang</span></span><b>{r.current_score}</b></li>))}</ol></section>
      <section className="card"><h2 className="section-label mb-3">Perkembangan skor</h2><LineChart series={prog.series.map((x) => ({ name: x.name, values: x.values }))} /></section>
      <section className="card"><h2 className="section-label mb-3">Pola menang</h2><BarList data={sum.patterns.slice(0, 8).map((x) => ({ name: x.name, value: x.count }))} empty="Tidak ada kemenangan." />
        {sum.highestHand && <p className="mt-3 text-sm text-muted">Tangan tertinggi: <b className="text-cream">{sum.highestHand.total_fan} faan</b> oleh {name(sum.highestHand.winner_player_id)}</p>}</section>
      <section><h2 className="section-label mb-2">Semua tangan</h2>
        <ol className="space-y-3">{rows.map((x) => { const d = x.hand_detail as HandDetail | null; return (
          <li key={x.id} className="card space-y-2 text-sm">
            <div className="flex justify-between"><b>#{x.hand_number} · {x.winner_player_id ? name(x.winner_player_id) : "Seri"}</b><b>{x.winner_player_id ? `${x.total_fan} faan` : "—"}</b></div>
            <p className="text-xs text-muted">{METHOD[x.winning_method as keyof typeof METHOD]}{x.discard_player_id ? ` · dibuang ${name(x.discard_player_id)}` : ""}{d ? ` · kursi ${d.seatWind}` : ""}</p>
            {d && <HandView concealed={d.concealed} melds={d.melds as never} winningTile={d.winningTile} flowers={d.flowers} width={24} />}
            {x.hand_fan_details?.length > 0 && <ul className="divide-y divide-line/50">{x.hand_fan_details.map((f: { fan_name: string; fan_value: number }) => <li key={f.fan_name} className="flex justify-between py-1.5"><span>{f.fan_name}</span><b>+{f.fan_value}</b></li>)}</ul>}
          </li>); })}</ol></section>
    </main>
  );
}

import { errText } from "@/lib/i18n/errors";
import { appLocale } from "@/lib/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { DashboardLive } from "@/components/admin/DashboardLive";
import { ActivityFeed, AttentionPanel, HourlyChart, KpiStrip, SectionHead, TableBoard, TodayHighlights, type Kpi } from "@/components/admin/DashboardPanels";
import {
  TZ, attentionItems, avgGameMs, buildActivity, dayStartMs, distinctPlayers, fmtDur, fmtTime, handsPerHour, lastHandByGame, tableCounts,
  todaySummary, type AuditRow, type DashTable, type TodayHand, type WinEvent,
} from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";

const TABLE_SELECT = "id, table_number, status, games(id, room_code, status, current_round_wind, current_dealer_seat, setup_complete, starting_points, session_minutes, session_started_at, game_players(player_name, seat_position, current_score), game_hands(count))";
const HAND_SELECT = "id, game_id, winning_method, total_fan, final_points, created_at, winner:game_players!winner_player_id(player_name), games(room_code), hand_fan_details(fan_name, category)";
const dateLong = { format: (d: Date | number) => new Intl.DateTimeFormat(appLocale(), { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d) };

export default async function AdminDashboard() {
  const s = createClient();
  const now = Date.now();
  const start = new Date(dayStartMs(now)).toISOString();
  const yesterday = new Date(dayStartMs(now) - 864e5).toISOString();

  const auditP = (async () => {
    const { data } = await s.from("admin_audit_log").select("id, admin_id, action, table_number, details, created_at").order("created_at", { ascending: false }).limit(10);
    const rows = (data ?? []) as AuditRow[];
    const ids = [...new Set(rows.map((r) => r.admin_id))];
    const names: Record<string, string> = {};
    if (ids.length) { const { data: ps } = await s.from("profiles").select("id, display_name").in("id", ids); for (const p of ps ?? []) names[p.id] = p.display_name ?? ""; }
    return { rows, names };
  })();

  const [tablesR, openR, handsR, yestR, gamesR, winsR, audit] = await Promise.all([
    s.from("cafe_tables").select(TABLE_SELECT).order("table_number"),
    s.from("games").select("id").neq("status", "finished").limit(500),                                           // every unfinished game, seated or not
    s.from("game_hands").select(HAND_SELECT).gte("created_at", start).order("created_at", { ascending: false }).limit(1000),
    s.from("game_hands").select("id", { count: "exact", head: true }).gte("created_at", yesterday).lt("created_at", start),
    s.from("games").select("id, status, session_started_at, finished_at, game_players(player_name)").or(`session_started_at.gte.${start},finished_at.gte.${start}`).limit(500),
    s.from("game_events").select("id, created_at, payload").eq("event_type", "WINNING_HAND").order("created_at", { ascending: false }).limit(10),
    auditP,
  ]);

  const tables = (tablesR.data ?? []) as unknown as DashTable[];
  const hands = (handsR.data ?? []) as unknown as TodayHand[];
  const todays = (gamesR.data ?? []) as unknown as { id: string; status: string; session_started_at: string; finished_at: string | null; game_players: { player_name: string }[] }[];

  const seated = new Set(tables.flatMap((t) => (t.games ? [t.games.id] : [])));
  const stray = (openR.data ?? []).filter((g: { id: string }) => !seated.has(g.id)).length;
  const tableByGame: Record<string, number> = {};
  for (const t of tables) if (t.games) tableByGame[t.games.id] = t.table_number;

  const c = tableCounts(tables);
  const sum = todaySummary(hands);
  const finishedToday = todays.filter((g) => g.status === "finished" && g.finished_at && g.finished_at >= start);
  const avg = avgGameMs(finishedToday);
  const attention = attentionItems(tables, stray, lastHandByGame(hands), now);
  const activity = buildActivity(audit.rows, (winsR.data ?? []) as unknown as WinEvent[], audit.names, 10);

  const tableParts = [c.playing && `${c.playing} berjalan`, c.setup && `${c.setup} menunggu pemain`, c.paused && `${c.paused} dijeda`, c.finished && `${c.finished} selesai`].filter(Boolean);
  const kpis: Kpi[] = [
    { label: "Meja terisi", value: `${c.occupied} dari ${c.total}`, bar: c.total ? c.occupied / c.total : 0, sub: tableParts.length ? tableParts.join(" · ") : "Semua meja kosong" },
    { label: "Pemain hari ini", value: String(distinctPlayers(todays)), sub: `${c.players} sedang di meja` },
    { label: "Tangan hari ini", value: String(sum.total), sub: `${sum.wins} menang · ${sum.draws} seri · kemarin ${yestR.count ?? 0}` },
    { label: "Game selesai hari ini", value: String(finishedToday.length), sub: avg ? `Rata-rata ${fmtDur(avg)}` : "Belum ada yang selesai" },
  ];

  const loadError = (tablesR.error?.message ?? handsR.error?.message ?? gamesR.error?.message);

  return (
    <main className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h1 className="text-3xl font-extrabold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">{dateLong.format(now)}</p>
        </div>
        <DashboardLive updatedAt={fmtTime(now)} />
      </header>

      {loadError && <p className="card text-sm text-neg" role="alert">Sebagian data gagal dimuat: {errText(loadError)}</p>}

      <AttentionPanel items={attention} hasTables={tables.length > 0} />
      <KpiStrip items={kpis} />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section>
            <SectionHead title="Meja sekarang" href="/admin/tables" link="Kelola semua meja" />
            <TableBoard tables={tables} />
          </section>
          <section>
            <SectionHead title="Tangan per jam" href="/admin/statistics" link="Statistik lengkap" />
            <HourlyChart data={handsPerHour(hands.map((h) => h.created_at), now)} />
          </section>
        </div>
        <div className="space-y-5">
          <section>
            <SectionHead title="Sorotan hari ini" />
            <TodayHighlights s={sum} tableByGame={tableByGame} />
          </section>
          <section>
            <SectionHead title="Aktivitas terbaru" />
            <ActivityFeed items={activity} now={now} />
          </section>
        </div>
      </div>
    </main>
  );
}

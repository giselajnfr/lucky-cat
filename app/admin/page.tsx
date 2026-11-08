import { createClient } from "@/lib/supabase/server";

const stat = (icon: string, n: number | null, label: string) => (
  <div key={label} className="card"><p className="text-3xl font-extrabold">{icon} {n ?? 0}</p><p className="text-sm text-muted">{label}</p></div>
);

export default async function AdminDashboard() {
  const s = createClient();
  // Start of "today" in Asia/Jakarta (UTC+7), expressed in UTC.
  const start = new Date(Math.floor((Date.now() + 7 * 36e5) / 864e5) * 864e5 - 7 * 36e5).toISOString();
  const [tables, players, hands, finished, audit] = await Promise.all([
    s.from("cafe_tables").select("id", { count: "exact", head: true }).eq("status", "PLAYING"),
    s.from("game_players").select("id, games!inner(status)", { count: "exact", head: true }).eq("games.status", "in_progress"),
    s.from("game_hands").select("id", { count: "exact", head: true }).gte("created_at", start).not("winner_player_id", "is", null),
    s.from("games").select("id", { count: "exact", head: true }).eq("status", "finished").gte("finished_at", start),
    s.from("admin_audit_log").select("id, action, table_number, details, created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("🀄", tables.count, "Tables playing")}{stat("👥", players.count, "Active players")}
        {stat("🏆", hands.count, "Winning hands today")}{stat("🎮", finished.count, "Games finished today")}
      </div>
      <section><h2 className="mb-2 text-lg font-bold">Recent admin activity</h2>
        {audit.data?.length ? <ul className="space-y-2">{audit.data.map((a) => (
          <li key={a.id} className="card text-sm"><b>{a.action.replace("ADMIN_", "").replaceAll("_", " ").toLowerCase()}</b>
            {a.table_number ? ` · Table ${a.table_number}` : ""} <span className="text-muted">{a.details ? JSON.stringify(a.details) : ""} · {new Date(a.created_at).toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta" })}</span></li>))}</ul>
          : <p className="card text-sm text-muted">No admin actions yet.</p>}
      </section>
    </main>
  );
}

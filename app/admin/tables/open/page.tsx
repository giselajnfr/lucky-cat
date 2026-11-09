import { notFound } from "next/navigation";
import { OpenRoomForm } from "@/components/game/OpenRoomForm";
import { BackLink } from "@/components/layout/BackLink";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Admin layout already blocks non-admins; the database also refuses create_game for them.
export default async function Page({ searchParams }: { searchParams: { table?: string } }) {
  const s = createClient();
  const { data: table } = searchParams.table ? await s.from("cafe_tables").select("id, table_number, current_game_id").eq("id", searchParams.table).maybeSingle() : { data: null };
  if (!table) notFound();
  return (
    <main className="max-w-xl">
      <BackLink href="/admin/tables" label="Live Tables" />
      <h1 className="text-[1.75rem]">Buka ruang meja {String(table.table_number).padStart(2, "0")}</h1>
      <p className="mt-1 text-sm text-muted">Atur lama bermain, lalu berikan <b className="text-cream">kode ruang</b> ke pemain. Mereka sendiri yang mengisi nama, memilih aturan, dan memulai sesi.</p>
      {table.current_game_id ? <p className="card mt-4 text-sm text-warn">Meja ini masih punya game. Lepas dulu di Live Tables sebelum membuka ruang baru.</p> : <OpenRoomForm tableId={table.id} />}
    </main>
  );
}

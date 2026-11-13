import { CalcCodesAdmin } from "@/components/admin/CalcCodesAdmin";
import type { CalcCodeRow } from "@/lib/calc/codes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createClient();
  const { data } = await supabase.from("calc_codes").select("id, code, label, created_at, expires_at, max_uses, uses, revoked_at").order("created_at", { ascending: false }).limit(100);
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Kode kalkulator</h1>
      <p className="mb-4 mt-1 max-w-xl text-sm text-muted">Pemain memasukkan kode ini untuk membuka <b className="text-cream">Hitung skor cepat</b>. Admin tidak perlu kode.</p>
      <CalcCodesAdmin codes={(data ?? []) as CalcCodeRow[]} />
    </main>
  );
}

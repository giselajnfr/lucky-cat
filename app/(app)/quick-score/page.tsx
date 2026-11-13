import Link from "next/link";
import { QuickScore } from "@/components/calculator/QuickScore";
import { CalcCodeForm } from "@/components/calculator/CalcCodeForm";
import { BackLink } from "@/components/layout/BackLink";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The calculator needs a code that an admin generated (admins themselves never need one). */
export default async function Page() {
  const supabase = createClient();
  const { data: allowed } = await supabase.rpc("has_calc_access");
  const { data: until } = allowed ? await supabase.rpc("calc_access_until") : { data: null };

  return (
    <main>
      <BackLink href="/home" label="Beranda" />
      <h1 className="text-[1.75rem]">Hitung skor cepat</h1>
      {allowed ? (
        <>
          <p className="mt-1 text-sm text-muted">Aturan HK18, minimum 3 faan. <Link href="/guidebook" className="underline">Lihat aturan rumah</Link></p>
          {until && <p className="mt-1 text-xs text-muted">Akses sampai {new Date(until as string).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>}
          <QuickScore />
        </>
      ) : <CalcCodeForm />}
    </main>
  );
}

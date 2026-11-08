import Link from "next/link";
import { QuickScore } from "@/components/calculator/QuickScore";

export default function Page() {
  return (
    <main>
      <h1 className="text-[1.75rem]">Hitung skor cepat</h1>
      <p className="mt-1 text-sm text-muted">Aturan HK18, minimum 3 faan. <Link href="/guidebook" className="underline">Lihat aturan rumah</Link></p>
      <QuickScore />
    </main>
  );
}

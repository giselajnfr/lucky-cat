import { BackLink } from "@/components/layout/BackLink";
import { JoinGameForm } from "@/components/game/JoinGameForm";

export default function Page({ searchParams }: { searchParams: { code?: string } }) {
  return (
    <main>
      <BackLink href="/game" label="Game" />
      <h1 className="text-[1.75rem]">Gabung game</h1>
      <p className="mt-1 text-sm text-muted">Masukkan kode ruang dari staf untuk meja kamu.</p>
      <JoinGameForm initialCode={searchParams.code ?? ""} />
    </main>
  );
}

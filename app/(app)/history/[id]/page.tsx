import { GameHistoryView } from "@/components/game/GameHistoryView";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { id: string } }) {
  return <GameHistoryView id={params.id} backHref="/game?tab=selesai" backLabel="Game selesai" gameHref={`/game/${params.id}`} />;
}

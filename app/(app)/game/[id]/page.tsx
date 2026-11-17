import { GamePageView } from "@/components/game/GamePageView";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { id: string } }) {
  return <GamePageView id={params.id} backHref="/game" backLabel="Game" />;
}

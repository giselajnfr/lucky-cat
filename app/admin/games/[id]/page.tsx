import { GamePageView } from "@/components/game/GamePageView";

export const dynamic = "force-dynamic";

/** Admin mode stays in admin mode: same game screen as /game/[id], but "back" returns to the admin game list. */
export default function Page({ params }: { params: { id: string } }) {
  return <GamePageView id={params.id} backHref="/admin/games" backLabel="Games" />;
}

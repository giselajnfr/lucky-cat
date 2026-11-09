import { NewGameForm } from "@/components/game/NewGameForm";
import { BackLink } from "@/components/layout/BackLink";

export default function Page() {
  return (<><BackLink href="/game" label="Game" /><NewGameForm /></>);
}

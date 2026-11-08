import { NewGameForm } from "@/components/game/NewGameForm";
export default function Page() {
  return (<main><h1 className="text-[1.75rem]">Game baru</h1><p className="mt-1 text-sm text-muted">Empat pemain, empat kursi.</p><NewGameForm /></main>);
}

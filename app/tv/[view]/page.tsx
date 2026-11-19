import { notFound } from "next/navigation";
import { TvDisplay } from "@/components/tv/TvDisplay";

export const metadata = { title: "Lucky Cat Mahjong — Live" };
const VIEWS = ["main", "tables", "live", "spotlight", "leaderboard", "rotate"];

/** /tv/main, /tv/tables, /tv/rotate ...: same as /tv?view=..., but a plain path that no redirect or proxy can strip. */
export default function Page({ params }: { params: { view: string } }) {
  if (!VIEWS.includes(params.view)) notFound();
  return <TvDisplay view={params.view} />;
}

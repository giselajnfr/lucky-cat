import { redirect } from "next/navigation";

// History now lives inside the Game tab ("Selesai"). Old links keep working.
export default function Page() { redirect("/game?tab=selesai"); }

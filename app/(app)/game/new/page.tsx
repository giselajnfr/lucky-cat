import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Players do not create rooms: an admin opens the table and gives them the room code.
export default async function Page() {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: prof } = user ? await s.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  redirect(prof?.role === "ADMIN" ? "/admin/tables" : "/game/join");
}

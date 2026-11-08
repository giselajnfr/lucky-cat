import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** UI gate only. The real protection is RLS + admin-checked database functions. */
export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, display_name").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") redirect("/home");
  return { user, profile };
}

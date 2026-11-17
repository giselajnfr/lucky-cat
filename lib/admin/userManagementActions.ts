"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function promoteUserToAdmin(userId: string) {
  const { user } = await requireAdmin();
  if (!UUID_RE.test(userId)) return { ok: false, error: "User tidak valid." };

  const supabase = createAdminClient();
  const { data: target, error: findError } = await supabase
    .from("profiles").select("id, role").eq("id", userId).maybeSingle();
  if (findError || !target) return { ok: false, error: "User tidak ditemukan." };
  if (target.role === "ADMIN") return { ok: false, error: "User tersebut sudah menjadi admin." };

  const { error } = await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("admin_audit_log").insert({
    admin_id: user.id, action: "ADMIN_PROMOTED", details: { target_user_id: userId },
  });
  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function demoteAdmin(userId: string) {
  const { user } = await requireAdmin();
  if (!UUID_RE.test(userId)) return { ok: false, error: "User tidak valid." };
  if (userId === user.id) return { ok: false, error: "Kamu tidak bisa menghapus akses admin sendiri." };

  const supabase = createAdminClient();
  const { data: target, error: findError } = await supabase
    .from("profiles").select("id, role").eq("id", userId).maybeSingle();
  if (findError || !target || target.role !== "ADMIN") {
    return { ok: false, error: "Admin tidak ditemukan atau sudah bukan admin." };
  }

  const { count, error: countError } = await supabase
    .from("profiles").select("id", { count: "exact", head: true }).eq("role", "ADMIN");
  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) <= 1) return { ok: false, error: "Minimal harus ada satu admin." };

  const { error } = await supabase.from("profiles").update({ role: "USER" }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("admin_audit_log").insert({
    admin_id: user.id, action: "ADMIN_DEMOTED", details: { target_user_id: userId },
  });
  revalidatePath("/admin/admins");
  return { ok: true };
}

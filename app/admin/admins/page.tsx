import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminManagement } from "@/components/admin/AdminManagement";

export default async function AdminsPage() {
  const { user } = await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <main><h1 className="text-3xl font-extrabold">Admin Management</h1><p className="card mt-4 text-sm text-neg">Gagal memuat daftar user: {error.message}</p></main>;
  }

  return <main className="space-y-5">
    <div><p className="section-label">ACCESS CONTROL</p><h1 className="text-3xl font-extrabold">Admin Management</h1><p className="mt-1 text-sm text-muted">Kelola siapa saja yang memiliki akses admin Lucky Cat Mahjong.</p></div>
    <AdminManagement users={data ?? []} currentUserId={user.id} />
  </main>;
}

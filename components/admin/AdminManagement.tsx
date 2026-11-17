"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { demoteAdmin, promoteUserToAdmin } from "@/lib/admin/userManagementActions";

type ManagedUser = { id: string; email: string | null; display_name: string | null; role: "ADMIN" | "USER"; created_at: string };

export function AdminManagement({ users, currentUserId }: { users: ManagedUser[]; currentUserId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const admins = useMemo(() => users.filter((u) => u.role === "ADMIN"), [users]);
  const regularUsers = useMemo(() => users.filter((u) => u.role === "USER"), [users]);

  function addAdmin() {
    if (!selectedId) return;
    setMessage("");
    startTransition(async () => {
      const result = await promoteUserToAdmin(selectedId);
      setMessage(result.ok ? "User berhasil dijadikan admin." : result.error ?? "Gagal menambahkan admin.");
      if (result.ok) setSelectedId("");
      router.refresh();
    });
  }

  function removeAdmin(target: ManagedUser) {
    if (!window.confirm(`Hapus akses admin untuk ${target.display_name || target.email || "user ini"}? Akunnya tidak akan dihapus.`)) return;
    setMessage("");
    startTransition(async () => {
      const result = await demoteAdmin(target.id);
      setMessage(result.ok ? "Akses admin berhasil dihapus. Akun tetap menjadi user biasa." : result.error ?? "Gagal menghapus admin.");
      router.refresh();
    });
  }

  return <div className="space-y-5">
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Tambah admin</h2><span className="rounded-full bg-cream px-3 py-1 text-xs font-extrabold text-base">{regularUsers.length} users</span></div>
      <p className="text-sm text-muted">Pilih akun yang sudah terdaftar untuk memberikan akses admin.</p>
      {regularUsers.length ? <div className="flex flex-col gap-2 sm:flex-row">
        <select className="input min-w-0 flex-1" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} aria-label="Pilih user untuk dijadikan admin">
          <option value="">Pilih user…</option>
          {regularUsers.map((u) => <option key={u.id} value={u.id}>{u.display_name || "Tanpa nama"} — {u.email || u.id}</option>)}
        </select>
        <button type="button" className="btn-primary" disabled={!selectedId || isPending} onClick={addAdmin}>{isPending ? "Memproses…" : "Jadikan admin"}</button>
      </div> : <p className="rounded-xl bg-base/50 p-3 text-sm text-muted">Belum ada user biasa yang bisa ditambahkan.</p>}
    </section>

    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="section-label">Admin aktif</h2><span className="text-xs font-bold text-muted">{admins.length} admin</span></div>
      {admins.length ? <ul className="grid gap-3 md:grid-cols-2">{admins.map((u) => {
        const isSelf = u.id === currentUserId;
        return <li key={u.id} className="card flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0"><p className="truncate font-bold">{u.display_name || "Tanpa nama"}{isSelf ? <span className="ml-2 text-xs font-semibold text-pos">(Kamu)</span> : null}</p><p className="truncate text-sm text-muted">{u.email || "Email tidak tersedia"}</p><p className="mt-1 text-[11px] font-extrabold tracking-wide text-pos">ADMIN</p></div>
          {isSelf ? <span className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted">Akun kamu</span> : <button type="button" className="btn-secondary btn-sm shrink-0 !border-neg/50 !text-neg" disabled={isPending || admins.length <= 1} onClick={() => removeAdmin(u)}>Remove</button>}
        </li>;
      })}</ul> : <p className="card text-sm text-muted">Belum ada admin.</p>}
    </section>

    {message ? <p role="status" className="rounded-xl border border-line bg-card p-3 text-sm font-semibold">{message}</p> : null}
    <p className="text-xs leading-relaxed text-muted">Menghapus akses admin tidak menghapus akun pengguna. User tersebut tetap dapat login dan menggunakan fitur user biasa.</p>
  </div>;
}

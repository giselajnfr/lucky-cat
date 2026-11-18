"use client";
import { errText } from "@/lib/i18n/errors";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { demoteAdmin, promoteUserToAdmin } from "@/lib/admin/userManagementActions";

type ManagedUser = { id: string; email: string | null; display_name: string | null; role: "ADMIN" | "USER"; created_at: string };

export function AdminManagement({ users, currentUserId }: { users: ManagedUser[]; currentUserId: string }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const admins = useMemo(() => users.filter((u) => u.role === "ADMIN"), [users]);
  const regularUsers = useMemo(() => users.filter((u) => u.role === "USER"), [users]);
  const matchingUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return [];
    return regularUsers.filter((u) =>
      [u.display_name, u.email].some((value) => value?.toLocaleLowerCase().includes(query))
    );
  }, [regularUsers, search]);

  const selectedUser = regularUsers.find((u) => u.id === selectedId) ??
    (matchingUsers.length === 1 ? matchingUsers[0] : undefined);

  function chooseUser(user: ManagedUser) {
    setSelectedId(user.id);
    setSearch(user.display_name || user.email || "");
  }

  function addAdmin() {
    if (!selectedUser) return;
    setMessage("");
    startTransition(async () => {
      const result = await promoteUserToAdmin(selectedUser.id);
      setMessage(result.ok ? "User berhasil dijadikan admin." : (result.error ? errText(result.error) : "Gagal menambahkan admin."));
      if (result.ok) {
        setSelectedId("");
        setSearch("");
      }
      router.refresh();
    });
  }

  function removeAdmin(target: ManagedUser) {
    if (!window.confirm(`Hapus akses admin untuk ${target.display_name || target.email || "user ini"}? Akunnya tidak akan dihapus.`)) return;
    setMessage("");
    startTransition(async () => {
      const result = await demoteAdmin(target.id);
      setMessage(result.ok ? "Akses admin berhasil dihapus. Akun tetap menjadi user biasa." : (result.error ? errText(result.error) : "Gagal menghapus admin."));
      router.refresh();
    });
  }

  return <div className="space-y-5">
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Tambah admin</h2>
        <span className="rounded-full bg-cream px-3 py-1 text-xs font-extrabold text-base">{regularUsers.length} users</span>
      </div>
      <p className="text-sm text-muted">Cari akun yang sudah terdaftar untuk memberikan akses admin.</p>

      {regularUsers.length ? <div className="space-y-2">
        <div className="flex w-full items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">⌕</span>
            <input
              type="search"
              className="input w-full min-w-0 pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedId("");
              }}
              placeholder="Cari nama atau email user…"
              aria-label="Cari user berdasarkan nama atau email"
            />
          </div>
          <button
            type="button"
            className="btn-primary btn-sm shrink-0 whitespace-nowrap"
            disabled={!selectedUser || isPending}
            onClick={addAdmin}
          >
            {isPending ? "Memproses…" : "Jadikan admin"}
          </button>
        </div>

        {search.trim() && !selectedId && matchingUsers.length > 1 ? (
          <div className="max-h-52 overflow-y-auto rounded-xl border border-line bg-card p-1">
            {matchingUsers.slice(0, 8).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => chooseUser(u)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-base/60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{u.display_name || "Tanpa nama"}</span>
                  <span className="block truncate text-xs text-muted">{u.email || "Email tidak tersedia"}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-muted">Pilih</span>
              </button>
            ))}
          </div>
        ) : null}

        {search.trim() && !selectedId && matchingUsers.length === 0 ? (
          <p className="px-1 text-xs text-muted">User tidak ditemukan.</p>
        ) : null}

        {selectedUser ? (
          <p className="px-1 text-xs text-muted">
            Dipilih: <span className="font-semibold text-base">{selectedUser.display_name || selectedUser.email || "User"}</span>
          </p>
        ) : null}
        {search.trim() && matchingUsers.length > 8 && !selectedId ? (
          <p className="px-1 text-xs text-muted">Menampilkan 8 hasil pertama. Perjelas pencarian untuk hasil lainnya.</p>
        ) : null}
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

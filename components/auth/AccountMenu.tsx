import { LogoutButton } from "./LogoutButton";

/** Avatar in the page header. Tapping it opens a small panel with the account and the logout button (no JavaScript needed to open it). */
export function AccountMenu({ name, email }: { name: string; email?: string | null }) {
  return (
    <details className="group relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-card font-bold [&::-webkit-details-marker]:hidden" aria-label={`Akun ${name}`}>
        {name[0]?.toUpperCase()}
      </summary>
      <div className="absolute right-0 top-12 z-30 w-60 rounded-2xl border border-line bg-card p-4 shadow-xl">
        <p className="truncate font-bold">{name}</p>
        {email && <p className="truncate text-xs text-muted">{email}</p>}
        <div className="mt-3"><LogoutButton className="btn-secondary !border-neg !text-neg" label="Keluar dari akun" /></div>
      </div>
    </details>
  );
}

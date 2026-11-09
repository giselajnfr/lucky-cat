import Link from "next/link";

/** Consistent "back" on every sub-page, so nobody gets lost. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-1 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-muted hover:text-cream">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>{label}
    </Link>
  );
}

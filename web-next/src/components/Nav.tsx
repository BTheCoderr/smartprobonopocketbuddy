import Link from "next/link";

export function Nav() {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-4 px-4 sm:px-6 text-sm">
      <Link
        href="/"
        className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-medium"
      >
        Home
      </Link>
      <Link
        href="/support"
        className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-medium"
      >
        Support
      </Link>
      <Link
        href="/marketing"
        className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-medium"
      >
        Marketing
      </Link>
      <Link
        href="/privacy"
        className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-medium"
      >
        Privacy
      </Link>
    </nav>
  );
}

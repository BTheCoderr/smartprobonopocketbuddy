import Link from "next/link";

export function Nav() {
  return (
    <nav className="flex items-center justify-center gap-6 py-4 text-sm">
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
    </nav>
  );
}

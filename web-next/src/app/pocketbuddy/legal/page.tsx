import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal & disclaimers — PocketBuddy | SmartProBono",
  description:
    "Legal notices and disclaimers for PocketBuddy: not legal advice, not emergency services, recording responsibility.",
};

export default function PocketBuddyLegalPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 sm:px-10 py-8 sm:py-10 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Legal & disclaimers</h1>
        <p className="mt-2 text-sm opacity-90">PocketBuddy by SmartProBono</p>
      </header>

      <main className="mt-6 space-y-6">
        <Link
          href="/pocketbuddy"
          className="inline-block text-[var(--accent)] font-medium hover:underline mb-2"
        >
          ← PocketBuddy home
        </Link>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Not legal advice</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            PocketBuddy by SmartProBono is informational only and is not a law
            firm. Content in the app and on this site is not legal advice. For
            legal questions, consult a licensed attorney in your jurisdiction.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Emergency services</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            PocketBuddy is not a replacement for emergency services. If you are
            in immediate danger, call 911 or your local emergency number.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Recording laws</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Recording laws vary by state and locality. You are responsible for
            complying with applicable laws when using recording features.
          </p>
          <p>
            <a
              href="https://www.aclu.org/know-your-rights/recording-police"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] font-medium hover:underline"
            >
              ACLU — Know Your Rights (recording police)
            </a>
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">
            Messages and incident packets
          </h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            PocketBuddy does not guarantee that SMS or other messages were
            delivered or read. Exported incident packets are informational;
            SmartProBono does not warrant that they will be accepted as evidence
            in any proceeding.
          </p>
        </section>

        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Calm guidance shown in the app is informational only — not legal
          advice. For full privacy and contractual terms, see the linked
          policies below.
        </p>
      </main>

      <footer className="mt-12 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
        <Link href="/pocketbuddy/privacy" className="hover:text-[var(--accent)]">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/pocketbuddy/terms" className="hover:text-[var(--accent)]">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import {
  APP_STORE_URL,
  POCKETBUDDY_SUPPORT_EMAIL,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "PocketBuddy — SmartProBono",
  description:
    "PocketBuddy is a personal safety documentation companion by SmartProBono. Trusted contacts, optional recording metadata, and calm guidance — local-first.",
};

export default function PocketBuddyHomePage() {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 sm:px-10 py-10 sm:py-12 text-center">
        <p className="text-sm font-medium uppercase tracking-wide opacity-90 mb-2">
          SmartProBono
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">PocketBuddy</h1>
        <p className="opacity-90">
          Safety documentation and trusted contacts — informational only
        </p>
      </header>

      <section className="mt-8 space-y-4 text-[var(--text-muted)] leading-relaxed">
        <p>
          PocketBuddy helps you stay connected with trusted contacts, document
          important moments on your device, and export structured summaries when
          you need them. It is{" "}
          <strong className="text-[var(--primary)]">not</strong> emergency
          services and <strong className="text-[var(--primary)]">not</strong>{" "}
          legal advice.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--primary)] mb-4">
          Highlights
        </h2>
        <ul className="space-y-3">
          {[
            "One-tap Safety, Travel, and Kid Track–style session flows",
            "Share location context with trusted contacts when you choose",
            "Calm, on-screen guidance — informational only",
            "Optional recording with local storage on your phone",
            "Incident packet export (JSON) you control",
            "Hosted Privacy Policy, Terms, and Legal & disclaimers",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="text-[var(--accent)] font-bold">✓</span>
              <span className="text-[var(--text-muted)]">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex justify-center items-center px-6 py-4 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-end)] text-white font-semibold rounded-xl hover:scale-[1.02] transition-transform"
        >
          Open on the App Store →
        </a>
        <a
          href={`mailto:${POCKETBUDDY_SUPPORT_EMAIL}`}
          className="inline-flex justify-center items-center px-6 py-4 border-2 border-[var(--accent)] text-[var(--accent)] font-semibold rounded-xl hover:bg-[var(--accent)]/10 transition-colors"
        >
          Email support
        </a>
      </div>

      <nav className="mt-10 pt-8 border-t border-[var(--primary)]/15 space-y-2 text-sm">
        <p className="font-semibold text-[var(--primary)] mb-2">Legal & policies</p>
        <ul className="space-y-2 text-[var(--accent)]">
          <li>
            <Link href="/pocketbuddy/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/pocketbuddy/terms" className="hover:underline">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="/pocketbuddy/legal" className="hover:underline">
              Legal & disclaimers
            </Link>
          </li>
        </ul>
        <Link
          href="/"
          className="inline-block mt-6 text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          ← SmartProBono PocketBuddy marketing home
        </Link>
      </nav>
    </div>
  );
}

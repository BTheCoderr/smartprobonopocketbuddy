import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — PocketBuddy | SmartProBono",
  description:
    "Terms of Service summary for PocketBuddy by SmartProBono. Informational tool provided as-is.",
};

export default function PocketBuddyTermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 sm:px-10 py-8 sm:py-10 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm opacity-90">PocketBuddy by SmartProBono</p>
      </header>

      <main className="mt-6 space-y-6">
        <Link
          href="/pocketbuddy"
          className="inline-block text-[var(--accent)] font-medium hover:underline mb-2"
        >
          ← PocketBuddy home
        </Link>

        <p className="text-[var(--text-muted)] leading-relaxed">
          These terms summarize how PocketBuddy is offered. For complete detail,
          retain screenshots or PDF exports of this page as needed for your
          records. Hosted Legal & disclaimers are linked from{" "}
          <Link href="/pocketbuddy/legal" className="text-[var(--accent)] hover:underline">
            Legal & disclaimers
          </Link>
          .
        </p>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Use at your own risk</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            You use PocketBuddy at your own risk. It is provided &quot;as
            is&quot; without warranties of any kind. PocketBuddy by SmartProBono
            is not responsible for outcomes related to alerts, recordings,
            location sharing, or messages you send. Nothing here guarantees SMS or
            message delivery, read receipts, or emergency response.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Not legal advice</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            PocketBuddy is informational only and is not a law firm. For legal
            questions, consult a licensed attorney in your jurisdiction.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Changes</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            SmartProBono may update these terms and related policies. Continued
            use after updates constitutes acceptance of the revised terms where
            permitted by law.
          </p>
        </section>
      </main>

      <footer className="mt-12 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
        <Link href="/pocketbuddy/privacy" className="hover:text-[var(--accent)]">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/pocketbuddy/legal" className="hover:text-[var(--accent)]">
          Legal & disclaimers
        </Link>
      </footer>
    </div>
  );
}

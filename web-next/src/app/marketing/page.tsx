import Link from "next/link";
import { APP_STORE_URL } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing — SmartPocketBuddy",
  description:
    "SmartPocketBuddy: One-tap Safety Mode. AAA for legal situations.",
};

export default function MarketingPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 py-10 text-center">
        <h1 className="text-2xl font-bold mb-2">SmartPocketBuddy</h1>
        <p className="opacity-90 text-lg">
          Your pocket-sized safety companion during legal interactions
        </p>
      </header>

      <section className="mt-8 space-y-6 text-[var(--text-muted)] leading-relaxed">
        <p className="text-lg">
          When you&apos;re pulled over, questioned, or in a stressful legal
          moment, you need calm—not chaos. SmartPocketBuddy is like AAA for
          legal situations.
        </p>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--primary)]">
            Why SmartPocketBuddy?
          </h2>
          <ul className="space-y-2">
            {[
              "One-tap Safety Mode — no fumbling when you're nervous",
              "Instantly share your location with a trusted contact",
              "Step-by-step on-screen guidance to stay calm",
              "Optional recording — your data stays on your device",
              "No legal jargon. No lecturing. Just support.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[var(--accent)]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p>
          Set up your emergency contact once. When you need help, two taps is
          all it takes. Built for anyone who wants a little peace of mind when
          it matters most.
        </p>
      </section>

      <div className="mt-10">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex justify-center items-center w-full sm:w-auto px-8 py-4 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-end)] text-white font-semibold rounded-xl hover:scale-[1.02] transition-transform"
        >
          Download on the App Store
        </a>
      </div>

      <p className="mt-6 text-sm text-[var(--text-muted)]">
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

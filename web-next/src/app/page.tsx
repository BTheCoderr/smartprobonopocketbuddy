import Link from "next/link";
import { APP_STORE_URL } from "@/lib/constants";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 sm:px-10 py-10 sm:py-12 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">SmartPocketBuddy</h1>
        <p className="opacity-90">AAA for legal situations</p>
      </header>

      <section className="mt-8 space-y-4 text-[var(--text-muted)] leading-relaxed">
        <p>
          SmartPocketBuddy helps you stay calm and take the right steps during
          legal or law enforcement interactions.
        </p>
        <p>
          Think of it as AAA for legal situations. One tap launches Safety
          Mode: your location is shared with a trusted contact, and you get
          simple, step-by-step guidance designed to reduce stress and keep
          things calm.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--primary)] mb-4">
          Features
        </h2>
        <ul className="space-y-3">
          {[
            "One-tap Safety Mode",
            "Share your location with emergency contacts",
            "Calm, on-screen guidance for different situations",
            "Optional recording with local storage",
            "Event history for your records",
            "No legal jargon. No lecturing. Just support when you need it.",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <span className="text-[var(--accent)] font-bold">✓</span>
              <span className="text-[var(--text-muted)]">{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-[var(--text-muted)]">
        Set up your emergency contact once, and you&apos;re ready. Works when
        you&apos;re pulled over, calling for help, or in other stressful legal
        moments.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex justify-center items-center px-6 py-4 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-end)] text-white font-semibold rounded-xl hover:scale-[1.02] transition-transform"
        >
          Get on App Store →
        </a>
        <Link
          href="/support"
          className="inline-flex justify-center items-center px-6 py-4 border-2 border-[var(--accent)] text-[var(--accent)] font-semibold rounded-xl hover:bg-[var(--accent)]/10 transition-colors"
        >
          Support
        </Link>
      </div>
    </div>
  );
}

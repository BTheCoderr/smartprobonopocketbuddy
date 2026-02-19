import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — SmartPocketBuddy",
  description: "Get help with SmartPocketBuddy. FAQ, setup guide, and contact.",
};

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 sm:px-10 py-8 sm:py-10 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">SmartPocketBuddy Support</h1>
      </header>

      <main className="mt-6 space-y-6">
        <Link
          href="/"
          className="inline-block text-[var(--accent)] font-medium hover:underline mb-4"
        >
          ← Back to home
        </Link>

        <p className="text-[var(--text-muted)]">
          Thank you for using SmartPocketBuddy. We&apos;re here to help.
        </p>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-[var(--primary)] mb-2">
            Getting started
          </h2>
          <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1">
            <li>
              Set up your emergency contact in Settings (Settings tab →
              Setup Contact)
            </li>
            <li>
              On the Home screen, tap Start to enter Safety Mode when you need
              help
            </li>
            <li>
              Confirm with a second tap — your location is shared and
              you&apos;ll see guidance
            </li>
          </ul>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-[var(--primary)] mb-3">FAQ</h2>
          <div className="space-y-3 text-[var(--text-muted)]">
            <p>
              <strong className="text-[var(--primary)]">
                Where is my data stored?
              </strong>{" "}
              Location, contacts, recordings, and event history stay on your
              device. Nothing is sent to our servers.
            </p>
            <p>
              <strong className="text-[var(--primary)]">
                Can I use it without an emergency contact?
              </strong>{" "}
              Yes, but setting one up is recommended so someone gets your
              location during Safety Mode.
            </p>
            <p>
              <strong className="text-[var(--primary)]">
                How do I share a recording?
              </strong>{" "}
              After an event, go to History → tap the event → Share recording.
            </p>
          </div>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-[var(--primary)] mb-2">
            Contact us
          </h2>
          <p className="text-[var(--text-muted)] mb-2">
            For bug reports, feedback, or questions:
          </p>
          <a
            href="https://github.com/BTheCoderr/smartprobonopocketbuddy/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] font-medium hover:underline"
          >
            Open an issue on GitHub
          </a>
        </section>
      </main>
    </div>
  );
}

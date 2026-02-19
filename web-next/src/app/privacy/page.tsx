import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — SmartPocketBuddy",
  description:
    "SmartPocketBuddy privacy policy. Your data stays on your device.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 sm:px-10 py-8 sm:py-10 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Privacy Policy</h1>
      </header>

      <main className="mt-6 space-y-6">
        <Link
          href="/"
          className="inline-block text-[var(--accent)] font-medium hover:underline mb-4"
        >
          ← Back to home
        </Link>

        <p className="text-[var(--text-muted)]">
          SmartPocketBuddy stores data locally on your device only.
        </p>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Location</h2>
          <p className="text-[var(--text-muted)]">
            Used only when you activate Safety Mode. Shared with your chosen
            emergency contact via SMS. Not stored on our servers.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Recordings</h2>
          <p className="text-[var(--text-muted)]">
            Stored on your device. You control sharing.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Contacts</h2>
          <p className="text-[var(--text-muted)]">
            Used only to let you select an emergency contact. Not uploaded
            anywhere.
          </p>
        </section>

        <p className="text-[var(--text-muted)] font-medium">
          We do not collect, sell, or share your personal data.
        </p>
      </main>

      <footer className="mt-12 text-center text-sm text-[var(--text-muted)]">
        <Link href="/" className="hover:text-[var(--accent)]">
          Home
        </Link>
        {" · "}
        <Link href="/support" className="hover:text-[var(--accent)]">
          Support
        </Link>
        {" · "}
        <a
          href="https://github.com/BTheCoderr/smartprobonopocketbuddy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--accent)]"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — PocketBuddy | SmartProBono",
  description:
    "PocketBuddy privacy policy. Local-first safety documentation; recordings and history stay on your device unless you choose to share.",
};

export default function PocketBuddyPrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <header className="bg-gradient-to-br from-[var(--primary)] to-[#1a3a5c] text-white rounded-b-3xl px-6 sm:px-10 py-8 sm:py-10 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Privacy Policy</h1>
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
          PocketBuddy is designed as a{" "}
          <strong className="text-[var(--primary)]">local-first</strong> safety
          documentation tool. Recordings and incident history stay on your device
          unless you choose to share them through your phone&apos;s share sheet
          or other actions you initiate. If cloud features are added later, this
          policy will be updated before those features are enabled.
        </p>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">What stays on your device</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            PocketBuddy may store emergency contacts, optional kid schedule,
            recordings you save, session and event history, and settings on your
            device. Recordings stay on your phone unless you share them with
            someone else.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Location</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Location is used when you start a session so you can share a map
            link with trusted contacts via SMS or other channels you choose.
            SmartProBono does not operate a live cloud viewer of your sessions in
            this product release; handling of data you send is governed by your
            carrier and recipients.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Contacts</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Contacts access is used so you can pick emergency contacts on
            device. Contact data is not uploaded to SmartProBono servers for
            PocketBuddy&apos;s core local-first flows described here.
          </p>
        </section>

        <section className="bg-[var(--surface)] rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-[var(--primary)]">Recordings</h2>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Audio or video you record is stored locally. You control export and
            sharing. Recording laws vary by location — you are responsible for
            complying with applicable law.
          </p>
        </section>

        <p className="text-[var(--text-muted)] font-medium leading-relaxed">
          This app does not upload your recordings to SmartProBono servers as
          part of the core experience described above. If analytics or optional
          cloud features are introduced, this page will be revised before they go
          live.
        </p>
      </main>

      <footer className="mt-12 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
        <Link href="/pocketbuddy/terms" className="hover:text-[var(--accent)]">
          Terms
        </Link>
        <span>·</span>
        <Link href="/pocketbuddy/legal" className="hover:text-[var(--accent)]">
          Legal & disclaimers
        </Link>
      </footer>
    </div>
  );
}

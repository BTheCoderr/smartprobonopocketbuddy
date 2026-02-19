import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartPocketBuddy — AAA for Legal Situations",
  description:
    "One-tap Safety Mode. Share your location with emergency contacts. Calm guidance when you need it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased min-h-screen`}>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--primary)]/10">
            <Nav />
          </header>
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="text-center py-8 text-sm text-[var(--text-muted)]">
            <a
              href="https://github.com/BTheCoderr/smartprobonopocketbuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              GitHub
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}

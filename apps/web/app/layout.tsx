import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Covenant | Programmable Guardrails",
  description:
    "Programmable guardrails for agentic tokenized finance on Arbitrum and Mantle."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="topbar">
            <nav className="nav" aria-label="Primary navigation">
              <Link className="brand" href="/">
                <span className="brand-mark">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </span>
                <span>Covenant</span>
              </Link>
              <div className="nav-links">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/create">Create</Link>
                <Link href="/proposals">Proposals</Link>
                <Link href="/proof">Proof</Link>
              </div>
              <Link className="button ghost" href="/dashboard">
                Open App
              </Link>
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

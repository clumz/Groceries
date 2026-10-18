import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const LEGAL_EFFECTIVE_DATE = "18 October 2026";

/** Contact line for legal pages: the configured email, else the in-app feedback button. */
export function ContactLine() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return email ? (
    <>
      email us at <a href={`mailto:${email}`}>{email}</a> or use the <strong>Report</strong> button in the app
    </>
  ) : (
    <>
      use the <strong>Report</strong> button in the app (bottom-left of every page once you&apos;re signed in)
    </>
  );
}

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100svh", background: "#FFF8EE", padding: "20px 20px 48px", color: "#1A1410" }}>
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: "#1A1410", textDecoration: "none", opacity: 0.7 }}
      >
        <ChevronLeft size={16} /> Back
      </Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, margin: "16px 0 4px" }}>{title}</h1>
      <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 24px" }}>Effective {LEGAL_EFFECTIVE_DATE}</p>
      <article className="legal-copy">{children}</article>
    </div>
  );
}

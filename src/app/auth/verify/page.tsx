"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyContent() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <div style={{ minHeight: "100svh", background: "#FFF8EE", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#C8FF3E", border: "1.5px solid #1A1410", boxShadow: "3px 3px 0 #1A1410", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>✉️</span>
      </div>

      {error ? (
        <>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "#1A1410", marginBottom: 10 }}>
            Link expired
          </h1>
          <p style={{ fontSize: 15, color: "#1A1410", opacity: 0.65, lineHeight: 1.5, maxWidth: 320, marginBottom: 28 }}>
            That sign-in link has expired or already been used. Head back to request a new one.
          </p>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", height: 48, padding: "0 28px", borderRadius: 999, background: "#1A1410", border: "1.5px solid #1A1410", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#FFF8EE", textDecoration: "none" }}>
            Back to Plate
          </a>
        </>
      ) : (
        <>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "#1A1410", marginBottom: 10 }}>
            Check your email
          </h1>
          <p style={{ fontSize: 15, color: "#1A1410", opacity: 0.65, lineHeight: 1.5, maxWidth: 320 }}>
            A sign-in link has been sent to your email address. Click the link to sign in — no password needed.
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}

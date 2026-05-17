"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "@/lib/toast";
import { Flag, X } from "lucide-react";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Don't show on landing / auth pages
  if (pathname === "/" || pathname.startsWith("/auth")) return null;

  async function submit() {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: window.location.href, message }),
      });
      toast.success("Report sent — thanks!");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error("Couldn't send report — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 90, left: 16, zIndex: 40,
            display: "flex", alignItems: "center", gap: 6,
            background: "#1A1410", color: "#FFF8EE",
            border: "none", borderRadius: 999,
            padding: "8px 12px", fontSize: 12,
            fontFamily: "var(--font-display)", fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          }}
        >
          <Flag size={12} />
          Report
        </button>
      )}

      {/* Sheet */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(26,20,16,0.5)" }} onClick={() => setOpen(false)} />
          <div style={{ position: "relative", zIndex: 1, background: "#FFF8EE", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", border: "1.5px solid #1A1410", borderBottom: "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#1A1410", margin: 0 }}>Report an issue</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color="#1A1410" />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#9C9087", marginBottom: 12, fontFamily: "var(--font-mono)" }}>
              {window.location.pathname}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what went wrong or what you expected to happen…"
              rows={4}
              style={{
                width: "100%", borderRadius: 16, border: "1.5px solid #1A1410",
                background: "#FFFFFF", padding: "12px 14px", fontSize: 14,
                color: "#1A1410", outline: "none", resize: "none",
                fontFamily: "var(--font-body)", boxSizing: "border-box",
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={submit}
              disabled={!message.trim() || submitting}
              style={{
                marginTop: 12, width: "100%", height: 48, borderRadius: 999,
                background: message.trim() ? "#C8FF3E" : "rgba(26,20,16,0.1)",
                border: "1.5px solid #1A1410",
                boxShadow: message.trim() ? "2px 2px 0 #1A1410" : "none",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15,
                color: message.trim() ? "#1A1410" : "rgba(26,20,16,0.35)",
                cursor: message.trim() ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              {submitting ? "Sending…" : "Send report"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

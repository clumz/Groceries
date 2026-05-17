"use client";

import { useAppStore } from "@/store/useAppStore";

const WORKS = [
  "AI-generated 7-day meal plans tailored to your preferences",
  "Meal swapping, feedback learning, and serving adjustments",
  "Weekly cart aggregated across all meals",
  "Pantry tracking — ingredients you already have are deducted",
  "Nutrition tracking with calorie and macro goals",
];

const FAKED = [
  "Supermarket prices are estimates from a static catalogue — not live",
  "There is no real checkout — the app can't place orders for you",
  "\"Open Woolworths / Coles\" links to the store homepage only",
];

const FOCUS = [
  "Onboarding flow — does it capture your preferences clearly?",
  "Plan quality — are meals relevant to your dietary needs?",
  "Cart accuracy — are the right ingredients showing up?",
  "Anything that crashes, freezes, or looks broken",
];

export function WelcomeModal() {
  const hasSeenWelcome = useAppStore((s) => s.hasSeenWelcome);
  const setHasSeenWelcome = useAppStore((s) => s.setHasSeenWelcome);

  if (hasSeenWelcome) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(26,20,16,0.75)", backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <div style={{
        background: "#FFF8EE", borderRadius: "24px 24px 0 0",
        border: "1.5px solid #1A1410", borderBottom: "none",
        padding: "28px 24px 48px", maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "#1A1410", opacity: 0.15, margin: "0 auto 24px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#C8FF3E", border: "1.5px solid #1A1410", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#1A1410" }}>P</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "#1A1410", margin: 0 }}>
            Welcome to the beta
          </h2>
        </div>
        <p style={{ fontSize: 14, color: "rgba(26,20,16,0.6)", marginBottom: 24, lineHeight: 1.5 }}>
          You're one of the first testers. Here's what to know before you dive in.
        </p>

        <Section title="✅ What's real" items={WORKS} color="#C8FF3E" />
        <Section title="🚧 What's not real yet" items={FAKED} color="#FFD66B" />
        <Section title="🔍 What to focus on" items={FOCUS} color="#FFF8EE" border />

        <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 16, background: "rgba(26,20,16,0.06)", border: "1px solid rgba(26,20,16,0.12)" }}>
          <p style={{ fontSize: 13, color: "#1A1410", margin: 0, lineHeight: 1.5 }}>
            Found a bug? Tap the <strong>⚑ Report</strong> button on any page — it captures the URL and device info automatically.
          </p>
        </div>

        <button
          onClick={() => setHasSeenWelcome(true)}
          style={{
            marginTop: 20, width: "100%", height: 52, borderRadius: 999,
            background: "#1A1410", border: "none", cursor: "pointer",
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#C8FF3E",
          }}
        >
          Got it, let's go →
        </button>
      </div>
    </div>
  );
}

function Section({ title, items, color, border }: { title: string; items: string[]; color: string; border?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#1A1410", marginBottom: 8 }}>{title}</p>
      <div style={{ background: color, border: border ? "1px solid rgba(26,20,16,0.15)" : "1.5px solid #1A1410", borderRadius: 16, overflow: "hidden" }}>
        {items.map((item, i) => (
          <div key={i} style={{ padding: "10px 14px", borderTop: i > 0 ? "1px solid rgba(26,20,16,0.1)" : "none", fontSize: 13, color: "#1A1410", lineHeight: 1.4 }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

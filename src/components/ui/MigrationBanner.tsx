"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/useAppStore";

const MIGRATION_KEY = "plate-migration-offered";

export function MigrationBanner() {
  const { status } = useSession();
  const preferences = useAppStore((s) => s.preferences);
  const feedbackHistory = useAppStore((s) => s.feedbackHistory);
  const pantryItems = useAppStore((s) => s.pantryItems);
  const stapleIngredients = useAppStore((s) => s.stapleIngredients);
  const currentMealPlan = useAppStore((s) => s.currentMealPlan);

  const [visible, setVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    // Only offer if there's meaningful localStorage data
    const raw = localStorage.getItem("plate-app-storage");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      if (!state?.preferences && !state?.currentMealPlan && !state?.feedbackHistory?.items?.length) return;
    } catch {
      return;
    }

    setVisible(true);
  }, [status]);

  if (!visible || done) return null;

  function dismiss() {
    localStorage.setItem(MIGRATION_KEY, "declined");
    setVisible(false);
  }

  async function importData() {
    setImporting(true);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences,
          feedbackHistory,
          pantryItems,
          stapleIngredients,
          currentMealPlan,
        }),
      });
      localStorage.setItem(MIGRATION_KEY, "done");
      setDone(true);
    } catch {
      // Silently fail — user can try again next time
    } finally {
      setImporting(false);
      setVisible(false);
    }
  }

  return (
    <div style={{
      margin: "0 20px 16px",
      background: "#FFD66B",
      border: "1.5px solid #1A1410",
      borderRadius: 20,
      boxShadow: "3px 3px 0 #1A1410",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#1A1410", margin: 0 }}>
          Import your existing data?
        </p>
        <p style={{ fontSize: 13, color: "rgba(26,20,16,0.65)", margin: "4px 0 0", lineHeight: 1.4 }}>
          We found a meal plan and preferences on this device. Import them to your account for cross-device sync.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={importData}
          disabled={importing}
          style={{ flex: 1, height: 38, borderRadius: 999, background: "#1A1410", border: "1.5px solid #1A1410", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#FFF8EE", cursor: "pointer", opacity: importing ? 0.7 : 1 }}
        >
          {importing ? "Importing…" : "Import"}
        </button>
        <button
          onClick={dismiss}
          style={{ flex: 1, height: 38, borderRadius: 999, background: "rgba(26,20,16,0.08)", border: "1.5px solid rgba(26,20,16,0.2)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#1A1410", cursor: "pointer" }}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}

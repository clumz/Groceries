"use client";

import { useEffect, useState } from "react";
import { toast as toastStore, type ToastItem } from "@/lib/toast";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

const ICONS = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
};

const COLORS: Record<ToastItem["variant"], { bg: string; border: string; color: string }> = {
  success: { bg: "#F0FFF4", border: "#22C55E", color: "#15803D" },
  error: { bg: "#FFF1F0", border: "#FF6B4A", color: "#C0392B" },
  info: { bg: "#FFF8EE", border: "#1A1410", color: "#1A1410" },
  warning: { bg: "#FFFBEB", border: "#F59E0B", color: "#92400E" },
};

function ToastBubble({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const c = COLORS[item.variant];

  useEffect(() => {
    // Trigger enter animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      onClick={onDismiss}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px 12px 12px",
        borderRadius: 16, border: `1.5px solid ${c.border}`,
        background: c.bg, color: c.color,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
        cursor: "pointer", userSelect: "none",
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
        maxWidth: 340,
      }}
    >
      <span style={{ flexShrink: 0 }}>{ICONS[item.variant]}</span>
      <span style={{ flex: 1, lineHeight: 1.3 }}>{item.message}</span>
      <X size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
    </div>
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => { const unsub = toastStore.subscribe(setToasts); return () => { unsub(); }; }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, display: "flex", flexDirection: "column", gap: 8,
        alignItems: "center", pointerEvents: "none", width: "calc(100% - 32px)", maxWidth: 400,
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto", width: "100%" }}>
          <ToastBubble item={t} onDismiss={() => toastStore.dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

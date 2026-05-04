interface MacroBarProps {
  label: string;
  val: number;
  target: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, val, target, unit = "g", color }: MacroBarProps) {
  const pct = Math.min(val / Math.max(target, 1), 1) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9C9087",
        }}>{label}</span>
        <span style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          color: "#1A1410",
        }}>
          {val}<span style={{ color: "#9C9087", fontWeight: 400 }}>/{target}{unit}</span>
        </span>
      </div>
      <div style={{
        height: 8,
        borderRadius: 999,
        background: "#EDE4D5",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          borderRadius: 999,
          background: color,
          width: `${pct}%`,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

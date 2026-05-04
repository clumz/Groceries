"use client";

interface MacroRingProps {
  size?: number;
  kcal: number;
  target: number;
  label?: string;
  color?: string;
}

export function MacroRing({ size = 148, kcal, target, label = "kcal today", color = "#C8FF3E" }: MacroRingProps) {
  const strokeWidth = 14;
  const r = size / 2 - strokeWidth / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(kcal / Math.max(target, 1), 1);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#EDE4D5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}>
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
          fontWeight: 700,
          fontSize: size > 120 ? 30 : 22,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: "#1A1410",
        }}>{kcal >= 1000 ? `${(kcal / 1000).toFixed(1)}k` : kcal}</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "#9C9087",
        }}>of {target >= 1000 ? `${(target / 1000).toFixed(1)}k` : target}</span>
      </div>
    </div>
  );
}

import { clsx } from "clsx";
import type { CSSProperties } from "react";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "shimmer 1.4s ease infinite", ...style }}
    />
  );
}

export function PlanSkeleton() {
  return (
    <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Day pill row */}
      <div style={{ display: "flex", gap: 8, overflowX: "hidden" }}>
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="!rounded-[18px] flex-shrink-0" style={{ width: 50, height: 60 }} />
        ))}
      </div>
      {/* Recipe cards */}
      {[...Array(2)].map((_, i) => (
        <div key={i} style={{ borderRadius: 22, overflow: "hidden", border: "1px solid #EDE4D5" }}>
          <Skeleton style={{ height: 180 }} className="!rounded-none" />
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton style={{ height: 20, width: "60%" }} />
            <Skeleton style={{ height: 14, width: "40%" }} />
            <Skeleton style={{ height: 14, width: "80%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      {[...Array(3)].map((_, g) => (
        <div key={g}>
          <Skeleton style={{ height: 12, width: 100, marginBottom: 8 }} />
          <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #EDE4D5" }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < 2 ? "1px solid #EDE4D5" : "none" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton style={{ height: 14, width: "55%" }} />
                  <Skeleton style={{ height: 11, width: "35%" }} />
                </div>
                <Skeleton style={{ height: 18, width: 50 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

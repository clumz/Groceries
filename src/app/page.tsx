"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import Image from "next/image";

export default function RootPage() {
  const router = useRouter();
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isOnboarded) {
      setRedirecting(true);
      router.replace("/plan");
    }
  }, [isOnboarded, router]);

  if (redirecting) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1A1410" }}>
        <div style={{ width: 32, height: 32, borderRadius: 999, border: "2px solid #C8FF3E", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1A1410", color: "#FFF8EE", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Food collage */}
      <div style={{ position: "relative", height: "52vh", flexShrink: 0, overflow: "hidden" }}>
        {/* Lime blob */}
        <div style={{
          position: "absolute", width: 320, height: 320,
          borderRadius: 999, background: "#C8FF3E", opacity: 0.12,
          top: -80, left: -80, filter: "blur(40px)",
        }} />
        {/* Coral blob */}
        <div style={{
          position: "absolute", width: 240, height: 240,
          borderRadius: 999, background: "#FF6B4A", opacity: 0.12,
          top: 20, right: -60, filter: "blur(40px)",
        }} />

        {/* Photo 1 — left, rotated */}
        <FloatPhoto
          src="https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300&q=80"
          alt="Pasta"
          style={{ width: 130, height: 130, left: "6%", top: "22%", transform: "rotate(-6deg)", zIndex: 1 }}
          tag="🍝 Italian"
          tagColor="#C8FF3E"
        />

        {/* Photo 2 — center, front */}
        <FloatPhoto
          src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80"
          alt="Fresh salad"
          style={{ width: 150, height: 150, left: "50%", top: "10%", transform: "translateX(-50%) rotate(2deg)", zIndex: 3 }}
          tag="🥗 22g protein"
          tagColor="#FF6B4A"
          tagStyle={{ color: "#fff" }}
        />

        {/* Photo 3 — right */}
        <FloatPhoto
          src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=80"
          alt="Curry"
          style={{ width: 130, height: 130, right: "6%", top: "28%", transform: "rotate(4deg)", zIndex: 2 }}
          tag="🌱 vegan"
          tagColor="#FFD66B"
        />

        {/* Gradient fade */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, #1A1410)", pointerEvents: "none" }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 40px", gap: 24 }}>
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#C8FF3E", display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid #FFF8EE",
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#1A1410" }}>P</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>Plate</span>
        </div>

        {/* Hero headline */}
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 50,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            margin: 0,
          }}>
            Eat well,{" "}
            <em style={{ color: "#C8FF3E", fontStyle: "italic" }}>every</em>
            <br />week.
          </h1>
          <p style={{ marginTop: 14, fontSize: 16, color: "rgba(255,248,238,0.65)", lineHeight: 1.45, maxWidth: 300 }}>
            AI meal plans + grocery cart. Done in seconds.
          </p>
        </div>

        {/* Stat row */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: "222", lab: "recipes" },
            { val: "2.1k", lab: "avg kcal" },
            { val: "7 day", lab: "plans" },
          ].map(({ val, lab }) => (
            <div key={lab} style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 16,
              background: "rgba(255,248,238,0.07)",
              border: "1px solid rgba(255,248,238,0.12)",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#C8FF3E" }}>{val}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,248,238,0.45)", marginTop: 2 }}>{lab}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/onboarding")}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 999,
            background: "#C8FF3E",
            border: "1.5px solid #FFF8EE",
            boxShadow: "3px 3px 0 rgba(255,248,238,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 17,
            color: "#1A1410",
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          Get started
          <span style={{
            width: 28, height: 28, borderRadius: 999,
            background: "#1A1410", color: "#C8FF3E",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
          }}>→</span>
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "#C8FF3E", margin: 0, cursor: "pointer" }}>
          Already have a Plate? <span style={{ textDecoration: "underline" }}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

function FloatPhoto({
  src, alt, style, tag, tagColor, tagStyle,
}: {
  src: string;
  alt: string;
  style: React.CSSProperties;
  tag?: string;
  tagColor?: string;
  tagStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "absolute", ...style }}>
      <div style={{
        width: "100%", height: "100%",
        borderRadius: 999,
        overflow: "hidden",
        border: "2px solid rgba(255,248,238,0.25)",
      }}>
        <Image src={src} alt={alt} fill style={{ objectFit: "cover" }} />
      </div>
      {tag && (
        <div style={{
          position: "absolute", bottom: -10, left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          background: tagColor ?? "#C8FF3E",
          color: "#1A1410",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1.5px solid rgba(255,248,238,0.5)",
          boxShadow: "2px 2px 0 rgba(255,248,238,0.2)",
          ...tagStyle,
        }}>
          {tag}
        </div>
      )}
    </div>
  );
}

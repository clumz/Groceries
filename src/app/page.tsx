"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useAppStore } from "@/store/useAppStore";
import Image from "next/image";

export default function RootPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // After auth: new users go to onboarding, returning users go to plan
  useEffect(() => {
    if (status === "authenticated") {
      setRedirecting(true);
      router.replace(isOnboarded ? "/plan" : "/onboarding");
    }
  }, [status, isOnboarded, router]);

  if (redirecting || status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1A1410" }}>
        <div style={{ width: 32, height: 32, borderRadius: 999, border: "2px solid #C8FF3E", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  async function handleGoogleSignIn() {
    setSigningIn(true);
    await signIn("google", { callbackUrl: "/" });
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSigningIn(true);
    await signIn("resend", { email, callbackUrl: "/", redirect: false });
    setEmailSent(true);
    setSigningIn(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1A1410", color: "#FFF8EE", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Food collage */}
      <div style={{ position: "relative", height: "52vh", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 320, height: 320, borderRadius: 999, background: "#C8FF3E", opacity: 0.12, top: -80, left: -80, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", width: 240, height: 240, borderRadius: 999, background: "#FF6B4A", opacity: 0.12, top: 20, right: -60, filter: "blur(40px)" }} />

        <FloatPhoto src="https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300&q=80" alt="Pasta"
          style={{ width: 130, height: 130, left: "6%", top: "22%", transform: "rotate(-6deg)", zIndex: 1 }}
          tag="🍝 Italian" tagColor="#C8FF3E" />
        <FloatPhoto src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80" alt="Fresh salad"
          style={{ width: 150, height: 150, left: "50%", top: "10%", transform: "translateX(-50%) rotate(2deg)", zIndex: 3 }}
          tag="🥗 22g protein" tagColor="#FF6B4A" tagStyle={{ color: "#fff" }} />
        <FloatPhoto src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=80" alt="Curry"
          style={{ width: 130, height: 130, right: "6%", top: "28%", transform: "rotate(4deg)", zIndex: 2 }}
          tag="🌱 vegan" tagColor="#FFD66B" />

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, #1A1410)", pointerEvents: "none" }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 40px", gap: 24 }}>
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#C8FF3E", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #FFF8EE" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#1A1410" }}>P</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>Plate</span>
        </div>

        {/* Hero headline */}
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 50, lineHeight: 0.95, letterSpacing: "-0.03em", margin: 0 }}>
            Eat well,{" "}
            <em style={{ color: "#C8FF3E", fontStyle: "italic" }}>every</em>
            <br />week.
          </h1>
          <p style={{ marginTop: 14, fontSize: 16, color: "rgba(255,248,238,0.65)", lineHeight: 1.45, maxWidth: 300 }}>
            AI meal plans + grocery cart. Done in seconds.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8 }}>
          {[{ val: "222", lab: "recipes" }, { val: "2.1k", lab: "avg kcal" }, { val: "7 day", lab: "plans" }].map(({ val, lab }) => (
            <div key={lab} style={{ flex: 1, padding: "10px 8px", borderRadius: 16, background: "rgba(255,248,238,0.07)", border: "1px solid rgba(255,248,238,0.12)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#C8FF3E" }}>{val}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,248,238,0.45)", marginTop: 2 }}>{lab}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <button
          onClick={() => { setIsNewUser(true); setShowSignIn(true); }}
          style={{ width: "100%", height: 56, borderRadius: 999, background: "#C8FF3E", border: "1.5px solid #FFF8EE", boxShadow: "3px 3px 0 rgba(255,248,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#1A1410", cursor: "pointer", letterSpacing: "-0.01em" }}
        >
          Get started
          <span style={{ width: 28, height: 28, borderRadius: 999, background: "#1A1410", color: "#C8FF3E", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>→</span>
        </button>

        <button
          onClick={() => { setIsNewUser(false); setShowSignIn(true); }}
          style={{ background: "none", border: "none", textAlign: "center", fontSize: 13, color: "#C8FF3E", margin: 0, cursor: "pointer", padding: 0 }}
        >
          Already have a Plate? <span style={{ textDecoration: "underline" }}>Sign in</span>
        </button>
      </div>

      {/* Sign-in bottom sheet */}
      {showSignIn && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSignIn(false); }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(26,20,16,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setShowSignIn(false)} />
          <div style={{ position: "relative", zIndex: 1, background: "#FFF8EE", borderRadius: "24px 24px 0 0", padding: "28px 24px 48px", border: "1.5px solid #1A1410", borderBottom: "none" }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "#1A1410", opacity: 0.15, margin: "0 auto 24px" }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#1A1410", margin: "0 0 6px", fontStyle: "italic" }}>
              {isNewUser ? "Create your account" : "Welcome back"}
            </h2>
            <p style={{ fontSize: 14, color: "rgba(26,20,16,0.55)", margin: "0 0 24px" }}>
              {isNewUser ? "Sign in to save your meal plan and cart." : "Sign in to sync your plans across devices."}
            </p>

            {emailSent ? (
              <div style={{ background: "#C8FF3E", border: "1.5px solid #1A1410", borderRadius: 16, padding: "16px 20px", boxShadow: "3px 3px 0 #1A1410" }}>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#1A1410", margin: "0 0 4px" }}>Check your email</p>
                <p style={{ fontSize: 13, color: "rgba(26,20,16,0.65)", margin: 0 }}>We sent a sign-in link to <strong>{email}</strong></p>
              </div>
            ) : (
              <>
                {/* Google sign-in */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  style={{ width: "100%", height: 52, borderRadius: 999, background: "#1A1410", border: "1.5px solid #1A1410", boxShadow: "3px 3px 0 #1A1410", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#FFF8EE", cursor: "pointer", opacity: signingIn ? 0.6 : 1 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58Z"/></svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(26,20,16,0.15)" }} />
                  <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontFamily: "var(--font-mono)" }}>or</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(26,20,16,0.15)" }} />
                </div>

                {/* Email magic link */}
                <form onSubmit={handleEmailSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", height: 48, borderRadius: 999, border: "1.5px solid #1A1410", background: "#FFFFFF", padding: "0 20px", fontSize: 15, color: "#1A1410", outline: "none", boxSizing: "border-box" }}
                  />
                  <button
                    type="submit"
                    disabled={signingIn || !email.trim()}
                    style={{ width: "100%", height: 48, borderRadius: 999, background: email.trim() ? "#FF6B4A" : "rgba(26,20,16,0.12)", border: "1.5px solid #1A1410", boxShadow: email.trim() ? "3px 3px 0 #1A1410" : "none", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: email.trim() ? "#FFF8EE" : "rgba(26,20,16,0.35)", cursor: email.trim() ? "pointer" : "default", transition: "all 0.15s" }}
                  >
                    Send magic link
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FloatPhoto({ src, alt, style, tag, tagColor, tagStyle }: {
  src: string; alt: string; style: React.CSSProperties; tag?: string; tagColor?: string; tagStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "absolute", ...style }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 999, overflow: "hidden", border: "2px solid rgba(255,248,238,0.25)" }}>
        <Image src={src} alt={alt} fill style={{ objectFit: "cover" }} />
      </div>
      {tag && (
        <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: tagColor ?? "#C8FF3E", color: "#1A1410", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1.5px solid rgba(255,248,238,0.5)", boxShadow: "2px 2px 0 rgba(255,248,238,0.2)", ...tagStyle }}>
          {tag}
        </div>
      )}
    </div>
  );
}

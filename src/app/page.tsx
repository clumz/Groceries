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
      <div className="flex items-center justify-center min-h-screen bg-surface-secondary">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col overflow-x-hidden">
      {/* Food collage hero */}
      <div className="relative h-[55vh] overflow-hidden shrink-0">
        {/* Card 1: Pasta — rotated left */}
        <div
          className="absolute rounded-2xl overflow-hidden shadow-xl"
          style={{ width: 140, height: 100, left: "8%", top: "14%", transform: "rotate(-6deg)", zIndex: 1 }}
        >
          <Image
            src="https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300&q=80"
            alt="Pasta"
            fill
            className="object-cover"
          />
        </div>

        {/* Card 2: Salad — centered, front */}
        <div
          className="absolute rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 160, height: 115, left: "50%", top: "8%", transform: "translateX(-50%)", zIndex: 3 }}
        >
          <Image
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80"
            alt="Fresh salad"
            fill
            className="object-cover"
          />
        </div>

        {/* Card 3: Curry — rotated right */}
        <div
          className="absolute rounded-2xl overflow-hidden shadow-xl"
          style={{ width: 140, height: 100, right: "8%", top: "20%", transform: "rotate(5deg)", zIndex: 2 }}
        >
          <Image
            src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=80"
            alt="Indian curry"
            fill
            className="object-cover"
          />
        </div>

        {/* Gradient fade to background */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface-secondary" />
      </div>

      {/* Content */}
      <div className="flex flex-col items-center px-6 pb-10 gap-6 -mt-4">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-xl leading-none">P</span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Plate</h1>
          <p className="text-base text-ink-secondary text-center">Eat well, every week.</p>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: "🍽", label: "222 recipes" },
            { icon: "✨", label: "AI-personalised" },
            { icon: "🛒", label: "Woolies & Coles" },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-slate-200 text-sm font-medium text-ink-secondary"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </span>
          ))}
        </div>

        {/* Get started CTA */}
        <button
          onClick={() => router.push("/onboarding")}
          className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-semibold text-base flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
        >
          Get started for free
          <span aria-hidden>→</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-ink-tertiary whitespace-nowrap">or continue with</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* SSO buttons — coming soon */}
        <div className="flex flex-col gap-3 w-full">
          <SsoButton logo={<GoogleLogo />} label="Continue with Google" />
          <SsoButton logo={<AppleLogo />} label="Continue with Apple" />
          <SsoButton logo={<FacebookLogo />} label="Continue with Facebook" />
        </div>

        {/* Legal footer */}
        <p className="text-xs text-ink-tertiary text-center leading-relaxed">
          By continuing you agree to our{" "}
          <span className="underline">Terms of Service</span> and{" "}
          <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

function SsoButton({ logo, label }: { logo: React.ReactNode; label: string }) {
  return (
    <div className="relative opacity-40 pointer-events-none select-none">
      <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-surface">
        <span className="w-5 h-5 flex items-center justify-center shrink-0">{logo}</span>
        <span className="flex-1 text-sm font-medium text-ink text-left line-through">{label}</span>
      </button>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-surface-tertiary text-ink-tertiary px-2 py-0.5 rounded-full">
        Soon
      </span>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-ink" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

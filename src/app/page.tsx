"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export default function RootPage() {
  const router = useRouter();
  const isOnboarded = useAppStore((s) => s.isOnboarded);

  useEffect(() => {
    if (isOnboarded) {
      router.replace("/plan");
    } else {
      router.replace("/onboarding");
    }
  }, [isOnboarded, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}

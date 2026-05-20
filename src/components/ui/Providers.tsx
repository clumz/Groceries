"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { PostHogProvider } from "./PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <PostHogProvider>{children}</PostHogProvider>
    </ClerkProvider>
  );
}

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function ThemeProvider() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
      return;
    }
    if (theme === "light") {
      root.classList.remove("dark");
      return;
    }

    // "system" — follow OS preference
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (matches: boolean) => {
      if (matches) root.classList.add("dark");
      else root.classList.remove("dark");
    };
    apply(mq.matches);
    mq.addEventListener("change", (e) => apply(e.matches));
    return () => mq.removeEventListener("change", (e) => apply(e.matches));
  }, [theme]);

  return null;
}

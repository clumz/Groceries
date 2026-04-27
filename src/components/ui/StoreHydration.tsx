"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function StoreHydration() {
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  return null;
}

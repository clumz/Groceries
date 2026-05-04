"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">
        ⚠️
      </div>
      <div>
        <h2 className="text-xl font-bold text-ink">Something went wrong</h2>
        <p className="text-sm text-ink-secondary mt-2 max-w-xs">
          Your meal plan and preferences are safe. This page hit an unexpected error.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-2xl bg-brand-600 text-white text-sm font-semibold"
        >
          Try again
        </button>
        <Link
          href="/plan"
          className="px-5 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-ink-secondary"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
}

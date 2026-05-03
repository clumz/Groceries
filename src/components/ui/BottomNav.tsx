"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { CalendarDays, ShoppingCart, BookOpen, ReceiptText, SlidersHorizontal } from "lucide-react";

const NAV_ITEMS = [
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/browse", label: "Browse", icon: BookOpen },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: ReceiptText },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/90 backdrop-blur-md border-t border-slate-100 safe-bottom z-50">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors",
                active ? "text-brand-600" : "text-ink-tertiary"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              <span className={clsx("text-[10px]", active ? "font-semibold" : "font-medium")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

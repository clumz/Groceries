"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ShoppingCart, BookOpen, Activity, Settings2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/plan",     label: "Plan",    icon: CalendarDays },
  { href: "/browse",   label: "Browse",  icon: BookOpen },
  { href: "/cart",     label: "Cart",    icon: ShoppingCart },
  { href: "/macros",   label: "Macros",  icon: Activity },
  { href: "/settings", label: "Settings",icon: Settings2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{ paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}
    >
      <div
        style={{
          marginLeft: 12,
          marginRight: 12,
          height: 64,
          background: "#1A1410",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 10px",
          boxShadow: "0 12px 32px -8px rgba(0,0,0,0.35)",
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: active ? "#C8FF3E" : "transparent",
                color: active ? "#1A1410" : "rgba(255,255,255,0.55)",
                transition: "all 0.12s",
              }}
              aria-label={label}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

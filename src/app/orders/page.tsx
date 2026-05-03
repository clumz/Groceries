"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { BottomNav } from "@/components/ui/BottomNav";
import { ShoppingBag, ChevronDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import type { Order } from "@/types";

const BUDGET_MAP: Record<string, number> = {
  "under-150": 150,
  "150-250": 200,
  "250-350": 300,
  "350-plus": 400,
};

export default function OrdersPage() {
  const router = useRouter();
  const orderHistory = useAppStore((s) => s.orderHistory);
  const preferences = useAppStore((s) => s.preferences);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const weeklyBudget = BUDGET_MAP[preferences?.budgetRange ?? "150-250"];
  const last8 = orderHistory.slice(0, 8);

  // Monthly spend (last 4 orders as a proxy for ~1 month)
  const monthOrders = orderHistory.slice(0, 4);
  const monthSpend = monthOrders.reduce((s, o) => s + o.cart.estimatedTotal, 0);
  const monthBudget = weeklyBudget * 4;

  return (
    <div className="min-h-screen bg-surface-secondary pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-ink">Order History</h1>
        <p className="text-xs text-ink-tertiary mt-0.5">{orderHistory.length} order{orderHistory.length !== 1 ? "s" : ""} total</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Budget summary */}
        {orderHistory.length > 0 && (
          <div className="bg-white rounded-3xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              <p className="text-sm font-semibold text-ink">This month</p>
            </div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-3xl font-bold text-ink">A${monthSpend.toFixed(0)}</p>
                <p className="text-xs text-ink-tertiary mt-0.5">of A${monthBudget} budget</p>
              </div>
              <p className={clsx(
                "text-sm font-semibold",
                monthSpend <= monthBudget ? "text-emerald-600" : "text-red-500"
              )}>
                {monthSpend <= monthBudget
                  ? `A$${(monthBudget - monthSpend).toFixed(0)} left`
                  : `A$${(monthSpend - monthBudget).toFixed(0)} over`}
              </p>
            </div>

            {/* Budget bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  monthSpend / monthBudget > 1 ? "bg-red-400" : "bg-brand-500"
                )}
                style={{ width: `${Math.min(100, (monthSpend / monthBudget) * 100).toFixed(1)}%` }}
              />
            </div>

            {/* Last 8 weeks sparkline */}
            {last8.length > 1 && (
              <div className="mt-5">
                <p className="text-xs text-ink-tertiary mb-2">Weekly spend (last {last8.length} orders)</p>
                <div className="flex items-end gap-1 h-12">
                  {[...last8].reverse().map((order, i) => {
                    const pct = Math.min(100, (order.cart.estimatedTotal / weeklyBudget) * 100);
                    const isOver = order.cart.estimatedTotal > weeklyBudget;
                    return (
                      <div key={order.id} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-t-sm" style={{ height: `${pct}%` }}>
                          <div className={clsx(
                            "w-full h-full rounded-t-sm",
                            isOver ? "bg-red-300" : i === last8.length - 1 ? "bg-brand-500" : "bg-brand-200"
                          )} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Budget line label */}
                <div className="flex justify-between mt-1">
                  <p className="text-[10px] text-ink-tertiary">Oldest</p>
                  <p className="text-[10px] text-ink-tertiary">Latest</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {orderHistory.length === 0 && (
          <div className="bg-white rounded-3xl shadow-card px-5 py-16 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🧺</span>
            <p className="font-semibold text-ink text-lg">No orders yet</p>
            <p className="text-sm text-ink-secondary">
              Your order history will appear here after your first shop.
            </p>
          </div>
        )}

        {/* Order list */}
        {orderHistory.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            expanded={expandedId === order.id}
            onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

function OrderRow({ order, expanded, onToggle }: { order: Order; expanded: boolean; onToggle: () => void }) {
  const retailerColor = order.retailer === "woolworths" ? "text-green-600" : "text-red-500";
  const retailerBg = order.retailer === "woolworths" ? "bg-green-50" : "bg-red-50";
  const confirmedItems = order.cart.items.filter((i) => !i.isStaple && (i.pantryContribution ?? 0) < i.totalQuantity && i.substituteApproved !== false);
  const date = order.placedAt
    ? new Date(order.placedAt).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
    : order.estimatedDeliveryDate;

  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4"
      >
        <div className={clsx("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0", retailerBg)}>
          <ShoppingBag className={clsx("w-5 h-5", retailerColor)} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-ink capitalize">{order.retailer}</p>
          <p className="text-xs text-ink-tertiary">{date} · {confirmedItems.length} items</p>
        </div>
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          <p className="font-bold text-ink">A${order.cart.estimatedTotal.toFixed(2)}</p>
          <ChevronDown className={clsx("w-4 h-4 text-ink-tertiary transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
          {confirmedItems.slice(0, 15).map((item) => {
            const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
            return (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-ink-secondary truncate flex-1 mr-3">{item.ingredientName}</span>
                <span className="text-ink font-medium flex-shrink-0">
                  {product ? `A$${product.price.toFixed(2)}` : "—"}
                </span>
              </div>
            );
          })}
          {confirmedItems.length > 15 && (
            <p className="text-xs text-ink-tertiary text-center">+{confirmedItems.length - 15} more items</p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { estimatePantrySavings } from "@/lib/cartAggregator";
import type { CartItem, Order } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeft, ShoppingBag, ArrowUpRight, Copy, Check, Leaf, Share2, Circle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Fresh Produce",
  meat: "Meat & Poultry",
  seafood: "Seafood",
  dairy: "Dairy & Eggs",
  pantry: "Pantry",
  frozen: "Frozen",
  snacks: "Snacks",
  bakery: "Bakery",
  health: "Health",
  deli: "Deli",
  beverages: "Beverages",
};

const CATEGORY_ORDER = ["produce", "meat", "seafood", "dairy", "pantry", "frozen", "bakery", "deli", "snacks", "health", "beverages"];

function buildShareText(
  items: CartItem[],
  retailerName: string,
  total: number,
): string {
  const grouped: Record<string, CartItem[]> = {};
  for (const item of items) {
    const cat = item.matchedProduct?.category ?? "pantry";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const sections = CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => {
    const label = CATEGORY_LABELS[cat] ?? cat;
    const lines = grouped[cat].map((item) => {
      const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
      const net = (item.totalQuantity - (item.pantryContribution ?? 0)).toFixed(1);
      return `☐ ${item.ingredientName} (${net} ${item.unit})${product ? ` — A$${product.price.toFixed(2)}` : ""}`;
    });
    return `${label}\n${lines.join("\n")}`;
  });

  return [
    `Shopping list — ${retailerName}`,
    `Estimated total: A$${total.toFixed(2)} · ${items.length} items`,
    "",
    ...sections,
  ].join("\n");
}

export default function CheckoutPage() {
  const router = useRouter();
  const currentCart = useAppStore((s) => s.currentCart);
  const setOrder = useAppStore((s) => s.setOrder);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [marked, setMarked] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  if (!currentCart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-plate-ink-2">No cart to review</p>
        <Button onClick={() => router.push("/cart")}>Go to Cart</Button>
      </div>
    );
  }

  const retailerName = currentCart.retailer === "woolworths" ? "Woolworths" : "Coles";
  const retailerColor = currentCart.retailer === "woolworths" ? "text-green-600" : "text-red-500";
  const retailerUrl = currentCart.retailer === "woolworths"
    ? "https://www.woolworths.com.au/shop/grocery"
    : "https://www.coles.com.au/browse";

  const confirmedItems = currentCart.items.filter(
    (i) => !i.isStaple && !i.markedAsHave && (i.pantryContribution ?? 0) < i.totalQuantity && i.substituteApproved !== false
  );
  const pantrySavings = estimatePantrySavings(currentCart.items);
  const checkedCount = checkedIds.size;
  const remainingCount = confirmedItems.length - checkedCount;

  const shareText = buildShareText(confirmedItems, retailerName, currentCart.estimatedTotal);

  async function shareList() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Shopping list — ${retailerName}`, text: shareText });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // User dismissed share sheet — no-op
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function copyList() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markAsOrdered() {
    const order: Order = {
      id: `order-${Date.now()}`,
      retailer: currentCart!.retailer,
      cart: currentCart!,
      status: "placed",
      estimatedDeliveryDate: "",
      estimatedDeliveryWindow: "",
      deliveryAddress: "",
      placedAt: Date.now(),
      confirmationNumber: `LIST-${Date.now().toString(36).toUpperCase()}`,
    };
    setOrder(order);
    setMarked(true);
    setCheckedIds(new Set());
  }

  // Group confirmed items by category, respecting order
  const grouped: Record<string, CartItem[]> = {};
  for (const item of confirmedItems) {
    const cat = item.matchedProduct?.category ?? "pantry";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  // ── Shopping checklist (after marking as ordered) ──────────────────────────
  if (marked) {
    return (
      <div className="min-h-screen bg-plate-bg pb-40">
        {/* Header */}
        <div className="bg-plate-surface px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-plate-line">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-plate-lime flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-plate-ink" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-plate-ink">Shopping checklist</h1>
                <p className="text-xs text-plate-ink-3">
                  {checkedCount > 0 ? `${checkedCount} of ${confirmedItems.length} added` : `${confirmedItems.length} items · A$${currentCart.estimatedTotal.toFixed(2)}`}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            {confirmedItems.length > 0 && (
              <div className="w-16 h-2 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                <div
                  className="h-full rounded-full bg-plate-lime transition-all duration-300"
                  style={{ width: `${(checkedCount / confirmedItems.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 space-y-1">
          {/* Tip banner */}
          <div className={clsx(
            "rounded-2xl px-4 py-3 mb-3",
            currentCart.retailer === "woolworths" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          )}>
            <p className={clsx("text-sm font-semibold", retailerColor)}>
              Tick off each item as you add it to your {retailerName} cart
            </p>
            <p className="text-xs text-plate-ink-3 mt-1">
              On iPad: use Split View — {retailerName} on one side, this checklist on the other
            </p>
          </div>

          {/* Grouped checklist */}
          {orderedCategories.map((cat) => (
            <div key={cat} className="mb-2">
              <p className="text-xs font-semibold text-plate-ink-3 uppercase tracking-wider px-1 py-2">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <div className="bg-plate-surface rounded-2xl overflow-hidden border border-slate-100">
                {grouped[cat].map((item, idx) => {
                  const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
                  const net = (item.totalQuantity - (item.pantryContribution ?? 0)).toFixed(1);
                  const isChecked = checkedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleChecked(item.id)}
                      className={clsx(
                        "w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors active:bg-slate-100",
                        idx < grouped[cat].length - 1 && "border-b border-slate-100",
                        isChecked ? "bg-slate-50" : "bg-white"
                      )}
                    >
                      {isChecked
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className={clsx("text-sm font-medium truncate transition-colors", isChecked ? "text-slate-400 line-through" : "text-plate-ink")}>
                          {item.ingredientName}
                        </p>
                        {product && (
                          <p className={clsx("text-xs truncate mt-0.5 transition-colors", isChecked ? "text-slate-300" : "text-plate-ink-3")}>
                            {product.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={clsx("text-xs transition-colors", isChecked ? "text-slate-300" : "text-plate-ink-3")}>
                          {net} {item.unit}
                        </p>
                        {product && (
                          <p className={clsx("text-sm font-semibold transition-colors", isChecked ? "text-slate-300" : "text-plate-ink")}>
                            A${product.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {checkedCount === confirmedItems.length && confirmedItems.length > 0 && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-4 text-center mt-4">
              <p className="text-emerald-700 font-bold text-base">All done! 🎉</p>
              <p className="text-emerald-600 text-sm mt-1">Everything is in your {retailerName} cart.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-8 pt-4 bg-plate-surface/90 backdrop-blur-sm border-t border-plate-line z-10 space-y-2">
          {remainingCount > 0 && (
            <p className="text-center text-xs text-plate-ink-3">
              {remainingCount} item{remainingCount !== 1 ? "s" : ""} still to add
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={shareList}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-plate-line text-sm font-medium text-plate-ink-2 hover:bg-plate-surface-tertiary transition-colors flex-shrink-0"
            >
              {shared ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              {shared ? "Shared!" : "Share list"}
            </button>
            <a
              href={retailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-plate-ink text-white font-semibold px-4 py-3 rounded-2xl text-sm"
            >
              Open {retailerName} <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          <Button fullWidth variant="secondary" onClick={() => router.push("/orders")}>
            View order history
          </Button>
        </div>
      </div>
    );
  }

  // ── Pre-checkout review ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-plate-bg pb-36">
      {/* Header */}
      <div className="bg-plate-surface px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-plate-line">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-plate-surface-tertiary flex items-center justify-center text-plate-ink-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-plate-ink">Review order</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Store banner */}
        <div className={clsx(
          "rounded-3xl p-4 flex items-center gap-3",
          currentCart.retailer === "woolworths" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        )}>
          <ShoppingBag className={clsx("w-8 h-8", retailerColor)} />
          <div className="flex-1">
            <p className={clsx("font-bold", retailerColor)}>{retailerName}</p>
            <p className="text-xs text-plate-ink-2">
              {confirmedItems.length} items · A${currentCart.estimatedTotal.toFixed(2)} estimated
            </p>
          </div>
          <Badge variant={currentCart.retailer === "woolworths" ? "green" : "red"}>
            {confirmedItems.length} items
          </Badge>
        </div>

        {/* Pantry savings */}
        {pantrySavings > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <Leaf className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">
              A${pantrySavings.toFixed(2)} covered by your pantry — not buying these
            </p>
          </div>
        )}

        {/* Grouped item list */}
        {orderedCategories.map((cat) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-plate-ink-3 uppercase tracking-wider px-1 py-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>
            <div className="bg-plate-surface rounded-3xl overflow-hidden shadow-card divide-y divide-slate-100">
              {grouped[cat].map((item) => {
                const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
                const net = (item.totalQuantity - (item.pantryContribution ?? 0)).toFixed(1);
                return (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-plate-ink truncate">{item.ingredientName}</p>
                      {product && <p className="text-xs text-plate-ink-3 truncate mt-0.5">{product.name}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-plate-ink-3">{net} {item.unit}</p>
                      {product && <p className="text-sm font-semibold text-plate-ink">A${product.price.toFixed(2)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bg-plate-surface rounded-2xl px-4 py-3 flex justify-between border border-slate-100">
          <span className="text-sm font-medium text-plate-ink">Estimated total</span>
          <span className="text-sm font-bold text-plate-ink">A${currentCart.estimatedTotal.toFixed(2)}</span>
        </div>

        <p className="text-xs text-plate-ink-3 text-center px-4">
          Prices are estimates. Final price confirmed by {retailerName} at checkout. Delivery fees not included.
        </p>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-8 pt-4 bg-plate-surface/90 backdrop-blur-sm border-t border-plate-line z-10 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={shareList}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-plate-line text-sm font-medium text-plate-ink-2 hover:bg-plate-surface-tertiary transition-colors flex-shrink-0"
          >
            {shared ? <Check className="w-4 h-4 text-emerald-600" /> : copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            {shared ? "Shared!" : copied ? "Copied!" : "Share list"}
          </button>
          <a
            href={retailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-plate-ink text-white font-semibold px-4 py-3 rounded-2xl text-sm"
          >
            Open {retailerName} <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
        <button
          onClick={markAsOrdered}
          className="w-full py-3.5 rounded-2xl bg-plate-lime border border-plate-ink text-plate-ink font-bold text-sm shadow-[2px_2px_0_#1A1410] hover:translate-y-px hover:shadow-[1px_1px_0_#1A1410] transition-all"
        >
          Start shopping checklist →
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { estimatePantrySavings } from "@/lib/cartAggregator";
import type { Order } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeft, ShoppingBag, ArrowUpRight, Copy, Check, Leaf, ExternalLink, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

function getProductSearchUrl(product: { retailer: string; name: string }): string {
  const searchName = product.name.replace(/^(woolworths|coles)\s+/i, "").trim();
  const encoded = encodeURIComponent(searchName);
  return product.retailer === "woolworths"
    ? `https://www.woolworths.com.au/shop/search/products?searchTerm=${encoded}`
    : `https://www.coles.com.au/search?q=${encoded}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const currentCart = useAppStore((s) => s.currentCart);
  const setOrder = useAppStore((s) => s.setOrder);
  const [copied, setCopied] = useState(false);
  const [marked, setMarked] = useState(false);

  if (!currentCart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-ink-secondary">No cart to review</p>
        <Button onClick={() => router.push("/cart")}>Go to Cart</Button>
      </div>
    );
  }

  const retailerName = currentCart.retailer === "woolworths" ? "Woolworths" : "Coles";
  const retailerColor = currentCart.retailer === "woolworths" ? "text-green-600" : "text-red-500";
  const retailerUrl = currentCart.retailer === "woolworths"
    ? "https://www.woolworths.com.au/shop/browse/fruit-veg"
    : "https://www.coles.com.au/browse/fruit-vegetables";
  const confirmedItems = currentCart.items.filter(
    (i) => !i.isStaple && (i.pantryContribution ?? 0) < i.totalQuantity && i.substituteApproved !== false
  );
  const pantrySavings = estimatePantrySavings(currentCart.items);

  function copyList() {
    const lines = confirmedItems.map((item) => {
      const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
      const net = (item.totalQuantity - (item.pantryContribution ?? 0)).toFixed(1);
      return `${item.ingredientName} — ${net} ${item.unit}${product ? ` (A$${product.price.toFixed(2)})` : ""}`;
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
  }

  if (marked) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Happy shopping!</h1>
            <p className="text-ink-secondary mt-2 text-sm leading-relaxed">
              Your order has been saved to history. Head to {retailerName} to add items to your cart.
            </p>
          </div>
          <a
            href={retailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm"
          >
            Open {retailerName} <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
        <div className="px-5 pb-10">
          <Button fullWidth variant="secondary" onClick={() => router.push("/orders")}>
            View order history
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary pb-36">
      {/* Header */}
      <div className="bg-surface px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface-tertiary flex items-center justify-center text-ink-secondary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-ink">Shopping Guide</h1>
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
            <p className="text-xs text-ink-secondary">
              Add items to your basket and checkout on their website
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

        {/* Full item list with links */}
        <div className="bg-surface rounded-3xl overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Items to buy</p>
            <p className="text-xs text-ink-tertiary">Tap to search on {retailerName}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {confirmedItems.map((item) => {
              const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
              const searchUrl = product ? getProductSearchUrl(product) : null;
              const net = (item.totalQuantity - (item.pantryContribution ?? 0)).toFixed(1);
              return (
                <a
                  key={item.id}
                  href={searchUrl ?? "#"}
                  target={searchUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={clsx("px-4 py-3 flex items-center gap-3", searchUrl ? "hover:bg-surface-tertiary/50 transition-colors" : "pointer-events-none")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.ingredientName}</p>
                    {product && <p className="text-xs text-ink-tertiary truncate mt-0.5">{product.name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-ink-tertiary">{net} {item.unit}</p>
                    {product && <p className="text-sm font-semibold text-ink">A${product.price.toFixed(2)}</p>}
                  </div>
                  {searchUrl && <ExternalLink className="w-3.5 h-3.5 text-ink-tertiary/50 flex-shrink-0" />}
                </a>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex justify-between">
            <span className="text-sm font-medium text-ink">Estimated total</span>
            <span className="text-sm font-bold text-ink">A${currentCart.estimatedTotal.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-xs text-ink-tertiary text-center px-4">
          Prices are estimates. Final price confirmed by {retailerName} at checkout. Delivery fees not included.
        </p>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-8 pt-4 bg-surface/90 backdrop-blur-sm border-t border-slate-100 z-10 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={copyList}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-ink-secondary hover:bg-surface-tertiary transition-colors flex-shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy list"}
          </button>
          <a
            href={retailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-4 py-3 rounded-2xl text-sm"
          >
            Open {retailerName} <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
        <button
          onClick={markAsOrdered}
          className="w-full py-3 rounded-2xl border border-slate-200 text-sm font-medium text-ink-secondary hover:bg-surface-tertiary transition-colors"
        >
          Mark as ordered & save to history
        </button>
      </div>
    </div>
  );
}

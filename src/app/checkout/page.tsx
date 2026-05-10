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
      <div className="min-h-screen bg-plate-bg pb-36">
        {/* Header */}
        <div className="bg-plate-surface px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-plate-line">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-plate-lime flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-plate-ink" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-plate-ink">Shopping guide</h1>
              <p className="text-xs text-plate-ink-3">Tap each item to search in {retailerName}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          <div className={clsx(
            "rounded-2xl px-4 py-3 text-sm",
            currentCart.retailer === "woolworths" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          )}>
            <p className={clsx("font-semibold", retailerColor)}>
              Tap each item below — it opens a search in the {retailerName} app. Add it to your basket, then come back for the next one.
            </p>
          </div>

          <div className="bg-plate-surface rounded-3xl overflow-hidden shadow-card">
            <div className="px-4 py-3 border-b border-plate-line flex items-center justify-between">
              <p className="text-xs font-semibold text-plate-ink-3 uppercase tracking-wider">
                {confirmedItems.length} items to buy
              </p>
              <p className="text-sm font-bold text-plate-ink">A${currentCart.estimatedTotal.toFixed(2)}</p>
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
                    className={clsx(
                      "px-4 py-3.5 flex items-center gap-3",
                      searchUrl ? "hover:bg-plate-surface-tertiary/50 active:bg-plate-surface-tertiary transition-colors" : "pointer-events-none opacity-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-plate-ink truncate">{item.ingredientName}</p>
                      {product && <p className="text-xs text-plate-ink-3 truncate mt-0.5">{product.name}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 mr-1">
                      <p className="text-xs text-plate-ink-3">{net} {item.unit}</p>
                      {product && <p className="text-sm font-semibold text-plate-ink">A${product.price.toFixed(2)}</p>}
                    </div>
                    {searchUrl && <ExternalLink className="w-4 h-4 text-plate-ink-3/60 flex-shrink-0" />}
                  </a>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-plate-ink-3 text-center px-4">
            Prices are estimates. Final price confirmed by {retailerName} at checkout.
          </p>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-8 pt-4 bg-plate-surface/90 backdrop-blur-sm border-t border-plate-line z-10 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={copyList}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-plate-line text-sm font-medium text-plate-ink-2 hover:bg-plate-surface-tertiary transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy list"}
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
          <h1 className="text-xl font-bold text-plate-ink">Shopping Guide</h1>
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
        <div className="bg-plate-surface rounded-3xl overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-plate-line flex items-center justify-between">
            <p className="text-xs font-semibold text-plate-ink-3 uppercase tracking-wider">Items to buy</p>
            <p className="text-xs text-plate-ink-3">Tap to search on {retailerName}</p>
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
                  className={clsx("px-4 py-3 flex items-center gap-3", searchUrl ? "hover:bg-plate-surface-tertiary/50 transition-colors" : "pointer-events-none")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-plate-ink truncate">{item.ingredientName}</p>
                    {product && <p className="text-xs text-plate-ink-3 truncate mt-0.5">{product.name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-plate-ink-3">{net} {item.unit}</p>
                    {product && <p className="text-sm font-semibold text-plate-ink">A${product.price.toFixed(2)}</p>}
                  </div>
                  {searchUrl && <ExternalLink className="w-3.5 h-3.5 text-plate-ink-3/50 flex-shrink-0" />}
                </a>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-plate-line flex justify-between">
            <span className="text-sm font-medium text-plate-ink">Estimated total</span>
            <span className="text-sm font-bold text-plate-ink">A${currentCart.estimatedTotal.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-xs text-plate-ink-3 text-center px-4">
          Prices are estimates. Final price confirmed by {retailerName} at checkout. Delivery fees not included.
        </p>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-8 pt-4 bg-plate-surface/90 backdrop-blur-sm border-t border-plate-line z-10 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={copyList}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-plate-line text-sm font-medium text-plate-ink-2 hover:bg-plate-surface-tertiary transition-colors flex-shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy list"}
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
          className="w-full py-3 rounded-2xl border border-plate-line text-sm font-medium text-plate-ink-2 hover:bg-plate-surface-tertiary transition-colors"
        >
          Mark as ordered & save to history
        </button>
      </div>
    </div>
  );
}

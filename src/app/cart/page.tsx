"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { aggregateIngredients, estimateCartTotal, estimatePantrySavings } from "@/lib/cartAggregator";
import { matchAllIngredients, findSubstitute } from "@/lib/skuMatcher";
import type { Cart, CartItem } from "@/types";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ShoppingCart, AlertCircle, RefreshCw, Check, X, Leaf, ChevronDown, Settings, ExternalLink, Copy, Tag, ArrowUpRight, Circle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { CartSkeleton } from "@/components/ui/Skeleton";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { track } from "@/lib/analytics";

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

export default function CartPage() {
  const router = useRouter();
  const preferences = useAppStore((s) => s.preferences);
  const currentMealPlan = useAppStore((s) => s.currentMealPlan);
  const currentCart = useAppStore((s) => s.currentCart);
  const isBuildingCart = useAppStore((s) => s.isBuildingCart);
  const setCart = useAppStore((s) => s.setCart);
  const setBuildingCart = useAppStore((s) => s.setBuildingCart);
  const switchRetailer = useAppStore((s) => s.switchRetailer);
  const approveSubstitute = useAppStore((s) => s.approveSubstitute);
  const rejectSubstitute = useAppStore((s) => s.rejectSubstitute);
  const toggleItemHave = useAppStore((s) => s.toggleItemHave);
  const pantryItems = useAppStore((s) => s.pantryItems);
  const stapleIngredients = useAppStore((s) => s.stapleIngredients);

  const { pullY, progress, refreshing } = usePullToRefresh(() => buildCart());

  const [pantryExpanded, setPantryExpanded] = useState(false);
  const [priceComparison, setPriceComparison] = useState<{ savings: number; cheaperStore: import("@/types").Retailer } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentMealPlan && !currentCart) buildCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMealPlan]);

  function buildCart(overrideRetailer?: "woolworths" | "coles") {
    if (!currentMealPlan || !preferences) return;
    setBuildingCart(true);
    try {
      const retailer = overrideRetailer ?? preferences.preferredStore;
      const allIngredients = currentMealPlan.meals.flatMap((m) => m.recipe.ingredients.map((i) => i.name));
      const mappings = matchAllIngredients(Array.from(new Set(allIngredients)), retailer);
      const productMappings = new Map(
        Array.from(mappings.entries()).map(([key, val]) => [key, { product: val.product, confidence: val.confidence }])
      );
      const items = aggregateIngredients(
        currentMealPlan.meals,
        currentMealPlan.snacks,
        productMappings,
        stapleIngredients,
        pantryItems
      );

      const itemsWithSubs: CartItem[] = items.map((item) => {
        if (item.isUnavailable && item.matchedProduct) {
          const sub = findSubstitute(item.matchedProduct, retailer);
          return { ...item, substitute: sub ?? undefined };
        }
        return item;
      });

      const currentTotal = estimateCartTotal(itemsWithSubs);
      const cart: Cart = {
        id: `cart-${Date.now()}`,
        retailer,
        items: itemsWithSubs,
        estimatedTotal: currentTotal,
        createdAt: Date.now(),
        mealPlanId: currentMealPlan.id,
      };
      setCart(cart);
      toast.success("Cart updated");
      track("cart_built", { item_count: itemsWithSubs.length, retailer });
      // Auto-save to server (best-effort)
      fetch("/api/user/carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart }),
      }).catch(() => {});

      // Price comparison: build the other retailer's cart silently
      const otherRetailer = retailer === "woolworths" ? "coles" : "woolworths";
      const otherMappings = matchAllIngredients(Array.from(new Set(allIngredients)), otherRetailer);
      const otherProductMappings = new Map(
        Array.from(otherMappings.entries()).map(([k, v]) => [k, { product: v.product, confidence: v.confidence }])
      );
      const otherItems = aggregateIngredients(currentMealPlan.meals, currentMealPlan.snacks, otherProductMappings, stapleIngredients, pantryItems);
      const otherTotal = estimateCartTotal(otherItems);
      const diff = Math.abs(otherTotal - currentTotal);
      if (diff >= 0.5) {
        setPriceComparison({ savings: diff, cheaperStore: otherTotal < currentTotal ? otherRetailer : retailer });
      } else {
        setPriceComparison(null);
      }
    } finally {
      setBuildingCart(false);
    }
  }

  // Split items: things to buy vs things already covered
  const toBuyItems = currentCart?.items.filter(
    (i) => !i.isStaple && !i.markedAsHave && (i.pantryContribution ?? 0) < i.totalQuantity
  ) ?? [];
  const alreadyHaveItems = currentCart?.items.filter(
    (i) => i.isStaple || i.markedAsHave || (i.pantryContribution ?? 0) >= i.totalQuantity
  ) ?? [];

  function copyShoppingList() {
    if (!currentCart) return;
    const lines = toBuyItems.map((item) => {
      const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
      const net = (item.totalQuantity - (item.pantryContribution ?? 0)).toFixed(1);
      return `${item.ingredientName} — ${net} ${item.unit}${product ? ` (A$${product.price.toFixed(2)})` : ""}`;
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const groupedItems = toBuyItems.reduce<Record<string, CartItem[]>>((acc, item) => {
    const cat = item.matchedProduct?.category ?? "pantry";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const savings = currentCart ? estimatePantrySavings(currentCart.items) : 0;
  const unavailableItems = toBuyItems.filter((i) => i.isUnavailable);

  if (!currentMealPlan) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFF8EE", paddingBottom: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 20px" }}>
        <ShoppingCart size={48} color="#9C9087" />
        <p style={{ color: "#5C5249", textAlign: "center", fontSize: 15 }}>Generate a meal plan first to build your cart</p>
        <Button variant="lime" onClick={() => router.push("/plan")}>Go to Plan</Button>
        <BottomNav />
      </div>
    );
  }

  const storeName = preferences?.preferredStore === "woolworths" ? "Woolworths" : "Coles";

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8EE", paddingBottom: 160 }}>
      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div style={{
          position: "fixed", top: 0, left: "50%", transform: `translateX(-50%) translateY(${Math.min(pullY, 56) - 40}px)`,
          zIndex: 50, display: "flex", alignItems: "center", gap: 6,
          background: "#1A1410", color: "#FFF8EE", borderRadius: 999,
          padding: "8px 14px", fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transition: "opacity 0.1s",
          opacity: Math.min(progress * 1.5, 1),
        }}>
          <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none", transform: refreshing ? undefined : `rotate(${progress * 180}deg)` }} />
          {refreshing ? "Refreshing…" : "Pull to refresh"}
        </div>
      )}
      {/* TopBar */}
      <div style={{ padding: "54px 20px 14px 20px" }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          {toBuyItems.length} items · {currentMealPlan.meals.length} meals
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.03em", lineHeight: 1, margin: 0 }}>
            Weekly cart
          </h1>
          <button
            onClick={() => buildCart()}
            disabled={isBuildingCart}
            style={{
              width: 44, height: 44, borderRadius: 999,
              border: "1.5px solid #1A1410", background: "#FFFFFF",
              color: "#1A1410", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 2px 0 #1A1410", cursor: "pointer",
              opacity: isBuildingCart ? 0.5 : 1,
            }}
          >
            <RefreshCw size={16} style={{ animation: isBuildingCart ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Store toggle */}
        <div style={{ display: "flex", padding: 4, background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 999, boxShadow: "2px 2px 0 #1A1410" }}>
          {(["woolworths", "coles"] as const).map((store) => {
            const active = preferences?.preferredStore === store;
            return (
              <button
                key={store}
                onClick={() => { switchRetailer(store); buildCart(store); }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 999, cursor: "pointer", textAlign: "center",
                  background: active ? "#1A1410" : "transparent",
                  color: active ? "#FFF8EE" : "#1A1410",
                  border: "none", transition: "all 0.12s",
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>
                  {store === "woolworths" ? "Woolworths" : "Coles"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Price comparison — sticker card */}
        {priceComparison && currentCart && (
          <div style={{
            padding: "12px 14px", borderRadius: 18,
            background: priceComparison.cheaperStore === currentCart.retailer ? "#C8FF3E" : "#FFD66B",
            border: "1.5px solid #1A1410", boxShadow: "2px 2px 0 #1A1410",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Tag size={14} />
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.3 }}>
              {priceComparison.cheaperStore === currentCart.retailer ? (
                <span><strong style={{ fontFamily: "var(--font-display)" }}>You're at the cheapest store</strong> — saving A${priceComparison.savings.toFixed(2)} vs the alternative</span>
              ) : (
                <span>Switch to <strong style={{ fontFamily: "var(--font-display)" }}>{priceComparison.cheaperStore === "woolworths" ? "Woolworths" : "Coles"}</strong> and save A${priceComparison.savings.toFixed(2)}</span>
              )}
            </div>
            {priceComparison.cheaperStore !== currentCart.retailer && (
              <button
                onClick={() => { switchRetailer(priceComparison.cheaperStore); buildCart(); }}
                style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, background: "#1A1410", color: "#FFF8EE", border: "none", borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}
              >
                Switch
              </button>
            )}
          </div>
        )}

        {/* Pantry savings — sticker card */}
        {savings > 0 && (
          <div style={{
            padding: "12px 14px", borderRadius: 18, background: "#C8FF3E",
            border: "1.5px solid #1A1410", boxShadow: "2px 2px 0 #1A1410",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Leaf size={14} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>
                Saved A${savings.toFixed(2)} from pantry
              </div>
              <div style={{ fontSize: 11, color: "#5C5249", marginTop: 2 }}>
                {alreadyHaveItems.length} item{alreadyHaveItems.length !== 1 ? "s" : ""} already covered
              </div>
            </div>
            <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", cursor: "pointer", color: "#1A1410" }}>
              <Settings size={14} />
            </button>
          </div>
        )}

        {/* Price disclaimer */}
        {!isBuildingCart && currentCart && (
          <div style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(26,20,16,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#9C9087", lineHeight: 1.4 }}>
              ⚠️ Prices are estimates from a static catalogue and may not reflect current supermarket prices.
            </span>
          </div>
        )}

        {/* Empty cart state */}
        {!isBuildingCart && currentCart && toBuyItems.length === 0 && alreadyHaveItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", gap: 12, textAlign: "center" }}>
            <span style={{ fontSize: 40 }}>🥬</span>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#1A1410" }}>All covered!</p>
            <p style={{ fontSize: 13, color: "#9C9087", maxWidth: 260 }}>Everything in your plan is already in your pantry or staples.</p>
            <button onClick={() => router.push("/settings/pantry")} style={{ fontSize: 13, fontWeight: 600, color: "#FF6B4A", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-display)" }}>
              Edit pantry →
            </button>
          </div>
        )}

        {/* "Got it" hint */}
        {!isBuildingCart && currentCart && toBuyItems.length > 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 16, background: "#FFFFFF", border: "1px solid #EDE4D5", display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={14} color="#9C9087" />
            <p style={{ fontSize: 12, color: "#5C5249", margin: 0, lineHeight: 1.4 }}>
              Tap <strong>○</strong> on any item you already have to remove it from your list.
            </p>
          </div>
        )}

        {isBuildingCart && <CartSkeleton />}

        {!isBuildingCart && currentCart && (
          <>
            {/* Substitution alerts */}
            {unavailableItems.filter((i) => i.substituteApproved === undefined).map((item) => (
              <div key={item.id} style={{ padding: 16, borderRadius: 18, background: "#FFD66B", border: "1.5px solid #1A1410", boxShadow: "2px 2px 0 #1A1410" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, margin: 0 }}>{item.matchedProduct?.name} is unavailable</p>
                    {item.substitute && (
                      <p style={{ fontSize: 12, color: "#5C5249", marginTop: 4 }}>
                        Substitute: <strong>{item.substitute.name}</strong> (A${item.substitute.price.toFixed(2)})
                      </p>
                    )}
                  </div>
                </div>
                {item.substitute && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => approveSubstitute(item.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 12, background: "#1A1410", color: "#FFF8EE", border: "none", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      <Check size={12} /> Accept
                    </button>
                    <button
                      onClick={() => rejectSubstitute(item.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 12, background: "rgba(0,0,0,0.08)", color: "#1A1410", border: "none", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Cart items by category */}
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, padding: "0 4px" }}>
                  <span className="eyebrow">{CATEGORY_LABELS[category] ?? category}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9C9087" }}>{items.length} items</span>
                </div>
                <div style={{ background: "#FFFFFF", borderRadius: 18, border: "1px solid #EDE4D5", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 28px -12px rgba(26,20,16,0.12)" }}>
                  {items.map((item, idx) => (
                    <CartItemRow key={item.id} item={item} onToggleHave={() => { haptic("light"); toggleItemHave(item.id); }} last={idx === items.length - 1} />
                  ))}
                </div>
              </div>
            ))}

            {/* Already have section */}
            {alreadyHaveItems.length > 0 && (
              <div>
                <button
                  onClick={() => setPantryExpanded((v) => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 4px", background: "none", border: "none", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Leaf size={12} color="#2D5A3D" />
                    <span className="eyebrow" style={{ color: "#2D5A3D" }}>Already have ({alreadyHaveItems.length})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, color: "#FF6B4A", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); router.push("/settings"); }}>Edit pantry</span>
                    <ChevronDown size={14} color="#9C9087" style={{ transform: pantryExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                </button>
                {pantryExpanded && (
                  <div style={{ background: "#FFFFFF", borderRadius: 18, border: "1px solid #EDE4D5", overflow: "hidden" }}>
                    {alreadyHaveItems.map((item) => (
                      <PantryItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Checkout footer — dark ink card */}
      {currentCart && !isBuildingCart && (
        <div style={{ position: "fixed", bottom: 82, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, padding: "0 16px", zIndex: 10 }}>
          <div style={{ background: "#1A1410", borderRadius: 22, border: "1.5px solid #1A1410", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div className="eyebrow" style={{ color: "rgba(255,248,238,0.55)" }}>Total · {toBuyItems.length} items</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "#FFF8EE", letterSpacing: "-0.02em", lineHeight: 1, marginTop: 2 }}>
                  A${currentCart.estimatedTotal.toFixed(2)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {savings > 0 && (
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, background: "#C8FF3E", color: "#1A1410", padding: "4px 10px", borderRadius: 999, border: "1.5px solid rgba(255,248,238,0.3)" }}>
                    A${savings.toFixed(2)} saved
                  </span>
                )}
                <button
                  onClick={copyShoppingList}
                  style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,248,238,0.12)", border: "1.5px solid rgba(255,248,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  {copied ? <Check size={14} color="#C8FF3E" /> : <Copy size={14} color="rgba(255,248,238,0.7)" />}
                </button>
              </div>
            </div>
            <button
              onClick={() => { track("checkout_opened", { retailer: currentCart.retailer }); router.push("/checkout"); }}
              style={{
                width: "100%", height: 52, borderRadius: 999,
                background: "#C8FF3E", border: "none", cursor: "pointer",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#1A1410",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              Checkout with {storeName} <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function getProductSearchUrl(product: { retailer: string; name: string }): string {
  const searchName = product.name.replace(/^(woolworths|coles)\s+/i, "").trim();
  const encoded = encodeURIComponent(searchName);
  return product.retailer === "woolworths"
    ? `https://www.woolworths.com.au/shop/search/products?searchTerm=${encoded}`
    : `https://www.coles.com.au/search?q=${encoded}`;
}

function CartItemRow({ item, onToggleHave, last }: { item: CartItem; onToggleHave: () => void; last?: boolean }) {
  const activeProduct = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
  const netQty = item.totalQuantity - (item.pantryContribution ?? 0);
  const searchUrl = activeProduct ? getProductSearchUrl(activeProduct) : null;
  const unavailable = item.isUnavailable && item.substituteApproved === false;

  const content = (
    <div className={clsx("flex-1 flex items-center gap-3 px-4 py-3 min-w-0", unavailable && "opacity-40")}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-plate-ink truncate">{item.ingredientName}</p>
        {activeProduct ? (
          <p className="text-xs text-plate-ink-3 truncate mt-0.5">{activeProduct.name}</p>
        ) : (
          <p className="text-xs text-orange-500 mt-0.5">No match found</p>
        )}
        {(item.pantryContribution ?? 0) > 0 && (
          <p className="text-xs text-plate-leaf mt-0.5">
            {item.pantryContribution?.toFixed(1)} {item.unit} from pantry
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-plate-ink-3">{netQty.toFixed(1)} {item.unit}</p>
        {activeProduct && (
          <p className="text-sm font-semibold text-plate-ink">A${activeProduct.price.toFixed(2)}</p>
        )}
      </div>
      {item.substituteApproved === true && (
        <Badge variant="orange" className="ml-1 flex-shrink-0">Sub</Badge>
      )}
      {searchUrl && <ExternalLink className="w-3.5 h-3.5 text-plate-ink-3/50 flex-shrink-0" />}
    </div>
  );

  return (
    <div className="flex items-center divide-x divide-slate-100">
      {searchUrl ? (
        <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 hover:bg-plate-surface-tertiary/50 transition-colors">
          {content}
        </a>
      ) : (
        <div className="flex-1 min-w-0">{content}</div>
      )}
      <button
        onClick={onToggleHave}
        className="px-4 py-3 flex-shrink-0 flex items-center justify-center hover:bg-plate-surface-tertiary/50 transition-colors"
        title={item.markedAsHave ? "Mark as needed" : "I've got this"}
      >
        {item.markedAsHave
          ? <CheckCircle2 className="w-5 h-5 text-plate-ink" />
          : <Circle className="w-5 h-5 text-slate-300" />
        }
      </button>
    </div>
  );
}

function PantryItemRow({ item }: { item: CartItem }) {
  const product = item.matchedProduct;
  return (
    <div className="px-4 py-3 flex items-center gap-3 opacity-60">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-plate-ink truncate line-through">{item.ingredientName}</p>
        <p className="text-xs text-plate-leaf mt-0.5">
          {item.isStaple ? "Kitchen staple" : `${item.pantryContribution?.toFixed(1)} ${item.unit} in pantry`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        {product && (
          <p className="text-sm text-plate-ink-3 line-through">A${product.price.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
}

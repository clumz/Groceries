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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ShoppingCart, AlertCircle, ChevronRight, RefreshCw, Check, X, Leaf, ChevronDown, Settings, ExternalLink, Copy, Tag, ArrowUpRight } from "lucide-react";
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
  const pantryItems = useAppStore((s) => s.pantryItems);
  const stapleIngredients = useAppStore((s) => s.stapleIngredients);

  const [pantryExpanded, setPantryExpanded] = useState(false);
  const [priceComparison, setPriceComparison] = useState<{ savings: number; cheaperStore: import("@/types").Retailer } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentMealPlan && !currentCart) buildCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMealPlan]);

  function buildCart() {
    if (!currentMealPlan || !preferences) return;
    setBuildingCart(true);
    try {
      const retailer = preferences.preferredStore;
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
    (i) => !i.isStaple && (i.pantryContribution ?? 0) < i.totalQuantity
  ) ?? [];
  const alreadyHaveItems = currentCart?.items.filter(
    (i) => i.isStaple || (i.pantryContribution ?? 0) >= i.totalQuantity
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
      <div className="min-h-screen pb-24 flex flex-col items-center justify-center gap-4 px-5">
        <ShoppingCart className="w-12 h-12 text-ink-tertiary" />
        <p className="text-ink-secondary text-center">Generate a meal plan first to build your cart</p>
        <Button onClick={() => router.push("/plan")}>Go to Plan</Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary pb-36">
      {/* Header */}
      <div className="bg-surface px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Your Cart</h1>
          <div className="flex items-center gap-2">
            {/* Store selector */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-medium">
              {(["woolworths", "coles"] as const).map((store) => (
                <button
                  key={store}
                  onClick={() => { switchRetailer(store); buildCart(); }}
                  className={clsx(
                    "px-3 py-1.5 capitalize transition-colors",
                    preferences?.preferredStore === store
                      ? store === "woolworths" ? "bg-green-600 text-white" : "bg-red-500 text-white"
                      : "text-ink-secondary hover:bg-surface-tertiary"
                  )}
                >
                  {store === "woolworths" ? "Woolies" : "Coles"}
                </button>
              ))}
            </div>
            <button
              onClick={buildCart}
              disabled={isBuildingCart}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-tertiary text-ink-secondary hover:bg-slate-200 disabled:opacity-50"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", isBuildingCart && "animate-spin")} />
            </button>
          </div>
        </div>
        {currentCart && (
          <p className="text-xs text-ink-tertiary mt-1">
            {toBuyItems.length} items to buy · {currentMealPlan.meals.length} meals
          </p>
        )}
        {/* Price comparison banner */}
        {priceComparison && currentCart && (
          <div className={clsx(
            "mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
            priceComparison.cheaperStore === currentCart.retailer
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          )}>
            <Tag className="w-3.5 h-3.5 flex-shrink-0" />
            {priceComparison.cheaperStore === currentCart.retailer ? (
              <span>Already at the cheaper store — saving A${priceComparison.savings.toFixed(2)} vs {currentCart.retailer === "woolworths" ? "Coles" : "Woolworths"}</span>
            ) : (
              <>
                <span className="flex-1">Switch to {priceComparison.cheaperStore === "woolworths" ? "Woolies" : "Coles"} and save A${priceComparison.savings.toFixed(2)}</span>
                <button
                  onClick={() => { switchRetailer(priceComparison.cheaperStore); buildCart(); }}
                  className="flex-shrink-0 font-semibold underline"
                >
                  Switch
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {isBuildingCart && (
          <div className="flex flex-col items-center py-16 gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-ink-secondary">Building your cart…</p>
          </div>
        )}

        {!isBuildingCart && currentCart && (
          <>
            {/* Pantry savings banner */}
            {savings > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                <Leaf className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800">
                    Saved A${savings.toFixed(2)} using your pantry
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {alreadyHaveItems.length} ingredient{alreadyHaveItems.length !== 1 ? "s" : ""} covered by staples or carry-forward stock
                  </p>
                </div>
                <button
                  onClick={() => router.push("/settings")}
                  className="flex-shrink-0"
                >
                  <Settings className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
            )}

            {/* Substitution alerts */}
            {unavailableItems.filter((i) => i.substituteApproved === undefined).map((item) => (
              <div key={item.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-start gap-2.5 mb-3">
                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">{item.matchedProduct?.name} is unavailable</p>
                    {item.substitute && (
                      <p className="text-xs text-orange-700 mt-0.5">
                        Suggested substitute: <strong>{item.substitute.name}</strong> (A${item.substitute.price.toFixed(2)})
                      </p>
                    )}
                  </div>
                </div>
                {item.substitute && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveSubstitute(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-600 text-white text-xs font-medium"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept substitute
                    </button>
                    <button
                      onClick={() => rejectSubstitute(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-100 text-orange-800 text-xs font-medium"
                    >
                      <X className="w-3.5 h-3.5" /> Remove item
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Cart items by category */}
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="bg-surface rounded-3xl overflow-hidden shadow-card">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
                    {CATEGORY_LABELS[category] ?? category}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <CartItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}

            {/* Already have section */}
            {alreadyHaveItems.length > 0 && (
              <div className="bg-surface rounded-3xl overflow-hidden shadow-card">
                <button
                  onClick={() => setPantryExpanded((v) => !v)}
                  className="w-full px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                      Already in your kitchen ({alreadyHaveItems.length})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push("/settings"); }}
                      className="text-xs text-ink-tertiary hover:text-brand-600"
                    >
                      Edit
                    </button>
                    <ChevronDown className={clsx("w-4 h-4 text-ink-tertiary transition-transform", pantryExpanded && "rotate-180")} />
                  </div>
                </button>
                {pantryExpanded && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
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

      {/* Checkout footer */}
      {currentCart && !isBuildingCart && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-2 z-10">
          <div className="bg-surface rounded-3xl shadow-elevated px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-ink-secondary">Estimated total</span>
              <div className="text-right">
                {savings > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">A${savings.toFixed(2)} saved</p>
                )}
                <span className="text-xl font-bold text-ink">A${currentCart.estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyShoppingList}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-ink-secondary hover:bg-surface-tertiary transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <Button
                fullWidth
                size="xl"
                onClick={() => router.push("/checkout")}
              >
                Shop at {preferences?.preferredStore === "woolworths" ? "Woolworths" : "Coles"}
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-ink-tertiary text-center mt-2">We'll open your items on {preferences?.preferredStore === "woolworths" ? "Woolworths" : "Coles"} — add them to your basket there.</p>
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

function CartItemRow({ item }: { item: CartItem }) {
  const activeProduct = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
  const netQty = item.totalQuantity - (item.pantryContribution ?? 0);
  const searchUrl = activeProduct ? getProductSearchUrl(activeProduct) : null;

  const inner = (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{item.ingredientName}</p>
        {activeProduct ? (
          <p className="text-xs text-ink-tertiary truncate mt-0.5">{activeProduct.name}</p>
        ) : (
          <p className="text-xs text-orange-500 mt-0.5">No match found</p>
        )}
        {(item.pantryContribution ?? 0) > 0 && (
          <p className="text-xs text-emerald-600 mt-0.5">
            {item.pantryContribution?.toFixed(1)} {item.unit} from pantry
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-ink-tertiary">{netQty.toFixed(1)} {item.unit}</p>
        {activeProduct && (
          <p className="text-sm font-semibold text-ink">A${activeProduct.price.toFixed(2)}</p>
        )}
      </div>
      {item.substituteApproved === true && (
        <Badge variant="orange" className="ml-1 flex-shrink-0">Sub</Badge>
      )}
      {searchUrl && <ExternalLink className="w-3.5 h-3.5 text-ink-tertiary/50 flex-shrink-0 ml-1" />}
    </>
  );

  if (searchUrl) {
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx("px-4 py-3 flex items-center gap-3 hover:bg-surface-tertiary/50 transition-colors", item.isUnavailable && item.substituteApproved === false && "opacity-40")}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className={clsx("px-4 py-3 flex items-center gap-3", item.isUnavailable && item.substituteApproved === false && "opacity-40")}>
      {inner}
    </div>
  );
}

function PantryItemRow({ item }: { item: CartItem }) {
  const product = item.matchedProduct;
  return (
    <div className="px-4 py-3 flex items-center gap-3 opacity-60">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate line-through">{item.ingredientName}</p>
        <p className="text-xs text-emerald-600 mt-0.5">
          {item.isStaple ? "Kitchen staple" : `${item.pantryContribution?.toFixed(1)} ${item.unit} in pantry`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        {product && (
          <p className="text-sm text-ink-tertiary line-through">A${product.price.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
}

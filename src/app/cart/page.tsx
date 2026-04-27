"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { aggregateIngredients, estimateCartTotal } from "@/lib/cartAggregator";
import { matchAllIngredients, findSubstitute } from "@/lib/skuMatcher";
import type { Cart, CartItem } from "@/types";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ShoppingCart, AlertCircle, ChevronRight, RefreshCw, Check, X } from "lucide-react";
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

  useEffect(() => {
    if (currentMealPlan && !currentCart) buildCart();
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
      const items = aggregateIngredients(currentMealPlan.meals, currentMealPlan.snacks, productMappings);

      // Add substitutes for unavailable items
      const itemsWithSubs: CartItem[] = items.map((item) => {
        if (item.isUnavailable && item.matchedProduct) {
          const sub = findSubstitute(item.matchedProduct, retailer);
          return { ...item, substitute: sub ?? undefined };
        }
        return item;
      });

      const cart: Cart = {
        id: `cart-${Date.now()}`,
        retailer,
        items: itemsWithSubs,
        estimatedTotal: estimateCartTotal(itemsWithSubs),
        createdAt: Date.now(),
        mealPlanId: currentMealPlan.id,
      };
      setCart(cart);
    } finally {
      setBuildingCart(false);
    }
  }

  const groupedItems = currentCart
    ? currentCart.items.reduce<Record<string, CartItem[]>>((acc, item) => {
        const cat = item.matchedProduct?.category ?? "pantry";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {})
    : {};

  const unavailableItems = currentCart?.items.filter((i) => i.isUnavailable) ?? [];

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
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-slate-100">
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
            {currentCart.items.length} items · {currentMealPlan.meals.length} meals
          </p>
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
              <div key={category} className="bg-white rounded-3xl overflow-hidden shadow-card">
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
          </>
        )}
      </div>

      {/* Checkout footer */}
      {currentCart && !isBuildingCart && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-2 z-10">
          <div className="bg-white rounded-3xl shadow-elevated px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-ink-secondary">Estimated total</span>
              <span className="text-xl font-bold text-ink">A${currentCart.estimatedTotal.toFixed(2)}</span>
            </div>
            <Button
              fullWidth
              size="xl"
              onClick={() => router.push("/checkout")}
            >
              Place order with {preferences?.preferredStore === "woolworths" ? "Woolworths" : "Coles"}
              <ChevronRight className="w-5 h-5" />
            </Button>
            <p className="text-xs text-ink-tertiary text-center mt-2">Prices are estimates. Final price confirmed at checkout.</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function CartItemRow({ item }: { item: CartItem }) {
  const activeProduct = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;

  return (
    <div className={clsx("px-4 py-3 flex items-center gap-3", item.isUnavailable && item.substituteApproved === false && "opacity-40")}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{item.ingredientName}</p>
        {activeProduct ? (
          <p className="text-xs text-ink-tertiary truncate mt-0.5">{activeProduct.name}</p>
        ) : (
          <p className="text-xs text-orange-500 mt-0.5">No match found</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-ink-tertiary">{item.totalQuantity.toFixed(1)} {item.unit}</p>
        {activeProduct && (
          <p className="text-sm font-semibold text-ink">A${activeProduct.price.toFixed(2)}</p>
        )}
      </div>
      {item.substituteApproved === true && (
        <Badge variant="orange" className="ml-1 flex-shrink-0">Sub</Badge>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import type { Order } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeft, MapPin, CalendarClock, ShoppingBag, CheckCircle2, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

function generateConfirmationNumber(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function getNextDeliveryDate(): { date: string; window: string } {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  return { date, window: "7:00 am – 10:00 am" };
}

export default function CheckoutPage() {
  const router = useRouter();
  const preferences = useAppStore((s) => s.preferences);
  const currentCart = useAppStore((s) => s.currentCart);
  const currentOrder = useAppStore((s) => s.currentOrder);
  const setOrder = useAppStore((s) => s.setOrder);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placed, setPlaced] = useState(!!currentOrder?.status === true && currentOrder?.status === "placed");

  if (!currentCart || !preferences) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-ink-secondary">No cart to checkout</p>
        <Button onClick={() => router.push("/cart")}>Go to Cart</Button>
      </div>
    );
  }

  const delivery = getNextDeliveryDate();
  const retailerName = currentCart.retailer === "woolworths" ? "Woolworths" : "Coles";
  const retailerColor = currentCart.retailer === "woolworths" ? "text-green-600" : "text-red-500";
  const confirmedItems = currentCart.items.filter((i) => i.substituteApproved !== false);

  async function handlePlaceOrder() {
    setIsPlacing(true);
    await new Promise((r) => setTimeout(r, 1800));
    const order: Order = {
      id: `order-${Date.now()}`,
      retailer: currentCart!.retailer,
      cart: currentCart!,
      status: "placed",
      estimatedDeliveryDate: delivery.date,
      estimatedDeliveryWindow: delivery.window,
      deliveryAddress: `${preferences!.suburb} ${preferences!.postcode}`,
      placedAt: Date.now(),
      confirmationNumber: generateConfirmationNumber(),
    };
    setOrder(order);
    setIsPlacing(false);
    setPlaced(true);
  }

  // Confirmation screen
  if (placed && currentOrder?.status === "placed") {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Order placed!</h1>
            <p className="text-ink-secondary mt-2 text-sm leading-relaxed">
              Your order has been sent to {retailerName}. You'll receive a confirmation email shortly.
            </p>
          </div>
          <div className="w-full bg-surface-tertiary rounded-3xl p-5 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Confirmation</span>
              <span className="font-mono font-semibold text-ink">{currentOrder.confirmationNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Retailer</span>
              <span className={clsx("font-semibold", retailerColor)}>{retailerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Items</span>
              <span className="font-semibold text-ink">{confirmedItems.length} items</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Total (est.)</span>
              <span className="font-semibold text-ink">A${currentCart.estimatedTotal.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-start gap-2 text-sm">
                <CalendarClock className="w-4 h-4 text-ink-tertiary mt-0.5" />
                <div>
                  <p className="font-medium text-ink">Delivery: {currentOrder.estimatedDeliveryDate}</p>
                  <p className="text-ink-tertiary text-xs">{currentOrder.estimatedDeliveryWindow}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm mt-2">
                <MapPin className="w-4 h-4 text-ink-tertiary" />
                <span className="text-ink">{currentOrder.deliveryAddress}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 pb-10">
          <Button fullWidth size="xl" onClick={() => router.push("/plan")}>
            Back to plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary pb-36">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface-tertiary flex items-center justify-center text-ink-secondary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-ink">Review & Place Order</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Store banner */}
        <div className={clsx(
          "rounded-3xl p-4 flex items-center gap-3",
          currentCart.retailer === "woolworths" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        )}>
          <ShoppingBag className={clsx("w-8 h-8", retailerColor)} />
          <div>
            <p className={clsx("font-bold", retailerColor)}>{retailerName}</p>
            <p className="text-xs text-ink-secondary">Home delivery</p>
          </div>
          <Badge variant={currentCart.retailer === "woolworths" ? "green" : "red"} className="ml-auto">
            {confirmedItems.length} items
          </Badge>
        </div>

        {/* Delivery details */}
        <div className="bg-white rounded-3xl p-4 shadow-card space-y-3">
          <h3 className="font-semibold text-ink">Delivery details</h3>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-ink-tertiary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink">
                {preferences.suburb}, {preferences.postcode}
              </p>
              <p className="text-xs text-ink-tertiary">Delivery address</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarClock className="w-4 h-4 text-ink-tertiary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink">{delivery.date}</p>
              <p className="text-xs text-ink-tertiary">{delivery.window} (earliest available)</p>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-3xl p-4 shadow-card">
          <h3 className="font-semibold text-ink mb-3">Order summary</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {confirmedItems.slice(0, 20).map((item) => {
              const product = item.substituteApproved && item.substitute ? item.substitute : item.matchedProduct;
              return (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-secondary truncate flex-1 mr-3">{item.ingredientName}</span>
                  <span className="text-ink font-medium flex-shrink-0">
                    {product ? `A$${product.price.toFixed(2)}` : "—"}
                  </span>
                </div>
              );
            })}
            {confirmedItems.length > 20 && (
              <p className="text-xs text-ink-tertiary text-center pt-1">
                + {confirmedItems.length - 20} more items
              </p>
            )}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
            <span className="font-medium text-ink">Estimated total</span>
            <span className="font-bold text-ink text-lg">A${currentCart.estimatedTotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            Final price confirmed by {retailerName} at checkout. Delivery fee not included.
          </p>
        </div>
      </div>

      {/* Place order footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-8 pt-4 bg-white/90 backdrop-blur-sm border-t border-slate-100 z-10">
        <Button
          fullWidth
          size="xl"
          loading={isPlacing}
          onClick={handlePlaceOrder}
        >
          {isPlacing ? "Placing order…" : `Place order with ${retailerName}`}
          {!isPlacing && <ChevronRight className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}

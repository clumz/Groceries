import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Order, Cart } from "@/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "52"), 52);
  const cursor = req.nextUrl.searchParams.get("cursor");

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { cart: true },
  });

  const hasMore = orders.length > limit;
  const page = hasMore ? orders.slice(0, limit) : orders;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({
    orders: page.map(dbOrderToClient),
    nextCursor,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const { order }: { order: Order } = await req.json();

  // Save the cart first if it doesn't exist
  const cartExists = await prisma.cart.findUnique({ where: { id: order.cart.id } });
  if (!cartExists) {
    await prisma.cart.create({
      data: {
        id: order.cart.id,
        userId,
        mealPlanId: order.cart.mealPlanId ?? null,
        retailer: order.cart.retailer,
        estimatedTotal: order.cart.estimatedTotal,
        items: order.cart.items as object,
      },
    });
  }

  const saved = await prisma.order.create({
    data: {
      id: order.id,
      userId,
      cartId: order.cart.id,
      retailer: order.retailer,
      status: order.status,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      estimatedDeliveryWindow: order.estimatedDeliveryWindow,
      deliveryAddress: order.deliveryAddress,
      placedAt: order.placedAt ? new Date(order.placedAt) : null,
      confirmationNumber: order.confirmationNumber ?? null,
    },
    include: { cart: true },
  });

  return NextResponse.json({ order: dbOrderToClient(saved) });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbOrderToClient(o: any): Order {
  const cart: Cart = {
    id: o.cart.id,
    retailer: o.cart.retailer,
    items: o.cart.items,
    estimatedTotal: o.cart.estimatedTotal,
    createdAt: o.cart.createdAt.getTime(),
    mealPlanId: o.cart.mealPlanId ?? "",
  };

  return {
    id: o.id,
    retailer: o.retailer,
    cart,
    status: o.status,
    estimatedDeliveryDate: o.estimatedDeliveryDate,
    estimatedDeliveryWindow: o.estimatedDeliveryWindow,
    deliveryAddress: o.deliveryAddress,
    placedAt: o.placedAt?.getTime(),
    confirmationNumber: o.confirmationNumber ?? undefined,
  };
}

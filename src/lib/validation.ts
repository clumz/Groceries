import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request-body schemas for the /api routes. Bounds are generous; they exist to
// turn junk input into a 400 instead of a Prisma 500 or an oversized row.

const id = z.string().min(1).max(200);
const shortText = z.string().max(200);
const tagList = z.array(z.string().max(60)).max(30);

const preferenceFields = {
  preferredStore: z.enum(["woolworths", "coles"]),
  suburb: shortText,
  postcode: z.string().max(10),
  dietaryRequirements: tagList,
  cuisinePreferences: tagList,
  proteinPreferences: tagList,
  householdSize: z.number().int().min(1).max(20),
  defaultServings: z.number().int().min(1).max(20),
  budgetRange: z.enum(["under-150", "150-250", "250-350", "350-plus"]),
  cookTimePreference: z.enum(["under-20", "20-40", "40-plus"]),
  includeLunches: z.boolean(),
  includeSnacks: z.boolean(),
  calorieGoal: z.number().min(0).max(10000).nullable().optional(),
  macroGoal: z
    .object({
      proteinPct: z.number().min(0).max(100),
      carbsPct: z.number().min(0).max(100),
      fatPct: z.number().min(0).max(100),
    })
    .nullable()
    .optional(),
};

/** Full preferences (PUT, sync): missing optional fields get their defaults. */
export const PreferencesSchema = z.object({
  ...preferenceFields,
  suburb: preferenceFields.suburb.default(""),
  postcode: preferenceFields.postcode.default(""),
  dietaryRequirements: preferenceFields.dietaryRequirements.default([]),
  cuisinePreferences: preferenceFields.cuisinePreferences.default([]),
  proteinPreferences: preferenceFields.proteinPreferences.default([]),
  householdSize: preferenceFields.householdSize.default(2),
  defaultServings: preferenceFields.defaultServings.default(2),
  includeLunches: preferenceFields.includeLunches.default(false),
  includeSnacks: preferenceFields.includeSnacks.default(true),
});

export const PreferencesPutSchema = PreferencesSchema.extend({
  isOnboarded: z.boolean().optional(),
  // Opt-in reminder emails; left unchanged when omitted.
  emailReminders: z.boolean().optional(),
});

// No defaults here: a PATCH must only touch the fields it sends.
export const PreferencesPatchSchema = z.object(preferenceFields).partial().extend({
  theme: z.enum(["light", "dark", "system"]).optional(),
  isOnboarded: z.boolean().optional(),
  emailReminders: z.boolean().optional(),
});

export const RecipeFeedbackSchema = z.object({
  recipeId: id,
  recipeName: shortText,
  feedback: z.enum(["thumbs-up", "thumbs-down", "never-show", "swapped"]),
  timestamp: z.number(),
  cuisineType: z.string().max(60).optional(),
  primaryProtein: z.string().max(60).optional(),
});

export const CartSchema = z.object({
  id,
  retailer: z.enum(["woolworths", "coles"]),
  // Cart items are a client-computed snapshot stored as JSON; bound the size only.
  items: z.array(z.record(z.string(), z.unknown())).max(500),
  estimatedTotal: z.number().min(0).max(100000),
  mealPlanId: z.string().max(200).nullish(),
});

export const OrderSchema = z.object({
  id,
  retailer: z.enum(["woolworths", "coles"]),
  cart: CartSchema,
  status: z.enum(["pending", "confirmed", "placed"]),
  estimatedDeliveryDate: shortText,
  estimatedDeliveryWindow: shortText,
  deliveryAddress: z.string().max(500),
  placedAt: z.number().optional(),
  confirmationNumber: z.string().max(100).optional(),
});

export const PantryPostSchema = z.union([
  z.object({ type: z.literal("staple"), ingredientName: shortText.min(1), active: z.boolean() }),
  z.object({
    type: z.undefined().optional(),
    ingredientName: shortText.min(1),
    quantity: z.number().max(100000),
    unit: z.string().max(40),
    sourceOrderId: z.string().max(200).optional(),
  }),
]);

export const PantryPutSchema = z.object({
  pantryItems: z
    .array(
      z.object({
        ingredientName: shortText.min(1),
        quantity: z.number().min(0).max(100000),
        unit: z.string().max(40),
        addedAt: z.number().optional(),
        sourceOrderId: z.string().max(200).optional(),
      })
    )
    .max(1000),
});

export const PantryDeleteSchema = z.object({
  ingredientName: shortText.min(1),
  unit: z.string().max(40),
});

export const MealPatchSchema = z.object({
  mealId: id.optional(),
  recipeId: id.optional(),
  servings: z.number().int().min(1).max(20).optional(),
  feedback: z.string().max(40).nullable().optional(),
});

/** Parse a JSON body against a schema; on failure returns a 400 response to send instead. */
export async function parseBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  const json = await req.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Invalid request body", issues: result.error.issues.slice(0, 5) },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

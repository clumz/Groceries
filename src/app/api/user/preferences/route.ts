import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrismaUserId } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import type { UserPreferences } from "@/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (!prefs) return NextResponse.json({ preferences: null });

  return NextResponse.json({ preferences: dbToPrefs(prefs) });
}

export async function PUT(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const body: UserPreferences & { isOnboarded?: boolean } = await req.json();

  const data = prefsToDb(body, userId);
  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    create: { ...data, isOnboarded: body.isOnboarded ?? true },
    update: { ...data, isOnboarded: body.isOnboarded ?? true },
  });

  return NextResponse.json({ preferences: dbToPrefs(prefs) });
}

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = await getPrismaUserId(clerkId);
  if (!userId) return unauthorized();

  const patch = await req.json();

  const mapped: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    preferredStore: "preferredStore",
    suburb: "suburb",
    postcode: "postcode",
    dietaryRequirements: "dietaryRequirements",
    cuisinePreferences: "cuisinePreferences",
    proteinPreferences: "proteinPreferences",
    householdSize: "householdSize",
    defaultServings: "defaultServings",
    budgetRange: "budgetRange",
    cookTimePreference: "cookTimePreference",
    includeLunches: "includeLunches",
    includeSnacks: "includeSnacks",
    calorieGoal: "calorieGoal",
    theme: "theme",
    isOnboarded: "isOnboarded",
  };
  for (const [k, v] of Object.entries(patch)) {
    if (fieldMap[k]) mapped[fieldMap[k]] = v;
  }
  if (patch.macroGoal !== undefined) {
    if (patch.macroGoal === null) {
      mapped.macroProteinPct = null;
      mapped.macroCarbsPct = null;
      mapped.macroFatPct = null;
    } else {
      mapped.macroProteinPct = patch.macroGoal.proteinPct;
      mapped.macroCarbsPct = patch.macroGoal.carbsPct;
      mapped.macroFatPct = patch.macroGoal.fatPct;
    }
  }

  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...mapped },
    update: mapped,
  });

  return NextResponse.json({ preferences: dbToPrefs(prefs) });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToPrefs(p: any): UserPreferences {
  return {
    preferredStore: p.preferredStore as UserPreferences["preferredStore"],
    suburb: p.suburb,
    postcode: p.postcode,
    dietaryRequirements: p.dietaryRequirements,
    cuisinePreferences: p.cuisinePreferences,
    proteinPreferences: p.proteinPreferences,
    householdSize: p.householdSize,
    defaultServings: p.defaultServings,
    budgetRange: p.budgetRange as UserPreferences["budgetRange"],
    cookTimePreference: p.cookTimePreference as UserPreferences["cookTimePreference"],
    includeLunches: p.includeLunches,
    includeSnacks: p.includeSnacks,
    calorieGoal: p.calorieGoal ?? null,
    macroGoal:
      p.macroProteinPct != null
        ? { proteinPct: p.macroProteinPct, carbsPct: p.macroCarbsPct, fatPct: p.macroFatPct }
        : null,
  };
}

function prefsToDb(p: UserPreferences, userId: string) {
  return {
    userId,
    preferredStore: p.preferredStore,
    suburb: p.suburb,
    postcode: p.postcode,
    dietaryRequirements: p.dietaryRequirements,
    cuisinePreferences: p.cuisinePreferences,
    proteinPreferences: p.proteinPreferences,
    householdSize: p.householdSize,
    defaultServings: p.defaultServings,
    budgetRange: p.budgetRange,
    cookTimePreference: p.cookTimePreference,
    includeLunches: p.includeLunches,
    includeSnacks: p.includeSnacks,
    calorieGoal: p.calorieGoal ?? null,
    macroProteinPct: p.macroGoal?.proteinPct ?? null,
    macroCarbsPct: p.macroGoal?.carbsPct ?? null,
    macroFatPct: p.macroGoal?.fatPct ?? null,
  };
}

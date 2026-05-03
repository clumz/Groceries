import { NextRequest, NextResponse } from "next/server";
import type { Recipe } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALL_RECIPES: Recipe[] = require("@/data/recipes.json");

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const cuisine = searchParams.get("cuisine");
  const protein = searchParams.get("protein");
  const difficulty = searchParams.get("difficulty");
  const excludeParam = searchParams.get("exclude");
  const q = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);
  const seed = parseInt(searchParams.get("seed") ?? "0") || Math.floor(Math.random() * 99999);

  // Single recipe lookup
  if (id) {
    const recipe = ALL_RECIPES.find((r) => r.id === id);
    return NextResponse.json({ recipes: recipe ? [recipe] : [], total: recipe ? 1 : 0 });
  }

  const excluded = new Set(excludeParam ? excludeParam.split(",").filter(Boolean) : []);

  let recipes = ALL_RECIPES.filter((r) => {
    if (excluded.has(r.id)) return false;
    if (cuisine && r.cuisine !== cuisine) return false;
    if (protein && r.primaryProtein !== protein) return false;
    if (difficulty && r.difficulty !== difficulty) return false;
    if (q) {
      const query = q.toLowerCase();
      return (
        r.name.toLowerCase().includes(query) ||
        r.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Deterministic shuffle with seed so pagination is stable
  let s = seed;
  recipes = [...recipes].sort(() => {
    s = Math.imul(s, 1664525) + 1013904223;
    return ((s >>> 16) & 0xffff) / 65536 - 0.5;
  });

  return NextResponse.json({ recipes: recipes.slice(0, limit), total: recipes.length });
}

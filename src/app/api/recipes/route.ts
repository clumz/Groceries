import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Fallback: if DB is unavailable, serve from the bundled JSON
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FALLBACK_RECIPES = require("@/data/recipes.json");

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

  try {
    const excluded = excludeParam ? excludeParam.split(",").filter(Boolean) : [];

    // Build Prisma where clause
    const where: Prisma.RecipeWhereInput = {
      isActive: true,
      ...(cuisine ? { cuisine } : {}),
      ...(protein ? { primaryProtein: protein } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(excluded.length ? { id: { notIn: excluded } } : {}),
    };

    // Single recipe lookup by ID
    if (id) {
      const recipe = await prisma.recipe.findUnique({ where: { id } });
      return NextResponse.json({ recipes: recipe ? [recipe] : [], total: recipe ? 1 : 0 });
    }

    // Full-text search via tsvector when ?q= is provided
    if (q) {
      // Use raw query for full-text ranking; fall back to ILIKE if tsvector column not yet set up
      const results = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM recipes
        WHERE is_active = true
          ${cuisine ? Prisma.sql`AND cuisine = ${cuisine}` : Prisma.empty}
          ${protein ? Prisma.sql`AND primary_protein = ${protein}` : Prisma.empty}
          ${difficulty ? Prisma.sql`AND difficulty = ${difficulty}` : Prisma.empty}
          ${excluded.length ? Prisma.sql`AND id != ALL(${excluded}::text[])` : Prisma.empty}
          AND (
            search_vector @@ plainto_tsquery('english', ${q})
            OR name ILIKE ${"%" + q + "%"}
          )
        ORDER BY
          ts_rank(search_vector, plainto_tsquery('english', ${q})) DESC,
          name ASC
        LIMIT ${limit}
      `;
      const ids = results.map((r) => r.id);
      const recipes = await prisma.recipe.findMany({ where: { id: { in: ids } } });
      // Preserve ranking order
      const ordered = ids.map((rid) => recipes.find((r) => r.id === rid)).filter(Boolean);
      return NextResponse.json({ recipes: ordered, total: ordered.length });
    }

    // Standard filtered listing with deterministic seeded ordering
    const total = await prisma.recipe.count({ where });
    // Use Postgres hashtext for deterministic seeded ordering (no in-memory shuffle)
    const recipes = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM recipes
      WHERE is_active = true
        ${cuisine ? Prisma.sql`AND cuisine = ${cuisine}` : Prisma.empty}
        ${protein ? Prisma.sql`AND primary_protein = ${protein}` : Prisma.empty}
        ${difficulty ? Prisma.sql`AND difficulty = ${difficulty}` : Prisma.empty}
        ${excluded.length ? Prisma.sql`AND id != ALL(${excluded}::text[])` : Prisma.empty}
      ORDER BY hashtext(id || ${String(seed)})
      LIMIT ${limit}
    `;
    const ids = recipes.map((r) => r.id);
    const fullRecipes = await prisma.recipe.findMany({ where: { id: { in: ids } } });
    const ordered = ids.map((rid) => fullRecipes.find((r) => r.id === rid)).filter(Boolean);

    return NextResponse.json({ recipes: ordered, total });
  } catch (err) {
    // DB unavailable — serve from bundled JSON fallback
    console.warn("DB unavailable, using fallback recipes:", err);
    return serveFallback(req);
  }
}

function serveFallback(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const cuisine = searchParams.get("cuisine");
  const protein = searchParams.get("protein");
  const difficulty = searchParams.get("difficulty");
  const excludeParam = searchParams.get("exclude");
  const q = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);
  const seed = parseInt(searchParams.get("seed") ?? "0") || 1;

  if (id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = FALLBACK_RECIPES.find((r: any) => r.id === id);
    return NextResponse.json({ recipes: recipe ? [recipe] : [], total: recipe ? 1 : 0 });
  }

  const excluded = new Set(excludeParam ? excludeParam.split(",").filter(Boolean) : []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recipes = FALLBACK_RECIPES.filter((r: any) => {
    if (excluded.has(r.id)) return false;
    if (cuisine && r.cuisine !== cuisine) return false;
    if (protein && r.primaryProtein !== protein) return false;
    if (difficulty && r.difficulty !== difficulty) return false;
    if (q) {
      const ql = q.toLowerCase();
      return r.name.toLowerCase().includes(ql) || r.tags.some((t: string) => t.toLowerCase().includes(ql));
    }
    return true;
  });

  let s = seed;
  recipes = [...recipes].sort(() => {
    s = Math.imul(s, 1664525) + 1013904223;
    return ((s >>> 16) & 0xffff) / 65536 - 0.5;
  });

  return NextResponse.json({ recipes: recipes.slice(0, limit), total: recipes.length });
}

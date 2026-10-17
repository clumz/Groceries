# Plate

Weekly meal planner for Australian households. Plate builds a week of dinners (and optional lunches) from your preferences, learns from your thumbs up/down, turns the plan into a Woolworths or Coles shopping list, and tracks what's already in your pantry.

- Free tier: a deterministic, feedback-aware planner (`src/lib/mealPlanAlgorithm.ts`).
- Premium (Stripe subscription): Claude chooses the week from the same recipe library (`src/lib/aiMealPlan.ts`), and falls back to the algorithm on any error.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind · Zustand (local cache) · Prisma 7 on Postgres (Neon serverless driver) · Clerk auth · Stripe billing · Resend email · Upstash Redis (rate limits/cache) · Sentry · PostHog · Vercel (hosting + cron).

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in at least the database and Clerk keys
npm run db:migrate                 # apply migrations
npm run db:seed                    # load recipes and the product catalogue
npm run dev                        # http://localhost:3000
```

Every environment variable is listed, with notes, in `.env.local.example`. Integrations marked optional are skipped when their keys are unset.

## Deploying

1. Set the env vars from `.env.local.example` in Vercel.
2. Run `npm run db:migrate` against production before (or as part of) each deploy that adds a migration, and `npm run db:seed` once on a new database.
3. Configure the webhooks:
   - **Clerk** → `/api/webhooks/clerk` (`user.created`, `user.updated`, `user.deleted`), secret in `CLERK_WEBHOOK_SECRET`.
   - **Stripe** → `/api/stripe/webhook` (`customer.subscription.*`), secret in `STRIPE_WEBHOOK_SECRET`.
4. The weekly reminder runs from `vercel.json` (Mondays 09:00 UTC) and requires `CRON_SECRET`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run type-check` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations (uses `DIRECT_URL` when set) |
| `npm run db:seed` | Upsert recipes and products from `src/data` (safe to re-run) |
| `npm run test:e2e` | Playwright smoke tests; signed-in tests need `E2E_CLERK_USER_EMAIL` and a Clerk dev instance |

CI (`.github/workflows/ci.yml`) runs type-check, lint and build, applies all migrations to a fresh Postgres, and fails if `schema.prisma` has changes without a migration.

## Layout

```
src/app/            pages and API routes (api/user/* are per-user data, all require sign-in)
src/lib/            planning, cart aggregation, SKU matching, integrations
src/store/          Zustand store (local cache, synced to the API in the background)
src/data/           bundled recipes and supermarket catalogues
prisma/             schema and migrations
scripts/            data import and seeding
docs/design/        design handoff
```

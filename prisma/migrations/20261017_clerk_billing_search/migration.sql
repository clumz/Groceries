-- Brings the migration history in line with schema.prisma.
-- Written idempotently because some environments were synced with `prisma db push`
-- and may already have part of this.

-- ─── Clerk ────────────────────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_key" ON "users"("clerk_id");

-- ─── Subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_key" ON "subscriptions"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- ─── Internal testing ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "bug_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "url" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "bug_reports_created_at_idx" ON "bug_reports"("created_at");

CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "analytics_events_event_idx" ON "analytics_events"("event");
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events"("user_id");
CREATE INDEX IF NOT EXISTS "analytics_events_created_at_idx" ON "analytics_events"("created_at");

DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Search (used by /api/recipes?q= and /api/map-ingredients) ────────────────
-- Trigger-maintained rather than GENERATED: array_to_string(tags) isn't immutable.
-- Matches what scripts/migrate-*.ts used to set up by hand, so re-running is safe.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

CREATE OR REPLACE FUNCTION recipes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', NEW.name), 'A') ||
    setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'B') ||
    setweight(to_tsvector('english', NEW.cuisine), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipes_search_vector_trigger ON "recipes";
CREATE TRIGGER recipes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "recipes"
  FOR EACH ROW EXECUTE FUNCTION recipes_search_vector_update();

UPDATE "recipes" SET "search_vector" =
  setweight(to_tsvector('english', "name"), 'A') ||
  setweight(to_tsvector('english', array_to_string("tags", ' ')), 'B') ||
  setweight(to_tsvector('english', "cuisine"), 'C');

CREATE INDEX IF NOT EXISTS "recipes_search_vector_idx" ON "recipes" USING GIN ("search_vector");

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', NEW.name || ' ' || COALESCE(NEW.brand, '') || ' ' || NEW.category);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_trigger ON "products";
CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

UPDATE "products" SET "search_vector" =
  to_tsvector('english', "name" || ' ' || COALESCE("brand", '') || ' ' || "category");

CREATE INDEX IF NOT EXISTS "products_search_vector_idx" ON "products" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);

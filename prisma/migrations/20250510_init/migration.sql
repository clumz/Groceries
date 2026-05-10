-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferred_store" TEXT NOT NULL DEFAULT 'woolworths',
    "suburb" TEXT NOT NULL DEFAULT '',
    "postcode" TEXT NOT NULL DEFAULT '',
    "dietary_requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cuisine_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "protein_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "household_size" INTEGER NOT NULL DEFAULT 2,
    "default_servings" INTEGER NOT NULL DEFAULT 2,
    "budget_range" TEXT NOT NULL DEFAULT '150-250',
    "cook_time_preference" TEXT NOT NULL DEFAULT '20-40',
    "include_lunches" BOOLEAN NOT NULL DEFAULT false,
    "include_snacks" BOOLEAN NOT NULL DEFAULT true,
    "calorie_goal" INTEGER,
    "macro_protein_pct" INTEGER,
    "macro_carbs_pct" INTEGER,
    "macro_fat_pct" INTEGER,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "is_onboarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "primary_protein" TEXT,
    "servings" INTEGER NOT NULL,
    "cook_time_minutes" INTEGER NOT NULL,
    "prep_time_minutes" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "ingredients" JSONB NOT NULL,
    "method" TEXT[],
    "tags" TEXT[],
    "image_query" TEXT NOT NULL,
    "estimated_cost" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preference_snapshot" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_meals" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "meal_type" TEXT NOT NULL,
    "servings" INTEGER NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "planned_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_snacks" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "estimated_cost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "planned_snacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "recipe_name" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "cuisine_type" TEXT,
    "primary_protein" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serving_adjustments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "original_servings" INTEGER NOT NULL,
    "adjusted_servings" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "serving_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substitute_decisions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "substitute_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_size" DOUBLE PRECISION NOT NULL,
    "unit_of_measure" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "barcode" TEXT,
    "last_verified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "meal_plan_id" TEXT,
    "retailer" TEXT NOT NULL,
    "estimated_total" DOUBLE PRECISION NOT NULL,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'placed',
    "estimated_delivery_date" TEXT NOT NULL,
    "estimated_delivery_window" TEXT NOT NULL,
    "delivery_address" TEXT NOT NULL,
    "placed_at" TIMESTAMP(3),
    "confirmation_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pantry_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_order_id" TEXT,

    CONSTRAINT "pantry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_staples" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ingredient_name" TEXT NOT NULL,

    CONSTRAINT "user_staples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "recipes_cuisine_idx" ON "recipes"("cuisine");

-- CreateIndex
CREATE INDEX "recipes_primary_protein_idx" ON "recipes"("primary_protein");

-- CreateIndex
CREATE INDEX "recipes_is_active_idx" ON "recipes"("is_active");

-- CreateIndex
CREATE INDEX "meal_plans_user_id_is_active_idx" ON "meal_plans"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "meal_plans_user_id_generated_at_idx" ON "meal_plans"("user_id", "generated_at");

-- CreateIndex
CREATE INDEX "planned_meals_meal_plan_id_idx" ON "planned_meals"("meal_plan_id");

-- CreateIndex
CREATE INDEX "planned_snacks_meal_plan_id_idx" ON "planned_snacks"("meal_plan_id");

-- CreateIndex
CREATE INDEX "recipe_feedback_user_id_feedback_idx" ON "recipe_feedback"("user_id", "feedback");

-- CreateIndex
CREATE INDEX "recipe_feedback_user_id_timestamp_idx" ON "recipe_feedback"("user_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_feedback_user_id_recipe_id_key" ON "recipe_feedback"("user_id", "recipe_id");

-- CreateIndex
CREATE INDEX "serving_adjustments_user_id_idx" ON "serving_adjustments"("user_id");

-- CreateIndex
CREATE INDEX "substitute_decisions_user_id_idx" ON "substitute_decisions"("user_id");

-- CreateIndex
CREATE INDEX "products_retailer_category_idx" ON "products"("retailer", "category");

-- CreateIndex
CREATE INDEX "products_retailer_available_idx" ON "products"("retailer", "available");

-- CreateIndex
CREATE INDEX "price_history_product_id_recorded_at_idx" ON "price_history"("product_id", "recorded_at");

-- CreateIndex
CREATE INDEX "carts_user_id_created_at_idx" ON "carts"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_cart_id_key" ON "orders"("cart_id");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "pantry_items_user_id_idx" ON "pantry_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pantry_items_user_id_ingredient_name_unit_key" ON "pantry_items"("user_id", "ingredient_name", "unit");

-- CreateIndex
CREATE INDEX "user_staples_user_id_idx" ON "user_staples"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_staples_user_id_ingredient_name_key" ON "user_staples"("user_id", "ingredient_name");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_snacks" ADD CONSTRAINT "planned_snacks_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_feedback" ADD CONSTRAINT "recipe_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_feedback" ADD CONSTRAINT "recipe_feedback_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serving_adjustments" ADD CONSTRAINT "serving_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitute_decisions" ADD CONSTRAINT "substitute_decisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_staples" ADD CONSTRAINT "user_staples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


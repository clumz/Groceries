import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL = non-pooled URL (required for Supabase migrations via PgBouncer)
    // Falls back to Neon unpooled or regular DATABASE_URL
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"] ?? "",
  },
});

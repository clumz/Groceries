// Imported first by scripts so env is loaded before the Prisma client reads it.
import { config } from "dotenv";

config({ path: ".env.local" });
config();

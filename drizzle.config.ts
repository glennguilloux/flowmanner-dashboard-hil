import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load secrets from .env.local (Next.js also reads .env.local, but drizzle-kit
// only reads .env by default — so we point it at .env.local explicitly).
config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required (set it in .env.local)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  // CRITICAL: keep drizzle-kit scoped to our `hil_ops` schema only. Without
  // this, drizzle-kit tries to drop FlowManner's alembic-managed tables in
  // `public` because it considers every table in the DB part of "its" schema.
  schemaFilter: ["hil_ops"],
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
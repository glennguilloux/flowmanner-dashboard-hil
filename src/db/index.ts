import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required (set it in .env.local)");
}

const globalForDb = globalThis as typeof globalThis & {
  __flowmannerHilPool?: Pool;
};

export const pool =
  globalForDb.__flowmannerHilPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__flowmannerHilPool = pool;
}

export const db = drizzle(pool, { schema });
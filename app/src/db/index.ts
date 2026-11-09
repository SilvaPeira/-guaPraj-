import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Produção: DATABASE_URL (Postgres/Neon).
// Desenvolvimento sem DATABASE_URL: PGlite (Postgres embutido) em .data/pglite,
// com as migrações aplicadas automaticamente.

type Db = PgliteDatabase<typeof schema>;

const g = globalThis as unknown as { __aguaDb?: Promise<Db> };

async function criar(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: 5 });
    return drizzlePostgres(client, { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(path.dirname(dir), { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export function getDb(): Promise<Db> {
  g.__aguaDb ??= criar().catch((e) => {
    g.__aguaDb = undefined; // permite tentar de novo na próxima requisição
    throw e;
  });
  return g.__aguaDb;
}

export { schema };

// src/scripts/migrate.ts

import "dotenv/config";

import fs from "fs";
import path from "path";

import { PostgresClient } from "../infrastructure/postgres/PostgresClient";

/**
 * Resolved relative to this file when run from source (tsx), with a fallback
 * to the source tree when run from `dist/` — the .sql files are data, not
 * TypeScript, so the compiler does not copy them into the build output.
 */
function resolveMigrationsDir(): string {
  const adjacent = path.join(__dirname, "../database/migrations");

  if (fs.existsSync(adjacent)) {
    return adjacent;
  }

  return path.resolve(process.cwd(), "src/database/migrations");
}

/**
 * Applies every .sql file in lexicographic order. Each file is expected to
 * be idempotent (CREATE TABLE IF NOT EXISTS / guarded ALTERs), which is what
 * lets this run safely on an existing database.
 */
async function migrate(): Promise<void> {
  const db = PostgresClient.getInstance();
  await db.connect();

  const migrationsDir = resolveMigrationsDir();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Running migration: ${file}`);
    await db.query(sql);
    console.log(`  ✓ done`);
  }

  console.log("All migrations applied.");
  process.exit(0);
}

migrate().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

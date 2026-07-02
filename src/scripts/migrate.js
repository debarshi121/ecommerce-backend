// src/scripts/migrate.js

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const PostgresClient = require("../infrastructure/postgres/PostgresClient");

async function migrate() {
  const db = PostgresClient.getInstance();
  await db.connect();

  const migrationsDir = path.join(__dirname, "../database/migrations");

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
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

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

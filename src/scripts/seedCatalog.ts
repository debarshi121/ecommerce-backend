// src/scripts/seedCatalog.ts

import "dotenv/config";

import { PostgresClient } from "../infrastructure/postgres/PostgresClient";

async function seed(): Promise<void> {
  const db = PostgresClient.getInstance();

  await db.connect();

  /*
  -------------------
  Permissions
  -------------------
  */

  await db.query(`
    INSERT INTO permissions(name)
    VALUES
      ('product:create'),
      ('product:update'),
      ('product:archive'),
      ('product:activate'),

      ('category:create'),
      ('category:update'),
      ('category:delete'),

      ('brand:create'),
      ('brand:update'),
      ('brand:delete')
    ON CONFLICT DO NOTHING
  `);

  /*
  -------------------
  Assign admin all catalog permissions
  -------------------
  */

  await db.query(`
    INSERT INTO role_permissions("roleId", "permissionId")

    SELECT
      r.id,
      p.id

    FROM roles r
    JOIN permissions p
      ON p.name IN (
        'product:create',
        'product:update',
        'product:archive',
        'product:activate',

        'category:create',
        'category:update',
        'category:delete',

        'brand:create',
        'brand:update',
        'brand:delete'
      )

    WHERE r.name = 'admin'

    ON CONFLICT DO NOTHING
  `);

  console.log("Catalog seed completed");

  process.exit(0);
}

seed().catch((error: unknown) => {
  console.error("Catalog seed failed:", error);
  process.exit(1);
});

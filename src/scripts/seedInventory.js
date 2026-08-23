// src/scripts/seedInventory.js

require("dotenv").config();

const PostgresClient = require("../infrastructure/postgres/PostgresClient");

async function seed() {
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
      ('inventory:read'),
      ('inventory:adjust'),
      ('inventory:increase'),
      ('inventory:decrease')
    ON CONFLICT DO NOTHING
  `);

  /*
  -------------------
  Assign admin all inventory permissions
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
        'inventory:read',
        'inventory:adjust',
        'inventory:increase',
        'inventory:decrease'
      )

    WHERE r.name = 'admin'

    ON CONFLICT DO NOTHING
  `);

  console.log("Inventory seed completed");

  process.exit(0);
}

seed();

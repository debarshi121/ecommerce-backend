// src/scripts/seedIdentity.js

require("dotenv").config();

const PostgresClient = require("../infrastructure/postgres/PostgresClient");

async function seed() {
  const db = PostgresClient.getInstance();

  await db.connect();

  /*
  -------------------
  Roles
  -------------------
  */

  await db.query(`
    INSERT INTO roles(name)
    VALUES
      ('admin'),
      ('customer')
    ON CONFLICT DO NOTHING
  `);

  /*
  -------------------
  Permissions
  -------------------
  */

  await db.query(`
    INSERT INTO permissions(name)
    VALUES
      ('user.create'),
      ('user.read'),
      ('user.update'),
      ('user.delete'),

      ('role.create'),
      ('role.read'),
      ('role.update'),
      ('role.delete'),

      ('permission.create'),
      ('permission.read'),
      ('permission.update'),
      ('permission.delete')
    ON CONFLICT DO NOTHING
  `);

  /*
  -------------------
  Assign admin all permissions
  -------------------
  */

  await db.query(`
    INSERT INTO role_permissions(role_id, permission_id)

    SELECT
      r.id,
      p.id

    FROM roles r
    CROSS JOIN permissions p

    WHERE r.name = 'admin'

    ON CONFLICT DO NOTHING
  `);

  /*
  -------------------
  Customer permissions
  -------------------
  */

  await db.query(`
    INSERT INTO role_permissions(role_id, permission_id)

    SELECT
      r.id,
      p.id

    FROM roles r
    JOIN permissions p
      ON p.name IN (
        'user.read',
        'user.update'
      )

    WHERE r.name = 'customer'

    ON CONFLICT DO NOTHING
  `);

  console.log("Seed completed");

  process.exit(0);
}

seed();

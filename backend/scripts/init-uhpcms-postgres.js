/**
 * Add U-HPCMS tables and super-admin to an existing Postgres DB (e.g. already has legacy tables).
 * Safe to run multiple times. Does not touch legacy tables.
 * Usage: DATABASE_URL="postgres://..." node scripts/init-uhpcms-postgres.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const config = require('../config');

const schemaUhpcmsPath = path.join(__dirname, '..', 'database', 'schema-uhpcms-postgres.sql');
const schemaUhpcms = fs.readFileSync(schemaUhpcmsPath, 'utf8');

async function init() {
  const clientConfig = config.postgres.connectionString
    ? { connectionString: config.postgres.connectionString, ssl: config.postgres.ssl }
    : {
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
      };
  const client = new Client(clientConfig);
  await client.connect();
  await client.query(schemaUhpcms);

  const superRoleId = 'role_super_admin';
  await client.query(
    `INSERT INTO roles (id, name, org_id) VALUES ($1, $2, NULL) ON CONFLICT (id) DO NOTHING`,
    [superRoleId, 'super_admin']
  );
  const hash = await bcrypt.hash('admin123', 10);
  const superId = 'su_1';
  await client.query(
    `INSERT INTO system_users (id, org_id, email, password_hash, role_id, full_name, status)
     VALUES ($1, NULL, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [superId, 'super@uhpcms.local', hash, superRoleId, 'Super Admin', 'active']
  );

  await client.end();
  console.log('U-HPCMS tables and super-admin ready. Login: super@uhpcms.local / admin123');
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});

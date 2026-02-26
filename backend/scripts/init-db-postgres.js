const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const config = require('../config');

const schemaPath = path.join(__dirname, '..', 'database', 'schema-postgres.sql');
const seedPath = path.join(__dirname, '..', 'database', 'seed-postgres.sql');
const schemaUhpcmsPath = path.join(__dirname, '..', 'database', 'schema-uhpcms-postgres.sql');
const schemaEntityDocsPath = path.join(__dirname, '..', 'database', 'schema-uhpcms-entity-docs-postgres.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
const seed = fs.readFileSync(seedPath, 'utf8');
const schemaUhpcms = fs.readFileSync(schemaUhpcmsPath, 'utf8');
const schemaEntityDocs = fs.existsSync(schemaEntityDocsPath) ? fs.readFileSync(schemaEntityDocsPath, 'utf8') : null;

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
  await client.query(schema);
  await client.query(seed);
  await client.query(schemaUhpcms);
  if (schemaEntityDocs) await client.query(schemaEntityDocs);

  // Seed U-HPCMS super-admin
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
  console.log('PostgreSQL database initialized (legacy + U-HPCMS). Super-admin: super@uhpcms.local / admin123');
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});

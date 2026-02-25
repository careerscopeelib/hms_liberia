const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../config');

const schemaPath = path.join(__dirname, '..', 'database', 'schema-postgres.sql');
const seedPath = path.join(__dirname, '..', 'database', 'seed-postgres.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
const seed = fs.readFileSync(seedPath, 'utf8');

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
  await client.end();
  console.log('PostgreSQL database initialized.');
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dbDir, 'hospital.db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const schemaPath = path.join(__dirname, '..', 'database', 'schema-sqlite.sql');
const seedPath = path.join(__dirname, '..', 'database', 'seed-sqlite.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
const seed = fs.readFileSync(seedPath, 'utf8');

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(schema);
  db.exec(seed);
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('SQLite database initialized at', dbPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

require('dotenv').config();

// Support Render's DATABASE_URL (PostgreSQL)
const databaseUrl = process.env.DATABASE_URL;
const usePostgres = databaseUrl || (process.env.DB_TYPE || 'sqlite').toLowerCase() === 'postgres';

// Allow frontend origin(s) for CORS. Comma-separated list, or true to allow all.
function getCorsOrigin() {
  const raw = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;
  if (!raw || raw === 'true') return true;
  const list = raw.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  return list.length ? list : true;
}

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbType: usePostgres ? 'postgres' : 'sqlite',
  jwtSecret: process.env.JWT_SECRET || 'uhpcms-default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: getCorsOrigin(),
  // Currency: USD and LRD (Liberian Dollars). Rate LRD per 1 USD.
  currency: {
    default: 'USD',
    lrdPerUsd: parseFloat(process.env.LRD_PER_USD || '193.5'),
  },
  sqlite: {
    path: process.env.SQLITE_PATH || './data/hospital.db',
  },
  postgres: databaseUrl
    ? { connectionString: databaseUrl, ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined }
    : {
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432', 10),
        database: process.env.PG_DATABASE || 'hospital',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || '',
      },
};

module.exports = config;

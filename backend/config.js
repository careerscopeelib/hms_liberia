require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbType: (process.env.DB_TYPE || 'sqlite').toLowerCase(),
  jwtSecret: process.env.JWT_SECRET || 'uhpcms-default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // Currency: USD and LRD (Liberian Dollars). Rate LRD per 1 USD.
  currency: {
    default: 'USD',
    lrdPerUsd: parseFloat(process.env.LRD_PER_USD || '193.5'),
  },
  sqlite: {
    path: process.env.SQLITE_PATH || './data/hospital.db',
  },
  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'hospital',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
  },
};

module.exports = config;

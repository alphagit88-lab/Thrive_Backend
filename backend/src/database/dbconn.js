const { Pool } = require('pg');

// Support both DATABASE_URL (local) and POSTGRES_URL (Vercel/Neon)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Auto-detect SSL: Enable for Neon (neon.tech) or when sslmode=require is in URL
const requiresSSL = connectionString && (
  connectionString.includes('neon.tech') ||
  connectionString.includes('sslmode=require')
);

const pool = new Pool({
  connectionString: connectionString,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
});

module.exports = pool;


const { Pool } = require('pg');

// Configure SSL for Neon (production) or disable for local development
const isProduction = process.env.NODE_ENV === 'production';

// Support both DATABASE_URL (local) and POSTGRES_URL (Vercel/Neon)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;

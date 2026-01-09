/**
 * Database Migration Script
 * Run: node src/database/migrate.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Running schema.sql...');
    await client.query(schema);
    console.log('✅ Schema created successfully!\n');
    
    // Read seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    
    console.log('🌱 Running seed.sql...');
    await client.query(seed);
    console.log('✅ Seed data inserted successfully!\n');
    
    // Verify tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 Created tables:');
    tables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Verify food categories
    const categories = await client.query('SELECT name FROM food_categories ORDER BY display_order');
    console.log('\n🍽️  Food Categories:');
    categories.rows.forEach(row => {
      console.log(`   - ${row.name}`);
    });
    
    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration();


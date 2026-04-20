/**
 * Migration: Convert MenuItem specifications and cook types to Many-to-Many
 */

require('dotenv').config();
const { getDataSource } = require('../database/typeorm');

async function migrate() {
  const dataSource = await getDataSource();
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('🔄 Converting MenuItem relations to Many-to-Many...');

    // 1. Create joining tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS menu_item_specifications (
        menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
        specification_id UUID REFERENCES specifications(id) ON DELETE CASCADE,
        PRIMARY KEY (menu_item_id, specification_id)
      )
    `);
    console.log('  ✅ Table menu_item_specifications created');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS menu_item_cook_types (
        menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
        cook_type_id UUID REFERENCES cook_types(id) ON DELETE CASCADE,
        PRIMARY KEY (menu_item_id, cook_type_id)
      )
    `);
    console.log('  ✅ Table menu_item_cook_types created');

    // 2. Migrate existing data if any (optional but good practice)
    await queryRunner.query(`
      INSERT INTO menu_item_specifications (menu_item_id, specification_id)
      SELECT id, specification_id FROM menu_items WHERE specification_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
    
    await queryRunner.query(`
      INSERT INTO menu_item_cook_types (menu_item_id, cook_type_id)
      SELECT id, cook_type_id FROM menu_items WHERE cook_type_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✅ Existing data migrated');

    // 3. Drop old columns
    await queryRunner.query(`
      ALTER TABLE menu_items DROP COLUMN IF EXISTS specification_id;
      ALTER TABLE menu_items DROP COLUMN IF EXISTS cook_type_id;
    `);
    console.log('  ✅ Old columns dropped');

    await queryRunner.commitTransaction();
    console.log('\n✅ Migration complete!');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

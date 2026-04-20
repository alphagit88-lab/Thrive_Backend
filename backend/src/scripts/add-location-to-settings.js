/**
 * Migration: Add location_id to settings tables
 * Adds nullable location_id to food_categories, food_types, specifications, cook_types
 * NULL = global (visible to all locations), UUID = location-specific
 */

require('dotenv').config();
const { getDataSource } = require('../database/typeorm');

async function migrate() {
  const dataSource = await getDataSource();
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('🔄 Adding location_id to settings tables...');

    // food_categories
    await queryRunner.query(`
      ALTER TABLE food_categories
      ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE
    `);
    console.log('  ✅ food_categories.location_id added');

    // food_types
    await queryRunner.query(`
      ALTER TABLE food_types
      ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE
    `);
    console.log('  ✅ food_types.location_id added');

    // specifications
    await queryRunner.query(`
      ALTER TABLE specifications
      ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE
    `);
    console.log('  ✅ specifications.location_id added');

    // cook_types
    await queryRunner.query(`
      ALTER TABLE cook_types
      ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE
    `);
    console.log('  ✅ cook_types.location_id added');

    // Drop old unique constraints that don't account for location, re-add with location_id
    // food_types: drop the unique constraint (which drops its backing index automatically)
    await queryRunner.query(`
      ALTER TABLE food_types DROP CONSTRAINT IF EXISTS "food_types_category_id_name_key"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_food_types_loc_cat_name
      ON food_types (COALESCE(location_id::text, 'global'), category_id, name)
    `);
    console.log('  ✅ food_types unique constraint updated');

    // specifications: drop the unique constraint
    await queryRunner.query(`
      ALTER TABLE specifications DROP CONSTRAINT IF EXISTS "specifications_food_type_id_name_key"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_specs_loc_type_name
      ON specifications (COALESCE(location_id::text, 'global'), food_type_id, name)
    `);
    console.log('  ✅ specifications unique constraint updated');

    // cook_types: drop the unique constraint
    await queryRunner.query(`
      ALTER TABLE cook_types DROP CONSTRAINT IF EXISTS "cook_types_category_id_name_key"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_cook_types_loc_cat_name
      ON cook_types (COALESCE(location_id::text, 'global'), category_id, name)
    `);
    console.log('  ✅ cook_types unique constraint updated');

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

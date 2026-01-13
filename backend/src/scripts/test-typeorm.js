/**
 * Test TypeORM Connection Script
 * Run: node src/scripts/test-typeorm.js
 */

require('reflect-metadata');
require('dotenv').config();
const { getDataSource } = require('../database/typeorm');
const { Location } = require('../entities/Location.entity');
const { FoodCategory } = require('../entities/FoodCategory.entity');

async function testTypeORM() {
  console.log('🧪 Testing TypeORM Connection...\n');
  
  try {
    // 1. Test DataSource initialization
    console.log('1️⃣ Initializing DataSource...');
    const dataSource = await getDataSource();
    
    if (!dataSource.isInitialized) {
      throw new Error('DataSource failed to initialize');
    }
    console.log('✅ DataSource initialized successfully');
    console.log(`   - Database: ${dataSource.options.type}`);
    console.log(`   - Entities loaded: ${dataSource.entityMetadatas.length}\n`);
    
    // 2. Test repository access
    console.log('2️⃣ Testing repository access...');
    const locationRepo = dataSource.getRepository(Location);
    const categoryRepo = dataSource.getRepository(FoodCategory);
    console.log('✅ Repositories accessible\n');
    
    // 3. Test query - Count locations
    console.log('3️⃣ Testing query - Count locations...');
    const locationCount = await locationRepo.count();
    console.log(`✅ Found ${locationCount} locations\n`);
    
    // 4. Test query - Get categories
    console.log('4️⃣ Testing query - Get food categories...');
    const categories = await categoryRepo.find({
      take: 5,
      order: { display_order: 'ASC' }
    });
    console.log(`✅ Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name}`);
    });
    console.log('');
    
    // 5. Test complex query
    console.log('5️⃣ Testing complex query with relations...');
    const locations = await locationRepo
      .createQueryBuilder('location')
      .where('location.status = :status', { status: 'active' })
      .getMany();
    console.log(`✅ Found ${locations.length} active locations\n`);
    
    console.log('🎉 All TypeORM tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   - DataSource: ✅ Connected`);
    console.log(`   - Entities: ✅ ${dataSource.entityMetadatas.length} loaded`);
    console.log(`   - Repositories: ✅ Working`);
    console.log(`   - Queries: ✅ Working`);
    
    // Close connection
    await dataSource.destroy();
    console.log('\n✅ Connection closed gracefully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TypeORM Test Failed!');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run test
testTypeORM();


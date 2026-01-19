/**
 * Script to activate a user account
 * Usage: node src/scripts/activate-user.js <email>
 */

require('dotenv').config();
const { getDataSource } = require('../database/typeorm');
const { User } = require('../entities/User.entity');

async function activateUser(email) {
  try {
    const dataSource = await getDataSource();
    const userRepo = dataSource.getRepository(User);
    
    const user = await userRepo.findOne({ where: { email } });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }
    
    if (user.account_status === 'active') {
      console.log(`✅ User "${email}" is already active`);
      process.exit(0);
    }
    
    user.account_status = 'active';
    await userRepo.save(user);
    
    console.log(`✅ Successfully activated user: ${email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.account_status}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error activating user:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: node src/scripts/activate-user.js <email>');
  console.error('Example: node src/scripts/activate-user.js admin@thrive.lk');
  process.exit(1);
}

activateUser(email);


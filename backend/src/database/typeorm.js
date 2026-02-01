/**
 * TypeORM Data Source Configuration
 * Since we're using JavaScript (not TypeScript), we'll use DataSource API
 */

require('reflect-metadata');
require('dotenv').config();
const { DataSource } = require('typeorm');

// Import entities
const { Location } = require('../entities/Location.entity');
const { FoodCategory } = require('../entities/FoodCategory.entity');
const { FoodType } = require('../entities/FoodType.entity');
const { Specification } = require('../entities/Specification.entity');
const { CookType } = require('../entities/CookType.entity');
const { Ingredient } = require('../entities/Ingredient.entity');
const { IngredientQuantity } = require('../entities/IngredientQuantity.entity');
const { MenuItem } = require('../entities/MenuItem.entity');
const { MenuItemPhoto } = require('../entities/MenuItemPhoto.entity');
const { MenuItemIngredient } = require('../entities/MenuItemIngredient.entity');
const { Order } = require('../entities/Order.entity');
const { OrderItem } = require('../entities/OrderItem.entity');
const { Customer } = require('../entities/Customer.entity');
const { User } = require('../entities/User.entity');

// Support both DATABASE_URL (local) and POSTGRES_URL (Vercel/Neon)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Auto-detect SSL: Enable for Neon (neon.tech) or when sslmode=require is in URL
const requiresSSL = connectionString && (
  connectionString.includes('neon.tech') ||
  connectionString.includes('sslmode=require')
);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: connectionString,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
  entities: [
    Location,
    FoodCategory,
    FoodType,
    Specification,
    CookType,
    Ingredient,
    IngredientQuantity,
    MenuItem,
    MenuItemPhoto,
    MenuItemIngredient,
    Order,
    OrderItem,
    Customer,
    User
  ],
  synchronize: false, // NEVER true in production - we use migrations
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
});

// Initialize connection (singleton pattern)
let isInitialized = false;

async function getDataSource() {
  if (!isInitialized) {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ TypeORM DataSource initialized');
    }
    isInitialized = true;
  }
  return AppDataSource;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('TypeORM connection closed');
  }
});

module.exports = { AppDataSource, getDataSource };


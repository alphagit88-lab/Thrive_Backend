/**
 * TypeORM Test Routes
 * Test database connection and basic operations
 */

const express = require('express');
const router = express.Router();
const { getDataSource } = require('../database/typeorm');
const { Location } = require('../entities/Location.entity');
const { FoodCategory } = require('../entities/FoodCategory.entity');

// Test TypeORM connection
router.get('/connection', async (req, res) => {
  try {
    const dataSource = await getDataSource();
    
    if (dataSource.isInitialized) {
      res.json({
        success: true,
        message: 'TypeORM DataSource is connected',
        database: dataSource.options.type,
        entities: dataSource.entityMetadatas.length
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'TypeORM DataSource is not initialized'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'TypeORM connection failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test query - Get locations
router.get('/locations', async (req, res) => {
  try {
    const dataSource = await getDataSource();
    const locationRepo = dataSource.getRepository(Location);
    
    const locations = await locationRepo.find({
      order: { created_at: 'DESC' },
      take: 10
    });
    
    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
      error: error.message
    });
  }
});

// Test query - Get food categories
router.get('/categories', async (req, res) => {
  try {
    const dataSource = await getDataSource();
    const categoryRepo = dataSource.getRepository(FoodCategory);
    
    const categories = await categoryRepo.find({
      order: { display_order: 'ASC' }
    });
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Test create - Create a test location
router.post('/test-location', async (req, res) => {
  try {
    const dataSource = await getDataSource();
    const locationRepo = dataSource.getRepository(Location);
    
    const testLocation = locationRepo.create({
      name: 'Test Location ' + Date.now(),
      currency: 'LKR',
      status: 'active'
    });
    
    const saved = await locationRepo.save(testLocation);
    
    res.json({
      success: true,
      message: 'Test location created',
      data: saved
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create test location',
      error: error.message
    });
  }
});

module.exports = router;


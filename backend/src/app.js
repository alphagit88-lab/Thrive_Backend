/**
 * Thrive - Food Preparation Admin Dashboard
 * Main Application Entry Point
 */

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const { getLocationFilter } = require('./middleware/auth');

const app = express();

// Middleware
// CORS configuration - allows frontend domain in production
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Location-Id']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get location filter from header for all requests
app.use(getLocationFilter);

// API Routes
app.use('/api/locations', require('./routes/locations.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/ingredients', require('./routes/ingredients.routes'));
app.use('/api/menu', require('./routes/menu.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/customers', require('./routes/customers.routes'));
app.use('/api/users', require('./routes/users.routes'));

// Health check / Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Thrive API is running',
    timestamp: new Date().toISOString()
  });
});

// Database connection test (Raw SQL)
const pool = require('./database/dbconn');
app.get('/api/test/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      success: true,
      status: 'Connected to database successfully (Raw SQL)',
      time: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      status: 'Database connection failed',
      error: error.message 
    });
  }
});

// TypeORM test routes
app.use('/api/test/typeorm', require('./routes/test-typeorm.routes'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;

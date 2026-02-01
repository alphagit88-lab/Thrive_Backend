// Vercel Serverless Function Entry Point
require('reflect-metadata');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('../src/middleware/errorHandler');
const { getLocationFilter } = require('../src/middleware/auth');

const app = express();

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        // Allow all Vercel deployments
        if (origin.includes('.vercel.app') || origin.includes('localhost')) {
            return callback(null, true);
        }
        callback(null, true); // Allow all for now
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Location-Id']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(getLocationFilter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Thrive API is running on Vercel',
        timestamp: new Date().toISOString()
    });
});

// Root health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Thrive Backend API',
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/locations', require('../src/routes/locations.routes'));
app.use('/api/settings', require('../src/routes/settings.routes'));
app.use('/api/ingredients', require('../src/routes/ingredients.routes'));
app.use('/api/menu', require('../src/routes/menu.routes'));
app.use('/api/orders', require('../src/routes/orders.routes'));
app.use('/api/customers', require('../src/routes/customers.routes'));
app.use('/api/users', require('../src/routes/users.routes'));

// Database test
const pool = require('../src/database/dbconn');
app.get('/api/test/db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            success: true,
            status: 'Connected to database',
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});

// Error handler
app.use(errorHandler);

// Export for Vercel
module.exports = app;

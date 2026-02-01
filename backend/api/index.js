// Vercel Serverless Function Entry Point for Express.js
require('reflect-metadata');
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import the main app configuration
const mainApp = require('../src/app');

// Create a wrapper for Vercel
const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Mount the main app
app.use('/', mainApp);

// Export for Vercel
module.exports = app;

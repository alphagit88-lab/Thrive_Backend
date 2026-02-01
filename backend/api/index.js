// Vercel Serverless Function Entry Point
// Load reflect-metadata FIRST (required for TypeORM decorators)
require('reflect-metadata');
require('dotenv').config();

const app = require('../src/app');

// Export the Express app as a serverless function handler
module.exports = app;

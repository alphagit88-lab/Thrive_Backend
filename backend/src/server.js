// Load reflect-metadata FIRST (required for TypeORM decorators)
require('reflect-metadata');
require('dotenv').config();

const app = require('./app');

// For local development - start the server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel serverless
module.exports = app;

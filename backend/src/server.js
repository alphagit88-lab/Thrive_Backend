// Load reflect-metadata FIRST (required for TypeORM decorators)
require('reflect-metadata');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

try {
  const app = require('./app');
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

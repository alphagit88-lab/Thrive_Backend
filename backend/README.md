# Thrive Restaurant Management System - Backend API

A robust Node.js REST API built with Express.js and TypeORM for managing restaurant operations. This backend provides comprehensive endpoints for handling customers, menu management, orders, locations, users, and inventory tracking.

## 🌟 Features

- **Location-Based Operations**: Multi-location support with location-specific data filtering
- **Customer Management**: Complete customer profile and order history management
- **Menu Management**: Dynamic menu items with categories, pricing, and ingredient tracking
- **Order Processing**: Real-time order management with status tracking
- **User Management**: Role-based access control (Admin, Manager, Staff, Kitchen Staff)
- **Ingredient Inventory**: Track ingredient quantities and usage
- **TypeORM Integration**: Modern ORM with entity relationships and migrations
- **Authentication Middleware**: Secure API endpoints with location-based filtering
- **Error Handling**: Comprehensive error handling and logging
- **Health Monitoring**: Built-in health check endpoints

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.2.1
- **Database**: PostgreSQL
- **ORM**: TypeORM 0.3.28
- **Authentication**: bcrypt for password hashing
- **Environment**: dotenv for configuration
- **CORS**: Cross-origin resource sharing enabled
- **Development**: nodemon for hot reloading

## 📋 Prerequisites

Before running this application, ensure you have:

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Getting Started

### 1. Clone and Setup

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thrive_db
DB_USER=your_username
DB_PASSWORD=your_password

# TypeORM Configuration
TYPEORM_CONNECTION=postgres
TYPEORM_HOST=localhost
TYPEORM_PORT=5432
TYPEORM_USERNAME=your_username
TYPEORM_PASSWORD=your_password
TYPEORM_DATABASE=thrive_db
TYPEORM_SYNCHRONIZE=true
TYPEORM_LOGGING=true

# Security (add your own secret keys)
JWT_SECRET=your_super_secret_jwt_key
BCRYPT_SALT_ROUNDS=12
```

### 3. Database Setup

#### Option 1: Using Raw SQL (Current Implementation)
```bash
# Create database and run schema
psql -U your_username -d postgres -c "CREATE DATABASE thrive_db;"
psql -U your_username -d thrive_db -f src/database/schema.sql
psql -U your_username -d thrive_db -f src/database/seed.sql
```

#### Option 2: Using TypeORM Migrations
```bash
# Run database migrations
npm run migrate

# Test TypeORM connection
npm run test:typeorm
```

### 4. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📁 Project Structure

```
src/
├── app.js                     # Express application setup
├── server.js                  # Server entry point
├── controllers/               # Business logic controllers
│   ├── customers.controller.js
│   ├── ingredients.controller.js
│   ├── locations.controller.js
│   ├── menu.controller.js
│   ├── orders.controller.js
│   ├── settings.controller.js
│   └── users.controller.js
├── database/                  # Database configuration and setup
│   ├── dbconn.js             # PostgreSQL connection pool
│   ├── migrate.js            # Migration runner
│   ├── schema.sql            # Database schema
│   ├── seed.sql              # Sample data
│   └── typeorm.js            # TypeORM configuration
├── entities/                  # TypeORM entity definitions
│   ├── CookType.entity.js
│   ├── Customer.entity.js
│   ├── FoodCategory.entity.js
│   ├── FoodType.entity.js
│   ├── Ingredient.entity.js
│   ├── IngredientQuantity.entity.js
│   ├── Location.entity.js
│   ├── MenuItem.entity.js
│   ├── MenuItemIngredient.entity.js
│   ├── MenuItemPhoto.entity.js
│   ├── Order.entity.js
│   ├── OrderItem.entity.js
│   ├── Specification.entity.js
│   └── User.entity.js
├── middleware/                # Express middleware
│   ├── auth.js               # Authentication and location filtering
│   └── errorHandler.js       # Global error handling
├── routes/                    # API route definitions
│   ├── customers.routes.js
│   ├── ingredients.routes.js
│   ├── locations.routes.js
│   ├── menu.routes.js
│   ├── orders.routes.js
│   ├── settings.routes.js
│   ├── test-typeorm.routes.js
│   └── users.routes.js
└── scripts/                   # Utility scripts
    └── test-typeorm.js       # TypeORM connection testing
```

## 🔧 Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm run migrate` - Run database migrations
- `npm run test:typeorm` - Test TypeORM connection and setup

## 🌐 API Endpoints

### Base URL: `http://localhost:5000/api`

### Health & Testing
- `GET /health` - API health check
- `GET /test/db` - Database connection test
- `GET /test/typeorm` - TypeORM connection test

### Core Resources

#### Locations
- `GET /locations` - Get all locations
- `POST /locations` - Create new location
- `GET /locations/:id` - Get location by ID
- `PUT /locations/:id` - Update location
- `DELETE /locations/:id` - Delete location

#### Customers  
- `GET /customers` - Get all customers (location-filtered)
- `POST /customers` - Create new customer
- `GET /customers/:id` - Get customer by ID
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

#### Menu Management
- `GET /menu` - Get all menu items (location-filtered)
- `POST /menu` - Create new menu item
- `GET /menu/:id` - Get menu item by ID
- `PUT /menu/:id` - Update menu item
- `DELETE /menu/:id` - Delete menu item
- `GET /menu/categories` - Get food categories
- `GET /menu/types` - Get food types

#### Orders
- `GET /orders` - Get all orders (location-filtered)
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order by ID
- `PUT /orders/:id` - Update order
- `PATCH /orders/:id/status` - Update order status
- `DELETE /orders/:id` - Delete order

#### Users
- `GET /users` - Get all users (location-filtered)
- `POST /users` - Create new user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

#### Ingredients
- `GET /ingredients` - Get all ingredients (location-filtered)
- `POST /ingredients` - Create new ingredient
- `GET /ingredients/:id` - Get ingredient by ID
- `PUT /ingredients/:id` - Update ingredient
- `DELETE /ingredients/:id` - Delete ingredient

#### Settings
- `GET /settings` - Get application settings (location-filtered)
- `PUT /settings` - Update settings

## 🔐 Authentication & Security

The API uses location-based filtering through headers:

```javascript
// Include location header in requests
headers: {
  'X-Location-Id': 'your-location-uuid',
  'Content-Type': 'application/json'
}
```

### User Roles
- **Admin**: Full system access
- **Manager**: Location management and reporting
- **Staff**: Order and customer management
- **Kitchen Staff**: Order preparation and ingredient tracking

## 🗄️ Database Schema

### Key Tables
- **locations**: Multi-location support base table
- **customers**: Customer information and preferences
- **menu_items**: Restaurant menu with pricing and categories
- **orders & order_items**: Order management and tracking
- **users**: Staff and authentication
- **ingredients & ingredient_quantities**: Inventory management
- **food_categories & food_types**: Menu categorization

### Relationships
- Location-based data isolation
- Menu items linked to ingredients
- Orders connected to customers and menu items
- Users assigned to specific locations

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Database Connection
```bash
curl http://localhost:5000/api/test/db
```

### TypeORM Testing
```bash
npm run test:typeorm
```

## 🚀 Deployment

### Environment Setup
1. Set production environment variables
2. Configure PostgreSQL database
3. Run database migrations
4. Start the application

### Production Commands
```bash
# Build and start
npm install --production
npm start

# With PM2 (recommended)
pm2 start src/server.js --name "thrive-backend"
```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Configuration

### CORS Setup
Configure allowed origins in production:
```javascript
// In app.js
origin: process.env.FRONTEND_URL || 'http://localhost:3000'
```

### Database Connection
- Uses connection pooling for optimal performance
- Supports both raw SQL and TypeORM
- Connection retry logic included

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service is running
   - Verify credentials in .env file
   - Ensure database exists

2. **TypeORM Sync Issues**
   - Run `npm run test:typeorm`
   - Check entity definitions
   - Verify database permissions

3. **CORS Errors**
   - Update FRONTEND_URL in .env
   - Check allowed methods and headers

4. **Port Already in Use**
   - Change PORT in .env file
   - Check for running processes: `netstat -ano | findstr :5000`

## 📊 Monitoring & Logging

- Health check endpoint for monitoring
- Error logging with stack traces
- Request/response logging in development
- Database query logging (configurable)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the existing code structure and patterns
4. Add proper error handling
5. Test your changes thoroughly
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

This project is part of the Thrive Restaurant Management System.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Examine server logs for detailed error information
4. Create an issue with detailed information including:
   - Error messages
   - Steps to reproduce
   - Environment details

## 🔗 Related Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Thrive Frontend Repository](../frontend/thrive-next-frontend/)
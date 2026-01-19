/**
 * Authentication Middleware
 * Simple token-based auth using user ID as token
 */

const { getDataSource } = require('../database/typeorm');
const { User } = require('../entities/User.entity');
const { AppError } = require('./errorHandler');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for Bearer token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    // Token is the user ID (simple implementation)
    const dataSource = await getDataSource();
    const userRepo = dataSource.getRepository(User);
    
    const user = await userRepo.findOne({
      where: { 
        id: token,
        account_status: 'active'
      },
      select: ['id', 'email', 'name', 'role', 'location_id', 'account_status']
    });

    if (!user) {
      return next(new AppError('User not found or inactive', 401));
    }

    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location_id: user.location_id
    };
    next();
  } catch (error) {
    next(new AppError('Not authorized to access this route', 401));
  }
};

// Restrict to certain roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Role '${req.user.role}' is not authorized to access this route`, 403));
    }
    next();
  };
};

// Optional: Get location from header for filtering
const getLocationFilter = (req, res, next) => {
  // Location can be passed in header or query
  req.locationId = req.headers['x-location-id'] || req.query.location_id || null;
  next();
};

module.exports = { protect, authorize, getLocationFilter };


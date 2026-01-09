/**
 * Authentication Middleware
 * For now, simple token-based auth. Can be upgraded to JWT later.
 */

const pool = require('../database/dbconn');
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

    // For now, token is the user ID (simple implementation)
    // TODO: Implement proper JWT authentication
    const result = await pool.query(
      'SELECT id, email, name, role, location_id FROM users WHERE id = $1 AND account_status = $2',
      [token, 'active']
    );

    if (result.rows.length === 0) {
      return next(new AppError('User not found or inactive', 401));
    }

    // Add user to request
    req.user = result.rows[0];
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


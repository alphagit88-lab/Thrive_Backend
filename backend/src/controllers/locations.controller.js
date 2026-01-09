/**
 * Locations Controller
 * Handles all location-related operations
 */

const pool = require('../database/dbconn');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Public
const getLocations = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  
  let query = 'SELECT * FROM locations WHERE 1=1';
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND name ILIKE $${params.length}`;
  }
  
  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single location
// @route   GET /api/locations/:id
// @access  Public
const getLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Create location
// @route   POST /api/locations
// @access  Private
const createLocation = asyncHandler(async (req, res) => {
  const { name, currency = 'LKR', location_type, address, phone, status = 'active' } = req.body;
  
  if (!name) {
    throw new AppError('Location name is required', 400);
  }
  
  const result = await pool.query(
    `INSERT INTO locations (name, currency, location_type, address, phone, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, currency, location_type, address, phone, status]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private
const updateLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, currency, location_type, address, phone, status } = req.body;
  
  // Check if location exists
  const existing = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }
  
  const result = await pool.query(
    `UPDATE locations 
     SET name = COALESCE($1, name),
         currency = COALESCE($2, currency),
         location_type = COALESCE($3, location_type),
         address = COALESCE($4, address),
         phone = COALESCE($5, phone),
         status = COALESCE($6, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [name, currency, location_type, address, phone, status, id]
  );
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private
const deleteLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Location deleted successfully'
  });
});

module.exports = {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation
};


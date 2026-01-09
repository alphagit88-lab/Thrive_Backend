/**
 * Users Controller
 * Handles user/staff management with authentication - Location dependent
 */

const pool = require('../database/dbconn');
const bcrypt = require('bcrypt');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all users (filtered by location)
// @route   GET /api/users
const getUsers = asyncHandler(async (req, res) => {
  const { location_id, search, role, status } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  let query = `
    SELECT 
      u.id, u.location_id, u.email, u.name, u.contact_number, 
      u.role, u.account_status, u.created_at, u.updated_at,
      l.name as location_name
    FROM users u
    JOIN locations l ON u.location_id = l.id
    WHERE u.location_id = $1
  `;
  
  const params = [location_id];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }
  
  if (role) {
    params.push(role);
    query += ` AND u.role = $${params.length}`;
  }
  
  if (status) {
    params.push(status);
    query += ` AND u.account_status = $${params.length}`;
  }
  
  query += ' ORDER BY u.created_at DESC';
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT 
      u.id, u.location_id, u.email, u.name, u.contact_number, 
      u.role, u.account_status, u.created_at, u.updated_at,
      l.name as location_name
    FROM users u
    JOIN locations l ON u.location_id = l.id
    WHERE u.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Create user
// @route   POST /api/users
const createUser = asyncHandler(async (req, res) => {
  const { location_id, email, password, name, contact_number, role = 'staff' } = req.body;
  
  if (!location_id || !email || !password || !name) {
    throw new AppError('Location ID, email, password, and name are required', 400);
  }
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  
  const result = await pool.query(
    `INSERT INTO users (location_id, email, password_hash, name, contact_number, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, location_id, email, name, contact_number, role, account_status, created_at`,
    [location_id, email, password_hash, name, contact_number, role]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, contact_number, role, account_status, password } = req.body;
  
  // If password is being updated, hash it
  let password_hash = null;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    password_hash = await bcrypt.hash(password, salt);
  }
  
  let query = `
    UPDATE users 
    SET email = COALESCE($1, email),
        name = COALESCE($2, name),
        contact_number = COALESCE($3, contact_number),
        role = COALESCE($4, role),
        account_status = COALESCE($5, account_status),
        updated_at = CURRENT_TIMESTAMP
  `;
  
  const params = [email, name, contact_number, role, account_status];
  
  if (password_hash) {
    params.push(password_hash);
    query += `, password_hash = $${params.length}`;
  }
  
  params.push(id);
  query += ` WHERE id = $${params.length}
             RETURNING id, location_id, email, name, contact_number, role, account_status, created_at, updated_at`;
  
  const result = await pool.query(query, params);
  
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Login user
// @route   POST /api/users/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }
  
  // Find user
  const result = await pool.query(
    `SELECT u.*, l.name as location_name 
     FROM users u 
     JOIN locations l ON u.location_id = l.id
     WHERE u.email = $1`,
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials', 401);
  }
  
  const user = result.rows[0];
  
  // Check if account is active
  if (user.account_status !== 'active') {
    throw new AppError('Account is not active', 401);
  }
  
  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }
  
  // Return user without password_hash
  // For now, using user ID as token (simple implementation)
  // TODO: Implement proper JWT
  const { password_hash, ...userWithoutPassword } = user;
  
  res.status(200).json({
    success: true,
    data: {
      user: userWithoutPassword,
      token: user.id  // Simple token - replace with JWT in production
    }
  });
});

// @desc    Get current logged in user
// @route   GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware
  const result = await pool.query(`
    SELECT 
      u.id, u.location_id, u.email, u.name, u.contact_number, 
      u.role, u.account_status, u.created_at, u.updated_at,
      l.name as location_name
    FROM users u
    JOIN locations l ON u.location_id = l.id
    WHERE u.id = $1
  `, [req.user.id]);
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  getMe
};


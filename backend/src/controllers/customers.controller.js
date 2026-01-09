/**
 * Customers Controller
 * Handles customer management - Location dependent
 */

const pool = require('../database/dbconn');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all customers (filtered by location)
// @route   GET /api/customers
const getCustomers = asyncHandler(async (req, res) => {
  const { location_id, search, status } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  let query = `
    SELECT 
      c.*,
      l.name as location_name
    FROM customers c
    JOIN locations l ON c.location_id = l.id
    WHERE c.location_id = $1
  `;
  
  const params = [location_id];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (c.name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.contact_number ILIKE $${params.length})`;
  }
  
  if (status) {
    params.push(status);
    query += ` AND c.account_status = $${params.length}`;
  }
  
  query += ' ORDER BY c.created_at DESC';
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
const getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT 
      c.*,
      l.name as location_name
    FROM customers c
    JOIN locations l ON c.location_id = l.id
    WHERE c.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Customer not found', 404);
  }
  
  // Get customer's recent orders
  const orders = await pool.query(`
    SELECT id, order_number, status, total_price, order_date
    FROM orders
    WHERE customer_id = $1
    ORDER BY order_date DESC
    LIMIT 10
  `, [id]);
  
  res.status(200).json({
    success: true,
    data: {
      ...result.rows[0],
      recent_orders: orders.rows
    }
  });
});

// @desc    Create customer
// @route   POST /api/customers
const createCustomer = asyncHandler(async (req, res) => {
  const { location_id, email, name, contact_number, address } = req.body;
  
  if (!location_id || !email || !name) {
    throw new AppError('Location ID, email, and name are required', 400);
  }
  
  const result = await pool.query(
    `INSERT INTO customers (location_id, email, name, contact_number, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [location_id, email, name, contact_number, address]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, contact_number, address, account_status } = req.body;
  
  const result = await pool.query(
    `UPDATE customers 
     SET email = COALESCE($1, email),
         name = COALESCE($2, name),
         contact_number = COALESCE($3, contact_number),
         address = COALESCE($4, address),
         account_status = COALESCE($5, account_status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [email, name, contact_number, address, account_status, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Customer not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Customer not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
};


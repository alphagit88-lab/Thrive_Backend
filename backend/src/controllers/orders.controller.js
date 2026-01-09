/**
 * Orders Controller
 * Handles orders (preps) - Location dependent
 */

const pool = require('../database/dbconn');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all orders (filtered by location)
// @route   GET /api/orders
const getOrders = asyncHandler(async (req, res) => {
  const { location_id, status, customer_id, date_from, date_to } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  let query = `
    SELECT 
      o.*,
      c.name as customer_name,
      c.email as customer_email,
      c.contact_number as customer_phone,
      l.name as location_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'menu_item_name', m.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          ) ORDER BY oi.created_at
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) as items
    FROM orders o
    JOIN locations l ON o.location_id = l.id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items m ON oi.menu_item_id = m.id
    WHERE o.location_id = $1
  `;
  
  const params = [location_id];
  
  if (status) {
    params.push(status);
    query += ` AND o.status = $${params.length}`;
  }
  
  if (customer_id) {
    params.push(customer_id);
    query += ` AND o.customer_id = $${params.length}`;
  }
  
  if (date_from) {
    params.push(date_from);
    query += ` AND o.order_date >= $${params.length}`;
  }
  
  if (date_to) {
    params.push(date_to);
    query += ` AND o.order_date <= $${params.length}`;
  }
  
  query += ` GROUP BY o.id, c.name, c.email, c.contact_number, l.name
             ORDER BY o.order_date DESC`;
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT 
      o.*,
      c.name as customer_name,
      c.email as customer_email,
      c.contact_number as customer_phone,
      l.name as location_name
    FROM orders o
    JOIN locations l ON o.location_id = l.id
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }
  
  // Get order items
  const items = await pool.query(`
    SELECT 
      oi.*,
      m.name as menu_item_name,
      m.description as menu_item_description
    FROM order_items oi
    LEFT JOIN menu_items m ON oi.menu_item_id = m.id
    WHERE oi.order_id = $1
    ORDER BY oi.created_at
  `, [id]);
  
  res.status(200).json({
    success: true,
    data: {
      ...result.rows[0],
      items: items.rows
    }
  });
});

// @desc    Create order
// @route   POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const {
    location_id,
    customer_id,
    notes,
    items = []  // Array of { menu_item_id, quantity, unit_price }
  } = req.body;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  if (items.length === 0) {
    throw new AppError('At least one item is required', 400);
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Calculate total price
    let totalPrice = 0;
    for (const item of items) {
      totalPrice += (item.unit_price || 0) * (item.quantity || 1);
    }
    
    // Generate order number
    const orderCount = await client.query(
      'SELECT COUNT(*) as count FROM orders WHERE location_id = $1',
      [location_id]
    );
    const orderNumber = `ORD-${String(parseInt(orderCount.rows[0].count) + 1).padStart(5, '0')}`;
    
    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (location_id, customer_id, order_number, status, total_price, notes)
       VALUES ($1, $2, $3, 'received', $4, $5)
       RETURNING *`,
      [location_id, customer_id || null, orderNumber, totalPrice, notes]
    );
    
    const order = orderResult.rows[0];
    
    // Create order items
    const createdItems = [];
    for (const item of items) {
      const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
      const itemResult = await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [order.id, item.menu_item_id, item.quantity || 1, item.unit_price || 0, itemTotal, item.notes || null]
      );
      createdItems.push(itemResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        ...order,
        items: createdItems
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    throw new AppError('Status is required', 400);
  }
  
  const validStatuses = ['received', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }
  
  let updateQuery = `
    UPDATE orders 
    SET status = $1,
        updated_at = CURRENT_TIMESTAMP
  `;
  
  // Set delivered_at if status is delivered
  if (status === 'delivered') {
    updateQuery += `, delivered_at = CURRENT_TIMESTAMP`;
  }
  
  updateQuery += ` WHERE id = $2 RETURNING *`;
  
  const result = await pool.query(updateQuery, [status, id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update order
// @route   PUT /api/orders/:id
const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { customer_id, notes, status } = req.body;
  
  const result = await pool.query(
    `UPDATE orders 
     SET customer_id = COALESCE($1, customer_id),
         notes = COALESCE($2, notes),
         status = COALESCE($3, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [customer_id, notes, status, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Order deleted successfully'
  });
});

// @desc    Get order statistics for dashboard
// @route   GET /api/orders/stats
const getOrderStats = asyncHandler(async (req, res) => {
  const { location_id, date } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const stats = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'received') as preps_received,
      COUNT(*) FILTER (WHERE status = 'delivered') as preps_delivered,
      COALESCE(SUM(total_price) FILTER (WHERE status = 'delivered'), 0) as total_earnings
    FROM orders
    WHERE location_id = $1 
    AND DATE(order_date) = $2
  `, [location_id, targetDate]);
  
  res.status(200).json({
    success: true,
    data: {
      preps_received: parseInt(stats.rows[0].preps_received) || 0,
      preps_delivered: parseInt(stats.rows[0].preps_delivered) || 0,
      total_earnings: parseFloat(stats.rows[0].total_earnings) || 0,
      date: targetDate
    }
  });
});

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats
};


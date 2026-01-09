/**
 * Orders Routes
 * /api/orders
 */

const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats
} = require('../controllers/orders.controller');

// Stats route - must be before /:id
router.get('/stats', getOrderStats);

// Standard CRUD routes
router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrder)
  .put(updateOrder)
  .delete(deleteOrder);

// Update status
router.patch('/:id/status', updateOrderStatus);

module.exports = router;


/**
 * Menu Routes
 * /api/menu
 */

const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuStatus
} = require('../controllers/menu.controller');

// Standard CRUD routes
router.route('/')
  .get(getMenuItems)
  .post(createMenuItem);

router.route('/:id')
  .get(getMenuItem)
  .put(updateMenuItem)
  .delete(deleteMenuItem);

// Toggle status
router.patch('/:id/toggle-status', toggleMenuStatus);

module.exports = router;


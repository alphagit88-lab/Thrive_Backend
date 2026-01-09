/**
 * Users Routes
 * /api/users
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  getMe
} = require('../controllers/users.controller');

// Public routes
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getMe);

// Standard CRUD routes
router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;


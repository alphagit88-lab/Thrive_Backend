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
  signupUser,
  loginUser,
  getMe
} = require('../controllers/users.controller');

// Public routes
router.post('/signup', signupUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getMe);

// Standard CRUD routes - all require authentication
router.route('/')
  .get(protect, getUsers)
  .post(protect, createUser);

router.route('/:id')
  .get(protect, getUser)
  .put(protect, updateUser)
  .delete(protect, deleteUser);

module.exports = router;


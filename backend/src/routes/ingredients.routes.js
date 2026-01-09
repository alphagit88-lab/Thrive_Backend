/**
 * Ingredients Routes
 * /api/ingredients
 */

const express = require('express');
const router = express.Router();
const {
  getIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientsByCategory
} = require('../controllers/ingredients.controller');

// Special route - must be before /:id
router.get('/by-category', getIngredientsByCategory);

// Standard CRUD routes
router.route('/')
  .get(getIngredients)
  .post(createIngredient);

router.route('/:id')
  .get(getIngredient)
  .put(updateIngredient)
  .delete(deleteIngredient);

module.exports = router;


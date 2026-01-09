/**
 * Settings Routes
 * /api/settings
 */

const express = require('express');
const router = express.Router();
const {
  // Categories
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  // Types
  getTypes,
  getType,
  createType,
  updateType,
  deleteType,
  // Specifications
  getSpecifications,
  createSpecification,
  updateSpecification,
  deleteSpecification,
  // Cook Types
  getCookTypes,
  createCookType,
  updateCookType,
  deleteCookType
} = require('../controllers/settings.controller');

// Food Categories
router.route('/categories')
  .get(getCategories)
  .post(createCategory);

router.route('/categories/:id')
  .get(getCategory)
  .put(updateCategory)
  .delete(deleteCategory);

// Food Types
router.route('/types')
  .get(getTypes)
  .post(createType);

router.route('/types/:id')
  .get(getType)
  .put(updateType)
  .delete(deleteType);

// Specifications
router.route('/specifications')
  .get(getSpecifications)
  .post(createSpecification);

router.route('/specifications/:id')
  .put(updateSpecification)
  .delete(deleteSpecification);

// Cook Types
router.route('/cook-types')
  .get(getCookTypes)
  .post(createCookType);

router.route('/cook-types/:id')
  .put(updateCookType)
  .delete(deleteCookType);

module.exports = router;


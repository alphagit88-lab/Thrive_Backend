/**
 * Settings Controller
 * Handles Food Categories, Food Types, Specifications, Cook Types
 */

const pool = require('../database/dbconn');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// ==================== FOOD CATEGORIES ====================

// @desc    Get all food categories
// @route   GET /api/settings/categories
const getCategories = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM food_categories ORDER BY display_order, name'
  );
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single category
// @route   GET /api/settings/categories/:id
const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('SELECT * FROM food_categories WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Create food category
// @route   POST /api/settings/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, display_order, show_specification = true, show_cook_type = true } = req.body;
  
  if (!name) {
    throw new AppError('Category name is required', 400);
  }
  
  // Get max display order if not provided
  let order = display_order;
  if (!order) {
    const maxOrder = await pool.query('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM food_categories');
    order = maxOrder.rows[0].next_order;
  }
  
  const result = await pool.query(
    `INSERT INTO food_categories (name, display_order, show_specification, show_cook_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, order, show_specification, show_cook_type]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update food category
// @route   PUT /api/settings/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, display_order, show_specification, show_cook_type } = req.body;
  
  const result = await pool.query(
    `UPDATE food_categories 
     SET name = COALESCE($1, name),
         display_order = COALESCE($2, display_order),
         show_specification = COALESCE($3, show_specification),
         show_cook_type = COALESCE($4, show_cook_type),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [name, display_order, show_specification, show_cook_type, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete food category
// @route   DELETE /api/settings/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM food_categories WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});

// ==================== FOOD TYPES ====================

// @desc    Get all food types (optionally filtered by category)
// @route   GET /api/settings/types
const getTypes = asyncHandler(async (req, res) => {
  const { category_id } = req.query;
  
  let query = `
    SELECT ft.*, fc.name as category_name 
    FROM food_types ft
    JOIN food_categories fc ON ft.category_id = fc.id
  `;
  const params = [];
  
  if (category_id) {
    params.push(category_id);
    query += ` WHERE ft.category_id = $${params.length}`;
  }
  
  query += ' ORDER BY fc.display_order, ft.name';
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single food type
// @route   GET /api/settings/types/:id
const getType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(
    `SELECT ft.*, fc.name as category_name 
     FROM food_types ft
     JOIN food_categories fc ON ft.category_id = fc.id
     WHERE ft.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Food type not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Create food type
// @route   POST /api/settings/types
const createType = asyncHandler(async (req, res) => {
  const { category_id, name } = req.body;
  
  if (!category_id || !name) {
    throw new AppError('Category ID and name are required', 400);
  }
  
  // Verify category exists
  const categoryCheck = await pool.query('SELECT id FROM food_categories WHERE id = $1', [category_id]);
  if (categoryCheck.rows.length === 0) {
    throw new AppError('Category not found', 404);
  }
  
  const result = await pool.query(
    `INSERT INTO food_types (category_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [category_id, name]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update food type
// @route   PUT /api/settings/types/:id
const updateType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category_id, name } = req.body;
  
  const result = await pool.query(
    `UPDATE food_types 
     SET category_id = COALESCE($1, category_id),
         name = COALESCE($2, name),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [category_id, name, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Food type not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete food type
// @route   DELETE /api/settings/types/:id
const deleteType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM food_types WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Food type not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Food type deleted successfully'
  });
});

// ==================== SPECIFICATIONS ====================

// @desc    Get specifications (optionally filtered by food type)
// @route   GET /api/settings/specifications
const getSpecifications = asyncHandler(async (req, res) => {
  const { food_type_id } = req.query;
  
  let query = `
    SELECT s.*, ft.name as food_type_name, fc.name as category_name
    FROM specifications s
    JOIN food_types ft ON s.food_type_id = ft.id
    JOIN food_categories fc ON ft.category_id = fc.id
  `;
  const params = [];
  
  if (food_type_id) {
    params.push(food_type_id);
    query += ` WHERE s.food_type_id = $${params.length}`;
  }
  
  query += ' ORDER BY ft.name, s.name';
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Create specification
// @route   POST /api/settings/specifications
const createSpecification = asyncHandler(async (req, res) => {
  const { food_type_id, name } = req.body;
  
  if (!food_type_id || !name) {
    throw new AppError('Food type ID and name are required', 400);
  }
  
  const result = await pool.query(
    `INSERT INTO specifications (food_type_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [food_type_id, name]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update specification
// @route   PUT /api/settings/specifications/:id
const updateSpecification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { food_type_id, name } = req.body;
  
  const result = await pool.query(
    `UPDATE specifications 
     SET food_type_id = COALESCE($1, food_type_id),
         name = COALESCE($2, name)
     WHERE id = $3
     RETURNING *`,
    [food_type_id, name, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Specification not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete specification
// @route   DELETE /api/settings/specifications/:id
const deleteSpecification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM specifications WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Specification not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Specification deleted successfully'
  });
});

// ==================== COOK TYPES ====================

// @desc    Get cook types (optionally filtered by category)
// @route   GET /api/settings/cook-types
const getCookTypes = asyncHandler(async (req, res) => {
  const { category_id } = req.query;
  
  let query = `
    SELECT ct.*, fc.name as category_name
    FROM cook_types ct
    JOIN food_categories fc ON ct.category_id = fc.id
  `;
  const params = [];
  
  if (category_id) {
    params.push(category_id);
    query += ` WHERE ct.category_id = $${params.length}`;
  }
  
  query += ' ORDER BY fc.display_order, ct.name';
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Create cook type
// @route   POST /api/settings/cook-types
const createCookType = asyncHandler(async (req, res) => {
  const { category_id, name } = req.body;
  
  if (!category_id || !name) {
    throw new AppError('Category ID and name are required', 400);
  }
  
  const result = await pool.query(
    `INSERT INTO cook_types (category_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [category_id, name]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update cook type
// @route   PUT /api/settings/cook-types/:id
const updateCookType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category_id, name } = req.body;
  
  const result = await pool.query(
    `UPDATE cook_types 
     SET category_id = COALESCE($1, category_id),
         name = COALESCE($2, name)
     WHERE id = $3
     RETURNING *`,
    [category_id, name, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Cook type not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete cook type
// @route   DELETE /api/settings/cook-types/:id
const deleteCookType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM cook_types WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Cook type not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Cook type deleted successfully'
  });
});

module.exports = {
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
};


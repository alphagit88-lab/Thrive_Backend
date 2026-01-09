/**
 * Ingredients Controller
 * Handles ingredient management with quantities, specs, and cook types
 */

const pool = require('../database/dbconn');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all ingredients (with optional filters)
// @route   GET /api/ingredients
const getIngredients = asyncHandler(async (req, res) => {
  const { category_id, food_type_id, is_active } = req.query;
  
  let query = `
    SELECT 
      i.*,
      ft.name as food_type_name,
      fc.id as category_id,
      fc.name as category_name,
      s.name as specification_name,
      ct.name as cook_type_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', iq.id,
            'quantity_value', iq.quantity_value,
            'quantity_grams', iq.quantity_grams,
            'price', iq.price,
            'is_available', iq.is_available
          )
        ) FILTER (WHERE iq.id IS NOT NULL),
        '[]'
      ) as quantities
    FROM ingredients i
    JOIN food_types ft ON i.food_type_id = ft.id
    JOIN food_categories fc ON ft.category_id = fc.id
    LEFT JOIN specifications s ON i.specification_id = s.id
    LEFT JOIN cook_types ct ON i.cook_type_id = ct.id
    LEFT JOIN ingredient_quantities iq ON i.id = iq.ingredient_id
  `;
  
  const params = [];
  const conditions = [];
  
  if (category_id) {
    params.push(category_id);
    conditions.push(`fc.id = $${params.length}`);
  }
  
  if (food_type_id) {
    params.push(food_type_id);
    conditions.push(`i.food_type_id = $${params.length}`);
  }
  
  if (is_active !== undefined) {
    params.push(is_active === 'true');
    conditions.push(`i.is_active = $${params.length}`);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ` GROUP BY i.id, ft.name, fc.id, fc.name, s.name, ct.name
             ORDER BY fc.display_order, ft.name, i.created_at DESC`;
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single ingredient
// @route   GET /api/ingredients/:id
const getIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT 
      i.*,
      ft.name as food_type_name,
      fc.id as category_id,
      fc.name as category_name,
      s.name as specification_name,
      ct.name as cook_type_name
    FROM ingredients i
    JOIN food_types ft ON i.food_type_id = ft.id
    JOIN food_categories fc ON ft.category_id = fc.id
    LEFT JOIN specifications s ON i.specification_id = s.id
    LEFT JOIN cook_types ct ON i.cook_type_id = ct.id
    WHERE i.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Ingredient not found', 404);
  }
  
  // Get quantities
  const quantities = await pool.query(
    'SELECT * FROM ingredient_quantities WHERE ingredient_id = $1 ORDER BY quantity_grams',
    [id]
  );
  
  res.status(200).json({
    success: true,
    data: {
      ...result.rows[0],
      quantities: quantities.rows
    }
  });
});

// @desc    Create ingredient with quantities
// @route   POST /api/ingredients
const createIngredient = asyncHandler(async (req, res) => {
  const { 
    food_type_id, 
    specification_id, 
    cook_type_id, 
    name,
    description,
    quantities = [] // Array of { quantity_value, quantity_grams, price }
  } = req.body;
  
  if (!food_type_id) {
    throw new AppError('Food type ID is required', 400);
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create ingredient
    const ingredientResult = await client.query(
      `INSERT INTO ingredients (food_type_id, specification_id, cook_type_id, name, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [food_type_id, specification_id || null, cook_type_id || null, name, description]
    );
    
    const ingredient = ingredientResult.rows[0];
    
    // Create quantities
    const createdQuantities = [];
    for (const qty of quantities) {
      const qtyResult = await client.query(
        `INSERT INTO ingredient_quantities (ingredient_id, quantity_value, quantity_grams, price, is_available)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [ingredient.id, qty.quantity_value, qty.quantity_grams || null, qty.price || 0, qty.is_available !== false]
      );
      createdQuantities.push(qtyResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        ...ingredient,
        quantities: createdQuantities
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// @desc    Update ingredient
// @route   PUT /api/ingredients/:id
const updateIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    food_type_id, 
    specification_id, 
    cook_type_id, 
    name,
    description,
    is_active,
    quantities // Array of quantities to update/create
  } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update ingredient
    const result = await client.query(
      `UPDATE ingredients 
       SET food_type_id = COALESCE($1, food_type_id),
           specification_id = $2,
           cook_type_id = $3,
           name = COALESCE($4, name),
           description = COALESCE($5, description),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [food_type_id, specification_id, cook_type_id, name, description, is_active, id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Ingredient not found', 404);
    }
    
    // Update quantities if provided
    let updatedQuantities = [];
    if (quantities && Array.isArray(quantities)) {
      // Delete existing quantities
      await client.query('DELETE FROM ingredient_quantities WHERE ingredient_id = $1', [id]);
      
      // Insert new quantities
      for (const qty of quantities) {
        const qtyResult = await client.query(
          `INSERT INTO ingredient_quantities (ingredient_id, quantity_value, quantity_grams, price, is_available)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [id, qty.quantity_value, qty.quantity_grams || null, qty.price || 0, qty.is_available !== false]
        );
        updatedQuantities.push(qtyResult.rows[0]);
      }
    } else {
      // Get existing quantities
      const existingQty = await client.query(
        'SELECT * FROM ingredient_quantities WHERE ingredient_id = $1',
        [id]
      );
      updatedQuantities = existingQty.rows;
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        quantities: updatedQuantities
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// @desc    Delete ingredient
// @route   DELETE /api/ingredients/:id
const deleteIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM ingredients WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Ingredient not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Ingredient deleted successfully'
  });
});

// @desc    Get ingredients grouped by category (for tabs)
// @route   GET /api/ingredients/by-category
const getIngredientsByCategory = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT 
      fc.id as category_id,
      fc.name as category_name,
      fc.display_order,
      fc.show_specification,
      fc.show_cook_type,
      COALESCE(
        json_agg(
          json_build_object(
            'id', i.id,
            'name', i.name,
            'food_type_id', ft.id,
            'food_type_name', ft.name,
            'specification_name', s.name,
            'cook_type_name', ct.name,
            'is_active', i.is_active
          ) ORDER BY ft.name, i.created_at DESC
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'
      ) as ingredients
    FROM food_categories fc
    LEFT JOIN food_types ft ON fc.id = ft.category_id
    LEFT JOIN ingredients i ON ft.id = i.food_type_id
    LEFT JOIN specifications s ON i.specification_id = s.id
    LEFT JOIN cook_types ct ON i.cook_type_id = ct.id
    GROUP BY fc.id, fc.name, fc.display_order, fc.show_specification, fc.show_cook_type
    ORDER BY fc.display_order
  `);
  
  res.status(200).json({
    success: true,
    data: result.rows
  });
});

module.exports = {
  getIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientsByCategory
};


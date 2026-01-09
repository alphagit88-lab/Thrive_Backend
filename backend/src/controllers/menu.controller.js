/**
 * Menu Controller
 * Handles menu items - Location dependent
 */

const pool = require('../database/dbconn');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all menu items (filtered by location)
// @route   GET /api/menu
const getMenuItems = asyncHandler(async (req, res) => {
  const { location_id, status, search, category_id } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  let query = `
    SELECT 
      m.*,
      fc.name as category_name,
      ft.name as food_type_name,
      s.name as specification_name,
      ct.name as cook_type_name,
      l.name as location_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', mp.id,
            'photo_url', mp.photo_url,
            'display_order', mp.display_order
          ) ORDER BY mp.display_order
        ) FILTER (WHERE mp.id IS NOT NULL),
        '[]'
      ) as photos
    FROM menu_items m
    JOIN locations l ON m.location_id = l.id
    LEFT JOIN food_categories fc ON m.food_category_id = fc.id
    LEFT JOIN food_types ft ON m.food_type_id = ft.id
    LEFT JOIN specifications s ON m.specification_id = s.id
    LEFT JOIN cook_types ct ON m.cook_type_id = ct.id
    LEFT JOIN menu_item_photos mp ON m.id = mp.menu_item_id
    WHERE m.location_id = $1
  `;
  
  const params = [location_id];
  
  if (status) {
    params.push(status);
    query += ` AND m.status = $${params.length}`;
  }
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (m.name ILIKE $${params.length} OR m.tags ILIKE $${params.length})`;
  }
  
  if (category_id) {
    params.push(category_id);
    query += ` AND m.food_category_id = $${params.length}`;
  }
  
  query += ` GROUP BY m.id, fc.name, ft.name, s.name, ct.name, l.name
             ORDER BY m.created_at DESC`;
  
  const result = await pool.query(query, params);
  
  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc    Get single menu item
// @route   GET /api/menu/:id
const getMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT 
      m.*,
      fc.name as category_name,
      ft.name as food_type_name,
      s.name as specification_name,
      ct.name as cook_type_name,
      l.name as location_name
    FROM menu_items m
    JOIN locations l ON m.location_id = l.id
    LEFT JOIN food_categories fc ON m.food_category_id = fc.id
    LEFT JOIN food_types ft ON m.food_type_id = ft.id
    LEFT JOIN specifications s ON m.specification_id = s.id
    LEFT JOIN cook_types ct ON m.cook_type_id = ct.id
    WHERE m.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Menu item not found', 404);
  }
  
  // Get photos
  const photos = await pool.query(
    'SELECT * FROM menu_item_photos WHERE menu_item_id = $1 ORDER BY display_order',
    [id]
  );
  
  // Get ingredients
  const ingredients = await pool.query(`
    SELECT 
      mii.*,
      i.name as ingredient_name,
      ft.name as food_type_name,
      iq.quantity_value,
      iq.price as quantity_price
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    JOIN food_types ft ON i.food_type_id = ft.id
    LEFT JOIN ingredient_quantities iq ON mii.ingredient_quantity_id = iq.id
    WHERE mii.menu_item_id = $1
  `, [id]);
  
  res.status(200).json({
    success: true,
    data: {
      ...result.rows[0],
      photos: photos.rows,
      ingredients: ingredients.rows
    }
  });
});

// @desc    Create menu item
// @route   POST /api/menu
const createMenuItem = asyncHandler(async (req, res) => {
  const {
    location_id,
    name,
    food_category_id,
    food_type_id,
    quantity,
    specification_id,
    cook_type_id,
    description,
    price,
    tags,
    prep_workout,
    status = 'draft',
    photos = [],        // Array of photo URLs
    ingredients = []    // Array of { ingredient_id, ingredient_quantity_id, custom_quantity }
  } = req.body;
  
  if (!location_id || !name) {
    throw new AppError('Location ID and name are required', 400);
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create menu item
    const menuResult = await client.query(
      `INSERT INTO menu_items 
       (location_id, name, food_category_id, food_type_id, quantity, specification_id, 
        cook_type_id, description, price, tags, prep_workout, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [location_id, name, food_category_id, food_type_id, quantity, specification_id,
       cook_type_id, description, price || 0, tags, prep_workout, status]
    );
    
    const menuItem = menuResult.rows[0];
    
    // Add photos
    const createdPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const photoResult = await client.query(
        `INSERT INTO menu_item_photos (menu_item_id, photo_url, display_order)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [menuItem.id, photos[i], i]
      );
      createdPhotos.push(photoResult.rows[0]);
    }
    
    // Add ingredients
    const createdIngredients = [];
    for (const ing of ingredients) {
      const ingResult = await client.query(
        `INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, ingredient_quantity_id, custom_quantity)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [menuItem.id, ing.ingredient_id, ing.ingredient_quantity_id || null, ing.custom_quantity || null]
      );
      createdIngredients.push(ingResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        ...menuItem,
        photos: createdPhotos,
        ingredients: createdIngredients
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// @desc    Update menu item
// @route   PUT /api/menu/:id
const updateMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    food_category_id,
    food_type_id,
    quantity,
    specification_id,
    cook_type_id,
    description,
    price,
    tags,
    prep_workout,
    status,
    photos,
    ingredients
  } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update menu item
    const result = await client.query(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           food_category_id = $2,
           food_type_id = $3,
           quantity = COALESCE($4, quantity),
           specification_id = $5,
           cook_type_id = $6,
           description = COALESCE($7, description),
           price = COALESCE($8, price),
           tags = COALESCE($9, tags),
           prep_workout = COALESCE($10, prep_workout),
           status = COALESCE($11, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [name, food_category_id, food_type_id, quantity, specification_id,
       cook_type_id, description, price, tags, prep_workout, status, id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Menu item not found', 404);
    }
    
    // Update photos if provided
    let updatedPhotos = [];
    if (photos !== undefined) {
      await client.query('DELETE FROM menu_item_photos WHERE menu_item_id = $1', [id]);
      for (let i = 0; i < photos.length; i++) {
        const photoResult = await client.query(
          `INSERT INTO menu_item_photos (menu_item_id, photo_url, display_order)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [id, photos[i], i]
        );
        updatedPhotos.push(photoResult.rows[0]);
      }
    }
    
    // Update ingredients if provided
    let updatedIngredients = [];
    if (ingredients !== undefined) {
      await client.query('DELETE FROM menu_item_ingredients WHERE menu_item_id = $1', [id]);
      for (const ing of ingredients) {
        const ingResult = await client.query(
          `INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, ingredient_quantity_id, custom_quantity)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [id, ing.ingredient_id, ing.ingredient_quantity_id || null, ing.custom_quantity || null]
        );
        updatedIngredients.push(ingResult.rows[0]);
      }
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        photos: updatedPhotos,
        ingredients: updatedIngredients
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
const deleteMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Menu item not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Menu item deleted successfully'
  });
});

// @desc    Toggle menu item status (draft/active)
// @route   PATCH /api/menu/:id/toggle-status
const toggleMenuStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    UPDATE menu_items 
    SET status = CASE WHEN status = 'draft' THEN 'active'::menu_item_status ELSE 'draft'::menu_item_status END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Menu item not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

module.exports = {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuStatus
};


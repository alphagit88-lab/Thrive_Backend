/**
 * Menu Controller - TypeORM Version
 * Handles menu items - Location dependent
 */

const { getDataSource } = require('../database/typeorm');
const { MenuItem } = require('../entities/MenuItem.entity');
const { MenuItemPhoto } = require('../entities/MenuItemPhoto.entity');
const { MenuItemIngredient } = require('../entities/MenuItemIngredient.entity');
const { Location } = require('../entities/Location.entity');
const { FoodCategory } = require('../entities/FoodCategory.entity');
const { FoodType } = require('../entities/FoodType.entity');
const { Specification } = require('../entities/Specification.entity');
const { CookType } = require('../entities/CookType.entity');
const { Ingredient } = require('../entities/Ingredient.entity');
const { IngredientQuantity } = require('../entities/IngredientQuantity.entity');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all menu items (filtered by location)
// @route   GET /api/menu
const getMenuItems = asyncHandler(async (req, res) => {
  let { location_id, status, search, category_id } = req.query;
  
  // Normalize IDs
  if (location_id === 'null' || location_id === 'undefined' || location_id === '') location_id = null;
  if (category_id === 'null' || category_id === 'undefined' || category_id === '') category_id = null;

  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  const dataSource = await getDataSource();
  const menuItemRepo = dataSource.getRepository(MenuItem);
  
  const queryBuilder = menuItemRepo
    .createQueryBuilder('menuItem')
    .leftJoinAndSelect('menuItem.location', 'location')
    .leftJoinAndSelect('menuItem.specifications', 'specifications')
    .leftJoinAndSelect('menuItem.cookTypes', 'cookTypes')
    .leftJoinAndSelect('menuItem.photos', 'photos')
    .leftJoinAndSelect('menuItem.ingredients', 'ingredients')
    .where('menuItem.location_id = :locationId', { locationId: location_id });
  
  if (status) {
    queryBuilder.andWhere('menuItem.status = :status', { status });
  }
  
  if (search) {
    queryBuilder.andWhere(
      '(menuItem.name ILIKE :search OR menuItem.tags ILIKE :search)',
      { search: `%${search}%` }
    );
  }
  
  if (category_id) {
    queryBuilder.andWhere('menuItem.food_category_id = :categoryId', { categoryId: category_id });
  }

  queryBuilder.orderBy('menuItem.created_at', 'DESC');
  
  const menuItems = await queryBuilder.getMany();
  
  // Format response and add extra names
  const formatted = await Promise.all(menuItems.map(async (item) => {
    // Fetch Category and Food Type names if not already included
    const category = item.food_category_id 
      ? await dataSource.getRepository(FoodCategory).findOne({ where: { id: item.food_category_id } })
      : null;
    const foodType = item.food_type_id
      ? await dataSource.getRepository(FoodType).findOne({ where: { id: item.food_type_id } })
      : null;

    // Fetch ingredient details for each menu item ingredient
    const ingredients = await Promise.all((item.ingredients || []).map(async (mi) => {
      const ingredient = await dataSource.getRepository(Ingredient).findOne({
        where: { id: mi.ingredient_id },
        relations: ['foodType']
      });
      
      const quantity = mi.ingredient_quantity_id
        ? await dataSource.getRepository(IngredientQuantity).findOne({
            where: { id: mi.ingredient_quantity_id }
          })
        : null;
      
      return {
        ...mi,
        ingredient_name: ingredient?.name,
        food_type_name: ingredient?.foodType?.name,
        quantity_value: quantity?.quantity_value,
        quantity_price: quantity?.price
      };
    }));

    return {
      ...item,
      category_name: category?.name,
      food_type_name: foodType?.name,
      specification_ids: item.specifications?.map(s => s.id) || [],
      specification_names: item.specifications?.map(s => s.name) || [],
      cook_type_ids: item.cookTypes?.map(c => c.id) || [],
      cook_type_names: item.cookTypes?.map(c => c.name) || [],
      location_name: item.location?.name,
      ingredients
    };
  }));
  
  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

// @desc    Get single menu item
// @route   GET /api/menu/:id
const getMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const menuItemRepo = dataSource.getRepository(MenuItem);
  
  const menuItem = await menuItemRepo.findOne({
    where: { id },
    relations: ['location', 'specifications', 'cookTypes', 'photos', 'ingredients']
  });
  
  if (!menuItem) {
    throw new AppError('Menu item not found', 404);
  }
  
  // Get related data names
  const [category, foodType] = await Promise.all([
    menuItem.food_category_id 
      ? dataSource.getRepository(FoodCategory).findOne({ where: { id: menuItem.food_category_id } })
      : null,
    menuItem.food_type_id
      ? dataSource.getRepository(FoodType).findOne({ where: { id: menuItem.food_type_id } })
      : null
  ]);

  // Format ingredients details
  const ingredients = await Promise.all(
    menuItem.ingredients.map(async (mi) => {
      const ingredient = await dataSource.getRepository(Ingredient).findOne({
        where: { id: mi.ingredient_id },
        relations: ['foodType']
      });
      
      const quantity = mi.ingredient_quantity_id
        ? await dataSource.getRepository(IngredientQuantity).findOne({
            where: { id: mi.ingredient_quantity_id }
          })
        : null;
      
      return {
        ...mi,
        ingredient_name: ingredient?.name,
        food_type_name: ingredient?.foodType?.name,
        quantity_value: quantity?.quantity_value,
        quantity_price: quantity?.price
      };
    })
  );
  
  res.status(200).json({
    success: true,
    data: {
      ...menuItem,
      category_name: category?.name,
      food_type_name: foodType?.name,
      specification_ids: menuItem.specifications?.map(s => s.id) || [],
      specification_names: menuItem.specifications?.map(s => s.name) || [],
      cook_type_ids: menuItem.cookTypes?.map(c => c.id) || [],
      cook_type_names: menuItem.cookTypes?.map(c => c.name) || [],
      location_name: menuItem.location?.name,
      ingredients
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
    specification_ids = [],
    cook_type_ids = [],
    description,
    price,
    tags,
    prep_workout,
    status = 'draft',
    photos = [],
    ingredients = []
  } = req.body;
  
  if (!location_id || !name) {
    throw new AppError('Location ID and name are required', 400);
  }
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const menuItemRepo = manager.getRepository(MenuItem);
    const photoRepo = manager.getRepository(MenuItemPhoto);
    const ingredientRepo = manager.getRepository(MenuItemIngredient);
    const specRepo = manager.getRepository(Specification);
    const cookTypeRepo = manager.getRepository(CookType);
    
    // Normalize foreign keys
    const normLocId = (location_id && location_id !== '' && location_id !== 'null' && location_id !== 'undefined') ? location_id : null;
    const normCatId = (food_category_id && food_category_id !== '' && food_category_id !== 'null' && food_category_id !== 'undefined') ? food_category_id : null;
    const normTypeId = (food_type_id && food_type_id !== '' && food_type_id !== 'null' && food_type_id !== 'undefined') ? food_type_id : null;

    // Filter valid relation IDs
    const validSpecIds = Array.isArray(specification_ids) ? specification_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined') : [];
    const validCookIds = Array.isArray(cook_type_ids) ? cook_type_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined') : [];

    // Fetch specs and cook types to associate
    const specs = validSpecIds.length > 0 
      ? await specRepo.findByIds(validSpecIds) 
      : [];
    const cookTypes = validCookIds.length > 0 
      ? await cookTypeRepo.findByIds(validCookIds) 
      : [];

    // Create menu item
    const menuItem = menuItemRepo.create({
      location_id: normLocId,
      name,
      food_category_id: normCatId,
      food_type_id: normTypeId,
      quantity: quantity || null,
      specifications: specs,
      cookTypes: cookTypes,
      description: description || null,
      price: price || 0,
      tags: tags || null,
      prep_workout: prep_workout || null,
      status
    });
    
    const savedMenuItem = await menuItemRepo.save(menuItem);
    
    // Add photos
    const createdPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photoRepo.create({
        menu_item_id: savedMenuItem.id,
        photo_url: photos[i],
        display_order: i
      });
      const saved = await photoRepo.save(photo);
      createdPhotos.push(saved);
    }
    
    // Add ingredients
    const createdIngredients = [];
    for (const ing of ingredients) {
      const menuIngredient = ingredientRepo.create({
        menu_item_id: savedMenuItem.id,
        ingredient_id: ing.ingredient_id,
        ingredient_quantity_id: ing.ingredient_quantity_id || null,
        custom_quantity: ing.custom_quantity || null
      });
      const saved = await ingredientRepo.save(menuIngredient);
      createdIngredients.push(saved);
    }
    
    res.status(201).json({
      success: true,
      data: {
        ...savedMenuItem,
        specification_ids: savedMenuItem.specifications?.map(s => s.id) || [],
        cook_type_ids: savedMenuItem.cookTypes?.map(c => c.id) || [],
        photos: createdPhotos,
        ingredients: createdIngredients
      }
    });
  });
});

// @desc    Update menu item
// @route   PUT /api/menu/:id
const updateMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    location_id,
    name,
    food_category_id,
    food_type_id,
    quantity,
    specification_ids,
    cook_type_ids,
    description,
    price,
    tags,
    prep_workout,
    status,
    photos,
    ingredients
  } = req.body;
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const menuItemRepo = manager.getRepository(MenuItem);
    const photoRepo = manager.getRepository(MenuItemPhoto);
    const ingredientRepo = manager.getRepository(MenuItemIngredient);
    const specRepo = manager.getRepository(Specification);
    const cookTypeRepo = manager.getRepository(CookType);
    
    const menuItem = await menuItemRepo.findOne({ 
      where: { id },
      relations: ['specifications', 'cookTypes']
    });
    
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }
    if (location_id !== undefined) {
      menuItem.location_id = (location_id && location_id !== '' && location_id !== 'null' && location_id !== 'undefined') ? location_id : null;
    }
    if (name !== undefined) menuItem.name = name;
    if (food_category_id !== undefined) {
      menuItem.food_category_id = (food_category_id && food_category_id !== '' && food_category_id !== 'null' && food_category_id !== 'undefined') ? food_category_id : null;
    }
    if (food_type_id !== undefined) {
      menuItem.food_type_id = (food_type_id && food_type_id !== '' && food_type_id !== 'null' && food_type_id !== 'undefined') ? food_type_id : null;
    }
    if (quantity !== undefined) menuItem.quantity = quantity || null;
    if (description !== undefined) menuItem.description = description || null;
    if (price !== undefined) menuItem.price = price || 0;
    if (tags !== undefined) menuItem.tags = tags || null;
    if (prep_workout !== undefined) menuItem.prep_workout = prep_workout || null;
    if (status !== undefined) menuItem.status = status;
    
    // Update relationships
    if (specification_ids !== undefined) {
      const validSpecIds = Array.isArray(specification_ids) ? specification_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined') : [];
      menuItem.specifications = validSpecIds.length > 0 
        ? await manager.getRepository(Specification).findByIds(validSpecIds)
        : [];
    }
    
    if (cook_type_ids !== undefined) {
      const validCookIds = Array.isArray(cook_type_ids) ? cook_type_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined') : [];
      menuItem.cookTypes = validCookIds.length > 0
        ? await manager.getRepository(CookType).findByIds(validCookIds)
        : [];
    }

    await menuItemRepo.save(menuItem);
    
    // Update photos if provided
    let updatedPhotos = [];
    if (photos !== undefined) {
      await photoRepo.delete({ menu_item_id: id });
      for (let i = 0; i < photos.length; i++) {
        const photo = photoRepo.create({
          menu_item_id: id,
          photo_url: photos[i],
          display_order: i
        });
        const saved = await photoRepo.save(photo);
        updatedPhotos.push(saved);
      }
    }
    
    // Update ingredients if provided
    let updatedIngredients = [];
    if (ingredients !== undefined) {
      await ingredientRepo.delete({ menu_item_id: id });
      for (const ing of ingredients) {
        const menuIngredient = ingredientRepo.create({
          menu_item_id: id,
          ingredient_id: ing.ingredient_id,
          ingredient_quantity_id: ing.ingredient_quantity_id || null,
          custom_quantity: ing.custom_quantity || null
        });
        const saved = await ingredientRepo.save(menuIngredient);
        updatedIngredients.push(saved);
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...menuItem,
        specification_ids: menuItem.specifications?.map(s => s.id) || [],
        cook_type_ids: menuItem.cookTypes?.map(c => c.id) || [],
        photos: updatedPhotos.length > 0 ? updatedPhotos : undefined, // simplify response
        ingredients: updatedIngredients.length > 0 ? updatedIngredients : undefined
      }
    });
  });
});

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
const deleteMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const menuItemRepo = dataSource.getRepository(MenuItem);
  
  const result = await menuItemRepo.delete({ id });
  
  if (result.affected === 0) {
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
  const dataSource = await getDataSource();
  const menuItemRepo = dataSource.getRepository(MenuItem);
  
  const menuItem = await menuItemRepo.findOne({ where: { id } });
  
  if (!menuItem) {
    throw new AppError('Menu item not found', 404);
  }
  
  menuItem.status = menuItem.status === 'draft' ? 'active' : 'draft';
  const updated = await menuItemRepo.save(menuItem);
  
  res.status(200).json({
    success: true,
    data: updated
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

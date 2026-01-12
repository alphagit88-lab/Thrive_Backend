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
  const { location_id, status, search, category_id } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  const dataSource = await getDataSource();
  const menuItemRepo = dataSource.getRepository(MenuItem);
  
  const queryBuilder = menuItemRepo
    .createQueryBuilder('menuItem')
    .leftJoinAndSelect('menuItem.location', 'location')
    .leftJoin('food_categories', 'category', 'category.id = menuItem.food_category_id')
    .leftJoin('food_types', 'foodType', 'foodType.id = menuItem.food_type_id')
    .leftJoin('specifications', 'spec', 'spec.id = menuItem.specification_id')
    .leftJoin('cook_types', 'cookType', 'cookType.id = menuItem.cook_type_id')
    .leftJoin('menu_item_photos', 'photo', 'photo.menu_item_id = menuItem.id')
    .where('menuItem.location_id = :locationId', { locationId: location_id })
    .addSelect('category.name', 'category_name')
    .addSelect('foodType.name', 'food_type_name')
    .addSelect('spec.name', 'specification_name')
    .addSelect('cookType.name', 'cook_type_name')
    .addSelect('location.name', 'location_name')
    .addSelect('photo.id', 'photo_id')
    .addSelect('photo.photo_url', 'photo_url')
    .addSelect('photo.display_order', 'photo_display_order')
    .orderBy('menuItem.created_at', 'DESC');
  
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
  
  const menuItems = await queryBuilder.getMany();
  
  // Get photos separately and group
  const menuItemIds = menuItems.map(m => m.id);
  const photos = menuItemIds.length > 0 
    ? await dataSource.getRepository(MenuItemPhoto).find({
        where: menuItemIds.map(id => ({ menu_item_id: id })),
        order: { display_order: 'ASC' }
      })
    : [];
  
  // Group photos by menu_item_id
  const photosByMenuItem = {};
  photos.forEach(photo => {
    if (!photosByMenuItem[photo.menu_item_id]) {
      photosByMenuItem[photo.menu_item_id] = [];
    }
    photosByMenuItem[photo.menu_item_id].push({
      id: photo.id,
      photo_url: photo.photo_url,
      display_order: photo.display_order
    });
  });
  
  // Format response
  const formatted = menuItems.map(item => ({
    ...item,
    category_name: item.category_name,
    food_type_name: item.food_type_name,
    specification_name: item.specification_name,
    cook_type_name: item.cook_type_name,
    location_name: item.location?.name,
    photos: photosByMenuItem[item.id] || []
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
    relations: ['location']
  });
  
  if (!menuItem) {
    throw new AppError('Menu item not found', 404);
  }
  
  // Get related data
  const [category, foodType, specification, cookType] = await Promise.all([
    menuItem.food_category_id 
      ? dataSource.getRepository(FoodCategory).findOne({ where: { id: menuItem.food_category_id } })
      : null,
    menuItem.food_type_id
      ? dataSource.getRepository(FoodType).findOne({ where: { id: menuItem.food_type_id } })
      : null,
    menuItem.specification_id
      ? dataSource.getRepository(Specification).findOne({ where: { id: menuItem.specification_id } })
      : null,
    menuItem.cook_type_id
      ? dataSource.getRepository(CookType).findOne({ where: { id: menuItem.cook_type_id } })
      : null
  ]);
  
  // Get photos
  const photos = await dataSource.getRepository(MenuItemPhoto).find({
    where: { menu_item_id: id },
    order: { display_order: 'ASC' }
  });
  
  // Get ingredients with relations
  const menuIngredients = await dataSource.getRepository(MenuItemIngredient).find({
    where: { menu_item_id: id }
  });
  
  const ingredients = await Promise.all(
    menuIngredients.map(async (mi) => {
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
      specification_name: specification?.name,
      cook_type_name: cookType?.name,
      location_name: menuItem.location?.name,
      photos: photos,
      ingredients: ingredients
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
    
    // Create menu item
    const menuItem = menuItemRepo.create({
      location_id,
      name,
      food_category_id: food_category_id || null,
      food_type_id: food_type_id || null,
      quantity: quantity || null,
      specification_id: specification_id || null,
      cook_type_id: cook_type_id || null,
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
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const menuItemRepo = manager.getRepository(MenuItem);
    const photoRepo = manager.getRepository(MenuItemPhoto);
    const ingredientRepo = manager.getRepository(MenuItemIngredient);
    
    const menuItem = await menuItemRepo.findOne({ where: { id } });
    
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }
    
    // Update menu item fields
    if (name !== undefined) menuItem.name = name;
    if (food_category_id !== undefined) menuItem.food_category_id = food_category_id;
    if (food_type_id !== undefined) menuItem.food_type_id = food_type_id;
    if (quantity !== undefined) menuItem.quantity = quantity;
    if (specification_id !== undefined) menuItem.specification_id = specification_id;
    if (cook_type_id !== undefined) menuItem.cook_type_id = cook_type_id;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) menuItem.price = price;
    if (tags !== undefined) menuItem.tags = tags;
    if (prep_workout !== undefined) menuItem.prep_workout = prep_workout;
    if (status !== undefined) menuItem.status = status;
    
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
    } else {
      updatedPhotos = await photoRepo.find({
        where: { menu_item_id: id },
        order: { display_order: 'ASC' }
      });
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
    } else {
      updatedIngredients = await ingredientRepo.find({
        where: { menu_item_id: id }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...menuItem,
        photos: updatedPhotos,
        ingredients: updatedIngredients
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

/**
 * Ingredients Controller - TypeORM Version
 * Handles ingredient management with quantities, specs, and cook types
 */

const { getDataSource } = require('../database/typeorm');
const { Ingredient } = require('../entities/Ingredient.entity');
const { IngredientQuantity } = require('../entities/IngredientQuantity.entity');
const { FoodType } = require('../entities/FoodType.entity');
const { FoodCategory } = require('../entities/FoodCategory.entity');
const { Specification } = require('../entities/Specification.entity');
const { CookType } = require('../entities/CookType.entity');
const { IngredientPhoto } = require('../entities/IngredientPhoto.entity');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { Brackets } = require('typeorm');

// @desc    Get all ingredients (with optional filters)
// @route   GET /api/ingredients
const getIngredients = asyncHandler(async (req, res) => {
  let { location_id, category_id, food_type_id, is_active } = req.query;
  
  // Robust ID normalization
  if (location_id === 'null' || location_id === 'undefined' || location_id === '') location_id = null;
  if (category_id === 'null' || category_id === 'undefined' || category_id === '') category_id = null;
  if (food_type_id === 'null' || food_type_id === 'undefined' || food_type_id === '') food_type_id = null;

  const dataSource = await getDataSource();
  const ingredientRepo = dataSource.getRepository(Ingredient);
  
  const queryBuilder = ingredientRepo
    .createQueryBuilder('ingredient')
    .leftJoinAndSelect('ingredient.foodType', 'foodType')
    .leftJoinAndSelect('foodType.category', 'category')
    .leftJoinAndSelect('ingredient.specifications', 'specifications')
    .leftJoinAndSelect('ingredient.cookTypes', 'cookTypes')
    .leftJoinAndSelect('ingredient.quantities', 'quantities')
    .leftJoinAndSelect('ingredient.photos', 'photos');

  // Handle location filtering (location specific or global)
  if (location_id) {
    queryBuilder.where(new Brackets(qb => {
      qb.where('ingredient.location_id = :locationId', { locationId: location_id })
        .orWhere('ingredient.location_id IS NULL');
    }));
  }
  
  if (category_id) {
    queryBuilder.andWhere('category.id = :categoryId', { categoryId: category_id });
  }
  
  if (food_type_id) {
    queryBuilder.andWhere('ingredient.food_type_id = :foodTypeId', { foodTypeId: food_type_id });
  }
  
  if (is_active !== undefined) {
    queryBuilder.andWhere('ingredient.is_active = :isActive', { isActive: is_active === 'true' });
  }

  queryBuilder.orderBy('category.display_order', 'ASC')
    .addOrderBy('foodType.name', 'ASC')
    .addOrderBy('ingredient.created_at', 'DESC');
  
  const ingredients = await queryBuilder.getMany();
  
  // Format response
  const formatted = ingredients.map(ing => ({
    ...ing,
    food_type_name: ing.foodType?.name,
    category_id: ing.foodType?.category?.id,
    category_name: ing.foodType?.category?.name,
    specification_ids: ing.specifications?.map(s => s.id) || [],
    specification_names: ing.specifications?.map(s => s.name) || [],
    cook_type_ids: ing.cookTypes?.map(c => c.id) || [],
    cook_type_names: ing.cookTypes?.map(c => c.name) || [],
    quantities: ing.quantities || [],
    photos: ing.photos || []
  }));
  
  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

// @desc    Get single ingredient
// @route   GET /api/ingredients/:id
const getIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const ingredientRepo = dataSource.getRepository(Ingredient);
  
  const ingredient = await ingredientRepo.findOne({
    where: { id },
    relations: ['foodType', 'foodType.category', 'specifications', 'cookTypes', 'quantities', 'photos']
  });
  
  if (!ingredient) {
    throw new AppError('Ingredient not found', 404);
  }
  
  // Format response
  const formatted = {
    ...ingredient,
    food_type_name: ingredient.foodType?.name,
    category_id: ingredient.foodType?.category?.id,
    category_name: ingredient.foodType?.category?.name,
    specification_ids: ingredient.specifications?.map(s => s.id) || [],
    specification_names: ingredient.specifications?.map(s => s.name) || [],
    cook_type_ids: ingredient.cookTypes?.map(c => c.id) || [],
    cook_type_names: ingredient.cookTypes?.map(c => c.name) || [],
    quantities: ingredient.quantities || [],
    photos: ingredient.photos || []
  };
  
  res.status(200).json({
    success: true,
    data: formatted
  });
});

// @desc    Create ingredient with quantities
// @route   POST /api/ingredients
const createIngredient = asyncHandler(async (req, res) => {
  const { 
    location_id,
    food_type_id, 
    specification_ids = [], 
    cook_type_ids = [], 
    name,
    description,
    quantities = [],
    photos = []
  } = req.body;
  
  // Normalize IDs that may be stringified nulls from frontend
  const normalizedFoodTypeId = (food_type_id && food_type_id !== '' && food_type_id !== 'null' && food_type_id !== 'undefined') ? food_type_id : null;
  const normalizedLocationId = (location_id && location_id !== '' && location_id !== 'null' && location_id !== 'undefined') ? location_id : null;
  
  if (!name || !name.trim()) {
    throw new AppError('Ingredient name is required', 400);
  }
  
  if (!normalizedFoodTypeId) {
    throw new AppError('Food type ID is required and must be valid', 400);
  }
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const ingredientRepo = manager.getRepository(Ingredient);
    const quantityRepo = manager.getRepository(IngredientQuantity);
    
    // Create ingredient
    const ingredient = ingredientRepo.create({
      location_id: normalizedLocationId,
      food_type_id: normalizedFoodTypeId,
      name,
      description
    });
    
    // Assign many-to-many relations (filter out invalid IDs)
    if (specification_ids && specification_ids.length > 0) {
      const validSpecIds = specification_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined');
      ingredient.specifications = validSpecIds.map(id => ({ id }));
    }
    
    if (cook_type_ids && cook_type_ids.length > 0) {
      const validCookIds = cook_type_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined');
      ingredient.cookTypes = validCookIds.map(id => ({ id }));
    }
    
    const savedIngredient = await ingredientRepo.save(ingredient);
    
    // Create quantities
    const createdQuantities = [];
    for (const qty of quantities) {
      const quantity = quantityRepo.create({
        ingredient_id: savedIngredient.id,
        quantity_value: qty.quantity_value,
        quantity_grams: qty.quantity_grams || null,
        price: qty.price || 0,
        is_available: qty.is_available !== false
      });
      const saved = await quantityRepo.save(quantity);
      createdQuantities.push(saved);
    }
    
    // Create photos
    const photoRepo = manager.getRepository(IngredientPhoto);
    const createdPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photoRepo.create({
        ingredient_id: savedIngredient.id,
        photo_url: photos[i].photo_url || photos[i],
        display_order: i
      });
      const saved = await photoRepo.save(photo);
      createdPhotos.push(saved);
    }
    
    // Fetch full ingredient with relations
    const fullIngredient = await ingredientRepo.findOne({
      where: { id: savedIngredient.id },
      relations: ['foodType', 'foodType.category', 'specifications', 'cookTypes']
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...fullIngredient,
        specification_ids: fullIngredient.specifications?.map(s => s.id) || [],
        cook_type_ids: fullIngredient.cookTypes?.map(c => c.id) || [],
        quantities: createdQuantities,
        photos: createdPhotos
      }
    });
  });
});

// @desc    Update ingredient
// @route   PUT /api/ingredients/:id
const updateIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    location_id,
    food_type_id, 
    specification_ids, 
    cook_type_ids, 
    name,
    description,
    is_active,
    quantities,
    photos
  } = req.body;
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const ingredientRepo = manager.getRepository(Ingredient);
    const quantityRepo = manager.getRepository(IngredientQuantity);
    
    const ingredient = await ingredientRepo.findOne({ 
      where: { id },
      relations: ['specifications', 'cookTypes']
    });
    
    if (!ingredient) {
      throw new AppError('Ingredient not found', 404);
    }
    
    // Update ingredient fields
    if (location_id !== undefined) {
      ingredient.location_id = (location_id && location_id !== '' && location_id !== 'null' && location_id !== 'undefined') ? location_id : null;
    }
    if (food_type_id !== undefined) {
      ingredient.food_type_id = (food_type_id && food_type_id !== '' && food_type_id !== 'null' && food_type_id !== 'undefined') ? food_type_id : null;
    }
    if (name !== undefined) {
        if (!name || !name.trim()) throw new AppError('Ingredient name cannot be empty', 400);
        ingredient.name = name;
    }
    if (description !== undefined) ingredient.description = description;
    if (is_active !== undefined) ingredient.is_active = is_active;
    
    // Update many-to-many relations
    if (specification_ids !== undefined) {
      const validSpecIds = Array.isArray(specification_ids) ? specification_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined') : [];
      ingredient.specifications = validSpecIds.map(id => ({ id }));
    }
    
    if (cook_type_ids !== undefined) {
      const validCookIds = Array.isArray(cook_type_ids) ? cook_type_ids.filter(id => id && id !== '' && id !== 'null' && id !== 'undefined') : [];
      ingredient.cookTypes = validCookIds.map(id => ({ id }));
    }
    
    await ingredientRepo.save(ingredient);
    
    // Update quantities if provided
    let updatedQuantities = [];
    if (quantities && Array.isArray(quantities)) {
      // Delete existing quantities
      await quantityRepo.delete({ ingredient_id: id });
      
      // Insert new quantities
      for (const qty of quantities) {
        const quantity = quantityRepo.create({
          ingredient_id: id,
          quantity_value: qty.quantity_value,
          quantity_grams: qty.quantity_grams || null,
          price: qty.price || 0,
          is_available: qty.is_available !== false
        });
        const saved = await quantityRepo.save(quantity);
        updatedQuantities.push(saved);
      }
    } else {
      // Get existing quantities
      updatedQuantities = await quantityRepo.find({
        where: { ingredient_id: id },
        order: { quantity_grams: 'ASC' }
      });
    }
    
    // Update photos if provided
    const photoRepo = manager.getRepository(IngredientPhoto);
    let updatedPhotos = [];
    if (photos && Array.isArray(photos)) {
      await photoRepo.delete({ ingredient_id: id });
      for (let i = 0; i < photos.length; i++) {
        const photo = photoRepo.create({
          ingredient_id: id,
          photo_url: photos[i].photo_url || photos[i],
          display_order: i
        });
        const saved = await photoRepo.save(photo);
        updatedPhotos.push(saved);
      }
    } else {
      updatedPhotos = await photoRepo.find({ where: { ingredient_id: id }, order: { display_order: 'ASC' } });
    }
 
    // Fetch full ingredient with relations
    const fullIngredient = await ingredientRepo.findOne({
      where: { id },
      relations: ['foodType', 'foodType.category', 'specifications', 'cookTypes']
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...fullIngredient,
        specification_ids: fullIngredient.specifications?.map(s => s.id) || [],
        cook_type_ids: fullIngredient.cookTypes?.map(c => c.id) || [],
        quantities: updatedQuantities,
        photos: updatedPhotos
      }
    });
  });
});

// @desc    Delete ingredient
// @route   DELETE /api/ingredients/:id
const deleteIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const ingredientRepo = dataSource.getRepository(Ingredient);
  
  const result = await ingredientRepo.delete({ id });
  
  if (result.affected === 0) {
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
  let { location_id } = req.query;

  // Robust location_id handling
  if (location_id === 'null' || location_id === 'undefined' || location_id === '') {
    location_id = null;
  }

  const dataSource = await getDataSource();
  const categoryRepo = dataSource.getRepository(FoodCategory);
  const ingredientRepo = dataSource.getRepository(Ingredient);
  
  // Get all categories
  const categories = await categoryRepo.find({
    order: { display_order: 'ASC' }
  });
  
  // Get all ingredients with relations
  const queryBuilder = ingredientRepo.createQueryBuilder('ingredient')
    .leftJoinAndSelect('ingredient.foodType', 'foodType')
    .leftJoinAndSelect('foodType.category', 'category')
    .leftJoinAndSelect('ingredient.specifications', 'specifications')
    .leftJoinAndSelect('ingredient.cookTypes', 'cookTypes')
    .leftJoinAndSelect('ingredient.photos', 'photos');

  if (location_id) {
    queryBuilder.where(new Brackets(qb => {
      qb.where('ingredient.location_id = :locationId', { locationId: location_id })
        .orWhere('ingredient.location_id IS NULL');
    }));
  }

  const ingredients = await queryBuilder.orderBy('ingredient.created_at', 'DESC').getMany();
  
  // Group ingredients by category
  const grouped = categories.map(category => {
    const categoryIngredients = ingredients
      .filter(ing => ing.foodType?.category?.id === category.id)
      .map(ing => ({
        id: ing.id,
        name: ing.name,
        food_type_id: ing.foodType?.id,
        food_type_name: ing.foodType?.name,
        specification_names: ing.specifications?.map(s => s.name) || [],
        cook_type_names: ing.cookTypes?.map(c => c.name) || [],
        photos: ing.photos || [],
        is_active: ing.is_active
      }));
    
    return {
      category_id: category.id,
      category_name: category.name,
      display_order: category.display_order,
      show_specification: category.show_specification,
      show_cook_type: category.show_cook_type,
      ingredients: categoryIngredients
    };
  });
  
  res.status(200).json({
    success: true,
    data: grouped
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

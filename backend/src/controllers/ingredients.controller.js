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
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all ingredients (with optional filters)
// @route   GET /api/ingredients
const getIngredients = asyncHandler(async (req, res) => {
  const { category_id, food_type_id, is_active } = req.query;
  const dataSource = await getDataSource();
  const ingredientRepo = dataSource.getRepository(Ingredient);
  
  const queryBuilder = ingredientRepo
    .createQueryBuilder('ingredient')
    .leftJoinAndSelect('ingredient.foodType', 'foodType')
    .leftJoinAndSelect('foodType.category', 'category')
    .leftJoinAndSelect('ingredient.specification', 'specification')
    .leftJoinAndSelect('ingredient.cookType', 'cookType')
    .leftJoinAndSelect('ingredient.quantities', 'quantities')
    .orderBy('category.display_order', 'ASC')
    .addOrderBy('foodType.name', 'ASC')
    .addOrderBy('ingredient.created_at', 'DESC');
  
  if (category_id) {
    queryBuilder.where('category.id = :categoryId', { categoryId: category_id });
  }
  
  if (food_type_id) {
    queryBuilder.andWhere('ingredient.food_type_id = :foodTypeId', { foodTypeId: food_type_id });
  }
  
  if (is_active !== undefined) {
    queryBuilder.andWhere('ingredient.is_active = :isActive', { isActive: is_active === 'true' });
  }
  
  const ingredients = await queryBuilder.getMany();
  
  // Format response
  const formatted = ingredients.map(ing => ({
    ...ing,
    food_type_name: ing.foodType?.name,
    category_id: ing.foodType?.category?.id,
    category_name: ing.foodType?.category?.name,
    specification_name: ing.specification?.name,
    cook_type_name: ing.cookType?.name,
    quantities: ing.quantities || []
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
    relations: ['foodType', 'foodType.category', 'specification', 'cookType', 'quantities']
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
    specification_name: ingredient.specification?.name,
    cook_type_name: ingredient.cookType?.name,
    quantities: ingredient.quantities || []
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
    food_type_id, 
    specification_id, 
    cook_type_id, 
    name,
    description,
    quantities = []
  } = req.body;
  
  if (!food_type_id) {
    throw new AppError('Food type ID is required', 400);
  }
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const ingredientRepo = manager.getRepository(Ingredient);
    const quantityRepo = manager.getRepository(IngredientQuantity);
    
    // Create ingredient
    const ingredient = ingredientRepo.create({
      food_type_id,
      specification_id: specification_id || null,
      cook_type_id: cook_type_id || null,
      name,
      description
    });
    
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
    
    // Fetch full ingredient with relations
    const fullIngredient = await ingredientRepo.findOne({
      where: { id: savedIngredient.id },
      relations: ['foodType', 'foodType.category', 'specification', 'cookType']
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...fullIngredient,
        quantities: createdQuantities
      }
    });
  });
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
    quantities
  } = req.body;
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const ingredientRepo = manager.getRepository(Ingredient);
    const quantityRepo = manager.getRepository(IngredientQuantity);
    
    const ingredient = await ingredientRepo.findOne({ where: { id } });
    
    if (!ingredient) {
      throw new AppError('Ingredient not found', 404);
    }
    
    // Update ingredient fields
    if (food_type_id !== undefined) ingredient.food_type_id = food_type_id;
    if (specification_id !== undefined) ingredient.specification_id = specification_id;
    if (cook_type_id !== undefined) ingredient.cook_type_id = cook_type_id;
    if (name !== undefined) ingredient.name = name;
    if (description !== undefined) ingredient.description = description;
    if (is_active !== undefined) ingredient.is_active = is_active;
    
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
    
    // Fetch full ingredient with relations
    const fullIngredient = await ingredientRepo.findOne({
      where: { id },
      relations: ['foodType', 'foodType.category', 'specification', 'cookType']
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...fullIngredient,
        quantities: updatedQuantities
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
  const dataSource = await getDataSource();
  const categoryRepo = dataSource.getRepository(FoodCategory);
  const ingredientRepo = dataSource.getRepository(Ingredient);
  
  // Get all categories
  const categories = await categoryRepo.find({
    order: { display_order: 'ASC' }
  });
  
  // Get all ingredients with relations
  const ingredients = await ingredientRepo.find({
    relations: ['foodType', 'foodType.category', 'specification', 'cookType'],
    order: { created_at: 'DESC' }
  });
  
  // Group ingredients by category
  const grouped = categories.map(category => {
    const categoryIngredients = ingredients
      .filter(ing => ing.foodType?.category?.id === category.id)
      .map(ing => ({
        id: ing.id,
        name: ing.name,
        food_type_id: ing.foodType?.id,
        food_type_name: ing.foodType?.name,
        specification_name: ing.specification?.name,
        cook_type_name: ing.cookType?.name,
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

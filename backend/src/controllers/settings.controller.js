/**
 * Settings Controller - TypeORM Version
 * Handles Food Categories, Food Types, Specifications, Cook Types
 */

const { getDataSource } = require('../database/typeorm');
const { FoodCategory } = require('../entities/FoodCategory.entity');
const { FoodType } = require('../entities/FoodType.entity');
const { Specification } = require('../entities/Specification.entity');
const { CookType } = require('../entities/CookType.entity');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// ==================== FOOD CATEGORIES ====================

const getCategories = asyncHandler(async (req, res) => {
  const dataSource = await getDataSource();
  const categoryRepo = dataSource.getRepository(FoodCategory);
  
  const categories = await categoryRepo.find({
    order: { display_order: 'ASC', name: 'ASC' }
  });
  
  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const categoryRepo = dataSource.getRepository(FoodCategory);
  
  const category = await categoryRepo.findOne({ where: { id } });
  
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: category
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, display_order, show_specification = true, show_cook_type = true } = req.body;
  
  if (!name) {
    throw new AppError('Category name is required', 400);
  }
  
  const dataSource = await getDataSource();
  const categoryRepo = dataSource.getRepository(FoodCategory);
  
  // Get max display order if not provided
  let order = display_order;
  if (!order) {
    const maxResult = await categoryRepo
      .createQueryBuilder('category')
      .select('MAX(category.display_order)', 'max')
      .getRawOne();
    order = (maxResult?.max || 0) + 1;
  }
  
  const category = categoryRepo.create({
    name,
    display_order: order,
    show_specification,
    show_cook_type
  });
  
  const saved = await categoryRepo.save(category);
  
  res.status(201).json({
    success: true,
    data: saved
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, display_order, show_specification, show_cook_type } = req.body;
  
  const dataSource = await getDataSource();
  const categoryRepo = dataSource.getRepository(FoodCategory);
  
  const category = await categoryRepo.findOne({ where: { id } });
  
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  
  if (name !== undefined) category.name = name;
  if (display_order !== undefined) category.display_order = display_order;
  if (show_specification !== undefined) category.show_specification = show_specification;
  if (show_cook_type !== undefined) category.show_cook_type = show_cook_type;
  
  const updated = await categoryRepo.save(category);
  
  res.status(200).json({
    success: true,
    data: updated
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const categoryRepo = dataSource.getRepository(FoodCategory);
  
  const result = await categoryRepo.delete({ id });
  
  if (result.affected === 0) {
    throw new AppError('Category not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});

// ==================== FOOD TYPES ====================

const getTypes = asyncHandler(async (req, res) => {
  const { category_id } = req.query;
  const dataSource = await getDataSource();
  const typeRepo = dataSource.getRepository(FoodType);
  
  const queryBuilder = typeRepo
    .createQueryBuilder('type')
    .leftJoinAndSelect('type.category', 'category')
    .orderBy('category.display_order', 'ASC')
    .addOrderBy('type.name', 'ASC');
  
  if (category_id) {
    queryBuilder.where('type.category_id = :categoryId', { categoryId: category_id });
  }
  
  const types = await queryBuilder.getMany();
  
  // Format response to include category_name
  const formattedTypes = types.map(type => ({
    ...type,
    category_name: type.category?.name
  }));
  
  res.status(200).json({
    success: true,
    count: formattedTypes.length,
    data: formattedTypes
  });
});

const getType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const typeRepo = dataSource.getRepository(FoodType);
  
  const type = await typeRepo.findOne({
    where: { id },
    relations: ['category']
  });
  
  if (!type) {
    throw new AppError('Food type not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: {
      ...type,
      category_name: type.category?.name
    }
  });
});

const createType = asyncHandler(async (req, res) => {
  const { category_id, name } = req.body;
  
  if (!category_id || !name) {
    throw new AppError('Category ID and name are required', 400);
  }
  
  const dataSource = await getDataSource();
  const typeRepo = dataSource.getRepository(FoodType);
  const categoryRepo = dataSource.getRepository(FoodCategory);
  
  // Verify category exists
  const category = await categoryRepo.findOne({ where: { id: category_id } });
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  
  const foodType = typeRepo.create({
    category_id,
    name
  });
  
  const saved = await typeRepo.save(foodType);
  
  res.status(201).json({
    success: true,
    data: saved
  });
});

const updateType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category_id, name } = req.body;
  
  const dataSource = await getDataSource();
  const typeRepo = dataSource.getRepository(FoodType);
  
  const foodType = await typeRepo.findOne({ where: { id } });
  
  if (!foodType) {
    throw new AppError('Food type not found', 404);
  }
  
  if (category_id !== undefined) foodType.category_id = category_id;
  if (name !== undefined) foodType.name = name;
  
  const updated = await typeRepo.save(foodType);
  
  res.status(200).json({
    success: true,
    data: updated
  });
});

const deleteType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const typeRepo = dataSource.getRepository(FoodType);
  
  const result = await typeRepo.delete({ id });
  
  if (result.affected === 0) {
    throw new AppError('Food type not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Food type deleted successfully'
  });
});

// ==================== SPECIFICATIONS ====================

const getSpecifications = asyncHandler(async (req, res) => {
  const { food_type_id } = req.query;
  const dataSource = await getDataSource();
  const specRepo = dataSource.getRepository(Specification);
  
  const queryBuilder = specRepo
    .createQueryBuilder('spec')
    .leftJoinAndSelect('spec.foodType', 'foodType')
    .leftJoinAndSelect('foodType.category', 'category')
    .orderBy('foodType.name', 'ASC')
    .addOrderBy('spec.name', 'ASC');
  
  if (food_type_id) {
    queryBuilder.where('spec.food_type_id = :foodTypeId', { foodTypeId: food_type_id });
  }
  
  const specifications = await queryBuilder.getMany();
  
  // Format response
  const formatted = specifications.map(spec => ({
    ...spec,
    food_type_name: spec.foodType?.name,
    category_name: spec.foodType?.category?.name
  }));
  
  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

const createSpecification = asyncHandler(async (req, res) => {
  const { food_type_id, name } = req.body;
  
  if (!food_type_id || !name) {
    throw new AppError('Food type ID and name are required', 400);
  }
  
  const dataSource = await getDataSource();
  const specRepo = dataSource.getRepository(Specification);
  
  const specification = specRepo.create({
    food_type_id,
    name
  });
  
  const saved = await specRepo.save(specification);
  
  res.status(201).json({
    success: true,
    data: saved
  });
});

const updateSpecification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { food_type_id, name } = req.body;
  
  const dataSource = await getDataSource();
  const specRepo = dataSource.getRepository(Specification);
  
  const specification = await specRepo.findOne({ where: { id } });
  
  if (!specification) {
    throw new AppError('Specification not found', 404);
  }
  
  if (food_type_id !== undefined) specification.food_type_id = food_type_id;
  if (name !== undefined) specification.name = name;
  
  const updated = await specRepo.save(specification);
  
  res.status(200).json({
    success: true,
    data: updated
  });
});

const deleteSpecification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const specRepo = dataSource.getRepository(Specification);
  
  const result = await specRepo.delete({ id });
  
  if (result.affected === 0) {
    throw new AppError('Specification not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Specification deleted successfully'
  });
});

// ==================== COOK TYPES ====================

const getCookTypes = asyncHandler(async (req, res) => {
  const { category_id } = req.query;
  const dataSource = await getDataSource();
  const cookTypeRepo = dataSource.getRepository(CookType);
  
  const queryBuilder = cookTypeRepo
    .createQueryBuilder('cookType')
    .leftJoinAndSelect('cookType.category', 'category')
    .orderBy('category.display_order', 'ASC')
    .addOrderBy('cookType.name', 'ASC');
  
  if (category_id) {
    queryBuilder.where('cookType.category_id = :categoryId', { categoryId: category_id });
  }
  
  const cookTypes = await queryBuilder.getMany();
  
  // Format response
  const formatted = cookTypes.map(ct => ({
    ...ct,
    category_name: ct.category?.name
  }));
  
  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

const createCookType = asyncHandler(async (req, res) => {
  const { category_id, name } = req.body;
  
  if (!category_id || !name) {
    throw new AppError('Category ID and name are required', 400);
  }
  
  const dataSource = await getDataSource();
  const cookTypeRepo = dataSource.getRepository(CookType);
  
  const cookType = cookTypeRepo.create({
    category_id,
    name
  });
  
  const saved = await cookTypeRepo.save(cookType);
  
  res.status(201).json({
    success: true,
    data: saved
  });
});

const updateCookType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category_id, name } = req.body;
  
  const dataSource = await getDataSource();
  const cookTypeRepo = dataSource.getRepository(CookType);
  
  const cookType = await cookTypeRepo.findOne({ where: { id } });
  
  if (!cookType) {
    throw new AppError('Cook type not found', 404);
  }
  
  if (category_id !== undefined) cookType.category_id = category_id;
  if (name !== undefined) cookType.name = name;
  
  const updated = await cookTypeRepo.save(cookType);
  
  res.status(200).json({
    success: true,
    data: updated
  });
});

const deleteCookType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const cookTypeRepo = dataSource.getRepository(CookType);
  
  const result = await cookTypeRepo.delete({ id });
  
  if (result.affected === 0) {
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

/**
 * Locations Controller - TypeORM Version
 * Example of how to use TypeORM in controllers
 */

const { getDataSource } = require('../database/typeorm');
const { Location } = require('../entities/Location.entity');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Public
const getLocations = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const dataSource = await getDataSource();
  const locationRepo = dataSource.getRepository(Location);
  
  const queryBuilder = locationRepo.createQueryBuilder('location');
  
  if (search) {
    queryBuilder.where('location.name ILIKE :search', { search: `%${search}%` });
  }
  
  if (status) {
    queryBuilder.andWhere('location.status = :status', { status });
  }
  
  queryBuilder.orderBy('location.created_at', 'DESC');
  
  const locations = await queryBuilder.getMany();
  
  res.status(200).json({
    success: true,
    count: locations.length,
    data: locations
  });
});

// @desc    Get single location
// @route   GET /api/locations/:id
// @access  Public
const getLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const locationRepo = dataSource.getRepository(Location);
  
  const location = await locationRepo.findOne({
    where: { id }
  });
  
  if (!location) {
    throw new AppError('Location not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: location
  });
});

// @desc    Create location
// @route   POST /api/locations
// @access  Private
const createLocation = asyncHandler(async (req, res) => {
  const { name, currency = 'LKR', location_type, address, phone, status = 'active' } = req.body;
  
  if (!name) {
    throw new AppError('Location name is required', 400);
  }
  
  const dataSource = await getDataSource();
  const locationRepo = dataSource.getRepository(Location);
  
  const location = locationRepo.create({
    name,
    currency,
    location_type,
    address,
    phone,
    status
  });
  
  const savedLocation = await locationRepo.save(location);
  
  res.status(201).json({
    success: true,
    data: savedLocation
  });
});

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private
const updateLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, currency, location_type, address, phone, status } = req.body;
  
  const dataSource = await getDataSource();
  const locationRepo = dataSource.getRepository(Location);
  
  const location = await locationRepo.findOne({ where: { id } });
  
  if (!location) {
    throw new AppError('Location not found', 404);
  }
  
  // Update fields
  if (name !== undefined) location.name = name;
  if (currency !== undefined) location.currency = currency;
  if (location_type !== undefined) location.location_type = location_type;
  if (address !== undefined) location.address = address;
  if (phone !== undefined) location.phone = phone;
  if (status !== undefined) location.status = status;
  
  const updatedLocation = await locationRepo.save(location);
  
  res.status(200).json({
    success: true,
    data: updatedLocation
  });
});

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private
const deleteLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const locationRepo = dataSource.getRepository(Location);
  
  const result = await locationRepo.delete({ id });
  
  if (result.affected === 0) {
    throw new AppError('Location not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Location deleted successfully'
  });
});

module.exports = {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation
};


/**
 * Users Controller - TypeORM Version
 * Handles user/staff management with authentication - Location dependent
 */

const { getDataSource } = require('../database/typeorm');
const { User } = require('../entities/User.entity');
const { Location } = require('../entities/Location.entity');
const bcrypt = require('bcrypt');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all users (filtered by location)
// @route   GET /api/users
const getUsers = asyncHandler(async (req, res) => {
  const { location_id, search, role, status } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  
  const queryBuilder = userRepo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.location', 'location')
    .select([
      'user.id',
      'user.location_id',
      'user.email',
      'user.name',
      'user.contact_number',
      'user.role',
      'user.account_status',
      'user.created_at',
      'user.updated_at',
      'location.name'
    ])
    .where('user.location_id = :locationId', { locationId: location_id })
    .orderBy('user.created_at', 'DESC');
  
  if (search) {
    queryBuilder.andWhere(
      '(user.name ILIKE :search OR user.email ILIKE :search)',
      { search: `%${search}%` }
    );
  }
  
  if (role) {
    queryBuilder.andWhere('user.role = :role', { role });
  }
  
  if (status) {
    queryBuilder.andWhere('user.account_status = :status', { status });
  }
  
  const users = await queryBuilder.getMany();
  
  // Format response
  const formatted = users.map(user => ({
    ...user,
    location_name: user.location?.name
  }));
  
  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  
  const user = await userRepo.findOne({
    where: { id },
    relations: ['location'],
    select: [
      'id',
      'location_id',
      'email',
      'name',
      'contact_number',
      'role',
      'account_status',
      'created_at',
      'updated_at'
    ]
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: {
      ...user,
      location_name: user.location?.name
    }
  });
});

// @desc    Create user
// @route   POST /api/users
const createUser = asyncHandler(async (req, res) => {
  const { location_id, email, password, name, contact_number, role = 'staff' } = req.body;
  
  if (!location_id || !email || !password || !name) {
    throw new AppError('Location ID, email, password, and name are required', 400);
  }
  
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  
  const user = userRepo.create({
    location_id,
    email,
    password_hash,
    name,
    contact_number: contact_number || null,
    role
  });
  
  const saved = await userRepo.save(user);
  
  // Return without password_hash
  const { password_hash: _, ...userResponse } = saved;
  
  res.status(201).json({
    success: true,
    data: userResponse
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, contact_number, role, account_status, password } = req.body;
  
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  
  const user = await userRepo.findOne({ where: { id } });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  if (email !== undefined) user.email = email;
  if (name !== undefined) user.name = name;
  if (contact_number !== undefined) user.contact_number = contact_number;
  if (role !== undefined) user.role = role;
  if (account_status !== undefined) user.account_status = account_status;
  
  // Update password if provided
  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
  }
  
  const updated = await userRepo.save(user);
  
  // Return without password_hash
  const { password_hash: _, ...userResponse } = updated;
  
  res.status(200).json({
    success: true,
    data: userResponse
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  
  const result = await userRepo.delete({ id });
  
  if (result.affected === 0) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Login user
// @route   POST /api/users/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }
  
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  
  const user = await userRepo.findOne({
    where: { email },
    relations: ['location']
  });
  
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }
  
  // Check if account is active
  if (user.account_status !== 'active') {
    throw new AppError('Account is not active', 401);
  }
  
  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }
  
  // Return user without password_hash
  const { password_hash, ...userWithoutPassword } = user;
  
  res.status(200).json({
    success: true,
    data: {
      user: {
        ...userWithoutPassword,
        location_name: user.location?.name
      },
      token: user.id  // Simple token - replace with JWT in production
    }
  });
});

// @desc    Get current logged in user
// @route   GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware
  if (!req.user || !req.user.id) {
    throw new AppError('Not authenticated', 401);
  }
  
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  
  const user = await userRepo.findOne({
    where: { id: req.user.id },
    relations: ['location'],
    select: [
      'id',
      'location_id',
      'email',
      'name',
      'contact_number',
      'role',
      'account_status',
      'created_at',
      'updated_at'
    ]
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: {
      ...user,
      location_name: user.location?.name
    }
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  getMe
};

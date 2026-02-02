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
  const { search, role, status, location_id } = req.query;

  // Determine target location:
  // - Admins can request any location via query param
  // - Non-admins are forced to their assigned location
  let targetLocationId = req.user?.location_id;
  if (req.user?.role === 'admin' && location_id) {
    targetLocationId = location_id;
  }

  if (!targetLocationId) {
    // If admin doesn't provide location_id and has no location (unlikely), 
    // or simply as a fallback.
    // Ideally admins should see ALL users if no location specified? 
    // But existing logic was location-bound.
    // Let's stick to location-bound for now, allowing switch.
    throw new AppError('User location not found', 403);
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
    .where('user.location_id = :locationId', { locationId: targetLocationId })
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
  const userLocationId = req.user?.location_id;

  if (!userLocationId) {
    throw new AppError('User location not found', 403);
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);

  const user = await userRepo.findOne({
    where: query,
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
    throw new AppError('User not found or access denied', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      ...user,
      location_name: user.location?.name
    }
  });
});

// @desc    Create user (Admin only)
// @route   POST /api/users
const createUser = asyncHandler(async (req, res) => {
  const { email, password, name, contact_number, role, account_status, location_id } = req.body;

  // Determine target location:
  // - Admins can specify location_id in body
  // - Non-admins are forced to their assigned location
  let targetLocationId = req.user?.location_id;

  if (req.user?.role === 'admin' && location_id) {
    targetLocationId = location_id;
  }

  if (!targetLocationId) {
    throw new AppError('Location required', 400);
  }

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required', 400);
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const locationRepo = dataSource.getRepository(Location);

  // Verify location exists and user has access to it
  const location = await locationRepo.findOne({ where: { id: targetLocationId } });
  if (!location) {
    throw new AppError('Location not found', 404);
  }

  // Check if email already exists for this location
  const existingUser = await userRepo.findOne({
    where: {
      email,
      location_id: targetLocationId
    }
  });
  if (existingUser) {
    throw new AppError('Email already registered for this location', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Set defaults - admins can override
  const finalRole = role || 'staff';
  const finalAccountStatus = account_status || 'active';

  const user = userRepo.create({
    location_id: targetLocationId,
    email,
    password_hash,
    name,
    contact_number: contact_number || null,
    role: finalRole,
    account_status: finalAccountStatus
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

  // Check permission:
  // - Admins can update any user
  // - Staff/Manager can only update users in their location

  const checkQuery = { id };
  if (req.user?.role !== 'admin') {
    if (!req.user?.location_id) throw new AppError('User location not found', 403);
    checkQuery.location_id = req.user.location_id;
  }

  // Ensure user exists and matches permission
  const user = await userRepo.findOne({ where: checkQuery });

  if (!user) {
    throw new AppError('User not found or access denied', 404);
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

  const query = { id };
  if (req.user?.role !== 'admin') {
    if (!req.user?.location_id) throw new AppError('User location not found', 403);
    query.location_id = req.user.location_id;
  }

  // Ensure user can only delete users from their own location (unless admin)
  const result = await userRepo.delete(query);

  if (result.affected === 0) {
    throw new AppError('User not found or access denied', 404);
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Admin signup (public)
// @route   POST /api/users/signup
const signupUser = asyncHandler(async (req, res) => {
  const { email, password, name, contact_number } = req.body;

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required', 400);
  }

  console.log('Signup Attempt:', { email, name }); // Log attempt

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const locationRepo = dataSource.getRepository(Location);

  // Check if email already exists
  const existingUser = await userRepo.findOne({ where: { email } });
  if (existingUser) {
    console.log('Signup failed: Email exists', email);
    throw new AppError('Email already registered', 400);
  }

  // Get first active location as default for admin signup
  const firstLocation = await locationRepo.findOne({
    where: { status: 'active' },
    order: { created_at: 'ASC' }
  });

  if (!firstLocation) {
    throw new AppError('No active location found. Please contact administrator.', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Admin signup - automatically activate account
  const user = userRepo.create({
    location_id: firstLocation.id,
    email,
    password_hash,
    name,
    contact_number: contact_number || null,
    role: 'admin', // Default to admin role for signups
    account_status: 'active' // Auto-activate admin accounts
  });

  const saved = await userRepo.save(user);

  // Return without password_hash
  const { password_hash: _, ...userResponse } = saved;

  res.status(201).json({
    success: true,
    data: userResponse
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

  // Verify password first
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Auto-activate admin accounts if they're inactive
  if (user.account_status !== 'active' && user.role === 'admin') {
    user.account_status = 'active';
    await userRepo.save(user);
    // Reload user to get updated data
    const updatedUser = await userRepo.findOne({
      where: { id: user.id },
      relations: ['location']
    });
    if (updatedUser) {
      user.account_status = updatedUser.account_status;
    }
  }

  // Check if account is active (after auto-activation)
  if (user.account_status !== 'active') {
    throw new AppError('Account is not active', 401);
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
  signupUser,
  loginUser,
  getMe
};

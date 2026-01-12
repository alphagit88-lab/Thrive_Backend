/**
 * Customers Controller - TypeORM Version
 * Handles customer management - Location dependent
 */

const { getDataSource } = require('../database/typeorm');
const { Customer } = require('../entities/Customer.entity');
const { Location } = require('../entities/Location.entity');
const { Order } = require('../entities/Order.entity');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all customers (filtered by location)
// @route   GET /api/customers
const getCustomers = asyncHandler(async (req, res) => {
  const { location_id, search, status } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  const dataSource = await getDataSource();
  const customerRepo = dataSource.getRepository(Customer);
  
  const queryBuilder = customerRepo
    .createQueryBuilder('customer')
    .leftJoinAndSelect('customer.location', 'location')
    .where('customer.location_id = :locationId', { locationId: location_id })
    .orderBy('customer.created_at', 'DESC');
  
  if (search) {
    queryBuilder.andWhere(
      '(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.contact_number ILIKE :search)',
      { search: `%${search}%` }
    );
  }
  
  if (status) {
    queryBuilder.andWhere('customer.account_status = :status', { status });
  }
  
  const customers = await queryBuilder.getMany();
  
  // Format response
  const formatted = customers.map(customer => ({
    ...customer,
    location_name: customer.location?.name
  }));
  
  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
const getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const customerRepo = dataSource.getRepository(Customer);
  
  const customer = await customerRepo.findOne({
    where: { id },
    relations: ['location']
  });
  
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  
  // Get customer's recent orders
  const orders = await dataSource.getRepository(Order).find({
    where: { customer_id: id },
    order: { order_date: 'DESC' },
    take: 10,
    select: ['id', 'order_number', 'status', 'total_price', 'order_date']
  });
  
  res.status(200).json({
    success: true,
    data: {
      ...customer,
      location_name: customer.location?.name,
      recent_orders: orders
    }
  });
});

// @desc    Create customer
// @route   POST /api/customers
const createCustomer = asyncHandler(async (req, res) => {
  const { location_id, email, name, contact_number, address } = req.body;
  
  if (!location_id || !email || !name) {
    throw new AppError('Location ID, email, and name are required', 400);
  }
  
  const dataSource = await getDataSource();
  const customerRepo = dataSource.getRepository(Customer);
  
  const customer = customerRepo.create({
    location_id,
    email,
    name,
    contact_number: contact_number || null,
    address: address || null
  });
  
  const saved = await customerRepo.save(customer);
  
  res.status(201).json({
    success: true,
    data: saved
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, contact_number, address, account_status } = req.body;
  
  const dataSource = await getDataSource();
  const customerRepo = dataSource.getRepository(Customer);
  
  const customer = await customerRepo.findOne({ where: { id } });
  
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  
  if (email !== undefined) customer.email = email;
  if (name !== undefined) customer.name = name;
  if (contact_number !== undefined) customer.contact_number = contact_number;
  if (address !== undefined) customer.address = address;
  if (account_status !== undefined) customer.account_status = account_status;
  
  const updated = await customerRepo.save(customer);
  
  res.status(200).json({
    success: true,
    data: updated
  });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const customerRepo = dataSource.getRepository(Customer);
  
  const result = await customerRepo.delete({ id });
  
  if (result.affected === 0) {
    throw new AppError('Customer not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
};

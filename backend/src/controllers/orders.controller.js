/**
 * Orders Controller - TypeORM Version
 * Handles orders (preps) - Location dependent
 */

const { getDataSource } = require('../database/typeorm');
const { Order } = require('../entities/Order.entity');
const { OrderItem } = require('../entities/OrderItem.entity');
const { Location } = require('../entities/Location.entity');
const { Customer } = require('../entities/Customer.entity');
const { MenuItem } = require('../entities/MenuItem.entity');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all orders (filtered by location)
// @route   GET /api/orders
const getOrders = asyncHandler(async (req, res) => {
  const { location_id, status, customer_id, date_from, date_to } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  const dataSource = await getDataSource();
  const orderRepo = dataSource.getRepository(Order);
  
  const queryBuilder = orderRepo
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.location', 'location')
    .leftJoinAndSelect('order.customer', 'customer')
    .where('order.location_id = :locationId', { locationId: location_id })
    .orderBy('order.order_date', 'DESC');
  
  if (status) {
    queryBuilder.andWhere('order.status = :status', { status });
  }
  
  if (customer_id) {
    queryBuilder.andWhere('order.customer_id = :customerId', { customerId: customer_id });
  }
  
  if (date_from) {
    queryBuilder.andWhere('order.order_date >= :dateFrom', { dateFrom: date_from });
  }
  
  if (date_to) {
    queryBuilder.andWhere('order.order_date <= :dateTo', { dateTo: date_to });
  }
  
  const orders = await queryBuilder.getMany();
  
  // Get order items for all orders
  const orderIds = orders.map(o => o.id);
  const orderItems = orderIds.length > 0
    ? await dataSource.getRepository(OrderItem).find({
        where: orderIds.map(id => ({ order_id: id })),
        order: { created_at: 'ASC' }
      })
    : [];
  
  // Get menu items for order items
  const menuItemIds = [...new Set(orderItems.map(oi => oi.menu_item_id).filter(Boolean))];
  const menuItems = menuItemIds.length > 0
    ? await dataSource.getRepository(MenuItem).find({
        where: menuItemIds.map(id => ({ id }))
      })
    : [];
  
  const menuItemsMap = {};
  menuItems.forEach(mi => { menuItemsMap[mi.id] = mi; });
  
  // Group order items by order_id
  const itemsByOrder = {};
  orderItems.forEach(oi => {
    if (!itemsByOrder[oi.order_id]) {
      itemsByOrder[oi.order_id] = [];
    }
    itemsByOrder[oi.order_id].push({
      id: oi.id,
      menu_item_id: oi.menu_item_id,
      menu_item_name: menuItemsMap[oi.menu_item_id]?.name,
      quantity: oi.quantity,
      unit_price: oi.unit_price,
      total_price: oi.total_price
    });
  });
  
  // Format response
  const formatted = orders.map(order => ({
    ...order,
    customer_name: order.customer?.name,
    customer_email: order.customer?.email,
    customer_phone: order.customer?.contact_number,
    location_name: order.location?.name,
    items: itemsByOrder[order.id] || []
  }));
  
  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const orderRepo = dataSource.getRepository(Order);
  
  const order = await orderRepo.findOne({
    where: { id },
    relations: ['location', 'customer']
  });
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  
  // Get order items
  const orderItems = await dataSource.getRepository(OrderItem).find({
    where: { order_id: id },
    order: { created_at: 'ASC' }
  });
  
  // Get menu items
  const menuItemIds = orderItems.map(oi => oi.menu_item_id).filter(Boolean);
  const menuItems = menuItemIds.length > 0
    ? await dataSource.getRepository(MenuItem).find({
        where: menuItemIds.map(id => ({ id }))
      })
    : [];
  
  const menuItemsMap = {};
  menuItems.forEach(mi => { menuItemsMap[mi.id] = mi; });
  
  // Format order items
  const items = orderItems.map(oi => ({
    ...oi,
    menu_item_name: menuItemsMap[oi.menu_item_id]?.name,
    menu_item_description: menuItemsMap[oi.menu_item_id]?.description
  }));
  
  res.status(200).json({
    success: true,
    data: {
      ...order,
      customer_name: order.customer?.name,
      customer_email: order.customer?.email,
      customer_phone: order.customer?.contact_number,
      location_name: order.location?.name,
      items: items
    }
  });
});

// @desc    Create order
// @route   POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const {
    location_id,
    customer_id,
    notes,
    items = []
  } = req.body;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  if (items.length === 0) {
    throw new AppError('At least one item is required', 400);
  }
  
  const dataSource = await getDataSource();
  
  await dataSource.transaction(async (manager) => {
    const orderRepo = manager.getRepository(Order);
    const orderItemRepo = manager.getRepository(OrderItem);
    
    // Calculate total price
    let totalPrice = 0;
    for (const item of items) {
      totalPrice += (item.unit_price || 0) * (item.quantity || 1);
    }
    
    // Generate order number
    const orderCount = await orderRepo.count({
      where: { location_id }
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, '0')}`;
    
    // Create order
    const order = orderRepo.create({
      location_id,
      customer_id: customer_id || null,
      order_number: orderNumber,
      status: 'received',
      total_price: totalPrice,
      notes: notes || null
    });
    
    const savedOrder = await orderRepo.save(order);
    
    // Create order items
    const createdItems = [];
    for (const item of items) {
      const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
      const orderItem = orderItemRepo.create({
        order_id: savedOrder.id,
        menu_item_id: item.menu_item_id || null,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: itemTotal,
        notes: item.notes || null
      });
      const saved = await orderItemRepo.save(orderItem);
      createdItems.push(saved);
    }
    
    res.status(201).json({
      success: true,
      data: {
        ...savedOrder,
        items: createdItems
      }
    });
  });
});

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    throw new AppError('Status is required', 400);
  }
  
  const validStatuses = ['received', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }
  
  const dataSource = await getDataSource();
  const orderRepo = dataSource.getRepository(Order);
  
  const order = await orderRepo.findOne({ where: { id } });
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  
  order.status = status;
  if (status === 'delivered') {
    order.delivered_at = new Date();
  }
  
  const updated = await orderRepo.save(order);
  
  res.status(200).json({
    success: true,
    data: updated
  });
});

// @desc    Update order
// @route   PUT /api/orders/:id
const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { customer_id, notes, status } = req.body;
  
  const dataSource = await getDataSource();
  const orderRepo = dataSource.getRepository(Order);
  
  const order = await orderRepo.findOne({ where: { id } });
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  
  if (customer_id !== undefined) order.customer_id = customer_id;
  if (notes !== undefined) order.notes = notes;
  if (status !== undefined) order.status = status;
  
  const updated = await orderRepo.save(order);
  
  res.status(200).json({
    success: true,
    data: updated
  });
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataSource = await getDataSource();
  const orderRepo = dataSource.getRepository(Order);
  
  const result = await orderRepo.delete({ id });
  
  if (result.affected === 0) {
    throw new AppError('Order not found', 404);
  }
  
  res.status(200).json({
    success: true,
    message: 'Order deleted successfully'
  });
});

// @desc    Get order statistics for dashboard
// @route   GET /api/orders/stats
const getOrderStats = asyncHandler(async (req, res) => {
  const { location_id, date } = req.query;
  
  if (!location_id) {
    throw new AppError('Location ID is required', 400);
  }
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  const dataSource = await getDataSource();
  const orderRepo = dataSource.getRepository(Order);
  
  const orders = await orderRepo
    .createQueryBuilder('order')
    .where('order.location_id = :locationId', { locationId: location_id })
    .andWhere('DATE(order.order_date) = :date', { date: targetDate })
    .getMany();
  
  const stats = {
    preps_received: orders.filter(o => o.status === 'received').length,
    preps_delivered: orders.filter(o => o.status === 'delivered').length,
    total_earnings: orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
    date: targetDate
  };
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats
};

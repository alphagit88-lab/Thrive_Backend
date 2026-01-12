/**
 * Order Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const Order = new EntitySchema({
  name: 'Order',
  tableName: 'orders',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    location_id: {
      type: 'uuid'
    },
    customer_id: {
      type: 'uuid',
      nullable: true
    },
    order_number: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    status: {
      type: 'enum',
      enum: ['received', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'received'
    },
    total_price: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: 0
    },
    notes: {
      type: 'text',
      nullable: true
    },
    order_date: {
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP'
    },
    delivered_at: {
      type: 'timestamp',
      nullable: true
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    },
    updated_at: {
      type: 'timestamp',
      updateDate: true
    }
  },
  relations: {
    location: {
      type: 'many-to-one',
      target: 'Location',
      joinColumn: {
        name: 'location_id'
      },
      onDelete: 'CASCADE'
    },
    customer: {
      type: 'many-to-one',
      target: 'Customer',
      joinColumn: {
        name: 'customer_id'
      },
      onDelete: 'SET NULL',
      nullable: true
    }
  }
});

module.exports = { Order };

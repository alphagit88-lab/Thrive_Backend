/**
 * Order Item Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const OrderItem = new EntitySchema({
  name: 'OrderItem',
  tableName: 'order_items',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    order_id: {
      type: 'uuid'
    },
    menu_item_id: {
      type: 'uuid',
      nullable: true
    },
    quantity: {
      type: 'int',
      default: 1
    },
    unit_price: {
      type: 'decimal',
      precision: 10,
      scale: 2
    },
    total_price: {
      type: 'decimal',
      precision: 10,
      scale: 2
    },
    notes: {
      type: 'text',
      nullable: true
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    }
  },
  relations: {
    order: {
      type: 'many-to-one',
      target: 'Order',
      joinColumn: {
        name: 'order_id'
      },
      onDelete: 'CASCADE'
    },
    menuItem: {
      type: 'many-to-one',
      target: 'MenuItem',
      joinColumn: {
        name: 'menu_item_id'
      },
      onDelete: 'SET NULL',
      nullable: true
    }
  }
});

module.exports = { OrderItem };

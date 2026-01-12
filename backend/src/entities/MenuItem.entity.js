/**
 * Menu Item Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const MenuItem = new EntitySchema({
  name: 'MenuItem',
  tableName: 'menu_items',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    location_id: {
      type: 'uuid'
    },
    display_id: {
      type: 'varchar',
      length: 20,
      nullable: true
    },
    name: {
      type: 'varchar',
      length: 255
    },
    food_category_id: {
      type: 'uuid',
      nullable: true
    },
    food_type_id: {
      type: 'uuid',
      nullable: true
    },
    quantity: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    specification_id: {
      type: 'uuid',
      nullable: true
    },
    cook_type_id: {
      type: 'uuid',
      nullable: true
    },
    description: {
      type: 'text',
      nullable: true
    },
    price: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: 0
    },
    tags: {
      type: 'text',
      nullable: true
    },
    prep_workout: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    status: {
      type: 'enum',
      enum: ['draft', 'active'],
      default: 'draft'
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
    }
  }
});

module.exports = { MenuItem };

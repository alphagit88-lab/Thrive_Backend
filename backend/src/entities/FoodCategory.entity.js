/**
 * Food Category Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const FoodCategory = new EntitySchema({
  name: 'FoodCategory',
  tableName: 'food_categories',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    location_id: {
      type: 'uuid',
      name: 'location_id',
      nullable: true
    },
    name: {
      type: 'varchar',
      length: 100
    },
    display_order: {
      type: 'int',
      default: 0
    },
    show_specification: {
      type: 'boolean',
      default: true
    },
    show_cook_type: {
      type: 'boolean',
      default: true
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
      joinColumn: { name: 'location_id' },
      nullable: true
    }
  }
});

module.exports = { FoodCategory };

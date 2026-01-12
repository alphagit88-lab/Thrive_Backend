/**
 * Food Type Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const FoodType = new EntitySchema({
  name: 'FoodType',
  tableName: 'food_types',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    category_id: {
      type: 'uuid'
    },
    name: {
      type: 'varchar',
      length: 100
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
    category: {
      type: 'many-to-one',
      target: 'FoodCategory',
      joinColumn: {
        name: 'category_id'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      columns: ['category_id', 'name'],
      unique: true
    }
  ]
});

module.exports = { FoodType };

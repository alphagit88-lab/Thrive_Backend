/**
 * Cook Type Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const CookType = new EntitySchema({
  name: 'CookType',
  tableName: 'cook_types',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    category_id: {
      type: 'uuid'
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
    created_at: {
      type: 'timestamp',
      createDate: true
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
    },
    location: {
      type: 'many-to-one',
      target: 'Location',
      joinColumn: { name: 'location_id' },
      nullable: true
    }
  },
  indices: [
    {
      columns: ['category_id', 'name'],
      unique: true
    }
  ]
});

module.exports = { CookType };

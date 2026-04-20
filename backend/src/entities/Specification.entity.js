/**
 * Specification Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const Specification = new EntitySchema({
  name: 'Specification',
  tableName: 'specifications',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    food_type_id: {
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
    foodType: {
      type: 'many-to-one',
      target: 'FoodType',
      joinColumn: {
        name: 'food_type_id'
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
      columns: ['food_type_id', 'name'],
      unique: true
    }
  ]
});

module.exports = { Specification };

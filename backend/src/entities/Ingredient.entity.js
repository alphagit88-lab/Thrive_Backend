/**
 * Ingredient Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const Ingredient = new EntitySchema({
  name: 'Ingredient',
  tableName: 'ingredients',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    location_id: {
      type: 'uuid',
      nullable: true // Set to true for backward compatibility or global ingredients if needed
    },
    food_type_id: {
      type: 'uuid'
    },
    name: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    description: {
      type: 'text',
      nullable: true
    },
    is_active: {
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
      joinColumn: {
        name: 'location_id'
      },
      onDelete: 'CASCADE'
    },
    foodType: {
      type: 'many-to-one',
      target: 'FoodType',
      joinColumn: {
        name: 'food_type_id'
      },
      onDelete: 'CASCADE'
    },
    specifications: {
      type: 'many-to-many',
      target: 'Specification',
      joinTable: {
        name: 'ingredient_specifications',
        joinColumn: { name: 'ingredient_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'specification_id', referencedColumnName: 'id' }
      }
    },
    cookTypes: {
      type: 'many-to-many',
      target: 'CookType',
      joinTable: {
        name: 'ingredient_cook_types',
        joinColumn: { name: 'ingredient_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'cook_type_id', referencedColumnName: 'id' }
      }
    },
    quantities: {
      type: 'one-to-many',
      target: 'IngredientQuantity',
      inverseSide: 'ingredient'
    },
    photos: {
      type: 'one-to-many',
      target: 'IngredientPhoto',
      inverseSide: 'ingredient'
    }
  }
});

module.exports = { Ingredient };

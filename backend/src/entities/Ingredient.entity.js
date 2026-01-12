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
    food_type_id: {
      type: 'uuid'
    },
    specification_id: {
      type: 'uuid',
      nullable: true
    },
    cook_type_id: {
      type: 'uuid',
      nullable: true
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
    foodType: {
      type: 'many-to-one',
      target: 'FoodType',
      joinColumn: {
        name: 'food_type_id'
      },
      onDelete: 'CASCADE'
    },
    specification: {
      type: 'many-to-one',
      target: 'Specification',
      joinColumn: {
        name: 'specification_id'
      },
      onDelete: 'SET NULL',
      nullable: true
    },
    cookType: {
      type: 'many-to-one',
      target: 'CookType',
      joinColumn: {
        name: 'cook_type_id'
      },
      onDelete: 'SET NULL',
      nullable: true
    },
    quantities: {
      type: 'one-to-many',
      target: 'IngredientQuantity',
      inverseSide: 'ingredient'
    }
  }
});

module.exports = { Ingredient };

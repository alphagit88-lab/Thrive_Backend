/**
 * Ingredient Quantity Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const IngredientQuantity = new EntitySchema({
  name: 'IngredientQuantity',
  tableName: 'ingredient_quantities',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    ingredient_id: {
      type: 'uuid'
    },
    quantity_value: {
      type: 'varchar',
      length: 50
    },
    quantity_grams: {
      type: 'int',
      nullable: true
    },
    price: {
      type: 'decimal',
      precision: 10,
      scale: 2
    },
    is_available: {
      type: 'boolean',
      default: true
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    }
  },
  relations: {
    ingredient: {
      type: 'many-to-one',
      target: 'Ingredient',
      joinColumn: {
        name: 'ingredient_id'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      columns: ['ingredient_id', 'quantity_value'],
      unique: true
    }
  ]
});

module.exports = { IngredientQuantity };

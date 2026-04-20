/**
 * Ingredient Photo Entity - Using EntitySchema
 * Multiple photos per ingredient
 */

const { EntitySchema } = require('typeorm');

const IngredientPhoto = new EntitySchema({
  name: 'IngredientPhoto',
  tableName: 'ingredient_photos',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    ingredient_id: {
      type: 'uuid'
    },
    photo_url: {
      type: 'text'
    },
    display_order: {
      type: 'integer',
      default: 0
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
  }
});

module.exports = { IngredientPhoto };

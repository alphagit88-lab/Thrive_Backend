/**
 * Menu Item Ingredient Entity (Junction Table) - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const MenuItemIngredient = new EntitySchema({
  name: 'MenuItemIngredient',
  tableName: 'menu_item_ingredients',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    menu_item_id: {
      type: 'uuid'
    },
    ingredient_id: {
      type: 'uuid'
    },
    ingredient_quantity_id: {
      type: 'uuid',
      nullable: true
    },
    custom_quantity: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    }
  },
  relations: {
    menuItem: {
      type: 'many-to-one',
      target: 'MenuItem',
      joinColumn: {
        name: 'menu_item_id'
      },
      onDelete: 'CASCADE'
    },
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
      columns: ['menu_item_id', 'ingredient_id'],
      unique: true
    }
  ]
});

module.exports = { MenuItemIngredient };

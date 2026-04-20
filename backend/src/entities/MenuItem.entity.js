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
    },
    specifications: {
      type: 'many-to-many',
      target: 'Specification',
      joinTable: {
        name: 'menu_item_specifications',
        joinColumn: { name: 'menu_item_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'specification_id', referencedColumnName: 'id' }
      }
    },
    cookTypes: {
      type: 'many-to-many',
      target: 'CookType',
      joinTable: {
        name: 'menu_item_cook_types',
        joinColumn: { name: 'menu_item_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'cook_type_id', referencedColumnName: 'id' }
      }
    },
    ingredients: {
      type: 'one-to-many',
      target: 'MenuItemIngredient',
      inverseSide: 'menuItem'
    },
    photos: {
      type: 'one-to-many',
      target: 'MenuItemPhoto',
      inverseSide: 'menuItem'
    }
  }
});

module.exports = { MenuItem };

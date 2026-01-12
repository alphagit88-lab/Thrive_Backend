/**
 * Menu Item Photo Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const MenuItemPhoto = new EntitySchema({
  name: 'MenuItemPhoto',
  tableName: 'menu_item_photos',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    menu_item_id: {
      type: 'uuid'
    },
    photo_url: {
      type: 'text'
    },
    display_order: {
      type: 'int',
      default: 0
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
    }
  }
});

module.exports = { MenuItemPhoto };

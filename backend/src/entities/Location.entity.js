/**
 * Location Entity - Using EntitySchema for JavaScript compatibility
 */

const { EntitySchema } = require('typeorm');

const Location = new EntitySchema({
  name: 'Location',
  tableName: 'locations',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    name: {
      type: 'varchar',
      length: 255
    },
    currency: {
      type: 'varchar',
      length: 10,
      default: 'LKR'
    },
    location_type: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    address: {
      type: 'text',
      nullable: true
    },
    phone: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    status: {
      type: 'enum',
      enum: ['active', 'inactive'],
      default: 'active'
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    },
    updated_at: {
      type: 'timestamp',
      updateDate: true
    }
  }
});

module.exports = { Location };

/**
 * Customer Entity - Using EntitySchema
 */

const { EntitySchema } = require('typeorm');

const Customer = new EntitySchema({
  name: 'Customer',
  tableName: 'customers',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    location_id: {
      type: 'uuid'
    },
    email: {
      type: 'varchar',
      length: 255
    },
    name: {
      type: 'varchar',
      length: 255
    },
    contact_number: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    address: {
      type: 'text',
      nullable: true
    },
    account_status: {
      type: 'enum',
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    total_preps: {
      type: 'int',
      default: 0
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
    }
  },
  indices: [
    {
      columns: ['location_id', 'email'],
      unique: true
    }
  ]
});

module.exports = { Customer };

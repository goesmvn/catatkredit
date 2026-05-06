import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'username', type: 'string' },
        { name: 'nama_lengkap', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'pin', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'nama', type: 'string' },
        { name: 'alamat', type: 'string', isOptional: true },
        { name: 'no_hp', type: 'string', isOptional: true },
        { name: 'ciri_ciri', type: 'string', isOptional: true },
        { name: 'foto_url', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'total_hutang', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'customer_id', type: 'string', isIndexed: true },
        { name: 'total_harga', type: 'number' },
        { name: 'tanggal', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'transaction_items',
      columns: [
        { name: 'transaction_id', type: 'string', isIndexed: true },
        { name: 'item_tag_name', type: 'string', isOptional: true },
        { name: 'nama_barang', type: 'string' },
        { name: 'qty', type: 'number' },
        { name: 'harga_satuan', type: 'number' },
        { name: 'subtotal', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'payments',
      columns: [
        { name: 'customer_id', type: 'string', isIndexed: true },
        { name: 'nominal_bayar', type: 'number' },
        { name: 'tanggal_bayar', type: 'number' },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'item_tags',
      columns: [
        { name: 'nama_barang', type: 'string' },
        { name: 'harga_default', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
})

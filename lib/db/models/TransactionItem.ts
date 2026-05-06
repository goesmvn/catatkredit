import { Model } from '@nozbe/watermelondb'
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators'

export class TransactionItem extends Model {
  static table = 'transaction_items'
  static associations = {
    transactions: { type: 'belongs_to', key: 'transaction_id' },
  } as const
  
  @relation('transactions', 'transaction_id') transaction!: any
  @field('item_tag_name') item_tag_name?: string
  @field('nama_barang') nama_barang!: string
  @field('qty') qty!: number
  @field('harga_satuan') harga_satuan!: number
  @field('subtotal') subtotal!: number
  
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}

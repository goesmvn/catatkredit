import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'

export class Transaction extends Model {
  static table = 'transactions'
  static associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
    transaction_items: { type: 'has_many', foreignKey: 'transaction_id' },
  } as const
  
  @relation('customers', 'customer_id') customer!: any
  @field('total_harga') total_harga!: number
  @date('tanggal') tanggal!: Date
  @field('status') status!: string
  @field('created_by') created_by!: string | null
  
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  @children('transaction_items') items!: any
}

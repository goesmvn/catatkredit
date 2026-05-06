import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators'

export class Payment extends Model {
  static table = 'payments'
  static associations = {
    customers: { type: 'belongs_to', key: 'customer_id' },
  } as const
  
  @relation('customers', 'customer_id') customer!: any
  @field('nominal_bayar') nominal_bayar!: number
  @date('tanggal_bayar') tanggal_bayar!: Date
  @field('created_by') created_by!: string | null
  
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}

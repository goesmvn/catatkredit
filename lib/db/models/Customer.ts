import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators'

export class Customer extends Model {
  static table = 'customers'
  static associations = {
    transactions: { type: 'has_many', foreignKey: 'customer_id' },
    payments: { type: 'has_many', foreignKey: 'customer_id' },
  } as const
  
  @field('nama') nama!: string
  @field('alamat') alamat?: string
  @field('no_hp') no_hp?: string
  @field('ciri_ciri') ciri_ciri?: string
  @field('foto_url') foto_url?: string
  @field('status') status!: string
  @field('total_hutang') total_hutang!: number
  
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  @children('transactions') transactions!: any
  @children('payments') payments!: any
}

import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export class ItemTag extends Model {
  static table = 'item_tags'
  
  @field('nama_barang') nama_barang!: string
  @field('harga_default') harga_default!: number
  
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}

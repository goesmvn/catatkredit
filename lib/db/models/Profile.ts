import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Profile extends Model {
  static table = 'profiles'

  @field('username') username!: string
  @field('nama_lengkap') nama_lengkap!: string
  @field('role') role!: string
  @field('pin') pin!: string
  
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}

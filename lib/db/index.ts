import { Database } from '@nozbe/watermelondb'
import schema from './schema'
import { Customer } from './models/Customer'
import { Transaction } from './models/Transaction'
import { TransactionItem } from './models/TransactionItem'
import { Payment } from './models/Payment'
import { ItemTag } from './models/ItemTag'
import { Profile } from './models/Profile'

const isServer = typeof window === 'undefined'

let LokiJSAdapter: any;
if (!isServer) {
  LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default
}

const adapter = isServer ? null : new LokiJSAdapter({
  schema,
  useWebWorker: false, 
  useIncrementalIndexedDB: true,
  dbName: 'catatbon_db',
})

// Initialize Database only on client
export const database = isServer ? null as any : new Database({
  adapter: adapter as any,
  modelClasses: [
    Customer,
    Transaction,
    TransactionItem,
    Payment,
    ItemTag,
    Profile
  ],
})

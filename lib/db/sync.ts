import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from './index'

export async function syncDatabase() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      console.log('[Sync] Pulling changes since:', lastPulledAt)
      
      try {
        const response = await fetch(`/api/sync/pull?last_pulled_at=${lastPulledAt || 0}`)
        if (!response.ok) throw new Error('Pull failed')
        const data = await response.json()
        
        return { 
          changes: data.changes || {}, 
          timestamp: data.timestamp || Date.now() 
        }
      } catch (error) {
        console.error('[Sync] Error pulling changes:', error)
        return { changes: {}, timestamp: Date.now() }
      }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      console.log('[Sync] Pushing changes:', changes)
      
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, lastPulledAt })
      })
      
      if (!response.ok) {
        console.error('[Sync] Error pushing changes:', await response.text())
        throw new Error('Push failed')
      }
    },
    migrationsEnabledAtVersion: 1,
  })
}

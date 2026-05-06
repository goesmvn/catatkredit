'use client'

import { useEffect, useState } from 'react'
import { syncDatabase } from '@/lib/db/sync'
import { useAuth } from '@/lib/auth'

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Only set online status on client
    setIsOnline(navigator.onLine)

    const doSync = async () => {
      if (!navigator.onLine || !user) return
      
      try {
        setIsSyncing(true)
        await syncDatabase()
      } catch (err) {
        console.error('Auto sync failed:', err)
      } finally {
        setIsSyncing(false)
      }
    }

    const handleOnline = () => {
      setIsOnline(true)
      doSync() // Sync immediately when internet comes back
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial sync
    doSync()

    // Periodically sync every 5 minutes if online
    const intervalId = setInterval(doSync, 5 * 60 * 1000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalId)
    }
  }, [user]) // Re-run when user auth state changes

  return (
    <>
      {/* Show small indicator if syncing or offline */}
      {(!isOnline || isSyncing) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: isOnline ? 'var(--primary)' : 'var(--danger)',
          color: 'white',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 600,
          padding: '4px',
          animation: 'slideDown 0.3s ease'
        }}>
          {isOnline ? '⏳ Menyinkronkan data...' : '📶 Anda sedang offline. Perubahan akan disimpan di perangkat.'}
        </div>
      )}
      {children}
    </>
  )
}

'use client'

import { useAuth } from '@/lib/auth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isReady && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, isReady, pathname, router])

  if (!isReady) {
    return <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>Loading...</div>
  }

  // If not logged in and not on login page, render nothing while redirecting
  if (!user && pathname !== '/login') {
    return <div style={{ height: '100dvh', background: 'var(--bg)' }}></div>
  }

  // If logged in but trying to access login page, redirect to home
  if (user && pathname === '/login') {
    router.push('/')
    return <div style={{ height: '100dvh', background: 'var(--bg)' }}></div>
  }

  return <>{children}</>
}

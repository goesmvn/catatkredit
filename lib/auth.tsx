'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Role = 'ADMIN' | 'KASIR'

interface UserProfile {
  id: string
  username: string
  nama_lengkap: string
  role: Role
}

interface AuthContextType {
  user: UserProfile | null
  login: (username: string, pin: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  isReady: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ error: 'Not initialized' }),
  logout: async () => {},
  isReady: false
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Muat user dari localStorage jika ada
    const saved = localStorage.getItem('catatbon_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch (e) {
        // ignore
      }
    }
    setIsReady(true)
  }, [])

  const login = async (username: string, pin: string) => {
    // 1. Fallback Admin Default
    if (username === 'admin' && pin === '123456') {
      const u: UserProfile = {
        id: 'admin-local-id',
        username: 'admin',
        nama_lengkap: 'Admin Utama',
        role: 'ADMIN'
      }
      setUser(u)
      localStorage.setItem('catatbon_user', JSON.stringify(u))
      return {}
    }
    
    // 2. Cek WatermelonDB Lokal (Profiles akan tersinkronisasi)
    try {
      const { database } = await import('@/lib/db')
      const q = await database.collections.get('profiles').query().fetch()
      const found = q.find((p: any) => p.username === username.toLowerCase() && p.pin === pin)
      if (found) {
        const u: UserProfile = {
          id: found.id,
          username: (found as any).username,
          nama_lengkap: (found as any).nama_lengkap,
          role: (found as any).role as Role
        }
        setUser(u)
        localStorage.setItem('catatbon_user', JSON.stringify(u))
        return {}
      }
    } catch (err) {
      console.error('Local auth check failed', err)
    }
    
    return { error: 'Username atau PIN salah.' }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('catatbon_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

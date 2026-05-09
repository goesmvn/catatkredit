'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Role = 'SUPERADMIN' | 'ADMIN' | 'KASIR'

interface UserProfile {
  id: string
  username: string
  nama_lengkap: string
  role: Role
}

interface AuthContextType {
  user: UserProfile | null
  login: (username: string, pin: string, rememberDevice?: boolean) => Promise<{ error?: string }>
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
    const remember = localStorage.getItem('catatbon_remember') === 'true'
    if (remember) {
      const saved = localStorage.getItem('catatbon_user')
      if (saved) {
        try {
          setUser(JSON.parse(saved))
        } catch (e) {
          // ignore
        }
      }
    }
    setIsReady(true)
  }, [])

  const login = async (username: string, pin: string, rememberDevice = false) => {
    const lowerUsername = username.toLowerCase();
    const saveLogin = (u: UserProfile) => {
      setUser(u)
      if (rememberDevice) {
        localStorage.setItem('catatbon_user', JSON.stringify(u))
        localStorage.setItem('catatbon_remember', 'true')
      } else {
        localStorage.removeItem('catatbon_user')
        localStorage.removeItem('catatbon_remember')
      }
    }

    // 1. Fallback Admin Default
    if (lowerUsername === 'admin' && pin === '123456') {
      const u: UserProfile = {
        id: 'admin-local-id',
        username: 'admin',
        nama_lengkap: 'Admin Utama',
        role: 'ADMIN'
      }
      saveLogin(u)
      return {}
    }

    if (lowerUsername === 'superadmin' && pin === '888888') {
      const u: UserProfile = {
        id: 'super-admin-id',
        username: 'superadmin',
        nama_lengkap: 'Super Administrator',
        role: 'SUPERADMIN'
      }
      saveLogin(u)
      return {}
    }
    
    // 2. Cek via API server (SQLite)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.toLowerCase(), pin })
      })
      if (res.ok) {
        const found = await res.json()
        const u: UserProfile = {
          id: found.id,
          username: found.username,
          nama_lengkap: found.nama_lengkap,
          role: found.role as Role
        }
        saveLogin(u)
        return {}
      }
    } catch (err) {
      console.error('API auth check failed', err)
    }
    
    return { error: 'Username atau PIN salah.' }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('catatbon_user')
    localStorage.removeItem('catatbon_remember')
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

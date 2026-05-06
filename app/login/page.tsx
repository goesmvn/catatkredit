'use client'

import { useAuth } from '@/lib/auth'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !pin) {
      setError('Username dan PIN harus diisi')
      return
    }
    
    setLoading(true)
    setError('')
    
    const { error: loginError } = await login(username, pin)
    
    setLoading(false)
    if (loginError) {
      setError(loginError)
    } else {
      router.push('/')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '40px 20px',
        color: 'white',
        textAlign: 'center',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📝</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>CatatKredit</h1>
        <p style={{ fontSize: '16px', opacity: 0.85, marginTop: '4px' }}>
          Silakan masuk untuk melanjutkan
        </p>
      </div>

      <div style={{ padding: '32px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '10px' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Contoh: kasir1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">PIN</label>
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-input" 
              placeholder="Masukkan PIN Anda"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-xl btn-full"
            style={{ marginTop: '16px' }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}

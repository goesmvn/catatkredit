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
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f6f8fb 0%, #e5ebf4 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--white)',
        borderRadius: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)',
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          width: '80px', height: '80px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          borderRadius: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '40px',
          marginBottom: '24px',
          boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
        }}>
          📝
        </div>
        
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          CatatKredit
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-sub)', textAlign: 'center', marginBottom: '40px' }}>
          Masuk untuk mengelola catatan kredit & transaksi toko Anda.
        </p>

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {error && (
            <div style={{ 
              background: 'var(--danger-light)', color: 'var(--danger)', 
              padding: '12px 16px', borderRadius: '12px', fontSize: '14px', 
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '8px'
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>Username</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Masukkan username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="username"
              style={{ padding: '16px', fontSize: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid transparent', transition: 'all 0.2s' }}
              onFocus={(e) => { e.target.style.border = '1px solid var(--primary)'; e.target.style.background = 'var(--white)' }}
              onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = '#f8fafc' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>PIN Keamanan</label>
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-input" 
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
              style={{ padding: '16px', fontSize: '20px', letterSpacing: '2px', borderRadius: '16px', background: '#f8fafc', border: '1px solid transparent', transition: 'all 0.2s' }}
              onFocus={(e) => { e.target.style.border = '1px solid var(--primary)'; e.target.style.background = 'var(--white)' }}
              onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = '#f8fafc' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-xl btn-full"
            style={{ 
              marginTop: '16px', 
              borderRadius: '16px', 
              padding: '18px', 
              fontSize: '16px', 
              fontWeight: 800,
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? 'Memproses...' : 'Masuk ke Dasbor'}
          </button>
        </form>
      </div>
    </div>
  )
}

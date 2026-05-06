'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'Beranda', icon: '🏠', roles: ['ADMIN', 'KASIR'] },
  { href: '/pelanggan', label: 'Pelanggan', icon: '👥', roles: ['ADMIN', 'KASIR'] },
  { href: '/bon-baru', label: 'Kredit Baru', icon: '📝', roles: ['ADMIN', 'KASIR'] },
  { href: '/barang', label: 'Barang', icon: '📦', roles: ['ADMIN', 'KASIR'] },
  { href: '/laporan', label: 'Laporan', icon: '📊', roles: ['ADMIN'] },
  { href: '/pengaturan', label: 'Pengaturan', icon: '⚙️', roles: ['ADMIN'] },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsTablet(window.innerWidth >= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!user) return null

  const allowedNavs = navItems.filter(item => item.roles.includes(user.role))

  return (
    <nav style={{
      position: 'fixed',
      bottom: isTablet ? 'auto' : 0,
      left: isTablet ? 0 : '50%',
      top: isTablet ? 0 : 'auto',
      transform: isTablet ? 'none' : 'translateX(-50%)',
      width: isTablet ? '100px' : '100%',
      height: isTablet ? '100dvh' : 'var(--nav-h)',
      maxWidth: isTablet ? '100px' : '480px',
      background: 'var(--surface)',
      borderTop: isTablet ? 'none' : '1.5px solid var(--border)',
      borderRight: isTablet ? '1.5px solid var(--border)' : 'none',
      display: 'flex',
      flexDirection: isTablet ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: isTablet ? 'flex-start' : 'space-around',
      padding: isTablet ? '32px 0' : '0',
      gap: isTablet ? '24px' : '0',
      zIndex: 50,
      boxShadow: isTablet ? '4px 0 16px rgba(0,0,0,0.05)' : '0 -4px 16px rgba(0,0,0,0.08)',
    }}>
      {allowedNavs.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: isTablet ? '12px' : '8px 20px',
              width: isTablet ? '80px' : 'auto',
              textDecoration: 'none',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: active ? '700' : '500',
              fontSize: '13px',
              transition: 'all 0.15s ease',
              borderRadius: 'var(--radius-md)',
              background: active ? 'var(--primary-light)' : 'transparent',
            }}
          >
            <span style={{ fontSize: '24px', lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}

      <div style={{ marginTop: isTablet ? 'auto' : '0', marginBottom: isTablet ? '16px' : '0' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--danger)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: '24px' }}>🚪</span>
          <span>Keluar</span>
        </button>
      </div>
    </nav>
  )
}

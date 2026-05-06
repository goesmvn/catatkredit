'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'Beranda', icon: '🏠', roles: ['ADMIN', 'KASIR'] },
  { href: '/pelanggan', label: 'Pelanggan', icon: '👥', roles: ['ADMIN', 'KASIR'] },
  { href: '/bon-baru', label: 'Kredit', icon: '📝', roles: ['ADMIN', 'KASIR'] },
  { href: '/barang', label: 'Barang', icon: '📦', roles: ['ADMIN', 'KASIR'] },
  { href: '/laporan', label: 'Laporan', icon: '📊', roles: ['ADMIN'] },
  { href: '/pengaturan', label: 'Setelan', icon: '⚙️', roles: ['ADMIN'] },
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

  // ── Sidebar (tablet/desktop) ──────────────────────────────────────────────
  if (isTablet) {
    return (
      <nav style={{
        position: 'fixed', top: 0, left: 0,
        width: '100px', height: '100dvh',
        background: 'var(--surface)',
        borderRight: '1.5px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '32px 0', gap: '8px', zIndex: 50,
        boxShadow: '4px 0 16px rgba(0,0,0,0.05)',
      }}>
        {allowedNavs.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '12px', width: '80px', textDecoration: 'none',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: active ? '700' : '500', fontSize: '12px',
              borderRadius: 'var(--radius-md)',
              background: active ? 'var(--primary-light)' : 'transparent',
            }}>
              <span style={{ fontSize: '24px', lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
        <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
          <button onClick={logout} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            padding: '8px', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--danger)', fontSize: '12px', fontWeight: 600,
          }}>
            <span style={{ fontSize: '24px' }}>🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </nav>
    )
  }

  // ── Bottom bar (mobile) ───────────────────────────────────────────────────
  // Pakai flex:1 tiap item agar selalu muat tanpa overflow
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px',
      height: 'var(--nav-h)',
      background: 'var(--surface)',
      borderTop: '1.5px solid var(--border)',
      display: 'flex', flexDirection: 'row',
      alignItems: 'stretch',
      zIndex: 50,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
    }}>
      {allowedNavs.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link key={item.href} href={item.href} style={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '3px', padding: '6px 2px',
            textDecoration: 'none',
            color: active ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: active ? '700' : '500',
            fontSize: '10px',
            background: active ? 'var(--primary-light)' : 'transparent',
            borderTop: active ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            transition: 'all 0.15s ease',
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', width: '100%', textAlign: 'center',
            }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

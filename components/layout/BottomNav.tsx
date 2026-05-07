'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠', roles: ['SUPERADMIN', 'ADMIN', 'KASIR'] },
  { href: '/pelanggan', label: 'Pelanggan', icon: '👥', roles: ['SUPERADMIN', 'ADMIN', 'KASIR'] },
  { href: '/bon-baru', label: 'Catat Kredit', icon: '📝', roles: ['SUPERADMIN', 'ADMIN', 'KASIR'] },
  { href: '/pembayaran', label: 'Bayar Kredit', icon: '💰', roles: ['SUPERADMIN', 'ADMIN', 'KASIR'] },
  { href: '/barang', label: 'Barang', icon: '📦', roles: ['SUPERADMIN', 'ADMIN', 'KASIR'] },
  { href: '/laporan', label: 'Laporan', icon: '📊', roles: ['SUPERADMIN', 'ADMIN'] },
  { href: '/pengaturan', label: 'Setelan', icon: '⚙️', roles: ['SUPERADMIN', 'ADMIN'] },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isTablet, setIsTablet] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      // Sidebar hanya tampil jika lebar cukup DAN tinggi cukup
      // Landscape HP (tinggi < 500px) tetap pakai bottom bar
      setIsTablet(window.innerWidth >= 768 && window.innerHeight >= 500)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!user) return null

  const allowedNavs = navItems.filter(item => item.roles.includes(user.role))

  // ── Sidebar (tablet/desktop) ──────────────────────────────────────────────
  if (isTablet) {
    return (
      <>
        <nav style={{
        position: 'fixed', top: 0, left: 0,
      width: '100px', height: '100dvh',
      background: 'var(--surface)',
      borderRight: '1.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '16px 0',
      gap: '4px',
      zIndex: 50,
      boxShadow: '4px 0 16px rgba(0,0,0,0.05)',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {allowedNavs.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '10px 8px', width: '84px', textDecoration: 'none',
            color: active ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: active ? '700' : '500', fontSize: '11px',
            borderRadius: 'var(--radius-md)',
            background: active ? 'var(--primary-light)' : 'transparent',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{item.icon}</span>
            <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
          </Link>
        )
      })}
      <div style={{ marginTop: 'auto', paddingTop: '8px', paddingBottom: '8px', flexShrink: 0 }}>
        <button onClick={() => setShowLogoutModal(true)} style={{
          width: '100%', padding: '12px', background: 'var(--danger-light)', border: 'none',
          borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          justifyContent: 'center', transition: 'all 0.2s', fontSize: '14px'
        }}>
          <span style={{ fontSize: '18px' }}>🚪</span> Keluar
        </button>
      </div>
    </nav>
      {/* MODAL KONFIRMASI LOGOUT (DESKTOP) */}
      {showLogoutModal && (
        <div className="overlay" style={{ zIndex: 100 }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Yakin ingin keluar?
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-sub)' }}>
                Anda harus login kembali untuk masuk ke aplikasi.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="btn btn-ghost btn-lg" 
                style={{ flex: 1, borderRadius: '100px', fontWeight: 700 }}
              >
                Batal
              </button>
              <button 
                onClick={() => { setShowLogoutModal(false); logout(); }} 
                className="btn btn-outline btn-lg" 
                style={{ flex: 1, borderRadius: '100px', fontWeight: 800, borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
  }

  // ── Bottom bar (mobile) ───────────────────────────────────────────────────
  // Pakai flex:1 tiap item agar selalu muat tanpa overflow
  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: '100%',
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
            gap: '1px', padding: '4px 2px',
            textDecoration: 'none',
            color: active ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: active ? '700' : '500',
            fontSize: '10px',
            background: active ? 'var(--primary-light)' : 'transparent',
            borderTop: active ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            transition: 'all 0.15s ease',
          }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', width: '100%', textAlign: 'center',
            }}>{item.label}</span>
          </Link>
        )
      })}
      
      {/* Tombol Logout khusus untuk non-ADMIN & non-SUPERADMIN di mobile */}
      {(user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') && (
        <button onClick={() => setShowLogoutModal(true)} style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '1px', padding: '4px 2px',
          background: 'transparent', border: 'none', borderTop: '2.5px solid transparent',
          cursor: 'pointer', color: 'var(--danger)',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>🚪</span>
          <span style={{
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            width: '100%', textAlign: 'center', fontSize: '10px', fontWeight: '600'
          }}>Keluar</span>
        </button>
      )}
    </nav>
      {/* MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div className="overlay" style={{ zIndex: 100 }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Yakin ingin keluar?
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-sub)' }}>
                Anda harus login kembali untuk masuk ke aplikasi.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="btn btn-ghost btn-lg" 
                style={{ flex: 1, borderRadius: '100px', fontWeight: 700 }}
              >
                Batal
              </button>
              <button 
                onClick={() => { setShowLogoutModal(false); logout(); }} 
                className="btn btn-outline btn-lg" 
                style={{ flex: 1, borderRadius: '100px', fontWeight: 800, borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { getSettings, updateSettings, AppSettings } from '@/lib/mockData'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function PengaturanPage() {
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(getSettings())
  const [showToast, setShowToast] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: name === 'batas_menunggak_hari' ? parseInt(value) || 0 : value
    }))
  }

  const handleSave = () => {
    updateSettings(settings)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="container pb-nav">
      <div className="header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Pengaturan ⚙️</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '15px', marginTop: '4px' }}>
          Atur informasi toko dan sinkronisasi cloud.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          👤 Akun
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px' }}>{user?.nama_lengkap}</p>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px' }}>Role: {user?.role}</p>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="btn btn-outline btn-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            Keluar
          </button>
        </div>
        
        {user?.role === 'ADMIN' && (
          <Link href="/pengaturan/users" className="btn btn-outline btn-lg btn-full" style={{ marginTop: '8px' }}>
            👥 Manajemen Kasir & Pengguna
          </Link>
        )}
      </div>



      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          🏪 Profil Toko
        </h2>
        <div className="form-group">
          <label className="form-label">Nama Toko</label>
          <input 
            type="text" 
            name="nama_toko"
            className="form-input" 
            value={settings.nama_toko}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Alamat Toko</label>
          <input 
            type="text" 
            name="alamat_toko"
            className="form-input" 
            value={settings.alamat_toko}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">No. Telepon Toko</label>
          <input 
            type="text" 
            name="no_telepon"
            className="form-input" 
            value={settings.no_telepon}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Pesan Catatan Kaki (Struk)</label>
          <textarea 
            name="teks_struk"
            className="form-textarea" 
            value={settings.teks_struk}
            onChange={handleChange}
          />
        </div>

        <hr className="divider" />

        <div className="form-group">
          <label className="form-label">Batas Hari Menunggak</label>
          <p className="form-hint">
            Pelanggan akan ditandai "Menunggak" jika belum membayar lewat dari jumlah hari ini.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="number" 
              name="batas_menunggak_hari"
              className="form-input" 
              style={{ width: '100px' }}
              value={settings.batas_menunggak_hari}
              onChange={handleChange}
            />
            <span style={{ fontWeight: 600 }}>Hari</span>
          </div>
        </div>

        <button onClick={handleSave} className="btn btn-primary btn-xl btn-full" style={{ marginTop: '12px' }}>
          💾 Simpan Pengaturan
        </button>
      </div>

      {showToast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--success)', 
          color: 'white', padding: '12px 24px',
          borderRadius: '100px', fontWeight: 600, fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
          animation: 'slideUp 0.3s ease'
        }}>
          ✅ Pengaturan berhasil disimpan!
        </div>
      )}
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
    </div>
  )
}

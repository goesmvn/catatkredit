'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PelangganBaruPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    nama: '', alamat: '', no_hp: '', ciri_ciri: '',
  })

  const handleSave = async () => {
    if (!form.nama.trim()) {
      alert('Nama pelanggan wajib diisi!')
      return
    }

    setSubmitting(true)
    try {
      const id = crypto.randomUUID()
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          nama: form.nama.trim(),
          alamat: form.alamat.trim(),
          no_hp: form.no_hp.trim(),
          ciri_ciri: form.ciri_ciri.trim(),
        })
      })

      if (!res.ok) throw new Error('Gagal menyimpan')
      setSaved(true)
      setTimeout(() => router.push('/pelanggan'), 1500)
    } catch (error) {
      console.error(error)
      alert('Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '20px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <button onClick={() => router.back()} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'white', color: 'var(--primary-dark)',
            padding: '8px 16px', borderRadius: '50px',
            border: 'none', cursor: 'pointer',
            fontSize: '16px', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <span style={{ fontSize: '20px' }}>←</span> Kembali
          </button>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>➕ Tambah Pelanggan Baru</h1>
      </div>

      {saved && (
        <div className="toast-container">
          <div className="toast toast-success">✅ Pelanggan berhasil disimpan!</div>
        </div>
      )}

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'var(--primary-light)', border: '3px dashed var(--primary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '4px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '32px' }}>📷</span>
            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>Foto</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">👤 Nama Pelanggan *</label>
          <input
            className="form-input"
            placeholder="Contoh: Ibu Sari Dewi"
            value={form.nama}
            onChange={e => setForm({ ...form, nama: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">🏠 Alamat</label>
          <input
            className="form-input"
            placeholder="Contoh: Jl. Mawar No. 12"
            value={form.alamat}
            onChange={e => setForm({ ...form, alamat: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">📱 No. HP</label>
          <input
            className="form-input"
            type="tel"
            placeholder="Contoh: 0812-3456-789"
            value={form.no_hp}
            onChange={e => setForm({ ...form, no_hp: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">📝 Ciri-ciri / Catatan</label>
          <textarea
            className="form-textarea"
            placeholder="Contoh: Ibu berkacamata tebal, sering pakai baju batik..."
            value={form.ciri_ciri}
            onChange={e => setForm({ ...form, ciri_ciri: e.target.value })}
            rows={4}
          />
          <p className="form-hint">Catatan ini membantu mengidentifikasi pelanggan dengan mudah</p>
        </div>

        <button onClick={handleSave} disabled={submitting} className="btn btn-success btn-xl btn-full">
          {submitting ? 'Menyimpan...' : '💾 Simpan Pelanggan'}
        </button>
      </div>
    </div>
  )
}

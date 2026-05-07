'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function UserManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ username: '', nama_lengkap: '', pin: '', role: 'KASIR' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') { router.push('/'); return }
    fetchUsers()
  }, [user, router])

  const fetchUsers = async () => {
    try {
      const data = await fetch('/api/profiles').then(r => r.json())
      setUsers(data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.nama_lengkap || !form.pin) return
    setSubmitting(true)
    try {
      if (editingId) {
        await fetch(`/api/profiles/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
      } else {
        const id = crypto.randomUUID()
        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...form })
        })
      }
      setShowModal(false)
      setForm({ username: '', nama_lengkap: '', pin: '', role: 'KASIR' })
      setEditingId(null)
      fetchUsers()
      alert(editingId ? 'Pengguna berhasil diperbarui!' : 'Berhasil menambahkan pengguna baru!')
    } catch (err: any) {
      alert(`Gagal: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (u: any) => {
    if (u.username === 'admin' || u.username === 'superadmin') { alert('Akun utama tidak dapat dihapus!'); return }
    if (confirm(`Apakah Anda yakin ingin menghapus pengguna ${u.nama_lengkap}?`)) {
      await fetch(`/api/profiles/${u.id}`, { method: 'DELETE' })
      fetchUsers()
      alert('Pengguna berhasil dihapus.')
    }
  }

  const openEditModal = (u: any) => {
    if (u.username === 'admin' || u.username === 'superadmin') { alert('Akun utama tidak dapat diedit!'); return }
    if (u.role === 'SUPERADMIN' && user?.role !== 'SUPERADMIN') { alert('Hanya Superadmin yang dapat mengedit akun ini!'); return }
    setForm({ username: u.username, nama_lengkap: u.nama_lengkap, pin: u.pin, role: u.role })
    setEditingId(u.id)
    setShowModal(true)
  }

  return (
    <div className="container pb-nav">
      <div className="header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', padding: '16px 20px', margin: '-16px -20px 16px -20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>←</button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>👥 Manajemen Pengguna</h1>
            <p style={{ color: 'var(--text-sub)', fontSize: '15px', marginTop: '4px' }}>Kelola akses kasir & admin.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Memuat data pengguna...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map(u => (
            <div key={u.id} className="card list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="list-item__avatar" style={{ 
                  background: u.role === 'SUPERADMIN' ? 'var(--danger-light)' : u.role === 'ADMIN' ? 'var(--warning-light)' : 'var(--primary-light)', 
                  color: u.role === 'SUPERADMIN' ? 'var(--danger)' : u.role === 'ADMIN' ? 'var(--warning)' : 'var(--primary)' 
                }}>
                  {u.role === 'SUPERADMIN' ? '🛡️' : u.role === 'ADMIN' ? '👑' : '👨‍💼'}
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 700 }}>{u.nama_lengkap}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '2px' }}>
                    @{u.username} • <span style={{ 
                      fontWeight: 600, 
                      color: u.role === 'SUPERADMIN' ? 'var(--danger)' : u.role === 'ADMIN' ? 'var(--warning)' : 'var(--primary)' 
                    }}>{u.role}</span>
                  </p>
                </div>
              </div>
              {(u.username !== 'admin' && u.username !== 'superadmin') && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Sembunyikan tombol edit/hapus untuk superadmin jika kita bukan superadmin */}
                  {!(u.role === 'SUPERADMIN' && user?.role !== 'SUPERADMIN') && (
                    <>
                      <button onClick={() => openEditModal(u)} className="btn btn-ghost" style={{ padding: '8px', minHeight: 'auto' }}>✏️</button>
                      <button onClick={() => handleDelete(u)} className="btn btn-ghost" style={{ padding: '8px', minHeight: 'auto', color: 'var(--danger)' }}>🗑️</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => { setEditingId(null); setForm({ username: '', nama_lengkap: '', pin: '', role: 'KASIR' }); setShowModal(true) }}
        style={{ bottom: 'calc(var(--nav-h) + 20px)' }}>+</button>

      {/* Modal */}
      {showModal && (
        <div className="overlay">
          <div className="modal-sheet">
            <div className="modal-handle"></div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>
              {editingId ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </h2>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input type="text" required className="form-input" placeholder="Contoh: Budi Kasir"
                  value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" required className="form-input" placeholder="Contoh: budi" autoCapitalize="none"
                  value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
              </div>
              <div className="form-group">
                <label className="form-label">PIN Akses (Min. 6 digit)</label>
                <input type="password" required pattern="[0-9]*" inputMode="numeric" className="form-input" placeholder="Masukkan angka PIN"
                  value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Role Akses</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="KASIR">Kasir (Hanya Input)</option>
                  <option value="ADMIN">Admin (Akses Penuh)</option>
                  {user?.role === 'SUPERADMIN' && (
                    <option value="SUPERADMIN">Superadmin (Maintenance)</option>
                  )}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <button type="submit" disabled={submitting} className="btn btn-xl btn-primary btn-full">
                  {submitting ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost btn-xl btn-full">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

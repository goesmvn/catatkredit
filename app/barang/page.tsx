'use client'

import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/mockData'

export default function BarangPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [editingItem, setEditingItem] = useState<any>(null)

  const fetchItems = async () => {
    try {
      const data = await fetch('/api/items').then(r => r.json())
      setItems(data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchItems() }, [])

  const handleSave = async () => {
    if (!newItemName || !newItemPrice) return
    const price = parseInt(newItemPrice.replace(/\D/g, '') || '0')

    if (editingItem) {
      await fetch(`/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_barang: newItemName, harga_default: price })
      })
    } else {
      const id = crypto.randomUUID()
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nama_barang: newItemName, harga_default: price })
      })
    }

    setShowModal(false)
    setEditingItem(null)
    setNewItemName('')
    setNewItemPrice('')
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus barang ini?')) {
      await fetch(`/api/items/${id}`, { method: 'DELETE' })
      fetchItems()
    }
  }

  const filteredItems = items.filter(i =>
    i.nama_barang.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header statis — tidak pakai sticky + negative margin agar tidak ada layout shift di mobile */}
      <div style={{
        flexShrink: 0,
        background: 'var(--bg)',
        padding: '16px 20px 12px',
        borderBottom: '1px solid var(--border)',
        zIndex: 10,
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '2px' }}>Master Barang 📦</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginBottom: '12px' }}>
          Atur katalog harga barang toko Anda.
        </p>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '18px', color: 'var(--text-muted)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Cari nama barang..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 44px',
              fontSize: '16px',
              borderRadius: '14px',
              border: '1.5px solid var(--border)',
              background: 'var(--white)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        paddingBottom: 'calc(var(--nav-h) + 80px)',
        WebkitOverflowScrolling: 'touch' as any,
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Memuat data barang...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredItems.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📦</p>
                <p style={{ fontWeight: 600, fontSize: '18px' }}>Barang tidak ditemukan</p>
                <p style={{ color: 'var(--text-sub)', marginTop: '8px' }}>
                  Coba kata kunci lain atau tambah barang baru.
                </p>
              </div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.id}
                  className="card list-item"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700 }}>{item.nama_barang}</p>
                    <p style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                      {formatRupiah(item.harga_default)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setEditingItem(item)
                      setNewItemName(item.nama_barang)
                      setNewItemPrice(String(item.harga_default))
                      setShowModal(true)
                    }}
                    className="btn"
                    style={{
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      padding: '8px', fontSize: '18px',
                      width: '40px', height: '40px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="btn"
                    style={{
                      background: 'var(--danger-light)', color: 'var(--danger)',
                      padding: '8px', fontSize: '18px',
                      width: '40px', height: '40px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    🗑️
                  </button>
                </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className="fab"
        onClick={() => {
          setEditingItem(null)
          setNewItemName('')
          setNewItemPrice('')
          setShowModal(true)
        }}
        style={{ bottom: 'calc(var(--nav-h) + 20px)' }}
      >
        +
      </button>

      {/* Modal Tambah Barang */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: '24px',
            width: '100%', maxWidth: '400px', padding: '24px',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
              {editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="section-label">Nama Barang</label>
                <input
                  type="text" className="form-input" placeholder="Contoh: Beras 5kg"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div>
                <label className="section-label">Harga Default</label>
                <input
                  type="text" inputMode="numeric" className="form-input" placeholder="Contoh: 75.000"
                  value={newItemPrice
                    ? new Intl.NumberFormat('id-ID').format(parseInt(newItemPrice.replace(/\D/g, ''), 10) || 0)
                    : ''}
                  onChange={(e) => setNewItemPrice(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <button onClick={handleSave} className="btn btn-xl btn-primary btn-full">
                {editingItem ? 'Perbarui Barang' : 'Simpan Barang'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-xl btn-full">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

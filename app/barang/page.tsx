'use client'

import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/mockData'
import { useRouter } from 'next/navigation'
import { database } from '@/lib/db'
import { ItemTag } from '@/lib/db/models/ItemTag'

export default function BarangPage() {
  const router = useRouter()
  const [items, setItems] = useState<ItemTag[]>([])
  
  useEffect(() => {
    const itemsSub = database.collections.get('item_tags').query().observe().subscribe((data: ItemTag[]) => setItems(data))
    return () => itemsSub.unsubscribe()
  }, [])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')

  const handleSave = async () => {
    if (!newItemName || !newItemPrice) return
    const price = parseInt(newItemPrice.replace(/\D/g, '') || '0')
    
    await database.write(async () => {
      await database.collections.get('item_tags').create((item: any) => {
        item.nama_barang = newItemName
        item.harga_default = price
      })
    })

    setShowModal(false)
    setNewItemName('')
    setNewItemPrice('')
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus barang ini?')) {
      const itemToDelete = await database.collections.get('item_tags').find(id)
      await database.write(async () => {
        await itemToDelete.markAsDeleted()
      })
    }
  }

  const filteredItems = items.filter(i => 
    i.nama_barang.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container pb-nav">
      <div className="header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', padding: '16px 20px', margin: '-16px -20px 16px -20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Master Barang 📦</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '15px', marginTop: '4px' }}>Atur katalog harga barang toko Anda.</p>
        <div style={{ marginTop: '16px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Cari nama barang..." 
            className="form-input" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '16px 16px 16px 48px', 
              fontSize: '16px', 
              borderRadius: '16px', 
              border: '2px solid var(--border)', 
              background: 'var(--white)', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📦</p>
            <p style={{ fontWeight: 600, fontSize: '18px' }}>Barang tidak ditemukan</p>
            <p style={{ color: 'var(--text-sub)', marginTop: '8px' }}>Coba kata kunci lain atau tambah barang baru.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="card list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700 }}>{item.nama_barang}</p>
                <p style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                  {formatRupiah(item.harga_default)}
                </p>
              </div>
              <button 
                onClick={() => handleDelete(item.id)}
                className="btn" 
                style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px', fontSize: '18px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        className="fab" 
        onClick={() => setShowModal(true)}
        style={{ bottom: 'calc(var(--nav-h) + 20px)' }}
      >
        +
      </button>

      {/* Modal Tambah Barang */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: '24px', width: '100%', maxWidth: '400px',
            padding: '24px', boxShadow: 'var(--shadow-xl)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Tambah Barang Baru</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="section-label">Nama Barang</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Contoh: Beras 5kg"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div>
                <label className="section-label">Harga Default</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  className="form-input" 
                  placeholder="Contoh: 75.000"
                  value={newItemPrice ? new Intl.NumberFormat('id-ID').format(parseInt(newItemPrice.toString().replace(/\D/g, ''), 10) || 0) : ''}
                  onChange={(e) => setNewItemPrice(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <button onClick={handleSave} className="btn btn-xl btn-primary btn-full">
                Simpan Barang
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-xl btn-full">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

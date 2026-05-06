'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatRupiah } from '@/lib/mockData'
import { database } from '@/lib/db'
import { Customer } from '@/lib/db/models/Customer'
import { ItemTag } from '@/lib/db/models/ItemTag'
import { useAuth } from '@/lib/auth'

interface CartItem {
  id: string;
  nama_barang: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
}

function BonBaruForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectId  = searchParams.get('pelanggan')
  const { user } = useAuth()

  const [dbCustomers, setDbCustomers] = useState<Customer[]>([])
  const [dbItems, setDbItems] = useState<ItemTag[]>([])

  useEffect(() => {
    const customersSub = database.collections.get('customers').query().observe().subscribe((data: Customer[]) => setDbCustomers(data))
    const itemsSub = database.collections.get('item_tags').query().observe().subscribe((data: ItemTag[]) => setDbItems(data))
    return () => {
      customersSub.unsubscribe()
      itemsSub.unsubscribe()
    }
  }, [])

  const [selectedCustomerId, setSelectedCustomerId] = useState(preSelectId || '')
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  
  // Keranjang Belanja (POS Cart)
  const [cart, setCart] = useState<CartItem[]>([])
  
  // Pencarian Barang
  const [itemSearch, setItemSearch] = useState('')
  const [showItemSuggestions, setShowItemSuggestions] = useState(false)
  
  const [saved, setSaved] = useState(false)

  // Tambah Pelanggan Baru Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    nama: '',
    alamat: '',
    no_hp: '',
    ciri_ciri: ''
  })

  const selectedCustomer = dbCustomers.find(c => c.id === selectedCustomerId)
  const filteredCustomers = dbCustomers.filter(c =>
    c.nama.toLowerCase().includes(search.toLowerCase()) && c.id !== selectedCustomerId
  )
  
  const filteredItems = dbItems.filter(i => 
    i.nama_barang.toLowerCase().includes(itemSearch.toLowerCase())
  )

  const addItemToCart = (item: { id: string, nama: string, harga_default: number }) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id)
      if (existing) {
        return prev.map(p => 
          p.id === item.id 
            ? { ...p, qty: p.qty + 1, subtotal: (p.qty + 1) * p.harga_satuan }
            : p
        )
      } else {
        return [...prev, {
          id: item.id,
          nama_barang: item.nama,
          qty: 1,
          harga_satuan: item.harga_default,
          subtotal: item.harga_default
        }]
      }
    })
    setItemSearch('')
    setShowItemSuggestions(false)
  }

  const handleAddNewItem = async (name: string) => {
    if (!name.trim()) return
    await database.write(async () => {
      const newItem = await database.collections.get('item_tags').create((i: any) => {
        i.nama_barang = name.trim()
        i.harga_default = 0
      })
      addItemToCart({ id: newItem.id, nama: (newItem as any).nama_barang, harga_default: 0 })
    })
  }

  const handleAddNewCustomer = (name: string) => {
    if (!name.trim()) return
    setNewCustomerForm({
      nama: name.trim(),
      alamat: '',
      no_hp: '',
      ciri_ciri: ''
    })
    setShowDropdown(false)
    setShowNewCustomerModal(true)
  }

  const handleSaveNewCustomer = async () => {
    if (!newCustomerForm.nama.trim()) return
    await database.write(async () => {
      const newCustomer = await database.collections.get('customers').create((c: any) => {
        c.nama = newCustomerForm.nama.trim()
        c.alamat = newCustomerForm.alamat.trim()
        c.no_hp = newCustomerForm.no_hp.trim()
        c.ciri_ciri = newCustomerForm.ciri_ciri.trim()
        c.status = 'LANCAR'
        c.total_hutang = 0
      })
      setSelectedCustomerId(newCustomer.id)
    })
    setShowNewCustomerModal(false)
    setSearch('')
  }

  const handleUpdateCart = (id: string, field: 'qty' | 'harga_satuan', value: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newValue = Math.max(0, value)
        const newQty = field === 'qty' ? newValue : item.qty
        const newHarga = field === 'harga_satuan' ? newValue : item.harga_satuan
        return {
          ...item,
          [field]: newValue,
          subtotal: newQty * newHarga
        }
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0)

  const handleSave = async () => {
    if (!selectedCustomerId) { alert('Pilih pelanggan terlebih dahulu!'); return }
    if (cart.length === 0) { alert('Keranjang belanja kosong!'); return }
    if (grandTotal === 0) { alert('Total kredit tidak boleh 0!'); return }
    if (selectedCustomer?.status === 'BLACKLIST') {
      alert('Pelanggan ini di-BLACKLIST! Tidak bisa membuat kredit baru.')
      return
    }
    
    try {
      await database.write(async () => {
        // 1. Buat Transaksi
        const tx = await database.collections.get('transactions').create((t: any) => {
          t.customer.set(selectedCustomer)
          t.total_harga = grandTotal
          t.tanggal = new Date()
          t.status = 'BELUM LUNAS'
          t.created_by = user?.id || null
        })
        
        // 2. Buat Transaction Items
        for (const item of cart) {
          await database.collections.get('transaction_items').create((ti: any) => {
            ti.transaction.set(tx)
            ti.nama_barang = item.nama_barang
            ti.qty = item.qty
            ti.harga_satuan = item.harga_satuan
            ti.subtotal = item.subtotal
            ti.item_tag_name = item.nama_barang
          })
        }
        
        // 3. Update Hutang Pelanggan
        await selectedCustomer!.update((c: any) => {
          c.total_hutang += grandTotal
          // Status tetap LANCAR saat baru ngutang. Akan dihitung MENUNGGAK jika lewat batas hari.
        })
      })

      setSaved(true)
      setTimeout(() => router.push('/'), 1800)
    } catch (error) {
      console.error(error)
      alert('Terjadi kesalahan saat menyimpan kredit')
    }
  }

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* HEADER */}
      <div className="page-header" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button onClick={() => router.back()} style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.2)', color: 'white', 
          padding: '8px 16px', borderRadius: '50px', 
          border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
          fontSize: '14px', fontWeight: 600, alignSelf: 'flex-start',
          backdropFilter: 'blur(10px)', transition: 'background 0.2s ease'
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span> Kembali
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span> Kasir Kredit Baru
          </h1>
          <p style={{ fontSize: '15px', opacity: 0.9 }}>Pencatatan otomatis dengan kalkulasi harga</p>
        </div>
      </div>

      {saved && (
        <div className="toast-container">
          <div className="toast toast-success" style={{ justifyContent: 'center' }}>
            <span>✅</span> Kredit berhasil disimpan!
          </div>
        </div>
      )}

      <div className="page-body">
        {/* Step 1: Pilih Pelanggan */}
        <div className="card-elevated" style={{ border: 'none', background: 'var(--white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>1</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>Pilih Pelanggan</h2>
          </div>

          {selectedCustomer ? (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', 
              background: 'linear-gradient(145deg, #f8faff 0%, #e8f4fd 100%)', 
              borderRadius: 'var(--radius-lg)', border: '1px solid rgba(27,108,168,0.1)'
            }}>
              <div className="list-item__avatar" style={{ background: 'var(--white)', color: 'var(--primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                {selectedCustomer.nama.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-main)' }}>{selectedCustomer.nama}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Sisa Hutang:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--danger)' }}>{formatRupiah(selectedCustomer.total_hutang)}</span>
                </div>
              </div>
              <button onClick={() => { setSelectedCustomerId(''); setSearch('') }}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '16px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div className="search-bar" style={{ background: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '20px', opacity: 0.7 }}>🔍</span>
                <input
                  placeholder="Ketik nama pelanggan..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  style={{ fontSize: '16px', fontWeight: 500 }}
                />
              </div>
              {showDropdown && search && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20,
                  background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '8px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)', maxHeight: '260px', overflowY: 'auto',
                }}>
                  {filteredCustomers.map(c => (
                    <button key={c.id}
                      onClick={() => { setSelectedCustomerId(c.id); setSearch(''); setShowDropdown(false) }}
                      style={{
                        width: '100%', padding: '12px', background: 'transparent', border: 'none',
                        textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                        borderRadius: 'var(--radius-md)', transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="list-item__avatar" style={{ width: 40, height: 40, fontSize: '16px' }}>{c.nama.charAt(0)}</div>
                      <div>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{c.nama}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{c.alamat || 'Tidak ada alamat'}</p>
                      </div>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <p style={{ marginBottom: '12px', color: 'var(--text-sub)', fontSize: '14px' }}>Pelanggan tidak ditemukan.</p>
                      <button 
                        onClick={() => handleAddNewCustomer(search)}
                        className="btn btn-primary btn-sm"
                        style={{ borderRadius: '100px', padding: '8px 20px' }}
                      >
                        <span>➕</span> Tambah &quot;{search}&quot;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Keranjang Belanja */}
        <div className="card-elevated" style={{ border: 'none', background: 'var(--white)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>2</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>Barang Belanjaan</h2>
          </div>
          
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div className="search-bar" style={{ background: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-md)', minHeight: '52px' }}>
              <span style={{ fontSize: '20px', opacity: 0.7 }}>📦</span>
              <input
                placeholder="Cari atau ketik barang baru..."
                value={itemSearch}
                onChange={e => { setItemSearch(e.target.value); setShowItemSuggestions(true) }}
                onFocus={() => setShowItemSuggestions(true)}
                style={{ fontSize: '16px', fontWeight: 500 }}
              />
            </div>
            {showItemSuggestions && itemSearch && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20,
                background: 'var(--white)', border: '1px solid var(--border)', padding: '8px',
                borderRadius: 'var(--radius-lg)', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', 
                maxHeight: '220px', overflowY: 'auto',
              }}>
                {filteredItems.map(i => (
                  <button key={i.id} onClick={() => addItemToCart({ id: i.id, nama: i.nama_barang, harga_default: i.harga_default })} 
                  style={{
                    width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                    borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{i.nama_barang}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '14px', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '100px' }}>
                      {formatRupiah(i.harga_default)}
                    </span>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <p style={{ marginBottom: '12px', color: 'var(--text-sub)', fontSize: '14px' }}>Barang belum ada di master data.</p>
                    <button 
                      onClick={() => handleAddNewItem(itemSearch)}
                      className="btn btn-outline btn-sm"
                      style={{ borderRadius: '100px' }}
                    >
                      <span>➕</span> Daftarkan &quot;{itemSearch}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {cart.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item, index) => (
                <div key={item.id} style={{
                  background: 'var(--white)', borderRadius: '16px', padding: '16px',
                  border: '1px solid var(--border)', position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: 24, height: 24, background: 'var(--primary-light)', color: 'var(--primary-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                    {index + 1}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <p style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)', paddingLeft: '8px' }}>{item.nama_barang}</p>
                    <button onClick={() => removeItem(item.id)} style={{ background: 'var(--danger-light)', borderRadius: '50%', width: 32, height: 32, border: 'none', color: 'var(--danger)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      ✕
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>Kuantitas</label>
                      <input 
                        type="number" 
                        inputMode="numeric"
                        className="form-input" 
                        style={{ padding: '10px', textAlign: 'center', fontSize: '16px', fontWeight: 700, background: 'var(--bg)', border: 'none' }}
                        value={item.qty === 0 ? '' : item.qty}
                        onChange={(e) => handleUpdateCart(item.id, 'qty', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>Harga Satuan (Rp)</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="form-input" 
                        style={{ padding: '10px 14px', color: 'var(--primary)', fontWeight: 800, fontSize: '16px', background: 'var(--bg)', border: 'none' }}
                        value={item.harga_satuan === 0 ? '' : new Intl.NumberFormat('id-ID').format(item.harga_satuan)}
                        onChange={(e) => handleUpdateCart(item.id, 'harga_satuan', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: 600 }}>Subtotal:</p>
                    <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)' }}>{formatRupiah(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', padding: '40px 20px', 
              background: 'var(--bg)', borderRadius: '16px', border: '1px dashed #cbd5e1'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'grayscale(1) opacity(0.5)' }}>🛒</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Keranjang Kosong</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>Silakan cari dan pilih barang belanjaan di atas untuk mulai mencatat kredit.</p>
            </div>
          )}
        </div>

      </div>

      {/* Floating Bottom Bar for Total & Checkout */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.06)'
      }}>
        {/* Kontainer internal untuk membatasi lebar agar sama dengan konten atasnya */}
        <div style={{ 
          maxWidth: '480px', margin: '0 auto', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
        }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tagihan</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1, marginTop: '2px' }}>
              {formatRupiah(grandTotal)}
            </p>
          </div>
          <button 
            onClick={handleSave} 
            className="btn btn-primary"
            style={{ 
              padding: '16px 32px', borderRadius: '100px', fontSize: '18px', fontWeight: 800,
              boxShadow: '0 8px 20px rgba(27,108,168,0.35)', letterSpacing: '0.02em',
              opacity: grandTotal > 0 && selectedCustomerId ? 1 : 0.6,
              transform: grandTotal > 0 && selectedCustomerId ? 'scale(1)' : 'scale(0.98)'
            }}
          >
            Simpan Kredit
          </button>
        </div>
      </div>

      {/* MODAL TAMBAH PELANGGAN BARU */}
      {showNewCustomerModal && (
        <div className="overlay">
          <div className="modal-sheet">
            <div className="modal-handle" />
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px', color: 'var(--text-main)', textAlign: 'center' }}>
              👤 Pelanggan Baru
            </h2>
            
            <div style={{ display: 'grid', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Nama Lengkap *</label>
                <input 
                  type="text" 
                  value={newCustomerForm.nama} 
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, nama: e.target.value }))}
                  className="form-input" 
                  placeholder="Misal: Budi Santoso"
                  style={{ background: 'var(--bg)', border: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>No. HP (Opsional)</label>
                <input 
                  type="tel" 
                  value={newCustomerForm.no_hp} 
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, no_hp: e.target.value }))}
                  className="form-input" 
                  placeholder="Misal: 08123456789"
                  style={{ background: 'var(--bg)', border: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Alamat (Opsional)</label>
                <textarea 
                  value={newCustomerForm.alamat} 
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, alamat: e.target.value }))}
                  className="form-input" 
                  placeholder="Alamat lengkap..."
                  style={{ minHeight: '80px', resize: 'vertical', background: 'var(--bg)', border: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowNewCustomerModal(false)} className="btn btn-ghost btn-lg" style={{ flex: 1, borderRadius: '100px', fontWeight: 700 }}>
                Batal
              </button>
              <button onClick={handleSaveNewCustomer} className="btn btn-primary btn-lg" style={{ flex: 2, borderRadius: '100px', fontWeight: 800 }}>
                Simpan & Pilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BonBaruPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>Memuat Kasir...</div>}>
      <BonBaruForm />
    </Suspense>
  )
}

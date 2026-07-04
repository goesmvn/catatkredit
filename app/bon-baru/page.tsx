'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatRupiah } from '@/lib/mockData'
import { useAuth } from '@/lib/auth'
import { useDataCache } from '@/lib/hooks/useDataCache'
import { useSettings } from '@/lib/hooks/useSettings'

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
  const preSelectId = searchParams.get('pelanggan')
  const { user } = useAuth()

  const { data: cachedCustomers, loading: loadingCust, refetch: refetchCustomers } = useDataCache<any[]>('/api/customers')
  const { data: cachedItems, loading: loadingItems, refetch: refetchItems } = useDataCache<any[]>('/api/items')

  const dbCustomers = cachedCustomers || []
  const dbItems = cachedItems || []

  const [selectedCustomerId, setSelectedCustomerId] = useState(preSelectId || '')
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [showItemSuggestions, setShowItemSuggestions] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({ nama: '', alamat: '', no_hp: '', ciri_ciri: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const savingRef = useRef(false)
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null)
  
  const settings = useSettings()
  const [showReceipt, setShowReceipt] = useState(false)
  const now = new Date()

  const selectedCustomer = dbCustomers.find(c => c.id === selectedCustomerId)
  const editingCartItem = cart.find(c => c.id === editingCartItemId)
  const filteredCustomers = dbCustomers.filter(c =>
    c.nama.toLowerCase().includes(search.toLowerCase()) && c.id !== selectedCustomerId
  )
  const filteredItems = dbItems.filter(i => i.nama_barang.toLowerCase().includes(itemSearch.toLowerCase()))

  const addItemToCart = (item: { id: string, nama_barang: string, harga_default: number }) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id)
      if (existing) {
        return prev; // Jangan tambah qty otomatis, biarkan user isi di popup
      } else {
        return [...prev, {
          id: item.id,
          nama_barang: item.nama_barang,
          qty: 1,
          harga_satuan: item.harga_default,
          subtotal: item.harga_default
        }]
      }
    })
    setItemSearch('')
    setShowItemSuggestions(false)
    setEditingCartItemId(item.id) // Buka popup otomatis
  }

  const handleAddNewItem = async (name: string) => {
    if (!name.trim()) return
    const id = crypto.randomUUID()
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nama_barang: name.trim(), harga_default: 0 })
    })
    const newItem = await res.json()
    await refetchItems()
    addItemToCart({ id: newItem.id, nama_barang: newItem.nama_barang, harga_default: 0 })
  }

  const handleAddNewCustomer = (name: string) => {
    if (!name.trim()) return
    setNewCustomerForm({ nama: name.trim(), alamat: '', no_hp: '', ciri_ciri: '' })
    setShowDropdown(false)
    setShowNewCustomerModal(true)
  }

  const handleSaveNewCustomer = async () => {
    if (!newCustomerForm.nama.trim()) return
    const id = crypto.randomUUID()
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...newCustomerForm })
    })
    const newCustomer = await res.json()
    await refetchCustomers()
    setSelectedCustomerId(newCustomer.id)
    setShowNewCustomerModal(false)
    setSearch('')
  }

  const handleUpdateCart = (id: string, field: 'qty' | 'harga_satuan', value: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newValue = Math.max(0, value)
        const newQty = field === 'qty' ? newValue : item.qty
        const newHarga = field === 'harga_satuan' ? newValue : item.harga_satuan
        return { ...item, [field]: newValue, subtotal: newQty * newHarga }
      }
      return item
    }))
  }

  const removeItem = (id: string) => setCart(prev => prev.filter(item => item.id !== id))
  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0)

  const handleSave = () => {
    if (!selectedCustomerId) { alert('Pilih pelanggan terlebih dahulu!'); return }
    if (cart.length === 0) { alert('Keranjang belanja kosong!'); return }
    if (grandTotal === 0) { alert('Total kredit tidak boleh 0!'); return }
    if (selectedCustomer?.status === 'BLACKLIST') {
      alert('Pelanggan ini di-BLACKLIST! Tidak bisa membuat kredit baru.')
      return
    }
    setShowConfirmModal(true)
  }

  const handleConfirmSave = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    setShowConfirmModal(false)
    try {
      const id = crypto.randomUUID()
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          customer_id: selectedCustomerId,
          total_harga: grandTotal,
          tanggal: Date.now(),
          status: 'BELUM_LUNAS',
          created_by: user?.id || null,
          items: cart.map(item => ({
            id: crypto.randomUUID(),
            nama_barang: item.nama_barang,
            qty: item.qty,
            harga_satuan: item.harga_satuan,
            subtotal: item.subtotal,
            item_tag_name: item.nama_barang,
          }))
        })
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      setSaved(true)
      setShowReceipt(true)
    } catch (error) {
      console.error(error)
      alert('Terjadi kesalahan saat menyimpan kredit')
    } finally {
      setIsSaving(false)
      savingRef.current = false
    }
  }

  return (
    <div className="kasir-content-wrapper">
      {/* HEADER KOMPAK */}
      <div className="page-header no-print" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.2)', color: 'white',
          width: '36px', height: '36px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span>
        </button>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📝</span> Kasir Kredit
          </h1>
          <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>Pencatatan kredit baru</p>
        </div>
      </div>

      {saved && (
        <div className="toast-container no-print">
          <div className="toast toast-success" style={{ justifyContent: 'center' }}>
            <span>✅</span> Kredit berhasil disimpan!
          </div>
        </div>
      )}

      <div className="page-body">
        {!showReceipt ? (
          <>
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
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '16px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
                        borderRadius: 'var(--radius-md)',
                      }}>
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
                      <button onClick={() => handleAddNewCustomer(search)} className="btn btn-primary btn-sm" style={{ borderRadius: '100px', padding: '8px 20px' }}>
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
                  <button key={i.id} onClick={() => addItemToCart({ id: i.id, nama_barang: i.nama_barang, harga_default: i.harga_default })}
                    style={{
                      width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                      borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{i.nama_barang}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '14px', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '100px' }}>
                      {formatRupiah(i.harga_default)}
                    </span>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <p style={{ marginBottom: '12px', color: 'var(--text-sub)', fontSize: '14px' }}>Barang belum ada di master data.</p>
                    <button onClick={() => handleAddNewItem(itemSearch)} className="btn btn-outline btn-sm" style={{ borderRadius: '100px' }}>
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
                  border: '1px solid var(--border)', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: 24, height: 24, background: 'var(--primary-light)', color: 'var(--primary-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                    {index + 1}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <p style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)', paddingLeft: '8px' }}>{item.nama_barang}</p>
                    <button onClick={() => removeItem(item.id)} style={{ background: 'var(--danger-light)', borderRadius: '50%', width: 32, height: 32, border: 'none', color: 'var(--danger)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                  <div 
                    onClick={() => setEditingCartItemId(item.id)}
                    style={{ 
                      display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px', alignItems: 'end',
                      background: 'var(--bg)', padding: '12px', borderRadius: '12px', cursor: 'pointer',
                      border: '1px solid transparent', transition: 'border 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.border = '1px solid var(--primary-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.border = '1px solid transparent'}
                  >
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '4px', display: 'block' }}>Kuantitas</label>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.qty} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-sub)' }}>x</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '4px', display: 'block' }}>Harga Satuan (Rp)</label>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                        {formatRupiah(item.harga_satuan)}
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2', textAlign: 'center', fontSize: '11px', color: 'var(--primary)', fontWeight: 600, marginTop: '4px', opacity: 0.8 }}>
                      ✎ Ketuk untuk ubah jumlah / harga
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
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg)', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'grayscale(1) opacity(0.5)' }}>🛒</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Keranjang Kosong</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>Silakan cari dan pilih barang belanjaan di atas untuk mulai mencatat kredit.</p>
            </div>
          )}
        </div>
        </>
        ) : (
          /* Struk */
          <div>
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: 58mm auto;
                  margin: 0;
                }
                html, body {
                  width: 58mm !important;
                  max-width: 58mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #fff !important;
                  visibility: hidden !important;
                }
                .receipt {
                  visibility: visible !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 4mm !important;
                  box-sizing: border-box !important;
                }
                .receipt * {
                  visibility: visible !important;
                }
              }
            `}} />
            <div className="receipt">
              <div className="receipt__header">
                <div className="receipt__store-name">{settings.nama_toko}</div>
                <div className="receipt__store-meta">{settings.alamat_toko}</div>
                <div className="receipt__store-meta">Telp: {settings.no_telepon}</div>
                <hr />
                <div className="receipt__title">BUKTI KREDIT BARANG</div>
                <div className="receipt__store-meta">{now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <hr />
              <div className="receipt__body">
                <div className="receipt__row"><div className="receipt__label">Pelanggan</div><div className="receipt__value">{selectedCustomer?.nama}</div></div>
                <div className="receipt__row" style={{ marginTop: '8px' }}><div className="receipt__label">Rincian Barang:</div><div className="receipt__value"></div></div>
                {cart.map((item, idx) => (
                  <div key={idx} style={{ paddingLeft: '8px', fontSize: '14px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.nama_barang}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-sub)' }}>
                      <span>{item.qty} x {formatRupiah(item.harga_satuan)}</span>
                      <span>{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
                <hr style={{ margin: '8px 0', borderStyle: 'dashed' }} />
                <div className="receipt__row" style={{ fontWeight: 800, fontSize: '16px' }}><div className="receipt__label">Total Tagihan</div><div className="receipt__value">{formatRupiah(grandTotal)}</div></div>
              </div>
              <hr />
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <p style={{ fontSize: '13px' }}>Harap simpan struk ini sebagai bukti pengambilan barang kredit.</p>
              </div>
              <hr style={{ margin: '12px 0' }} />
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-sub)' }}>{settings.teks_struk}</p>
            </div>
            <button
              onClick={() => {
                try {
                  window.print?.()
                } catch (e) {
                  console.error('Print failed', e)
                } finally {
                  setTimeout(() => router.push(`/pelanggan/${selectedCustomerId}`), 600)
                }
              }}
              className="btn btn-primary btn-xl btn-full no-print"
              style={{ marginTop: '12px' }}
            >
              🖨️ Cetak Struk
            </button>
            <button
              onClick={() => router.push(`/pelanggan/${selectedCustomerId}`)}
              className="btn btn-ghost btn-lg btn-full no-print"
              style={{ marginTop: '8px' }}
            >
              Selesai (Kembali ke Profil)
            </button>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      {!showReceipt && (
        <div className="kasir-bottom-bar no-print">
          <div className="kasir-bottom-bar__inner">
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tagihan</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1, marginTop: '2px' }}>
                {formatRupiah(grandTotal)}
              </p>
            </div>
            <button 
              onClick={handleSave} 
              className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`}
              disabled={isSaving || showConfirmModal || grandTotal === 0 || !selectedCustomerId}
              style={{
                padding: '10px 20px', borderRadius: '50px', fontSize: '15px', fontWeight: 700,
                boxShadow: '0 4px 12px rgba(27,108,168,0.25)',
                opacity: (grandTotal > 0 && selectedCustomerId && !isSaving) ? 1 : 0.6,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                height: 'auto', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}>
              {isSaving ? (
                <>
                  <span className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.7)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                  Menyimpan...
                </>
              ) : 'Simpan Kredit'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDIT ITEM KERANJANG */}
      {editingCartItemId && editingCartItem && (
        <div className="overlay" style={{ zIndex: 60 }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)', textAlign: 'center' }}>
              Atur {editingCartItem.nama_barang}
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px', 
              marginBottom: '24px' 
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', textAlign: 'center' }}>Kuantitas</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => handleUpdateCart(editingCartItem.id, 'qty', editingCartItem.qty - 1)} className="btn btn-outline" style={{ width: '44px', height: '44px', borderRadius: '50%', fontSize: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  <input
                    type="number" inputMode="numeric" className="form-input"
                    style={{ flex: 1, padding: '12px', textAlign: 'center', fontSize: '20px', fontWeight: 800, background: 'var(--bg)', border: 'none', borderRadius: '12px' }}
                    value={editingCartItem.qty === 0 ? '' : editingCartItem.qty}
                    onChange={(e) => handleUpdateCart(editingCartItem.id, 'qty', parseInt(e.target.value) || 0)}
                  />
                  <button onClick={() => handleUpdateCart(editingCartItem.id, 'qty', editingCartItem.qty + 1)} className="btn btn-outline" style={{ width: '44px', height: '44px', borderRadius: '50%', fontSize: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', textAlign: 'center' }}>Harga Satuan (Rp)</label>
                <input
                  type="text" inputMode="numeric" className="form-input"
                  style={{ width: '100%', padding: '12px', textAlign: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '20px', background: 'var(--bg)', border: 'none', borderRadius: '12px' }}
                  value={editingCartItem.harga_satuan === 0 ? '' : new Intl.NumberFormat('id-ID').format(editingCartItem.harga_satuan)}
                  onChange={(e) => handleUpdateCart(editingCartItem.id, 'harga_satuan', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { removeItem(editingCartItem.id); setEditingCartItemId(null); }} className="btn btn-ghost btn-lg" style={{ flex: 1, borderRadius: '100px', fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-light)' }}>Hapus</button>
              <button onClick={() => setEditingCartItemId(null)} className="btn btn-primary btn-lg" style={{ flex: 2, borderRadius: '100px', fontWeight: 800 }}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PELANGGAN BARU */}
      {showNewCustomerModal && (
        <div className="overlay">
          <div className="modal-sheet">
            <div className="modal-handle" />
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px', color: 'var(--text-main)', textAlign: 'center' }}>
              👤 Pelanggan Baru
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '12px 16px', 
              marginBottom: '24px' 
            }}>
              {[
                { label: 'Nama Lengkap *', key: 'nama', type: 'text', placeholder: 'Misal: Budi Santoso' },
                { label: 'No. HP (Opsional)', key: 'no_hp', type: 'tel', placeholder: 'Misal: 08123456789' },
                { label: 'Alamat (Opsional)', key: 'alamat', type: 'text', placeholder: 'Alamat lengkap...' },
                { label: 'Ciri-ciri (Opsional)', key: 'ciri_ciri', type: 'text', placeholder: 'Misal: Sering pakai topi' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(newCustomerForm as any)[field.key]}
                    onChange={e => setNewCustomerForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="form-input"
                    placeholder={field.placeholder}
                    style={{ background: 'var(--bg)', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowNewCustomerModal(false)} className="btn btn-ghost btn-lg" style={{ flex: 1, borderRadius: '100px', fontWeight: 700 }}>Batal</button>
              <button onClick={handleSaveNewCustomer} className="btn btn-primary btn-lg" style={{ flex: 2, borderRadius: '100px', fontWeight: 800 }}>Simpan & Pilih</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL KONFIRMASI SIMPAN */}
      {showConfirmModal && (
        <div className="overlay" style={{ zIndex: 70 }}>
          <div className="modal-sheet" style={{ paddingBottom: '32px' }}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Simpan Kredit Baru?
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-sub)' }}>
                Total tagihan: <strong style={{ color: 'var(--primary)' }}>{formatRupiah(grandTotal)}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="btn btn-ghost btn-lg" 
                style={{ flex: 1, borderRadius: '100px', fontWeight: 700 }}
                disabled={isSaving}
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmSave} 
                className={`btn btn-primary btn-lg ${isSaving ? 'btn-loading' : ''}`} 
                style={{ flex: 1, borderRadius: '100px', fontWeight: 800, opacity: isSaving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.7)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                    Menyimpan...
                  </>
                ) : 'Ya, Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="fs-overlay">
          <div className="fs-overlay__spinner" />
          <div className="fs-overlay__text">Menyimpan kredit...</div>
          <div className="fs-overlay__sub">Mohon tunggu, data kredit sedang dicatat.</div>
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

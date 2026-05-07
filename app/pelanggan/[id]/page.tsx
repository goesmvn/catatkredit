'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah, formatDate, formatDateTime, getSettings } from '@/lib/mockData'
import { notFound } from 'next/navigation'

const daysSince = (d: number): number => Math.floor((Date.now() - d) / 86400000)

export default function PelangganDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [customer, setCustomer] = useState<any>(null)
  const [txs, setTxs] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ nama: '', alamat: '', no_hp: '', ciri_ciri: '' })
  
  const [showEditTxModal, setShowEditTxModal] = useState(false)
  const [editTxForm, setEditTxForm] = useState({ id: '', total_harga: 0, status: '' })

  const fetchData = useCallback(async () => {
    if (!id) return
    setFetchError(false)
    try {
      const res = await fetch(`/api/customers/${id}`)
      if (!res.ok) {
        if (res.status === 404) setFetchError(true)
        setLoading(false)
        return
      }
      const json = await res.json()
      setCustomer(json.customer)
      setTxs((json.transactions || []).sort((a: any, b: any) => b.tanggal - a.tanggal))
      setPayments((json.payments || []).sort((a: any, b: any) => b.tanggal_bayar - a.tanggal_bayar))
      setItems(json.items || [])
    } catch (e) {
      console.error(e)
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-sub)' }}>⏳ Memuat data...</div>
    </div>
  )
  if (fetchError || !customer) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p style={{ fontSize: 18, fontWeight: 600 }}>❌ Data pelanggan tidak ditemukan</p>
      <Link href="/pelanggan" style={{ color: 'var(--primary)', marginTop: 16, display: 'block' }}>← Kembali ke daftar</Link>
    </div>
  )

  const settings = getSettings()
  const nowMs = Date.now()
  const batasMs = (settings.batas_menunggak_hari || 30) * 86400000
  const isBlacklisted = customer.status === 'BLACKLIST'
  const isMenunggak = customer.total_hutang > 0 && txs.some(t => t.status !== 'LUNAS' && (nowMs - t.tanggal) > batasMs)
  const displayStatus = isBlacklisted ? 'BLACKLIST' : isMenunggak ? 'MENUNGGAK' : 'LANCAR'
  const latestPaymentTs = payments.length > 0 ? Math.max(...payments.map((p: any) => p.tanggal_bayar)) : null

  // Get items for a specific transaction
  const getTxItems = (txId: string) => items.filter((i: any) => i.transaction_id === txId)

  const handleToggleBlacklist = async () => {
    await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isBlacklisted ? 'LANCAR' : 'BLACKLIST' })
    })
    setShowModal(false)
    fetchData()
  }

  const handleSaveEdit = async () => {
    if (!editForm.nama.trim()) return
    await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: editForm.nama.trim(),
        alamat: editForm.alamat.trim(),
        no_hp: editForm.no_hp.trim(),
        ciri_ciri: editForm.ciri_ciri.trim()
      })
    })
    setShowEditModal(false)
    fetchData()
  }

  const handleEditClick = () => {
    setEditForm({ nama: customer.nama, alamat: customer.alamat || '', no_hp: customer.no_hp || '', ciri_ciri: customer.ciri_ciri || '' })
    setShowEditModal(true)
  }

  const handleEditTxClick = (tx: any) => {
    setEditTxForm({ id: tx.id, total_harga: tx.total_harga, status: tx.status })
    setShowEditTxModal(true)
  }

  const handleSaveEditTx = async () => {
    try {
      const res = await fetch(`/api/transactions/${editTxForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_harga: editTxForm.total_harga, status: editTxForm.status })
      })
      if (!res.ok) throw new Error('Gagal mengupdate')
      setShowEditTxModal(false)
      fetchData()
    } catch (e) {
      console.error(e)
      alert('Terjadi kesalahan saat mengupdate transaksi')
    }
  }

  const handleDeleteCustomer = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus pelanggan')
      router.push('/pelanggan')
    } catch (e) {
      console.error(e)
      alert('Terjadi kesalahan saat menghapus pelanggan')
      setIsDeleting(false)
      setShowDeleteCustomerModal(false)
    }
  }

  const handleDeleteTransaction = async (txId: string, total: number) => {
    if (!window.confirm(`Hapus transaksi senilai ${formatRupiah(total)}? Saldo hutang pelanggan akan otomatis dikurangi.`)) {
      return
    }

    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
      fetchData()
    } catch (e) {
      console.error(e)
      alert('Terjadi kesalahan saat menghapus transaksi')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: isBlacklisted
          ? 'linear-gradient(135deg, var(--danger) 0%, #a93226 100%)'
          : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '20px', color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Link href="/pelanggan" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'white', color: 'var(--primary-dark)',
            padding: '8px 16px', borderRadius: '50px',
            textDecoration: 'none', fontSize: '16px', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <span style={{ fontSize: '20px' }}>←</span> Kembali
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 800,
            border: '3px solid rgba(255,255,255,0.4)',
          }}>
            {customer.nama.charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{customer.nama}</h1>
            <p style={{ fontSize: '14px', opacity: 0.85 }}>{customer.alamat}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {isBlacklisted && (
          <div className="blacklist-banner">
            <span style={{ fontSize: '24px' }}>🚫</span>
            <div>
              <p>PELANGGAN BLACKLIST</p>
              <p style={{ fontSize: '14px', fontWeight: 400, marginTop: '2px' }}>Tidak boleh membuat kredit baru untuk pelanggan ini</p>
            </div>
          </div>
        )}

        {/* Status & Hutang */}
        <div className="card-elevated" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-sub)', marginBottom: '8px' }}>Total Sisa Hutang</p>
          <p className={`big-number ${customer.total_hutang > 0 ? 'big-number--danger' : 'big-number--success'}`} style={{ fontSize: '48px' }}>
            {formatRupiah(customer.total_hutang)}
          </p>
          <div style={{ marginTop: '12px' }}>
            <span className={`status-badge ${displayStatus === 'BLACKLIST' ? 'status-blacklist' : displayStatus === 'MENUNGGAK' ? 'status-menunggak' : 'status-lancar'}`}>
              {displayStatus === 'BLACKLIST' ? '🚫 Blacklist' : displayStatus === 'MENUNGGAK' ? '⚠️ Menunggak' : '✅ Lancar'}
            </span>
          </div>
          {latestPaymentTs && (
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
              Terakhir bayar: {daysSince(latestPaymentTs)} hari lalu ({formatDate(new Date(latestPaymentTs).toISOString())})
            </p>
          )}
        </div>

        {/* Info */}
        <div className="card">
          <p className="section-label">Informasi Pelanggan</p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>No. HP</p>
              <p style={{ fontSize: '17px', fontWeight: 600 }}>{customer.no_hp || '-'}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Ciri-ciri</p>
              <p style={{ fontSize: '16px', color: 'var(--text-main)', lineHeight: 1.5 }}>{customer.ciri_ciri || '-'}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Bergabung</p>
              <p style={{ fontSize: '16px', fontWeight: 600 }}>{formatDate(new Date(customer.created_at).toISOString())}</p>
            </div>
          </div>
        </div>

        {/* Ringkasan Belanja */}
        <div className="card">
          <p className="section-label">Ringkasan Belanja</p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Belanja (Sejak Awal)</p>
              <p style={{ fontSize: '17px', fontWeight: 600 }}>{formatRupiah(txs.reduce((sum, t) => sum + t.total_harga, 0))}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Status Kredit Lunas</p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--success)' }}>{txs.filter(t => t.status === 'LUNAS').length} kali</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Kredit Masuk</p>
                <p style={{ fontSize: '16px', fontWeight: 600 }}>{payments.length} kali</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Barang yang Pernah Dibeli</p>
              {items.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Belum ada data barang</p>
              ) : (
                <div className="item-tags">
                  {Array.from(new Set(items.map((i: any) => i.nama_barang))).map((nama: any) => (
                    <span key={nama} className="item-tag">{nama}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {!isBlacklisted && (
            <Link href={`/bon-baru?pelanggan=${customer.id}`} className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
              📝 Catat Kredit
            </Link>
          )}
          <Link href={`/pembayaran?pelanggan=${customer.id}`} className="btn btn-success btn-md" style={{ textDecoration: 'none' }}>
            💰 Bayar
          </Link>
          <button onClick={handleEditClick} className="btn btn-ghost btn-md" style={{ cursor: 'pointer' }}>
            ✏️ Edit Data
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-ghost btn-md" style={{
            background: isBlacklisted ? 'var(--warning-light)' : 'var(--danger-light)',
            color: isBlacklisted ? 'var(--warning)' : 'var(--danger)',
            border: `2px solid ${isBlacklisted ? 'var(--warning)' : 'var(--danger)'}`,
          }}>
            {isBlacklisted ? '✅ Aktifkan' : '🚫 Blacklist'}
          </button>
          {txs.length === 0 && payments.length === 0 && (
            <button
              onClick={() => setShowDeleteCustomerModal(true)}
              className="btn btn-ghost btn-md"
              style={{
                gridColumn: '1 / -1',
                background: 'var(--danger-light)',
                color: 'var(--danger)',
                border: '2px solid var(--danger)',
                cursor: 'pointer',
              }}
            >
              🗑️ Hapus Pelanggan
            </button>
          )}
        </div>

        {/* Riwayat Transaksi */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p className="section-label" style={{ marginBottom: 0 }}>🛍️ Riwayat Belanja ({txs.length})</p>
          </div>
          {txs.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px', background: 'var(--bg)', borderRadius: '16px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Belum ada transaksi belanja</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {txs.map((tx: any) => (
                <div key={tx.id} style={{
                  padding: '16px', borderRadius: '16px', border: '1px solid var(--border)',
                  background: 'var(--white)', position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        📅 {formatDateTime(tx.tanggal)}
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {formatRupiah(tx.total_harga)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleEditTxClick(tx)}
                        style={{ 
                          background: 'var(--primary-light)', border: 'none', 
                          color: 'var(--primary)', padding: '4px 8px', 
                          borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                          cursor: 'pointer'
                        }}>
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTransaction(tx.id, tx.total_harga)}
                        style={{ 
                          background: 'var(--danger-light)', border: 'none', 
                          color: 'var(--danger)', padding: '4px 8px', 
                          borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                          cursor: 'pointer'
                        }}>
                        🗑️ Hapus
                      </button>
                      <span className={`status-badge ${tx.status === 'LUNAS' ? 'status-lunas' : 'status-belum-lunas'}`}
                        style={{ fontSize: '12px', padding: '4px 12px', fontWeight: 700 }}>
                        {tx.status === 'LUNAS' ? '✅ Lunas' : '⏳ Ngutang'}
                      </span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Daftar Kredit / Barang
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {getTxItems(tx.id).length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tidak ada detail barang.</p>
                      ) : (
                        getTxItems(tx.id).map((item: any) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.qty}x</span>
                              <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{item.nama_barang}</span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Riwayat Pembayaran */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p className="section-label" style={{ marginBottom: 0 }}>💰 Riwayat Pembayaran ({payments.length})</p>
          </div>
          {payments.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px', background: 'var(--bg)', borderRadius: '16px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Belum ada riwayat pembayaran</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payments.map((p: any) => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px', borderRadius: '16px', background: 'var(--success-light)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: 'var(--success)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px'
                    }}>💵</div>
                    <div>
                      <p style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 700, marginBottom: '2px' }}>Pembayaran Masuk</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateTime(p.tanggal_bayar)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success)' }}>+{formatRupiah(p.nominal_bayar)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL BLACKLIST */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: '24px', width: '100%', maxWidth: '400px',
            padding: '32px 24px', textAlign: 'center', boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isBlacklisted ? '✅' : '🚫'}</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
              {isBlacklisted ? 'Aktifkan Pelanggan?' : 'Blacklist Pelanggan?'}
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-sub)', marginBottom: '32px', lineHeight: 1.5 }}>
              {isBlacklisted
                ? `Apakah Anda yakin ingin memulihkan status ${customer.nama}?`
                : `Apakah Anda yakin ingin memasukkan ${customer.nama} ke daftar hitam?`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleToggleBlacklist} className="btn btn-xl btn-full" style={{
                background: isBlacklisted ? 'var(--success)' : 'var(--danger)', color: 'white'
              }}>
                {isBlacklisted ? 'Ya, Aktifkan' : 'Ya, Blacklist'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-xl btn-full">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA PELANGGAN */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: '24px', width: '100%', maxWidth: '400px',
            padding: '32px 24px', textAlign: 'left', boxShadow: 'var(--shadow-xl)'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>✏️ Edit Data Pelanggan</h2>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
              {[
                { label: 'Nama Lengkap', key: 'nama', type: 'text', placeholder: 'Misal: Budi Santoso' },
                { label: 'No. HP', key: 'no_hp', type: 'tel', placeholder: 'Misal: 08123456789' },
                { label: 'Alamat', key: 'alamat', type: 'text', placeholder: 'Alamat lengkap...' },
                { label: 'Ciri-ciri Tambahan', key: 'ciri_ciri', type: 'text', placeholder: 'Misal: Baju merah, warung ujung' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(editForm as any)[field.key]}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="form-input"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleSaveEdit} className="btn btn-primary btn-xl btn-full">Simpan Perubahan</button>
              <button onClick={() => setShowEditModal(false)} className="btn btn-ghost btn-xl btn-full">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT TRANSAKSI */}
      {showEditTxModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: '24px', width: '100%', maxWidth: '400px',
            padding: '32px 24px', textAlign: 'left', boxShadow: 'var(--shadow-xl)'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>✏️ Edit Transaksi</h2>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>Total Harga (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editTxForm.total_harga === 0 ? '' : new Intl.NumberFormat('id-ID').format(editTxForm.total_harga)}
                  onChange={e => setEditTxForm(prev => ({ ...prev, total_harga: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 }))}
                  className="form-input"
                  placeholder="Contoh: 2.000.000"
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>* Mengubah total akan memperbarui hutang pelanggan.</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>Status</label>
                <select 
                  value={editTxForm.status} 
                  onChange={e => setEditTxForm(prev => ({ ...prev, status: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="BELUM_LUNAS">BELUM LUNAS (Ngutang)</option>
                  <option value="LUNAS">LUNAS</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleSaveEditTx} className="btn btn-primary btn-xl btn-full">Simpan Perubahan</button>
              <button onClick={() => setShowEditTxModal(false)} className="btn btn-ghost btn-xl btn-full">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS PELANGGAN */}
      {showDeleteCustomerModal && (
        <div className="modal-premium">
          <div className="modal-premium__card">
            <div className="modal-premium__handle" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '12px', animation: 'bounceIn 0.5s ease' }}>🗑️</div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: 'var(--danger)' }}>
                Hapus Pelanggan?
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-sub)', marginBottom: '8px', lineHeight: 1.5 }}>
                Anda akan menghapus <strong>{customer.nama}</strong> secara permanen.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
                ⚠️ Tindakan ini tidak bisa dibatalkan.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handleDeleteCustomer}
                  disabled={isDeleting}
                  className={`btn btn-danger btn-xl btn-full${isDeleting ? ' btn-loading' : ''}`}
                  style={{ cursor: isDeleting ? 'not-allowed' : 'pointer' }}
                >
                  {isDeleting ? '⏳ Menghapus...' : '🗑️ Ya, Hapus Pelanggan'}
                </button>
                <button
                  onClick={() => setShowDeleteCustomerModal(false)}
                  disabled={isDeleting}
                  className="btn btn-ghost btn-xl btn-full"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

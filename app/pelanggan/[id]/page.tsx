'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatRupiah, formatDate, getSettings } from '@/lib/mockData'
import { notFound } from 'next/navigation'
import { database } from '@/lib/db'
import { Customer } from '@/lib/db/models/Customer'

const daysSince = (d: number): number => Math.floor((Date.now() - d) / 86400000)

export default function PelangganDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [txs, setTxs] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [latestPayment, setLatestPayment] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    nama: '',
    alamat: '',
    no_hp: '',
    ciri_ciri: ''
  })

  useEffect(() => {
    let customerSub: any

    const fetchData = async () => {
      try {
        const c = await database.collections.get('customers').find(id)
        
        customerSub = c.observe().subscribe(async (data: any) => {
          setCustomer(data)
          
          const txsData = await data.transactions.fetch()
          const txsWithItems = await Promise.all(txsData.map(async (tx: any) => {
            const items = await tx.items.fetch()
            return {
               id: tx.id,
               total_harga: tx.total_harga,
               tanggal: tx.tanggal,
               status: tx.status,
               items: items.map((i: any) => ({
                 id: i.id,
                 nama_barang: i.nama_barang,
                 qty: i.qty,
                 harga_satuan: i.harga_satuan,
                 subtotal: i.subtotal
               }))
            }
          }))
          setTxs(txsWithItems.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()))
          
          const paymentsData = await data.payments.fetch()
          setPayments(paymentsData.sort((a: any, b: any) => b.tanggal_bayar.getTime() - a.tanggal_bayar.getTime()))
          
          if (paymentsData.length > 0) {
            setLatestPayment(new Date(Math.max(...paymentsData.map((p: any) => p.tanggal_bayar.getTime()))))
          }
        })

        setLoading(false)
      } catch (err) {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      if (customerSub) customerSub.unsubscribe()
    }
  }, [id])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  if (!customer) return notFound()

  const handleToggleBlacklist = async () => {
    await database.write(async () => {
      await customer.update((c: any) => {
        c.status = isBlacklisted ? 'LANCAR' : 'BLACKLIST'
      })
    })
    setShowModal(false)
  }

  const settings = getSettings()
  const nowMs = Date.now()
  const batasMs = (settings.batas_menunggak_hari || 30) * 86400000
  const isBlacklisted = customer.status === 'BLACKLIST'
  const isMenunggak = customer.total_hutang > 0 && txs.some(t => t.status !== 'LUNAS' && (nowMs - new Date(t.tanggal).getTime()) > batasMs)
  const displayStatus = isBlacklisted ? 'BLACKLIST' : isMenunggak ? 'MENUNGGAK' : 'LANCAR'

  const handleEditClick = () => {
    setEditForm({
      nama: customer.nama,
      alamat: customer.alamat || '',
      no_hp: customer.no_hp || '',
      ciri_ciri: customer.ciri_ciri || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.nama.trim()) return
    await database.write(async () => {
      await customer.update((c: any) => {
        c.nama = editForm.nama.trim()
        c.alamat = editForm.alamat.trim()
        c.no_hp = editForm.no_hp.trim()
        c.ciri_ciri = editForm.ciri_ciri.trim()
      })
    })
    setShowEditModal(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: isBlacklisted
          ? 'linear-gradient(135deg, var(--danger) 0%, #a93226 100%)'
          : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '20px',
        color: 'white',
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
        {/* Blacklist warning */}
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
          <p className={`big-number ${customer.total_hutang > 0 ? 'big-number--danger' : 'big-number--success'}`}
            style={{ fontSize: '48px' }}>
            {formatRupiah(customer.total_hutang)}
          </p>
          <div style={{ marginTop: '12px' }}>
            <span className={`status-badge ${displayStatus === 'BLACKLIST' ? 'status-blacklist' : displayStatus === 'MENUNGGAK' ? 'status-menunggak' : 'status-lancar'}`}>
              {displayStatus === 'BLACKLIST' ? '🚫 Blacklist' : displayStatus === 'MENUNGGAK' ? '⚠️ Menunggak' : '✅ Lancar'}
            </span>
          </div>
          {latestPayment && (
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
              Terakhir bayar: {daysSince(latestPayment.getTime())} hari lalu ({formatDate(latestPayment.toISOString())})
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
              <p style={{ fontSize: '16px', fontWeight: 600 }}>{formatDate(new Date(customer.createdAt).toISOString())}</p>
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
              {txs.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Belum ada data barang</p>
              ) : (
                <div className="item-tags">
                  {Array.from(new Set(txs.flatMap(t => t.items.map((i: any) => i.nama_barang)))).map((nama: any) => (
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
          <button onClick={handleEditClick} className="btn btn-ghost btn-md" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            ✏️ Edit Data
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-ghost btn-md" style={{
            background: isBlacklisted ? 'var(--warning-light)' : 'var(--danger-light)',
            color: isBlacklisted ? 'var(--warning)' : 'var(--danger)',
            border: `2px solid ${isBlacklisted ? 'var(--warning)' : 'var(--danger)'}`,
          }}>
            {isBlacklisted ? '✅ Aktifkan' : '🚫 Blacklist'}
          </button>
        </div>

        {/* Riwayat Transaksi (Kredit) */}
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
                        📅 {formatDate(new Date(tx.tanggal).toISOString())}
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {formatRupiah(tx.total_harga)}
                      </p>
                    </div>
                    <span className={`status-badge ${tx.status === 'LUNAS' ? 'status-lunas' : 'status-belum-lunas'}`}
                      style={{ fontSize: '12px', padding: '4px 12px', fontWeight: 700 }}>
                      {tx.status === 'LUNAS' ? '✅ Lunas' : '⏳ Ngutang'}
                    </span>
                  </div>
                  
                  <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Daftar Kredit / Barang
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {tx.items.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tidak ada detail barang.</p>
                      ) : (
                        tx.items.map((item: any) => (
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
              {payments.map(p => (
                <div key={p.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '16px', borderRadius: '16px', background: 'var(--success-light)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', background: 'var(--success)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                      fontSize: '20px'
                    }}>
                      💵
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 700, marginBottom: '2px' }}>
                        Pembayaran Masuk
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDate(new Date(p.tanggal_bayar).toISOString())}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success)' }}>
                      +{formatRupiah(p.nominal_bayar)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: '24px', width: '100%', maxWidth: '400px',
            padding: '32px 24px', textAlign: 'center', boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {isBlacklisted ? '✅' : '🚫'}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
              {isBlacklisted ? 'Aktifkan Pelanggan?' : 'Blacklist Pelanggan?'}
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-sub)', marginBottom: '32px', lineHeight: 1.5 }}>
              {isBlacklisted
                ? `Apakah Anda yakin ingin memulihkan status ${customer.nama}? Mereka akan bisa mengambil kredit lagi.`
                : `Apakah Anda yakin ingin memasukkan ${customer.nama} ke daftar hitam? Mereka tidak akan bisa mengambil kredit baru.`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleToggleBlacklist} className="btn btn-xl btn-full" style={{
                background: isBlacklisted ? 'var(--success)' : 'var(--danger)', color: 'white'
              }}>
                {isBlacklisted ? 'Ya, Aktifkan' : 'Ya, Blacklist'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-xl btn-full">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: '24px', width: '100%', maxWidth: '400px',
            padding: '32px 24px', textAlign: 'left', boxShadow: 'var(--shadow-xl)'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>
              ✏️ Edit Data Pelanggan
            </h2>
            
            <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editForm.nama} 
                  onChange={e => setEditForm(prev => ({ ...prev, nama: e.target.value }))}
                  className="form-input" 
                  placeholder="Misal: Budi Santoso"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>No. HP</label>
                <input 
                  type="tel" 
                  value={editForm.no_hp} 
                  onChange={e => setEditForm(prev => ({ ...prev, no_hp: e.target.value }))}
                  className="form-input" 
                  placeholder="Misal: 08123456789"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>Alamat</label>
                <textarea 
                  value={editForm.alamat} 
                  onChange={e => setEditForm(prev => ({ ...prev, alamat: e.target.value }))}
                  className="form-input" 
                  placeholder="Alamat lengkap..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px' }}>Ciri-ciri Tambahan</label>
                <input 
                  type="text" 
                  value={editForm.ciri_ciri} 
                  onChange={e => setEditForm(prev => ({ ...prev, ciri_ciri: e.target.value }))}
                  className="form-input" 
                  placeholder="Misal: Baju merah, warung ujung"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleSaveEdit} className="btn btn-primary btn-xl btn-full">
                Simpan Perubahan
              </button>
              <button onClick={() => setShowEditModal(false)} className="btn btn-ghost btn-xl btn-full">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

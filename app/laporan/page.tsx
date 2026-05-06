'use client'

import { useState, useEffect } from 'react'
import { formatRupiah, formatDate, daysSince, getSettings } from '@/lib/mockData'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { database } from '@/lib/db'
import { Customer } from '@/lib/db/models/Customer'
import { Payment } from '@/lib/db/models/Payment'
import { TransactionItem } from '@/lib/db/models/TransactionItem'
import { Transaction } from '@/lib/db/models/Transaction'
import { Q } from '@nozbe/watermelondb'

type Tab = 'dashboard' | 'tunggakan' | 'blacklist' | 'riwayat' | 'barang'

export default function LaporanPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [items, setItems] = useState<TransactionItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // State untuk Filter Range Tanggal
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    let custSub: any
    let paySub: any
    let itemsSub: any
    let txSub: any
    
    // Server-side guard
    if (typeof window !== 'undefined' && database) {
      try {
        custSub = database.collections.get('customers').query().observe().subscribe((data: Customer[]) => setCustomers(data))
        paySub = database.collections.get('payments').query(Q.sortBy('tanggal_bayar', Q.desc)).observe().subscribe((data: Payment[]) => setPayments(data))
        itemsSub = database.collections.get('transaction_items').query().observe().subscribe((data: TransactionItem[]) => setItems(data))
        txSub = database.collections.get('transactions').query(Q.sortBy('tanggal', Q.desc)).observe().subscribe((data: Transaction[]) => setTransactions(data))
      } catch (error) {
        console.error('Error observing database:', error)
      }
    }
    
    return () => {
      custSub?.unsubscribe()
      paySub?.unsubscribe()
      itemsSub?.unsubscribe()
      txSub?.unsubscribe()
    }
  }, [])

  if (user?.role !== 'ADMIN') {
    return (
      <div className="empty-state">
        <span className="empty-state__icon">🔒</span>
        <p className="empty-state__title">Akses Ditolak</p>
        <p className="empty-state__desc">Halaman ini khusus untuk Admin / Pemilik.</p>
        <Link href="/" className="btn btn-primary mt-4">Kembali ke Beranda</Link>
      </div>
    )
  }

  // --- Filtering Logic (Date Range) ---
  const isWithinDateRange = (dateInput: Date | string | number) => {
    if (!startDate && !endDate) return true
    const d = new Date(dateInput).getTime()
    const s = startDate ? new Date(startDate).getTime() : 0
    const e = endDate ? new Date(endDate).getTime() + 86400000 : Infinity // tambah 1 hari agar inclusive
    return d >= s && d < e
  }

  const filteredPayments = payments.filter(p => isWithinDateRange(p.tanggal_bayar))
  const filteredTxs = transactions.filter(t => isWithinDateRange(t.tanggal))
  
  const txDateMap = new Map(transactions.map(t => [t.id, t.tanggal]))
  const filteredItems = items.filter(item => {
    const txId = (item as any)._raw.transaction_id
    const txDate = txDateMap.get(txId)
    if (!txDate) return false
    return isWithinDateRange(txDate)
  })

  // --- Core Calculations ---
  const tunggakan = customers
    .filter(c => c.total_hutang > 0)
    .sort((a, b) => b.total_hutang - a.total_hutang)

  const blacklist = customers.filter(c => c.status === 'BLACKLIST')

  const totalTunggakan = tunggakan.reduce((s, c) => s + c.total_hutang, 0)
  
  // Rekapan Berdasarkan Rentang Waktu
  const totalPemasukan = filteredPayments.reduce((s, p) => s + p.nominal_bayar, 0)
  const totalPenjualanBarang = filteredItems.reduce((s, i) => s + i.subtotal, 0)
  const totalBonBaru = filteredTxs.reduce((s, t) => s + t.total_harga, 0)

  const getLastPaymentDate = (customerId: string) => {
    const custPayments = payments.filter(p => (p as any)._raw.customer_id === customerId)
    if (custPayments.length === 0) return null
    return new Date(Math.max(...custPayments.map(p => new Date(p.tanggal_bayar).getTime())))
  }

  // Analisis Kredit Macet
  const settings = getSettings()
  const batasMacet = settings.batas_menunggak_hari || 30
  const kreditMacet = tunggakan.filter(c => {
    const lastPayment = getLastPaymentDate(c.id)
    const late = lastPayment ? daysSince(lastPayment) : 999
    return late >= batasMacet
  })

  // --- Data untuk CSS Native Chart ---
  const chartData = (() => {
    if (filteredPayments.length === 0) return { data: [], max: 0 }
    
    // Group by YYYY-MM-DD
    const grouped = new Map<string, number>()
    filteredPayments.forEach(p => {
      const day = new Date(p.tanggal_bayar).toISOString().split('T')[0]
      grouped.set(day, (grouped.get(day) || 0) + p.nominal_bayar)
    })
    
    const sortedDays = Array.from(grouped.keys()).sort()
    const displayDays = sortedDays.slice(-14) // Tampilkan max 14 hari terakhir yg aktif di range ini
    
    let max = 0
    const finalData = displayDays.map(day => {
      const total = grouped.get(day) || 0
      if (total > max) max = total
      return { day, total }
    })
    return { data: finalData, max }
  })()

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
        padding: '20px',
        color: 'white',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>📊 Laporan & Analitik</h1>
        <p style={{ fontSize: '14px', opacity: 0.85, marginTop: '2px' }}>Data real-time kondisi keuangan toko</p>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {([
          ['dashboard', '📈 Dashboard'],
          ['riwayat', '📋 Riwayat'],
          ['barang', '📦 Penjualan'],
          ['tunggakan', '⏳ Tunggakan'],
          ['blacklist', '🚫 Blacklist'],
        ] as [Tab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '14px 16px', border: 'none', background: 'none',
              fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filter Rentang Tanggal (Global) */}
      <div style={{ padding: '16px 16px 0 16px' }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg)' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Dari Tanggal</label>
            <input 
              type="date" 
              className="form-input" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ padding: '6px 10px', fontSize: '14px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sampai Tanggal</label>
            <input 
              type="date" 
              className="form-input" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              style={{ padding: '6px 10px', fontSize: '14px' }}
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 700, padding: '8px', marginTop: '18px', cursor: 'pointer' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: '16px' }}>
        {/* ============ TAB: DASHBOARD ============ */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="card" style={{ padding: '16px', background: 'var(--success-light)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 700 }}>💵 Pemasukan Range Ini</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                  {formatRupiah(totalPemasukan)}
                </p>
              </div>
              <div className="card" style={{ padding: '16px', background: 'var(--primary-light)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>🛍️ Kredit Baru Range Ini</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                  {formatRupiah(totalBonBaru)}
                </p>
              </div>
            </div>

            {/* Native CSS Chart */}
            <div className="card" style={{ padding: '16px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>📉 Grafik Penerimaan Pembayaran</p>
              {chartData.data.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Belum ada data pembayaran di rentang ini</p>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', alignItems: 'flex-end', height: '180px', gap: '8px', 
                  overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--border)' 
                }}>
                  {chartData.data.map((d, i) => {
                    const heightPct = chartData.max > 0 ? (d.total / chartData.max) * 100 : 0
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: 1, minWidth: '40px', height: '100%' }}>
                        {/* Tooltip-like title is supported natively */}
                        <div style={{
                          width: '100%',
                          height: `${Math.max(heightPct, 5)}%`, // min height 5% for visibility
                          background: 'var(--success)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                          cursor: 'pointer'
                        }} title={`${d.day}: ${formatRupiah(d.total)}`} />
                        <span style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '6px' }}>
                          {d.day.substring(5, 10)} {/* MM-DD */}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Kredit Macet */}
            <div>
              <p className="section-label" style={{ color: 'var(--danger)', display: 'flex', justifyContent: 'space-between' }}>
                <span>🚨 Kredit Macet ({kreditMacet.length})</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>&gt; {batasMacet} Hari</span>
              </p>
              
              {kreditMacet.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 16px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Mantap! Tidak ada pelanggan macet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {kreditMacet.map(c => {
                    const lastPayment = getLastPaymentDate(c.id)
                    const late = lastPayment ? daysSince(lastPayment) : 999
                    return (
                      <Link key={c.id} href={`/pelanggan/${c.id}`} className="card" style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '12px 16px', borderLeft: '4px solid var(--danger)', textDecoration: 'none'
                      }}>
                        <div>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{c.nama}</p>
                          <p style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                            {lastPayment ? `Telat ${late} Hari` : 'Belum Pernah Bayar'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--danger)' }}>
                            {formatRupiah(c.total_hutang)}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sisa Tagihan</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ TAB: RIWAYAT ============ */}
        {activeTab === 'riwayat' && (
          <>
            <div className="card" style={{ background: 'var(--success-light)', border: '2px solid var(--success)' }}>
              <p style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>✅ Total Diterima (Filtered)</p>
              <p style={{ fontSize: '36px', fontWeight: 800, color: 'var(--success)', marginTop: '4px', letterSpacing: '-0.03em' }}>
                {formatRupiah(totalPemasukan)}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--success)', marginTop: '4px', opacity: 0.8 }}>
                Dari {filteredPayments.length} transaksi pembayaran
              </p>
            </div>

            <p className="section-label">Riwayat Pembayaran</p>
            {filteredPayments.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Tidak ada pembayaran di periode ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredPayments.map(p => {
                  const customerId = (p as any)._raw.customer_id
                  const customerInfo = customers.find(c => c.id === customerId)
                  return (
                    <div key={p.id} className="card" style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '17px', fontWeight: 700 }}>{customerInfo?.nama || 'Pelanggan Tidak Diketahui'}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {formatDate(p.tanggal_bayar)}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)' }}>
                            +{formatRupiah(p.nominal_bayar)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ============ TAB: BARANG ============ */}
        {activeTab === 'barang' && (() => {
          const barangTerjual = (() => {
            const map = new Map<string, { nama: string, total_qty: number, total_rp: number }>()
            filteredItems.forEach(item => {
              const nama = item.nama_barang || 'Barang Lainnya'
              const existing = map.get(nama) || { nama, total_qty: 0, total_rp: 0 }
              existing.total_qty += item.qty
              existing.total_rp += item.subtotal
              map.set(nama, existing)
            })
            return Array.from(map.values()).sort((a, b) => b.total_qty - a.total_qty)
          })()

          return (
            <>
              <div className="card" style={{ background: 'var(--primary-light)', border: '2px solid var(--primary)' }}>
                <p style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600 }}>📦 Total Penjualan (Filtered)</p>
                <p style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px', letterSpacing: '-0.03em' }}>
                  {formatRupiah(totalPenjualanBarang)}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '4px', opacity: 0.8 }}>
                  Dari {barangTerjual.reduce((sum, b) => sum + b.total_qty, 0)} item terjual
                </p>
              </div>

              <p className="section-label">Barang Paling Laris</p>
              {barangTerjual.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Tidak ada penjualan di periode ini.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {barangTerjual.map((b, i) => (
                    <div key={b.nama} className="card" style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', background: i < 3 ? 'var(--warning-light)' : 'var(--bg)',
                        color: i < 3 ? 'var(--warning)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '14px', marginRight: '16px'
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '16px', fontWeight: 700 }}>{b.nama}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '2px' }}>
                          Terjual: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.total_qty}x</span>
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                          {formatRupiah(b.total_rp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        })()}

        {/* ============ TAB: TUNGGAKAN ============ */}
        {activeTab === 'tunggakan' && (
          <>
            <div className="card" style={{ background: 'var(--danger-light)', border: '2px solid var(--danger)' }}>
              <p style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600 }}>⚠️ Total Piutang Belum Lunas</p>
              <p style={{ fontSize: '36px', fontWeight: 800, color: 'var(--danger)', marginTop: '4px', letterSpacing: '-0.03em' }}>
                {formatRupiah(totalTunggakan)}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '4px', opacity: 0.8 }}>
                Dari {tunggakan.length} pelanggan menunggak
              </p>
            </div>

            {tunggakan.map(c => {
              const lastPayment = getLastPaymentDate(c.id)
              const daysLate = lastPayment ? daysSince(lastPayment) : 999
              const isAlert  = daysLate > batasMacet
              return (
                <Link key={c.id} href={`/pelanggan/${c.id}`} className="card" style={{
                  display: 'block', textDecoration: 'none',
                  border: isAlert ? '2px solid var(--danger)' : '1px solid var(--border)',
                  background: isAlert ? 'var(--danger-light)' : 'var(--white)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '18px', fontWeight: 700 }}>{c.nama}</p>
                        <span className={`status-badge ${c.status === 'BLACKLIST' ? 'status-blacklist' : c.status === 'MENUNGGAK' ? 'status-menunggak' : 'status-lancar'}`}
                          style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {c.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '2px' }}>{c.alamat || '-'}</p>
                      <p style={{
                        fontSize: '14px', fontWeight: 600, marginTop: '6px',
                        color: isAlert ? 'var(--danger)' : 'var(--text-muted)',
                      }}>
                        {lastPayment ? (isAlert ? `🔴 Belum bayar ${daysLate} hari!` : `✅ ${daysLate} hari lalu bayar`) : 'Belum pernah bayar'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--danger)' }}>
                        {formatRupiah(c.total_hutang)}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>sisa hutang</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </>
        )}

        {/* ============ TAB: BLACKLIST ============ */}
        {activeTab === 'blacklist' && (
          <>
            <div className="card" style={{ background: 'var(--danger-light)', border: '2px solid var(--danger)', textAlign: 'center' }}>
              <p style={{ fontSize: '40px', fontWeight: 800, color: 'var(--danger)' }}>{blacklist.length}</p>
              <p style={{ fontSize: '15px', color: 'var(--danger)', fontWeight: 600 }}>Pelanggan Blacklist</p>
            </div>

            {blacklist.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">✅</span>
                <p className="empty-state__title">Tidak ada blacklist</p>
                <p className="empty-state__desc">Semua pelanggan dalam status baik</p>
              </div>
            ) : (
              blacklist.map(c => {
                const lastPayment = getLastPaymentDate(c.id)
                return (
                <div key={c.id} className="card" style={{ border: '2px solid var(--danger)', background: 'var(--danger-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="list-item__avatar" style={{
                      width: 56, height: 56, fontSize: '24px', fontWeight: 700,
                      background: 'var(--danger-light)', color: 'var(--danger)', border: '2px solid var(--danger)',
                    }}>
                      🚫
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{c.nama}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{c.alamat || '-'}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', padding: '10px', background: 'var(--white)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sisa Hutang</p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>
                        {formatRupiah(c.total_hutang)}
                      </p>
                    </div>
                  </div>
                  <Link href={`/pelanggan/${c.id}`} className="btn btn-danger btn-md btn-full" style={{ marginTop: '12px', textDecoration: 'none' }}>
                    Lihat Profil Lengkap →
                  </Link>
                </div>
              )})
            )}
          </>
        )}
      </div>
    </div>
  )
}

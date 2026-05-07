'use client'

import { useState, useEffect } from 'react'
import { formatRupiah, formatDate, daysSince, getSettings } from '@/lib/mockData'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

type Tab = 'dashboard' | 'tunggakan' | 'blacklist' | 'riwayat' | 'barang'

export default function LaporanPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [customers, setCustomers] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/transactions').then(r => r.json()),
    ]).then(([c, p, t]) => {
      setCustomers(c)
      setPayments(p.sort((a: any, b: any) => b.tanggal_bayar - a.tanggal_bayar))
      setTransactions(t.sort((a: any, b: any) => b.tanggal - a.tanggal))
      // Load items for each transaction
      const allItems: any[] = []
      t.forEach((tx: any) => {
        // items are fetched on customer detail, but we also need them in laporan
      })
    }).catch(console.error).finally(() => setLoading(false))

    // Fetch all transaction items via customers (comprehensive)
    fetch('/api/transactions/items').then(r => r.ok ? r.json() : []).then(setItems).catch(() => setItems([]))
  }, [])

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN') {
    return (
      <div className="empty-state">
        <span className="empty-state__icon">🔒</span>
        <p className="empty-state__title">Akses Ditolak</p>
        <p className="empty-state__desc">Halaman ini khusus untuk Admin / Pemilik.</p>
        <Link href="/" className="btn btn-primary mt-4">Kembali ke Beranda</Link>
      </div>
    )
  }

  const isWithinDateRange = (dateInput: number | string) => {
    if (!startDate && !endDate) return true
    const d = new Date(dateInput).getTime()
    const s = startDate ? new Date(startDate).getTime() : 0
    const e = endDate ? new Date(endDate).getTime() + 86400000 : Infinity
    return d >= s && d < e
  }

  const filteredPayments = payments.filter(p => isWithinDateRange(p.tanggal_bayar))
  const filteredTxs = transactions.filter(t => isWithinDateRange(t.tanggal))

  const txDateMap = new Map(transactions.map(t => [t.id, t.tanggal]))
  const filteredItems = items.filter(item => {
    const txDate = txDateMap.get(item.transaction_id)
    if (!txDate) return false
    return isWithinDateRange(txDate)
  })

  const tunggakan = customers.filter(c => c.total_hutang > 0).sort((a, b) => b.total_hutang - a.total_hutang)
  const blacklist = customers.filter(c => c.status === 'BLACKLIST')
  const totalTunggakan = tunggakan.reduce((s, c) => s + c.total_hutang, 0)
  const totalPemasukan = filteredPayments.reduce((s, p) => s + p.nominal_bayar, 0)
  const totalPenjualanBarang = filteredItems.reduce((s, i) => s + i.subtotal, 0)
  const totalBonBaru = filteredTxs.reduce((s, t) => s + t.total_harga, 0)

  const getLastPaymentDate = (customerId: string) => {
    const custPayments = payments.filter(p => p.customer_id === customerId)
    if (custPayments.length === 0) return null
    return new Date(Math.max(...custPayments.map(p => p.tanggal_bayar)))
  }

  const settings = getSettings()
  const batasMacet = settings.batas_menunggak_hari || 30
  const kreditMacet = tunggakan.filter(c => {
    const lastPayment = getLastPaymentDate(c.id)
    const late = lastPayment ? daysSince(lastPayment) : 999
    return late >= batasMacet
  })

  const chartData = (() => {
    if (filteredPayments.length === 0) return { data: [], max: 0 }
    const grouped = new Map<string, number>()
    filteredPayments.forEach(p => {
      const day = new Date(p.tanggal_bayar).toISOString().split('T')[0]
      grouped.set(day, (grouped.get(day) || 0) + p.nominal_bayar)
    })
    const sortedDays = Array.from(grouped.keys()).sort()
    const displayDays = sortedDays.slice(-14)
    let max = 0
    const finalData = displayDays.map(day => {
      const total = grouped.get(day) || 0
      if (total > max) max = total
      return { day, total }
    })
    return { data: finalData, max }
  })()

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>Memuat laporan...</div>

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)', padding: '20px', color: 'white' }}>
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

      {/* Filter Tanggal */}
      <div style={{ padding: '16px 16px 0 16px' }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg)' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Dari Tanggal</label>
            <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 10px', fontSize: '14px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sampai Tanggal</label>
            <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 10px', fontSize: '14px' }} />
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate('') }}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 700, padding: '8px', marginTop: '18px', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: '16px' }}>
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="card" style={{ padding: '16px', background: 'var(--success-light)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 700 }}>💵 Pemasukan Range Ini</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>{formatRupiah(totalPemasukan)}</p>
              </div>
              <div className="card" style={{ padding: '16px', background: 'var(--primary-light)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>🛍️ Kredit Baru Range Ini</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{formatRupiah(totalBonBaru)}</p>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>📉 Grafik Penerimaan Pembayaran</p>
              {chartData.data.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Belum ada data pembayaran di rentang ini</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  {chartData.data.map((d, i) => {
                    const heightPct = chartData.max > 0 ? (d.total / chartData.max) * 100 : 0
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: 1, minWidth: '40px', height: '100%' }}>
                        <div style={{ width: '100%', height: `${Math.max(heightPct, 5)}%`, background: 'var(--success)', borderRadius: '4px 4px 0 0', cursor: 'pointer' }}
                          title={`${d.day}: ${formatRupiah(d.total)}`} />
                        <span style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '6px' }}>{d.day.substring(5, 10)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

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
                          <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--danger)' }}>{formatRupiah(c.total_hutang)}</p>
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

        {/* RIWAYAT TAB */}
        {activeTab === 'riwayat' && (
          <>
            <div className="card" style={{ background: 'var(--success-light)', border: '2px solid var(--success)' }}>
              <p style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>✅ Total Diterima (Filtered)</p>
              <p style={{ fontSize: '36px', fontWeight: 800, color: 'var(--success)', marginTop: '4px', letterSpacing: '-0.03em' }}>{formatRupiah(totalPemasukan)}</p>
              <p style={{ fontSize: '13px', color: 'var(--success)', marginTop: '4px', opacity: 0.8 }}>Dari {filteredPayments.length} transaksi pembayaran</p>
            </div>
            <p className="section-label">Riwayat Pembayaran</p>
            {filteredPayments.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Tidak ada pembayaran di periode ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredPayments.map(p => {
                  const customerInfo = customers.find(c => c.id === p.customer_id)
                  return (
                    <div key={p.id} className="card" style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '17px', fontWeight: 700 }}>{customerInfo?.nama || 'Pelanggan Tidak Diketahui'}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatDate(new Date(p.tanggal_bayar).toISOString())}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)' }}>+{formatRupiah(p.nominal_bayar)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* BARANG TAB */}
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
                <p style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px', letterSpacing: '-0.03em' }}>{formatRupiah(totalPenjualanBarang)}</p>
                <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '4px', opacity: 0.8 }}>Dari {barangTerjual.reduce((sum, b) => sum + b.total_qty, 0)} item terjual</p>
              </div>
              <p className="section-label">Barang Paling Laris</p>
              {barangTerjual.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Tidak ada penjualan di periode ini.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {barangTerjual.map((b, i) => (
                    <div key={b.nama} className="card" style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: i < 3 ? 'var(--warning-light)' : 'var(--bg)', color: i < 3 ? 'var(--warning)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', marginRight: '16px' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '16px', fontWeight: 700 }}>{b.nama}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '2px' }}>Terjual: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.total_qty}x</span></p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{formatRupiah(b.total_rp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        })()}

        {/* TUNGGAKAN TAB */}
        {activeTab === 'tunggakan' && (
          <>
            <div className="card" style={{ background: 'var(--danger-light)', border: '2px solid var(--danger)' }}>
              <p style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600 }}>⚠️ Total Piutang Belum Lunas</p>
              <p style={{ fontSize: '36px', fontWeight: 800, color: 'var(--danger)', marginTop: '4px', letterSpacing: '-0.03em' }}>{formatRupiah(totalTunggakan)}</p>
              <p style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '4px', opacity: 0.8 }}>Dari {tunggakan.length} pelanggan menunggak</p>
            </div>
            {tunggakan.map(c => {
              const lastPayment = getLastPaymentDate(c.id)
              const daysLate = lastPayment ? daysSince(lastPayment) : 999
              const isAlert = daysLate > batasMacet
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
                        <span className={`status-badge ${c.status === 'BLACKLIST' ? 'status-blacklist' : 'status-menunggak'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>{c.status}</span>
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '2px' }}>{c.alamat || '-'}</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '6px', color: isAlert ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {lastPayment ? (isAlert ? `🔴 Belum bayar ${daysLate} hari!` : `✅ ${daysLate} hari lalu bayar`) : 'Belum pernah bayar'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--danger)' }}>{formatRupiah(c.total_hutang)}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>sisa hutang</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </>
        )}

        {/* BLACKLIST TAB */}
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
              blacklist.map(c => (
                <div key={c.id} className="card" style={{ border: '2px solid var(--danger)', background: 'var(--danger-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="list-item__avatar" style={{ width: 56, height: 56, fontSize: '24px', fontWeight: 700, background: 'var(--danger-light)', color: 'var(--danger)', border: '2px solid var(--danger)' }}>🚫</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{c.nama}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{c.alamat || '-'}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', padding: '10px', background: 'var(--white)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sisa Hutang</p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{formatRupiah(c.total_hutang)}</p>
                    </div>
                  </div>
                  <Link href={`/pelanggan/${c.id}`} className="btn btn-danger btn-md btn-full" style={{ marginTop: '12px', textDecoration: 'none' }}>Lihat Profil Lengkap →</Link>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

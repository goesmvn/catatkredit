'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatRupiah, getSettings } from '@/lib/mockData'

const daysSince = (d: number): number => Math.floor((Date.now() - d) / 86400000)

export default function DashboardPage() {
  const settings = getSettings()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error("Dashboard fetch error:", e)
      setData({ totalPiutang: 0, uangMasukHariIni: 0, customers: [], transactions: [], payments: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    // Refresh setiap 30 detik
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: '18px' }}>Memuat data...</div>
  }

  const { totalPiutang, uangMasukHariIni, customers = [], transactions = [], payments = [] } = data

  const nowMs = Date.now()
  const batasMs = (settings.batas_menunggak_hari || 30) * 86400000

  const menunggakCount = customers.filter((c: any) => {
    if (c.status === 'BLACKLIST') return false
    if (c.total_hutang <= 0) return false
    const unpaidTxs = transactions.filter((t: any) => t.customer_id === c.id && t.status !== 'LUNAS')
    return unpaidTxs.some((t: any) => (nowMs - t.tanggal) > batasMs)
  }).length

  const getCustomerName = (id: string) => customers.find((c: any) => c.id === id)?.nama || 'Pelanggan'

  const allActivities = [
    ...payments.map((p: any) => ({
      id: `p_${p.id}`,
      timestamp: p.tanggal_bayar,
      icon: '💰',
      text: `${getCustomerName(p.customer_id)} bayar ${formatRupiah(p.nominal_bayar)}`,
      color: 'var(--success)'
    })),
    ...transactions.map((t: any) => ({
      id: `t_${t.id}`,
      timestamp: t.tanggal,
      icon: '📝',
      text: `Kredit baru: ${getCustomerName(t.customer_id)} (${formatRupiah(t.total_harga)})`,
      color: 'var(--primary)'
    }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

  const formatActivityTime = (ts: number) => {
    const date = new Date(ts)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return `Hari ini ${timeStr}`
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return `Kemarin ${timeStr}`
    return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${timeStr}`
  }

  return (
    <div style={{ paddingBottom: 'calc(var(--nav-h) + 16px)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '24px 20px 32px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '2px' }}>Selamat datang 👋</p>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>{settings.nama_toko}</h1>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden',
          }}>
            <p style={{ fontSize: '12px', opacity: 0.85, marginBottom: '6px', fontWeight: 500 }}>💳 Total Kredit di Luar</p>
            <p style={{ fontSize: '11px', opacity: 0.75, fontWeight: 600, marginBottom: '2px' }}>Rp</p>
            <p style={{
              fontSize: 'clamp(16px, 4vw, 26px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
            }}>
              {new Intl.NumberFormat('id-ID').format(totalPiutang)}
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden',
          }}>
            <p style={{ fontSize: '12px', opacity: 0.85, marginBottom: '6px', fontWeight: 500 }}>💵 Masuk Hari Ini</p>
            <p style={{ fontSize: '11px', opacity: 0.75, fontWeight: 600, marginBottom: '2px' }}>Rp</p>
            <p style={{
              fontSize: 'clamp(16px, 4vw, 26px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
            }}>
              {new Intl.NumberFormat('id-ID').format(uangMasukHariIni)}
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Smart Alert */}
        {menunggakCount > 0 && (
          <div className="alert alert-warning animate-slideDown">
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <strong>Perhatian!</strong>
              <br />Ada {menunggakCount} pelanggan belum bayar lebih dari {settings.batas_menunggak_hari} hari.{' '}
              <Link href="/laporan" style={{ color: 'var(--warning)', textDecoration: 'underline', fontWeight: 700 }}>
                Lihat laporan →
              </Link>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <p className="section-label">Aksi Cepat</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Link href="/bon-baru" className="btn-cta btn-cta-blue" style={{
              textDecoration: 'none', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 12px'
            }}>
              <span className="btn-cta__icon" style={{ width: '56px', height: '56px', fontSize: '32px', marginBottom: '8px' }}>📝</span>
              <span className="btn-cta__text" style={{ alignItems: 'center' }}>
                <span className="btn-cta__label" style={{ fontSize: '16px' }}>Catat Kredit</span>
                <span className="btn-cta__sublabel" style={{ textAlign: 'center', fontSize: '12px', marginTop: '4px' }}>Kredit baru</span>
              </span>
            </Link>
            <Link href="/pembayaran" className="btn-cta btn-cta-green" style={{
              textDecoration: 'none', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 12px'
            }}>
              <span className="btn-cta__icon" style={{ width: '56px', height: '56px', fontSize: '32px', marginBottom: '8px' }}>💰</span>
              <span className="btn-cta__text" style={{ alignItems: 'center' }}>
                <span className="btn-cta__label" style={{ fontSize: '16px' }}>Bayar Kredit</span>
                <span className="btn-cta__sublabel" style={{ textAlign: 'center', fontSize: '12px', marginTop: '4px' }}>Pembayaran</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Total Pelanggan', value: customers.length, color: 'var(--primary)' },
            { label: 'Blacklist', value: customers.filter((c: any) => c.status === 'BLACKLIST').length, color: 'var(--danger)' },
            { label: 'Menunggak', value: menunggakCount, color: 'var(--warning)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
              <p style={{ fontSize: '28px', fontWeight: 800, color: stat.color }}>{stat.value}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px', fontWeight: 500 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div>
          <p className="section-label">Aktivitas Terakhir</p>
          {allActivities.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Belum ada aktivitas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allActivities.map((act) => (
                <div key={act.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', flexShrink: 0,
                  }}>
                    {act.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{act.text}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatActivityTime(act.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pelanggan Snapshot */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p className="section-label" style={{ margin: 0 }}>Pelanggan dengan Hutang</p>
            <Link href="/pelanggan" style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Lihat Semua →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customers.filter((c: any) => c.total_hutang > 0).slice(0, 3).map((customer: any) => (
              <Link key={customer.id} href={`/pelanggan/${customer.id}`} className="list-item" style={{ textDecoration: 'none' }}>
                <div className="list-item__avatar">
                  {customer.nama.charAt(0)}
                </div>
                <div className="list-item__info">
                  <p className="list-item__name">{customer.nama}</p>
                  <p className="list-item__sub">Ada tunggakan</p>
                </div>
                <div className="list-item__right">
                  <p style={{ fontSize: '16px', fontWeight: 700, color: customer.status === 'BLACKLIST' ? 'var(--danger)' : customer.total_hutang > 500000 ? 'var(--warning)' : 'var(--text-main)' }}>
                    {formatRupiah(customer.total_hutang)}
                  </p>
                  <span className={`status-badge ${customer.status === 'BLACKLIST' ? 'status-blacklist' : customer.status === 'MENUNGGAK' ? 'status-menunggak' : 'status-lancar'}`}
                    style={{ fontSize: '12px', padding: '2px 8px', marginTop: '4px' }}>
                    {customer.status === 'BLACKLIST' ? '🚫 Blacklist' : customer.status === 'MENUNGGAK' ? '⚠️ Nunggak' : '✅ Lancar'}
                  </span>
                </div>
              </Link>
            ))}
            {customers.filter((c: any) => c.total_hutang > 0).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                Tidak ada pelanggan yang mempunyai hutang aktif.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

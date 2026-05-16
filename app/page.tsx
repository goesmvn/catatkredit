'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatRupiah } from '@/lib/mockData'
import { useSettings } from '@/lib/hooks/useSettings'
import { useDataCache } from '@/lib/hooks/useDataCache'

const daysSince = (d: number): number => Math.floor((Date.now() - d) / 86400000)

export default function DashboardPage() {
  const settings = useSettings()
  
  const { data: rawData, loading: isCacheLoading, refetch } = useDataCache<any>('/api/dashboard')

  useEffect(() => {
    // Refresh setiap 30 detik
    const interval = setInterval(refetch, 30000)
    return () => clearInterval(interval)
  }, [refetch])

  // Defensive normalization
  const data = rawData ? {
    ...rawData,
    customers: Array.isArray(rawData.customers) ? rawData.customers : [],
    transactions: Array.isArray(rawData.transactions) ? rawData.transactions : [],
    payments: Array.isArray(rawData.payments) ? rawData.payments : [],
  } : null

  if (isCacheLoading && !data) {
    return <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: '18px' }}>Memuat data...</div>
  }

  const { totalPiutang = 0, uangMasukHariIni = 0, customers = [], transactions = [], payments = [] } = data || {}

  const nowMs = Date.now()
  const batasMs = (settings.batas_menunggak_hari || 30) * 86400000

  const isMacet = (c: any) => {
    if (c.status === 'BLACKLIST') return false
    if (c.total_hutang <= 0) return false
    
    const custPayments = payments.filter((p: any) => p.customer_id === c.id)
    if (custPayments.length > 0) {
      const lastPaymentTime = Math.max(...custPayments.map((p: any) => p.tanggal_bayar))
      return (nowMs - lastPaymentTime) > batasMs
    } else {
      const unpaidTxs = transactions.filter((t: any) => t.customer_id === c.id && t.status !== 'LUNAS')
      if (unpaidTxs.length === 0) return false
      const oldestTxTime = Math.min(...unpaidTxs.map((t: any) => t.tanggal))
      return (nowMs - oldestTxTime) > batasMs
    }
  }

  const menunggakCount = customers.filter(isMacet).length

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const blacklistCount = customers.filter((c: any) => c.status === 'BLACKLIST').length
  const activeCustomers = customers.filter((c: any) => c.status !== 'BLACKLIST').length

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>Selamat datang 👋</p>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{settings.nama_toko}</h1>
            <p style={{ fontSize: '13px', opacity: 0.7 }}>{today}</p>
          </div>
        </div>

        {/* Main Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Total Piutang */}
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.18)',
            overflow: 'hidden',
          }}>
            <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px', fontWeight: 500 }}>💳 Total Piutang</p>
            <p style={{
              fontSize: 'clamp(18px, 4.5vw, 28px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
            }}>
              {formatRupiah(totalPiutang)}
            </p>
          </div>
          
          {/* Masuk Hari Ini */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            overflow: 'hidden',
          }}>
            <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>💵 Masuk Hari Ini</p>
            <p style={{
              fontSize: 'clamp(18px, 4.5vw, 28px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
              color: '#22c55e'
            }}>
              {formatRupiah(uangMasukHariIni)}
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Overview Stats Grid */}
        <div>
          <p className="section-label">📊 Overview</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { 
                label: 'Total Pelanggan', 
                value: customers.length, 
                icon: '👥',
                color: '#3b82f6',
                lightColor: 'rgba(59, 130, 246, 0.1)'
              },
              { 
                label: 'Pelanggan Aktif', 
                value: activeCustomers, 
                icon: '✅',
                color: '#10b981',
                lightColor: 'rgba(16, 185, 129, 0.1)'
              },
              { 
                label: 'Blacklist', 
                value: blacklistCount, 
                icon: '🚫',
                color: '#ef4444',
                lightColor: 'rgba(239, 68, 68, 0.1)'
              },
              { 
                label: 'Menunggak', 
                value: menunggakCount, 
                icon: '⚠️',
                color: '#f59e0b',
                lightColor: 'rgba(245, 158, 11, 0.1)'
              },
            ].map(stat => (
              <div key={stat.label} className="card" style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: stat.lightColor,
                border: `1px solid ${stat.color}33`,
              }}>
                <p style={{ fontSize: '28px', marginBottom: '6px' }}>{stat.icon}</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: stat.color, marginBottom: '4px' }}>{stat.value}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 500 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '24px' }}>
          <p className="section-label">⚡ Aksi Cepat</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Link href="/bon-baru" className="btn-cta btn-cta-blue" style={{
              textDecoration: 'none', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center', 
              padding: '18px 12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '12px',
              border: 'none',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              <span style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>📝</span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Catat Kredit</span>
              <span style={{ fontSize: '11px', opacity: 0.85, marginTop: '4px', display: 'block' }}>Kredit baru</span>
            </Link>
            <Link href="/pembayaran" className="btn-cta btn-cta-green" style={{
              textDecoration: 'none', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center', 
              padding: '18px 12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              border: 'none',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              <span style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>💰</span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Bayar Kredit</span>
              <span style={{ fontSize: '11px', opacity: 0.85, marginTop: '4px', display: 'block' }}>Pembayaran</span>
            </Link>
          </div>
        </div>

        {/* Smart Alert */}
        {menunggakCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '12px',
            padding: '14px 16px',
            color: 'white',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, marginBottom: '4px' }}>Perhatian!</p>
              <p style={{ fontSize: '14px', lineHeight: 1.4, opacity: 0.95 }}>
                Ada <strong>{menunggakCount} pelanggan</strong> belum bayar lebih dari {settings.batas_menunggak_hari} hari. 
              </p>
              <Link href="/laporan" style={{ 
                color: 'white', 
                textDecoration: 'underline', 
                fontWeight: 700,
                fontSize: '13px',
                display: 'inline-block',
                marginTop: '6px'
              }}>
                Lihat detail di Laporan →
              </Link>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Recent Activity */}
          <div>
            <p className="section-label">🕐 Aktivitas Terakhir</p>
            {allActivities.length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 12px', textAlign: 'center', borderRadius: '12px', background: 'var(--bg)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada aktivitas.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allActivities.map((act) => (
                  <div key={act.id} className="card" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '12px',
                    fontSize: '13px'
                  }}>
                    <div style={{
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '8px',
                      background: 'var(--bg)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '16px', 
                      flexShrink: 0,
                    }}>
                      {act.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.text}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatActivityTime(act.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Customers with Debt */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p className="section-label" style={{ margin: 0 }}>👤 Pelanggan Hutang Besar</p>
              <Link href="/pelanggan" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Semua →
              </Link>
            </div>
            {customers.filter((c: any) => c.total_hutang > 0).length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 12px', textAlign: 'center', borderRadius: '12px', background: 'var(--bg)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tidak ada hutang aktif.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customers.filter((c: any) => c.total_hutang > 0).sort((a: any, b: any) => b.total_hutang - a.total_hutang).slice(0, 3).map((customer: any) => (
                  <Link key={customer.id} href={`/pelanggan/${customer.id}`} className="list-item" style={{ 
                    textDecoration: 'none',
                    padding: '12px',
                  }}>
                    <div className="list-item__avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                      {customer.nama.charAt(0).toUpperCase()}
                    </div>
                    <div className="list-item__info">
                      <p className="list-item__name" style={{ fontSize: '13px', fontWeight: 600 }}>{customer.nama}</p>
                      <p className="list-item__sub" style={{ fontSize: '11px' }}>
                        {customer.status === 'BLACKLIST' ? '🚫 Blacklist' : customer.status === 'MENUNGGAK' ? '⚠️ Menunggak' : '✅ Lancar'}
                      </p>
                    </div>
                    <div className="list-item__right" style={{ textAlign: 'right' }}>
                      <p style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        color: customer.status === 'BLACKLIST' ? 'var(--danger)' : customer.total_hutang > 500000 ? 'var(--warning)' : 'var(--text-main)' 
                      }}>
                        {new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(customer.total_hutang)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

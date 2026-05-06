'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/mockData'
import { getSettings } from '@/lib/mockData'

type CustomerStatus = 'LANCAR' | 'BLACKLIST' | 'MENUNGGAK'

export default function PelangganPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | 'ALL'>('ALL')
  const [customers, setCustomers] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const settings = getSettings()

  const fetchData = async () => {
    try {
      const [custRes, txRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/transactions'),
      ])
      setCustomers(await custRes.json())
      setTransactions(await txRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getDynamicStatus = (c: any): CustomerStatus => {
    if (c.status === 'BLACKLIST') return 'BLACKLIST'
    if (c.total_hutang <= 0) return 'LANCAR'
    const nowMs = Date.now()
    const batasMs = (settings.batas_menunggak_hari || 30) * 86400000
    const unpaidTxs = transactions.filter(t => t.customer_id === c.id && t.status !== 'LUNAS')
    return unpaidTxs.some(t => (nowMs - t.tanggal) > batasMs) ? 'MENUNGGAK' : 'LANCAR'
  }

  const filtered = customers.filter(c => {
    const matchSearch = c.nama.toLowerCase().includes(search.toLowerCase()) ||
      (c.alamat && c.alamat.toLowerCase().includes(search.toLowerCase()))
    const dynamicStatus = getDynamicStatus(c)
    return matchSearch && (filterStatus === 'ALL' || dynamicStatus === filterStatus)
  })

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: '18px' }}>Memuat data...</div>
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '20px 20px 24px',
        color: 'white',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>👥 Data Pelanggan</h1>
        <p style={{ fontSize: '14px', opacity: 0.85, marginTop: '2px' }}>
          {customers.length} pelanggan terdaftar
        </p>
      </div>

      <div className="page-body">
        {/* Search */}
        <div className="search-bar">
          <span style={{ fontSize: '22px' }}>🔍</span>
          <input
            placeholder="Cari nama atau alamat pelanggan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}>✕</button>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {([['ALL', 'Semua'], ['LANCAR', '✅ Lancar'], ['MENUNGGAK', '⚠️ Menunggak'], ['BLACKLIST', '🚫 Blacklist']] as [CustomerStatus | 'ALL', string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              style={{
                padding: '8px 16px', borderRadius: '999px', border: '2px solid',
                borderColor: filterStatus === val ? 'var(--primary)' : 'var(--border)',
                background: filterStatus === val ? 'var(--primary)' : 'var(--white)',
                color: filterStatus === val ? 'white' : 'var(--text-main)',
                fontFamily: 'inherit', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Add button */}
        <Link href="/pelanggan/baru" className="btn btn-primary btn-lg btn-full">
          ➕ Tambah Pelanggan Baru
        </Link>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">👤</span>
            <p className="empty-state__title">Pelanggan tidak ditemukan</p>
            <p className="empty-state__desc">Coba ubah kata pencarian atau tambah pelanggan baru</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(c => (
              <Link key={c.id} href={`/pelanggan/${c.id}`} className="list-item" style={{ textDecoration: 'none' }}>
                <div className="list-item__avatar" style={{
                  background: getDynamicStatus(c) === 'BLACKLIST' ? 'var(--danger-light)' : getDynamicStatus(c) === 'MENUNGGAK' ? 'var(--warning-light)' : 'var(--primary-light)',
                  color: getDynamicStatus(c) === 'BLACKLIST' ? 'var(--danger)' : getDynamicStatus(c) === 'MENUNGGAK' ? 'var(--warning)' : 'var(--primary)',
                  fontSize: '22px', fontWeight: 700,
                }}>
                  {c.nama.charAt(0)}
                </div>
                <div className="list-item__info">
                  <p className="list-item__name">{c.nama}</p>
                  <p className="list-item__sub" style={{ marginTop: '2px' }}>{c.alamat || '-'}</p>
                  <p className="list-item__sub">
                    Terdaftar: {new Date(c.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="list-item__right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span className={`status-badge ${getDynamicStatus(c) === 'BLACKLIST' ? 'status-blacklist' : getDynamicStatus(c) === 'MENUNGGAK' ? 'status-menunggak' : 'status-lancar'}`}
                    style={{ fontSize: '12px', padding: '3px 10px' }}>
                    {getDynamicStatus(c) === 'BLACKLIST' ? '🚫 BL' : getDynamicStatus(c) === 'MENUNGGAK' ? '⚠️ NUN' : '✅ OK'}
                  </span>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: c.total_hutang > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {c.total_hutang > 0 ? formatRupiah(c.total_hutang) : 'Lunas'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

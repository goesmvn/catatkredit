'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/mockData'
import { database } from '@/lib/db'
import { Customer } from '@/lib/db/models/Customer'
import { Transaction } from '@/lib/db/models/Transaction'
import { getSettings } from '@/lib/mockData'

type CustomerStatus = 'LANCAR' | 'BLACKLIST' | 'MENUNGGAK'

export default function PelangganPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | 'ALL'>('ALL')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const settings = getSettings()

  useEffect(() => {
    // Observe customer and transaction changes from WatermelonDB
    const custSub = database.collections.get('customers').query().observe().subscribe((data: Customer[]) => setCustomers(data))
    const txSub = database.collections.get('transactions').query().observe().subscribe((data: Transaction[]) => setTransactions(data))
    
    return () => {
      custSub.unsubscribe()
      txSub.unsubscribe()
    }
  }, [])

  const getDynamicStatus = (c: Customer): CustomerStatus => {
    if (c.status === 'BLACKLIST') return 'BLACKLIST'
    if (c.total_hutang <= 0) return 'LANCAR'
    
    const nowMs = Date.now()
    const batasMs = (settings.batas_menunggak_hari || 30) * 86400000
    const unpaidTxs = transactions.filter(t => (t as any)._raw.customer_id === c.id && t.status !== 'LUNAS')
    
    const isMenunggak = unpaidTxs.some(t => {
      const txDate = new Date(t.tanggal).getTime()
      return (nowMs - txDate) > batasMs
    })
    
    return isMenunggak ? 'MENUNGGAK' : 'LANCAR'
  }

  const filtered = customers.filter(c => {
    const matchSearch = c.nama.toLowerCase().includes(search.toLowerCase()) ||
      (c.alamat && c.alamat.toLowerCase().includes(search.toLowerCase()))
    
    const dynamicStatus = getDynamicStatus(c)
    const matchStatus = filterStatus === 'ALL' || dynamicStatus === filterStatus
    
    return matchSearch && matchStatus
  })

  // Calculate days since a date
  const daysSince = (d: number): number => {
    const diff = Date.now() - d
    return Math.floor(diff / 86400000)
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
                padding: '8px 16px',
                borderRadius: '999px',
                border: '2px solid',
                borderColor: filterStatus === val ? 'var(--primary)' : 'var(--border)',
                background: filterStatus === val ? 'var(--primary)' : 'var(--white)',
                color: filterStatus === val ? 'white' : 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
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
                  fontSize: '22px',
                  fontWeight: 700,
                }}>
                  {c.nama.charAt(0)}
                </div>
                <div className="list-item__info">
                  <p className="list-item__name">{c.nama}</p>
                  <p className="list-item__sub" style={{ marginTop: '2px' }}>{c.alamat || '-'}</p>
                  <p className="list-item__sub">
                    {/* Wait, we don't have last_payment in Customer model easily without joining */}
                    Terdaftar: {new Date(c.createdAt).toLocaleDateString('id-ID')}
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

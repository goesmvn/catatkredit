'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatRupiah } from '@/lib/mockData'
import { useSettings } from '@/lib/hooks/useSettings'
import { useAuth } from '@/lib/auth'

function PembayaranForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectId = searchParams.get('pelanggan')
  const { user } = useAuth()

  const [dbCustomers, setDbCustomers] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => setDbCustomers(data)).catch(console.error)
  }, [])

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(preSelectId || '')
  const [initialTotalHutang, setInitialTotalHutang] = useState<number | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [nominal, setNominal] = useState('')
  const [saved, setSaved] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [sisaHutang, setSisaHutang] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)

  const settings = useSettings()
  const customer = dbCustomers.find(c => c.id === selected)
  const nominalNum = parseInt(nominal.replace(/\D/g, '')) || 0
  const previewSisa = customer ? Math.max(0, customer.total_hutang - nominalNum) : 0
  const isLunas = saved ? (sisaHutang <= 0) : (customer && nominalNum >= customer.total_hutang)

  const filteredCustomers = dbCustomers.filter(c =>
    c.total_hutang > 0 && c.nama.toLowerCase().includes(search.toLowerCase())
  )

  const isOverLimit = customer ? nominalNum > customer.total_hutang : false
  const quickAmounts = [50000, 100000, 200000, 250000, 500000]
  const paymentOptions = customer ? Array.from(new Set([...quickAmounts, customer.total_hutang]))
    .filter(a => a > 0)
    .sort((a, b) => {
      if (a === customer.total_hutang) return 1
      if (b === customer.total_hutang) return -1
      return a - b
    }) : []

  const handleSave = () => {
    if (!selected) { alert('Pilih pelanggan!'); return }
    if (!nominal) { alert('Masukkan jumlah pembayaran!'); return }
    if (nominalNum <= 0) { alert('Jumlah harus lebih dari 0!'); return }
    if (isOverLimit) { alert(`Jumlah bayar tidak boleh melebihi total hutang (${formatRupiah(customer!.total_hutang)})!`); return }
    
    setShowSuccessModal(true)
  }

  // keep track of the customer's total hutang at the moment they were selected
  useEffect(() => {
    if (!selected) {
      setInitialTotalHutang(null)
      return
    }
    const c = dbCustomers.find((x: any) => x.id === selected)
    if (c && !saved) {
      setInitialTotalHutang(c.total_hutang || 0)
    }
  }, [selected, dbCustomers, saved])

  const handleConfirmSave = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    try {
      const id = crypto.randomUUID()
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          customer_id: selected,
          nominal_bayar: nominalNum,
          tanggal_bayar: Date.now(),
          created_by: user?.id || null,
        })
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      setSisaHutang(previewSisa)
      setSaved(true)
      setShowReceipt(true)
      setShowSuccessModal(false)
      // Refresh customer data
      const updatedList = await fetch('/api/customers').then(r => r.json())
      setDbCustomers(updatedList)
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan pembayaran')
      setShowSuccessModal(false)
    } finally {
      setIsSaving(false)
      savingRef.current = false
    }
  }

  const now = new Date()

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--success) 0%, #155f38 100%)',
        padding: '20px', color: 'white',
      }}>
        <button onClick={() => router.back()} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'white', color: 'var(--primary-dark)',
          padding: '8px 16px', borderRadius: '50px',
          border: 'none', cursor: 'pointer',
          fontSize: '16px', fontWeight: 700,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', marginBottom: '16px'
        }}>
          <span style={{ fontSize: '20px' }}>←</span> Kembali
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>💰 Bayar Kredit</h1>
        <p style={{ fontSize: '14px', opacity: 0.85 }}>Catat pembayaran pelanggan</p>
      </div>

      {saved && (
        <div className="toast-container">
          <div className="toast toast-success">
            {isLunas ? '🎉 LUNAS! Pembayaran berhasil disimpan' : '✅ Pembayaran berhasil disimpan'}
          </div>
        </div>
      )}

      <div className="page-body">
        {!selected ? (
          <div className="card-elevated">
            <p className="section-label" style={{ marginBottom: '12px' }}>Cari Pelanggan</p>
            <div style={{ position: 'relative' }}>
              <div className="search-bar">
                <span style={{ fontSize: '22px' }}>🔍</span>
                <input
                  placeholder="Ketik nama pelanggan yang mau bayar..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  autoFocus
                />
              </div>
              {(showDropdown || filteredCustomers.length > 0) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  background: 'var(--white)', border: '2px solid var(--border)',
                  borderRadius: 'var(--radius-md)', marginTop: '4px',
                  boxShadow: 'var(--shadow-lg)', maxHeight: '300px', overflowY: 'auto',
                }}>
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => { setSelected(c.id); setShowDropdown(false) }}
                      style={{
                        width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                        textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
                        borderBottom: '1px solid var(--border)', fontFamily: 'inherit',
                      }}>
                      <div className="list-item__avatar" style={{ width: 44, height: 44, fontSize: '18px' }}>{c.nama.charAt(0)}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '17px', fontWeight: 700 }}>{c.nama}</p>
                        <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '2px' }}>{c.alamat}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{formatRupiah(c.total_hutang)}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sisa hutang</p>
                      </div>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '16px' }}>
                      Tidak ada pelanggan dengan hutang aktif
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="section-label" style={{ marginTop: '20px' }}>Pelanggan dengan Hutang Terbesar</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dbCustomers.filter(c => c.total_hutang > 0).sort((a, b) => b.total_hutang - a.total_hutang).slice(0, 4).map(c => (
                <button key={c.id} onClick={() => setSelected(c.id)} className="list-item" style={{ background: 'var(--white)', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div className="list-item__avatar">{c.nama.charAt(0)}</div>
                  <div className="list-item__info">
                    <p className="list-item__name">{c.nama}</p>
                    <p className="list-item__sub">{c.alamat}</p>
                  </div>
                  <div className="list-item__right">
                    <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{formatRupiah(c.total_hutang)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Selected customer display */}
            <div className="card-elevated" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="list-item__avatar" style={{ width: 48, height: 48, fontSize: '20px' }}>{customer?.nama.charAt(0)}</div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '18px', fontWeight: 700 }}>{customer?.nama}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{customer?.alamat}</p>
                  </div>
                </div>
                <button onClick={() => { setSelected(''); setNominal(''); setSaved(false); setShowReceipt(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>✕</button>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '4px' }}>Total Hutang (sebelum bayar)</p>
              <p className="big-number" style={{ fontSize: '52px', color: 'var(--danger)' }}>
                {formatRupiah((saved && initialTotalHutang != null) ? initialTotalHutang : (customer?.total_hutang || 0))}
              </p>
            </div>

            {/* Input bayar */}
            {!saved && (
              <div className="card-elevated">
                <p className="section-label">Jumlah Bayar</p>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)',
                  }}>Rp</span>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={nominal ? new Intl.NumberFormat('id-ID').format(parseInt(nominal.replace(/\D/g, ''), 10) || 0) : ''}
                    onChange={e => {
                      const raw = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0
                      const maxVal = customer?.total_hutang || Infinity
                      setNominal(String(Math.min(raw, maxVal)))
                    }}
                    style={{
                      paddingLeft: '52px', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', height: '72px',
                      borderColor: isOverLimit ? 'var(--danger)' : undefined,
                      boxShadow: isOverLimit ? '0 0 0 3px rgba(239,68,68,0.15)' : undefined,
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {paymentOptions.map(amt => (
                    <button key={amt} onClick={() => setNominal(String(amt))} style={{
                      padding: '10px 8px', background: 'var(--primary-light)', border: '1.5px solid var(--primary)',
                      borderRadius: 'var(--radius-md)', color: 'var(--primary)', fontWeight: 700,
                      fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      {amt === customer?.total_hutang ? '🏁 Bayar penuh' : formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                {nominalNum > 0 && (
                  <div style={{
                    marginTop: '16px', padding: '14px', borderRadius: 'var(--radius-md)',
                    background: isOverLimit ? 'var(--danger-light)' : isLunas ? 'var(--success-light)' : 'var(--warning-light)'
                  }}>
                    {isOverLimit ? (
                      <>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--danger)' }}>⚠️ Melebihi total hutang!</p>
                        <p style={{ fontSize: '15px', color: 'var(--danger)', marginTop: '4px' }}>
                          Maksimal pembayaran: <strong>{formatRupiah(customer?.total_hutang || 0)}</strong>
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>Sisa setelah bayar:</p>
                        <p style={{ fontSize: '28px', fontWeight: 800, color: isLunas ? 'var(--success)' : 'var(--warning)' }}>
                          {isLunas ? '🎉 LUNAS!' : formatRupiah(previewSisa)}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  className="btn btn-success btn-xl btn-full"
                  disabled={isOverLimit || nominalNum <= 0 || showSuccessModal}
                  style={{ marginTop: '16px', opacity: (isOverLimit || nominalNum <= 0 || showSuccessModal) ? 0.5 : 1, cursor: isOverLimit ? 'not-allowed' : 'pointer' }}
                >
                  💾 Simpan Pembayaran
                </button>
              </div>
            )}

            {/* MODAL KONFIRMASI PEMBAYARAN */}
            {showSuccessModal && (
              <div className="overlay" style={{ zIndex: 70 }}>
                <div className="modal-sheet" style={{ paddingBottom: '32px' }}>
                  <div className="modal-handle" />
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                      Konfirmasi Pembayaran
                    </h2>
                    <p style={{ fontSize: '15px', color: 'var(--text-sub)' }}>
                      Apakah nominal pembayaran <strong style={{ color: 'var(--primary)' }}>{formatRupiah(nominalNum)}</strong> untuk <strong>{customer?.nama}</strong> sudah benar?
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => setShowSuccessModal(false)} 
                      className="btn btn-ghost btn-lg" 
                      style={{ flex: 1, borderRadius: '100px', fontWeight: 700 }}
                      disabled={isSaving}
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleConfirmSave} 
                      className={`btn btn-primary btn-lg ${isSaving ? 'btn-loading' : ''}`} 
                      style={{ flex: 1, borderRadius: '100px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
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

            {/* Saving overlay */}
            {isSaving && (
              <div className="fs-overlay">
                <div className="fs-overlay__spinner" />
                <div className="fs-overlay__text">Menyimpan pembayaran...</div>
                <div className="fs-overlay__sub">Mohon tunggu, data sedang dicatat.</div>
              </div>
            )}

            {/* Struk */}
            {showReceipt && (
              <div>
                <div className="receipt">
                  <div className="receipt__header">
                    <div className="receipt__store-name">{settings.nama_toko}</div>
                    <div className="receipt__store-meta">{settings.alamat_toko}</div>
                    <div className="receipt__store-meta">Telp: {settings.no_telepon}</div>
                    <hr />
                    <div className="receipt__title">BUKTI PEMBAYARAN CICILAN</div>
                    <div className="receipt__store-meta">{now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <hr />
                  <div className="receipt__body">
                    <div className="receipt__row"><div className="receipt__label">Pelanggan</div><div className="receipt__value">{customer?.nama}</div></div>
                    {initialTotalHutang != null && (
                      <div className="receipt__row"><div className="receipt__label">Sebelum</div><div className="receipt__value">{formatRupiah(initialTotalHutang)}</div></div>
                    )}
                    <div className="receipt__row"><div className="receipt__label">Bayar</div><div className="receipt__value">{formatRupiah(nominalNum)}</div></div>
                    <div className="receipt__callout">Sisa : {sisaHutang <= 0 ? 'LUNAS' : formatRupiah(sisaHutang)}</div>
                  </div>
                  <hr />
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <p style={{ fontSize: '13px' }}>{sisaHutang <= 0 ? '🎉 Terima kasih! Hutang Anda sudah LUNAS!' : `Terima kasih! Sisa hutang Anda ${formatRupiah(sisaHutang)}`}</p>
                  </div>
                  <hr style={{ margin: '12px 0' }} />
                  <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-sub)' }}>{settings.teks_struk}</p>
                </div>
                <button
                  onClick={() => {
                    try {
                      // buka dialog cetak browser (atau handler cetak Bluetooth jika ada)
                      window.print?.()
                    } catch (e) {
                      console.error('Print failed', e)
                    } finally {
                      // setelah memicu cetak, kembali ke detail pelanggan yang membayar
                      setTimeout(() => router.push(`/pelanggan/${selected}`), 600)
                    }
                  }}
                  className="btn btn-primary btn-xl btn-full"
                  style={{ marginTop: '12px' }}
                >
                  🖨️ Cetak Struk
                </button>
                <button
                  onClick={() => router.push(`/pelanggan/${selected}`)}
                  className="btn btn-ghost btn-lg btn-full"
                  style={{ marginTop: '8px' }}
                >
                  Tidak, Kembali ke Detail Pelanggan
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function PembayaranPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>Loading...</div>}>
      <PembayaranForm />
    </Suspense>
  )
}

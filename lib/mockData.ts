// Shared mock data — simulates what a real DB would return
// Semua fitur frontend menggunakan ini sebagai "state" awal

export type CustomerStatus = 'LANCAR' | 'BLACKLIST' | 'MENUNGGAK'
export type TransactionStatus = 'LUNAS' | 'BELUM_LUNAS'

export interface AppSettings {
  nama_toko: string
  alamat_toko: string
  no_telepon: string
  teks_struk: string
  batas_menunggak_hari: number
}

export interface Item {
  id: string
  nama: string
  harga_default: number
}

export interface TransactionItem {
  id: string
  nama_barang: string
  qty: number
  harga_satuan: number
  subtotal: number
}

export interface Customer {
  id: string
  nama: string
  alamat: string
  no_hp: string
  ciri_ciri: string
  foto_url: string | null
  status: CustomerStatus
  total_hutang: number
  last_payment: string | null
  created_at: string
}

export interface Transaction {
  id: string
  customer_id: string
  total_harga: number
  tanggal: string
  status: TransactionStatus
  items: TransactionItem[]
}

export interface Payment {
  id: string
  customer_id: string
  customer_nama: string
  nominal_bayar: number
  tanggal_bayar: string
  sisa_hutang: number
}

export const mockCustomers: Customer[] = [
  {
    id: 'c1',
    nama: 'Ibu Sari Dewi',
    alamat: 'Jl. Mawar No. 12, Kerobokan',
    no_hp: '08123456789',
    ciri_ciri: 'Ibu berkacamata tebal, sering pakai baju batik, ramah',
    foto_url: null,
    status: 'LANCAR',
    total_hutang: 450000,
    last_payment: '2026-04-28',
    created_at: '2026-03-01',
  },
  {
    id: 'c2',
    nama: 'Pak Wayan Suka',
    alamat: 'Jl. Kamboja No. 5, Denpasar',
    no_hp: '08987654321',
    ciri_ciri: 'Bapak tinggi besar, motor merah, biasanya belanja pagi',
    foto_url: null,
    status: 'MENUNGGAK',
    total_hutang: 1250000,
    last_payment: '2026-03-15',
    created_at: '2026-02-10',
  },
  {
    id: 'c3',
    nama: 'Ni Made Ayu',
    alamat: 'Jl. Nusa Indah No. 3, Gianyar',
    no_hp: '08567891234',
    ciri_ciri: 'Ibu muda, selalu bawa tas belanja hijau besar',
    foto_url: null,
    status: 'BLACKLIST',
    total_hutang: 2100000,
    last_payment: '2026-01-20',
    created_at: '2025-12-01',
  },
  {
    id: 'c4',
    nama: 'Pak Kadek Rasta',
    alamat: 'Jl. Pulau Moyo No. 8, Badung',
    no_hp: '08234567890',
    ciri_ciri: 'Bapak tua berambut putih, naik sepeda',
    foto_url: null,
    status: 'LANCAR',
    total_hutang: 0,
    last_payment: '2026-04-30',
    created_at: '2026-01-15',
  },
  {
    id: 'c5',
    nama: 'Ibu Komang Rini',
    alamat: 'Jl. Teratai No. 22, Tabanan',
    no_hp: '08345678901',
    ciri_ciri: 'Ibu berambut pendek, sering bawa cucu',
    foto_url: null,
    status: 'MENUNGGAK',
    total_hutang: 875000,
    last_payment: '2026-03-01',
    created_at: '2026-02-01',
  },
]

export let mockTransactions: Transaction[] = [
  {
    id: 't1',
    customer_id: 'c1',
    total_harga: 250000,
    tanggal: '2026-04-20',
    status: 'BELUM_LUNAS',
    items: [
      { id: '1', nama_barang: 'Beras 5kg', qty: 2, harga_satuan: 75000, subtotal: 150000 },
      { id: '2', nama_barang: 'Minyak Goreng 1L', qty: 5, harga_satuan: 16000, subtotal: 80000 },
      { id: '3', nama_barang: 'Gula Pasir 1kg', qty: 1, harga_satuan: 20000, subtotal: 20000 },
    ],
  },
  {
    id: 't2',
    customer_id: 'c1',
    total_harga: 200000,
    tanggal: '2026-04-25',
    status: 'BELUM_LUNAS',
    items: [
      { id: '4', nama_barang: 'Sabun Mandi', qty: 10, harga_satuan: 4000, subtotal: 40000 },
      { id: '5', nama_barang: 'Sampo', qty: 10, harga_satuan: 12000, subtotal: 120000 },
      { id: '6', nama_barang: 'Pasta Gigi', qty: 4, harga_satuan: 10000, subtotal: 40000 },
    ],
  },
  {
    id: 't3',
    customer_id: 'c2',
    total_harga: 1250000,
    tanggal: '2026-03-10',
    status: 'BELUM_LUNAS',
    items: [
      { id: '7', nama_barang: 'Gas LPG 12kg', qty: 5, harga_satuan: 220000, subtotal: 1100000 },
      { id: '8', nama_barang: 'Beras 10kg', qty: 1, harga_satuan: 150000, subtotal: 150000 },
    ],
  },
  {
    id: 't4',
    customer_id: 'c4',
    total_harga: 350000,
    tanggal: '2026-04-28',
    status: 'LUNAS',
    items: [
      { id: '9', nama_barang: 'Beras 5kg', qty: 4, harga_satuan: 75000, subtotal: 300000 },
      { id: '10', nama_barang: 'Telur 1 kg', qty: 2, harga_satuan: 25000, subtotal: 50000 },
    ],
  },
]

export let mockPayments: Payment[] = [
  {
    id: 'p1',
    customer_id: 'c1',
    customer_nama: 'Ibu Sari Dewi',
    nominal_bayar: 100000,
    tanggal_bayar: '2026-04-30',
    sisa_hutang: 450000,
  },
  {
    id: 'p2',
    customer_id: 'c4',
    customer_nama: 'Pak Kadek Rasta',
    nominal_bayar: 350000,
    tanggal_bayar: '2026-04-30',
    sisa_hutang: 0,
  },
  {
    id: 'p3',
    customer_id: 'c5',
    customer_nama: 'Ibu Komang Rini',
    nominal_bayar: 50000,
    tanggal_bayar: '2026-04-29',
    sisa_hutang: 875000,
  },
]

export let mockItems: Item[] = [
  { id: 'i1', nama: 'Beras 5kg', harga_default: 75000 },
  { id: 'i2', nama: 'Beras 10kg', harga_default: 145000 },
  { id: 'i3', nama: 'Minyak Goreng 1L', harga_default: 16000 },
  { id: 'i4', nama: 'Gula Pasir 1kg', harga_default: 17000 },
  { id: 'i5', nama: 'Sabun Mandi', harga_default: 4000 },
  { id: 'i6', nama: 'Sampo', harga_default: 12000 },
  { id: 'i7', nama: 'Gas LPG 3kg', harga_default: 20000 },
]

export let mockSettings: AppSettings = {
  nama_toko: 'CatatKredit',
  alamat_toko: 'Pasar Induk Blok A, Denpasar',
  no_telepon: '0812-3456-7890',
  teks_struk: 'Terima kasih telah berbelanja! Barang yang sudah dibeli tidak dapat ditukar.',
  batas_menunggak_hari: 30,
}

export const getSettings = () => mockSettings
export const updateSettings = (newSettings: Partial<AppSettings>) => {
  mockSettings = { ...mockSettings, ...newSettings }
}

// Helpers
export const formatRupiah = (n: number | null | undefined): string => {
  const value = typeof n === 'number' && !Number.isNaN(n) ? n : 0
  return 'Rp ' + value.toLocaleString('id-ID')
}

export const formatDate = (d: string | number | Date | null | undefined): string => {
  const date = d == null ? null : new Date(d)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export const formatDateTime = (d: string | number | Date | null | undefined): string => {
  const date = d == null ? null : new Date(d)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const daysSince = (d: string | number | Date | null | undefined): number => {
  const date = d == null ? null : new Date(d)
  if (!date || Number.isNaN(date.getTime())) return 0
  const diff = Date.now() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export const getTotalPiutang = (): number => {
  return mockCustomers.reduce((sum, c) => sum + c.total_hutang, 0)
}

export const getUangMasukHariIni = (): number => {
  const today = new Date().toISOString().split('T')[0]
  return mockPayments
    .filter(p => p.tanggal_bayar === today)
    .reduce((sum, p) => sum + p.nominal_bayar, 0)
}

export const getMenunggakCount = (): number => {
  return mockCustomers.filter(c => {
    if (!c.last_payment || c.total_hutang === 0) return false
    return daysSince(c.last_payment) > mockSettings.batas_menunggak_hari
  }).length
}

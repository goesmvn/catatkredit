import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { db, initDB } from '@/lib/db/server/sqlite'

initDB()

const DEFAULT_SETTINGS = {
  nama_toko: 'CatatKredit',
  alamat_toko: 'Pasar Induk Blok A, Denpasar',
  no_telepon: '0812-3456-7890',
  teks_struk: 'Terima kasih telah berbelanja! Barang yang sudah dibeli tidak dapat ditukar.',
  batas_menunggak_hari: 30,
}

const ALLOWED_KEYS = ['nama_toko', 'alamat_toko', 'no_telepon', 'teks_struk', 'batas_menunggak_hari']

export async function GET() {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const result: any = { ...DEFAULT_SETTINGS }
    for (const r of rows) {
      if (!r || !r.key) continue
      if (r.key === 'batas_menunggak_hari') {
        const n = parseInt(r.value, 10)
        result[r.key] = Number.isNaN(n) ? DEFAULT_SETTINGS.batas_menunggak_hari : n
      } else {
        result[r.key] = r.value
      }
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const entries = Object.entries(body).filter(([k]) => ALLOWED_KEYS.includes(k))
    if (entries.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

    const now = Date.now()
    const tx = db.transaction((items: Array<[string, any]>) => {
      for (const [k, v] of items) {
        const value = v == null ? '' : (typeof v === 'number' ? String(v) : String(v))
        db.prepare(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).run(k, value, now)
      }
    })

    tx(entries)

    // return updated settings
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const result: any = { ...DEFAULT_SETTINGS }
    for (const r of rows) {
      if (!r || !r.key) continue
      if (r.key === 'batas_menunggak_hari') {
        const n = parseInt(r.value, 10)
        result[r.key] = Number.isNaN(n) ? DEFAULT_SETTINGS.batas_menunggak_hari : n
      } else {
        result[r.key] = r.value
      }
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

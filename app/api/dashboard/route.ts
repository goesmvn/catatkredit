import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET() {
  try {
    const customers = (db.prepare('SELECT * FROM customers WHERE deleted_at IS NULL').all() as any[]) || [];
    const transactions = (db.prepare('SELECT * FROM transactions WHERE deleted_at IS NULL').all() as any[]) || [];
    const payments = (db.prepare('SELECT * FROM payments WHERE deleted_at IS NULL').all() as any[]) || [];

    const totalPiutang = customers.reduce((s: number, c: any) => s + (Number(c.total_hutang) || 0), 0);
    const todayStr = new Date().toLocaleDateString('id-ID');

    const uangMasukHariIni = (payments || []).reduce((s: number, p: any) => {
      try {
        let ts: any = p.tanggal_bayar;
        if (ts == null) return s;
        if (typeof ts === 'string' && /^\d+$/.test(ts)) ts = parseInt(ts, 10);
        if (typeof ts === 'string') {
          const parsed = Date.parse(ts);
          if (!Number.isNaN(parsed)) ts = parsed;
        }
        if (typeof ts === 'number' && !Number.isNaN(ts)) {
          if (new Date(ts).toLocaleDateString('id-ID') === todayStr) {
            return s + (Number(p.nominal_bayar) || 0);
          }
        }
      } catch (err) {
        console.warn('Skipping malformed payment row in dashboard calculation', err, p && p.id);
      }
      return s;
    }, 0);

    // normalize transactions timestamps to numbers to avoid downstream errors in UI
    const normalizedTransactions = (transactions || []).map((t: any) => {
      const tt: any = { ...t };
      try {
        let tv: any = tt.tanggal;
        if (tv == null) tv = 0;
        if (typeof tv === 'string' && /^\d+$/.test(tv)) tv = parseInt(tv, 10);
        if (typeof tv === 'string') {
          const parsed = Date.parse(tv);
          tv = Number.isNaN(parsed) ? 0 : parsed;
        }
        tt.tanggal = typeof tv === 'number' && !Number.isNaN(tv) ? tv : 0;
      } catch (err) {
        tt.tanggal = 0;
      }
      return tt;
    });

    return NextResponse.json({
      totalPiutang,
      uangMasukHariIni,
      totalCustomers: customers.length,
      blacklistCount: customers.filter((c: any) => c.status === 'BLACKLIST').length,
      customers,
      transactions: normalizedTransactions.slice(0, 20),
      payments: (payments || []).slice(0, 20),
    });
  } catch (e: any) {
    console.error('Dashboard API error:', e);
    return NextResponse.json({ error: e?.message || String(e), stack: e?.stack }, { status: 500 });
  }
}

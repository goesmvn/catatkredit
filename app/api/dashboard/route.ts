import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET() {
  try {
    const customers = db.prepare('SELECT * FROM customers WHERE deleted_at IS NULL').all() as any[];
    const transactions = db.prepare('SELECT * FROM transactions WHERE deleted_at IS NULL').all() as any[];
    const payments = db.prepare('SELECT * FROM payments WHERE deleted_at IS NULL').all() as any[];

    const totalPiutang = customers.reduce((s: number, c: any) => s + (c.total_hutang || 0), 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const uangMasukHariIni = payments
      .filter((p: any) => {
        if (!p.tanggal_bayar) return false;
        try {
          return new Date(p.tanggal_bayar).toISOString().split('T')[0] === todayStr;
        } catch (err) {
          return false;
        }
      })
      .reduce((s: number, p: any) => s + (p.nominal_bayar || 0), 0);

    return NextResponse.json({
      totalPiutang,
      uangMasukHariIni,
      totalCustomers: customers.length,
      blacklistCount: customers.filter((c: any) => c.status === 'BLACKLIST').length,
      customers,
      transactions: transactions.slice(0, 20),
      payments: payments.slice(0, 20),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

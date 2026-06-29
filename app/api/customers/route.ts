import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

import { calculateCustomerStatus } from '@/lib/utils/status';

export async function GET() {
  try {
    const customers = db.prepare('SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY nama ASC').all() as any[];
    const transactions = db.prepare('SELECT customer_id, total_harga, tanggal FROM transactions WHERE deleted_at IS NULL').all() as any[];
    const payments = db.prepare('SELECT customer_id, nominal_bayar, tanggal_bayar FROM payments WHERE deleted_at IS NULL').all() as any[];

    // Get settings to find batas_menunggak_hari
    const settingsRows = (db.prepare('SELECT key, value FROM settings').all() as any[]) || [];
    const settings: any = {};
    settingsRows.forEach(r => {
      if (r && r.key) {
        settings[r.key] = r.value;
      }
    });
    const batasMenunggakHari = parseInt(settings.batas_menunggak_hari, 10) || 30;

    const txMap = new Map<string, any[]>();
    transactions.forEach(t => {
      if (!txMap.has(t.customer_id)) txMap.set(t.customer_id, []);
      txMap.get(t.customer_id)!.push(t);
    });

    const pmMap = new Map<string, any[]>();
    payments.forEach(p => {
      if (!pmMap.has(p.customer_id)) pmMap.set(p.customer_id, []);
      pmMap.get(p.customer_id)!.push(p);
    });

    const nowMs = Date.now();

    const normalizedCustomers = customers.map(c => {
      const cTxs = txMap.get(c.id) || [];
      const cPms = pmMap.get(c.id) || [];
      const dynamicStatus = calculateCustomerStatus(c, cTxs, cPms, batasMenunggakHari, nowMs);
      return {
        ...c,
        status: dynamicStatus
      };
    });

    return NextResponse.json(normalizedCustomers);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nama, alamat, no_hp, ciri_ciri, foto_url } = body;
    const now = Date.now();
    db.prepare(
      `INSERT INTO customers (id, nama, alamat, no_hp, ciri_ciri, foto_url, status, total_hutang, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'LANCAR', 0, ?, ?)`
    ).run(id, nama, alamat || null, no_hp || null, ciri_ciri || null, foto_url || null, now, now);
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

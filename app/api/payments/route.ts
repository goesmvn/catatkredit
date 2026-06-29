import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';
import { syncCustomerStatusInDB } from '@/lib/db/server/status-sync';

initDB();

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM payments WHERE deleted_at IS NULL ORDER BY tanggal_bayar DESC').all();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, customer_id, nominal_bayar, tanggal_bayar, created_by } = body;
    // Idempotency: jika pembayaran dengan id ini sudah ada, kembalikan saja
    if (id) {
      const exists = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
      if (exists) return NextResponse.json(exists, { status: 200 });
    }
    const now = Date.now();

    const insertPayment = db.transaction(() => {
      const customer = db.prepare('SELECT total_hutang FROM customers WHERE id = ?').get(customer_id) as any;
      const currentHutang = customer?.total_hutang || 0;
      const newHutang = Math.max(0, currentHutang - nominal_bayar);

      db.prepare(
        `INSERT INTO payments (id, customer_id, nominal_bayar, tanggal_bayar, created_by, sisa_hutang, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, customer_id, nominal_bayar, tanggal_bayar || now, created_by || null, newHutang, now, now);

      db.prepare('UPDATE customers SET total_hutang = ?, updated_at = ? WHERE id = ?')
        .run(newHutang, now, customer_id);

      syncCustomerStatusInDB(customer_id, now);
    });

    insertPayment();
    const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

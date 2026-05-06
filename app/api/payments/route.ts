import { NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';

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
    const now = Date.now();

    const insertPayment = db.transaction(() => {
      db.prepare(
        `INSERT INTO payments (id, customer_id, nominal_bayar, tanggal_bayar, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, customer_id, nominal_bayar, tanggal_bayar || now, created_by || null, now, now);

      // Reduce total_hutang customer
      const customer = db.prepare('SELECT total_hutang FROM customers WHERE id = ?').get(customer_id) as any;
      const newHutang = Math.max(0, (customer?.total_hutang || 0) - nominal_bayar);
      const newStatus = newHutang <= 0 ? 'LANCAR' : 'MENUNGGAK';
      db.prepare('UPDATE customers SET total_hutang = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(newHutang, newStatus, now, customer_id);
    });

    insertPayment();
    const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

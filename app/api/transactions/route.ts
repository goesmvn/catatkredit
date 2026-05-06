import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY tanggal DESC').all();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, customer_id, total_harga, tanggal, status, created_by, items } = body;
    const now = Date.now();

    const insertTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO transactions (id, customer_id, total_harga, tanggal, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, customer_id, total_harga, tanggal || now, status || 'BELUM_LUNAS', created_by || null, now, now);

      for (const item of (items || [])) {
        db.prepare(
          `INSERT INTO transaction_items (id, transaction_id, item_tag_name, nama_barang, qty, harga_satuan, subtotal, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(item.id, id, item.item_tag_name || null, item.nama_barang, item.qty, item.harga_satuan, item.subtotal, now, now);
      }

      // Update total hutang customer
      db.prepare('UPDATE customers SET total_hutang = total_hutang + ?, updated_at = ? WHERE id = ?')
        .run(total_harga, now, customer_id);
    });

    insertTx();
    const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

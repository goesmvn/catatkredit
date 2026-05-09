import { NextResponse } from 'next/server';
import crypto from 'crypto';
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
        // 1. Simpan ke detail transaksi
        db.prepare(
          `INSERT INTO transaction_items (id, transaction_id, item_tag_name, nama_barang, qty, harga_satuan, subtotal, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(item.id, id, item.item_tag_name || item.nama_barang, item.nama_barang, item.qty, item.harga_satuan, item.subtotal, now, now);

        // 2. Simpan atau perbarui harga ke Master Barang (item_tags)
        const existingItem = db.prepare('SELECT id FROM item_tags WHERE nama_barang = ?').get(item.nama_barang);
        if (existingItem) {
          db.prepare('UPDATE item_tags SET harga_default = ?, updated_at = ? WHERE id = ?')
            .run(item.harga_satuan, now, existingItem.id);
        } else {
          db.prepare(
            `INSERT INTO item_tags (id, nama_barang, harga_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
          ).run(crypto.randomUUID(), item.nama_barang, item.harga_satuan, now, now);
        }
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

import { NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';
import { syncCustomerStatusInDB } from '@/lib/db/server/status-sync';

initDB();

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = Date.now();

    const deleteTx = db.transaction(() => {
      // Get transaction details first to get customer_id and total_harga
      const tx = db.prepare('SELECT customer_id, total_harga FROM transactions WHERE id = ?').get(id) as any;
      
      if (!tx) {
        throw new Error('Transaksi tidak ditemukan');
      }

      // 1. Soft delete transaction
      db.prepare('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?')
        .run(now, now, id);

      // 2. Soft delete transaction items
      db.prepare('UPDATE transaction_items SET deleted_at = ?, updated_at = ? WHERE transaction_id = ?')
        .run(now, now, id);

      // 3. Update customer total_hutang
      db.prepare('UPDATE customers SET total_hutang = total_hutang - ?, updated_at = ? WHERE id = ?')
        .run(tx.total_harga, now, tx.customer_id);

      syncCustomerStatusInDB(tx.customer_id, now);
    });

    deleteTx();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { total_harga, status, items } = body;
    const now = Date.now();

    const updateTx = db.transaction(() => {
      const oldTx = db.prepare('SELECT customer_id, total_harga FROM transactions WHERE id = ?').get(id) as any;
      if (!oldTx) throw new Error('Transaksi tidak ditemukan');

      // Update transaction fields
      if (total_harga !== undefined || status !== undefined) {
        db.prepare(`
          UPDATE transactions 
          SET total_harga = COALESCE(?, total_harga), 
               status = COALESCE(?, status), 
               updated_at = ? 
          WHERE id = ?
        `).run(total_harga, status, now, id);
      }

      // If total_harga changed, update customer total_hutang
      if (total_harga !== undefined && total_harga !== oldTx.total_harga) {
        const diff = total_harga - oldTx.total_harga;
        db.prepare('UPDATE customers SET total_hutang = total_hutang + ?, updated_at = ? WHERE id = ?')
          .run(diff, now, oldTx.customer_id);
      }

      // If items provided, replace them (simple implementation: delete old, insert new)
      if (items) {
        db.prepare('DELETE FROM transaction_items WHERE transaction_id = ?').run(id);
        for (const item of items) {
          db.prepare(`
            INSERT INTO transaction_items (id, transaction_id, item_tag_name, nama_barang, qty, harga_satuan, subtotal, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(item.id || crypto.randomUUID(), id, item.item_tag_name || item.nama_barang, item.nama_barang, item.qty, item.harga_satuan, item.subtotal, now, now);
        }
      }

      syncCustomerStatusInDB(oldTx.customer_id, now);
    });

    updateTx();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

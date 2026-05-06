import { NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL').get(params.id);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const transactions = db.prepare('SELECT * FROM transactions WHERE customer_id = ? AND deleted_at IS NULL ORDER BY tanggal DESC').all(params.id);
    const payments = db.prepare('SELECT * FROM payments WHERE customer_id = ? AND deleted_at IS NULL ORDER BY tanggal_bayar DESC').all(params.id);
    const items = db.prepare(
      `SELECT ti.* FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.customer_id = ? AND ti.deleted_at IS NULL`
    ).all(params.id);
    return NextResponse.json({ customer, transactions, payments, items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const now = Date.now();
    const allowed = ['nama', 'alamat', 'no_hp', 'ciri_ciri', 'foto_url', 'status', 'total_hutang'];
    const fields = Object.keys(body).filter(k => allowed.includes(k));
    if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => body[f]);
    db.prepare(`UPDATE customers SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, params.id);
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(params.id);
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run(Date.now(), params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

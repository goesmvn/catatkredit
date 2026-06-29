import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';
import { calculateCustomerStatus } from '@/lib/utils/status';

initDB();

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL').get(id) as any;
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const transactions = db.prepare('SELECT * FROM transactions WHERE customer_id = ? AND deleted_at IS NULL ORDER BY tanggal DESC').all(id) as any[];
    const payments = db.prepare('SELECT * FROM payments WHERE customer_id = ? AND deleted_at IS NULL ORDER BY tanggal_bayar DESC').all(id) as any[];
    
    // Get settings to find batas_menunggak_hari
    const settingsRows = (db.prepare('SELECT key, value FROM settings').all() as any[]) || [];
    const settings: any = {};
    settingsRows.forEach(r => {
      if (r && r.key) {
        settings[r.key] = r.value;
      }
    });
    const batasMenunggakHari = parseInt(settings.batas_menunggak_hari, 10) || 30;

    const dynamicStatus = calculateCustomerStatus(customer, transactions, payments, batasMenunggakHari, Date.now());
    const customerWithStatus = { ...customer, status: dynamicStatus };

    const items = db.prepare(
      `SELECT ti.* FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.customer_id = ? AND ti.deleted_at IS NULL`
    ).all(id);
    return NextResponse.json({ customer: customerWithStatus, transactions, payments, items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const now = Date.now();
    const allowed = ['nama', 'alamat', 'no_hp', 'ciri_ciri', 'foto_url', 'status', 'total_hutang'];
    const fields = Object.keys(body).filter(k => allowed.includes(k));
    if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => body[f]);
    db.prepare(`UPDATE customers SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id);
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?').run(Date.now(), id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

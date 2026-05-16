import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const { nominal_bayar } = body;

    const oldPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    if (!oldPayment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const customer_id = oldPayment.customer_id;

    const updatePayment = db.transaction(() => {
      const customer = db.prepare('SELECT total_hutang FROM customers WHERE id = ?').get(customer_id) as any;
      const currentHutang = customer?.total_hutang || 0;
      
      // Revert the old payment
      const revertedHutang = currentHutang + oldPayment.nominal_bayar;
      
      // Apply the new payment
      const newHutang = Math.max(0, revertedHutang - nominal_bayar);
      const now = Date.now();

      db.prepare(
        `UPDATE payments SET nominal_bayar = ?, sisa_hutang = ?, updated_at = ? WHERE id = ?`
      ).run(nominal_bayar, newHutang, now, id);

      const newStatus = newHutang <= 0 ? 'LANCAR' : 'MENUNGGAK';
      db.prepare('UPDATE customers SET total_hutang = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(newHutang, newStatus, now, customer_id);
    });

    updatePayment();
    const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    return NextResponse.json(updatedPayment, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const oldPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    if (!oldPayment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const customer_id = oldPayment.customer_id;

    const deletePayment = db.transaction(() => {
      const customer = db.prepare('SELECT total_hutang FROM customers WHERE id = ?').get(customer_id) as any;
      const currentHutang = customer?.total_hutang || 0;
      
      // Revert the old payment
      const newHutang = currentHutang + oldPayment.nominal_bayar;
      const now = Date.now();

      db.prepare(`UPDATE payments SET deleted_at = ?, updated_at = ? WHERE id = ?`)
        .run(now, now, id);

      const newStatus = newHutang <= 0 ? 'LANCAR' : 'MENUNGGAK';
      db.prepare('UPDATE customers SET total_hutang = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(newHutang, newStatus, now, customer_id);
    });

    deletePayment();
    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

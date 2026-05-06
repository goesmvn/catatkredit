import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY nama ASC').all();
    return NextResponse.json(rows);
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

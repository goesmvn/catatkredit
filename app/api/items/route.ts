import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM item_tags WHERE deleted_at IS NULL ORDER BY nama_barang ASC').all();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nama_barang, harga_default } = body;
    const now = Date.now();
    db.prepare(
      `INSERT INTO item_tags (id, nama_barang, harga_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(id, nama_barang, harga_default || 0, now, now);
    const row = db.prepare('SELECT * FROM item_tags WHERE id = ?').get(id);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

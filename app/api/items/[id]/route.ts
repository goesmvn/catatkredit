import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json();
    const { nama_barang, harga_default } = body;
    const now = Date.now();
    const fields = [] as string[];
    const values = [] as unknown[];
    if (typeof nama_barang === 'string') {
      fields.push('nama_barang = ?');
      values.push(nama_barang);
    }
    if (typeof harga_default === 'number') {
      fields.push('harga_default = ?');
      values.push(harga_default);
    }
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    }
    values.push(now, id);
    db.prepare(`UPDATE item_tags SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM item_tags WHERE id = ?').get(id);
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    db.prepare('UPDATE item_tags SET deleted_at = ? WHERE id = ?').run(Date.now(), id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

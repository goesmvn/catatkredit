import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const now = Date.now();
    const allowed = ['username', 'nama_lengkap', 'role', 'pin'];
    const fields = Object.keys(body).filter(k => allowed.includes(k));
    if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => body[f]);
    db.prepare(`UPDATE profiles SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, params.id);
    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(params.id);
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    db.prepare('UPDATE profiles SET deleted_at = ? WHERE id = ?').run(Date.now(), params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM profiles WHERE deleted_at IS NULL').all();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, username, nama_lengkap, role, pin } = body;
    const now = Date.now();
    db.prepare(
      `INSERT INTO profiles (id, username, nama_lengkap, role, pin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, username, nama_lengkap, role || 'KASIR', pin, now, now);
    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

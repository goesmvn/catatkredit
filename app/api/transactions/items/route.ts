import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM transaction_items WHERE deleted_at IS NULL').all();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

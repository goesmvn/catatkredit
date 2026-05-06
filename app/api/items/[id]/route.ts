import { NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    db.prepare('UPDATE item_tags SET deleted_at = ? WHERE id = ?').run(Date.now(), params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

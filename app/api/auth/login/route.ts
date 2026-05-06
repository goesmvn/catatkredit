import { NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();
    const profile = db.prepare(
      'SELECT * FROM profiles WHERE username = ? AND pin = ? AND deleted_at IS NULL'
    ).get(username, pin);

    if (!profile) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return NextResponse.json(profile);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

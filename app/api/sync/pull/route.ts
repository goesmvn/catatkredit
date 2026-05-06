import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, initDB } from '@/lib/db/server/sqlite';

// Inisialisasi DB di setiap request untuk memastikan tabel ada (cepat di SQLite)
initDB();

const TABLES = ['profiles', 'customers', 'transactions', 'transaction_items', 'payments', 'item_tags'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lastPulledAt = parseInt(searchParams.get('last_pulled_at') || '0', 10);

  const changes: any = {};
  const timestamp = Date.now();

  try {
    for (const table of TABLES) {
      changes[table] = {
        created: db.prepare(`SELECT * FROM ${table} WHERE created_at > ? AND deleted_at IS NULL`).all(lastPulledAt),
        updated: db.prepare(`SELECT * FROM ${table} WHERE updated_at > ? AND created_at <= ? AND deleted_at IS NULL`).all(lastPulledAt, lastPulledAt),
        deleted: db.prepare(`SELECT id FROM ${table} WHERE deleted_at > ?`).all(lastPulledAt).map((r: any) => r.id),
      };
    }

    return NextResponse.json({ changes, timestamp });
  } catch (error: any) {
    console.error('Pull Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

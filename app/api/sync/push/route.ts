import { NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';

initDB();

export async function POST(request: Request) {
  try {
    const { changes } = await request.json();

    // Gunakan transaction SQLite agar aman
    const pushTransaction = db.transaction((changesPayload: any) => {
      for (const [tableName, tableChanges] of Object.entries(changesPayload)) {
        const { created, updated, deleted } = tableChanges as any;

        // 1. CREATED
        if (created && created.length > 0) {
          const cols = Object.keys(created[0]).join(', ');
          const placeholders = Object.keys(created[0]).map(() => '?').join(', ');
          const stmt = db.prepare(`INSERT OR IGNORE INTO ${tableName} (${cols}) VALUES (${placeholders})`);
          
          for (const record of created) {
            stmt.run(...Object.values(record));
          }
        }

        // 2. UPDATED
        if (updated && updated.length > 0) {
          const keys = Object.keys(updated[0]).filter(k => k !== 'id');
          const setClause = keys.map(k => `${k} = ?`).join(', ');
          const stmt = db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`);
          
          for (const record of updated) {
            const values = keys.map(k => record[k]);
            stmt.run(...values, record.id);
          }
        }

        // 3. DELETED
        if (deleted && deleted.length > 0) {
          const stmt = db.prepare(`UPDATE ${tableName} SET deleted_at = ? WHERE id = ?`);
          const now = Date.now();
          for (const id of deleted) {
            stmt.run(now, id);
          }
        }
      }
    });

    pushTransaction(changes);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

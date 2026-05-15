import { NextRequest, NextResponse } from 'next/server';
import { db, initDB } from '@/lib/db/server/sqlite';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

// Helper function untuk mengatasi TypeScript strict-mode di block catch
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(request: NextRequest) {
  // BACKUP operation
  try {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'catatbon.db');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
    }

    // Ensure WAL is checkpointed so the main DB file contains latest data
    try {
      // If `db` is available, force a checkpoint which will flush WAL into the main DB
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (ckErr: unknown) {
      // Non-fatal: continue to read file, but warn
      console.warn('WAL checkpoint failed before backup:', getErrorMessage(ckErr));
    }

    const fileBuffer = fs.readFileSync(dbPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="backup_catatbon_${new Date().toISOString().split('T')[0]}.db"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'reset') {
    try {
      const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'catatbon.db');
      console.log('[maintenance] reset handler starting, dbPath=', dbPath);
      // Use a fresh, local Database instance for maintenance operations to avoid
      // relying on the module-level connection which may be closed in some dev-server workers.
      console.log('[maintenance] opening temporary Database instance for reset');
      const tempDb = new Database(dbPath);
      console.log('[maintenance] temporary Database opened, proceeding with transaction');
      
      try {
        try {
          tempDb.pragma('journal_mode = WAL');
        } catch { /* ignore */ }

        tempDb.transaction(() => {
          tempDb.prepare('DELETE FROM transaction_items').run();
          tempDb.prepare('DELETE FROM transactions').run();
          tempDb.prepare('DELETE FROM payments').run();
          tempDb.prepare('DELETE FROM customers').run();
          tempDb.prepare('DELETE FROM item_tags').run();

          try {
            tempDb.prepare("DELETE FROM sqlite_sequence").run();
          } catch {
            // Ignore if sqlite_sequence doesn't exist
          }
        })();
      } finally {
        try { tempDb.close(); } catch { /* ignore */ }
      }

      // Ensure module-level wrapper re-initializes if needed
      try { 
        initDB(); 
      } catch (initErr: unknown) { 
        console.warn('initDB() after reset failed:', getErrorMessage(initErr)); 
      }

      return NextResponse.json({ success: true, message: 'Database has been reset' });
    } catch (e: unknown) {
      console.error('Reset Database Error:', e);
      return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
  }

  if (action === 'restore') {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Write uploaded DB to a temporary file and ATTACH it as 'src', then copy tables
      const tmpDir = os.tmpdir();
      const tmpName = `catatbon_restore_${Date.now()}-${crypto.randomBytes(6).toString('hex')}.db`;
      const tmpPath = path.join(tmpDir, tmpName);
      fs.writeFileSync(tmpPath, buffer);

      const mainDbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'catatbon.db');

      try {
        // Use a fresh Database instance for the main DB to avoid module-level reopening issues
        const mainDb = new Database(mainDbPath);
        try {
          try { mainDb.pragma('journal_mode = WAL'); } catch { }

          const escapedTmp = tmpPath.replace(/'/g, "''");
          mainDb.exec(`ATTACH DATABASE '${escapedTmp}' AS src;`);

          // Determine which tables exist in the source
          let srcTables: string[] = [];
          try {
            // Explicitly cast to an array of objects to fix TS errors
            const rows = mainDb.prepare("SELECT name FROM src.sqlite_master WHERE type='table'").all() as { name: string }[];
            srcTables = rows.map(r => r.name).filter(Boolean);
          } catch (e: unknown) {
            console.warn('[maintenance] could not list src tables:', getErrorMessage(e));
          }

          const tables = ['profiles','customers','item_tags','transactions','transaction_items','payments','settings'];

          // Copy data inside a single transaction; disable foreign keys during copy
          mainDb.transaction(() => {
            try { mainDb.exec('PRAGMA foreign_keys = OFF'); } catch { }

            for (const t of tables) {
              if (!srcTables.includes(t)) {
                console.warn('[maintenance] source missing table, skipping:', t);
                continue;
              }

              try {
                mainDb.exec(`DELETE FROM ${t}`);
              } catch (delErr: unknown) {
                console.warn('[maintenance] delete failed for', t, getErrorMessage(delErr));
              }

              try {
                mainDb.exec(`INSERT INTO ${t} SELECT * FROM src.${t}`);
              } catch (insErr: unknown) {
                console.warn('[maintenance] insert failed for', t, getErrorMessage(insErr));
              }
            }

            // Try to copy sqlite_sequence if present
            if (srcTables.includes('sqlite_sequence')) {
              try {
                mainDb.exec('DELETE FROM sqlite_sequence');
                mainDb.exec('INSERT INTO sqlite_sequence SELECT * FROM src.sqlite_sequence');
              } catch (seqErr: unknown) {
                console.warn('[maintenance] sqlite_sequence copy failed:', getErrorMessage(seqErr));
              }
            }

            try { mainDb.exec('PRAGMA foreign_keys = ON'); } catch { }
          })();

          // Detach source
          try { mainDb.exec('DETACH DATABASE src'); } catch (e: unknown) { console.warn('[maintenance] detach failed:', getErrorMessage(e)); }
        } finally {
          try { mainDb.close(); } catch { /* ignore */ }
        }
      } finally {
        // Remove temporary file
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
      }

      // Re-init wrapper if needed
      try { 
        initDB(); 
      } catch (initErr: unknown) { 
        console.warn('initDB() after attach-restore failed:', getErrorMessage(initErr)); 
      }

      return NextResponse.json({ success: true, message: 'Database restored (via ATTACH+copy) successfully' });
    } catch (e: unknown) {
      console.error('Restore (attach-copy) error:', e);
      return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

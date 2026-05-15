import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

// Buat atau buka database file di root project (atau volume docker)
const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'catatbon.db');
let dbInstance: any = null;

function getDB() {
  if (!dbInstance || !dbInstance.open) {
    // Debug: log which DB path is being opened by the server
    try {
      console.log('[sqlite] opening DB at', dbPath)
    } catch (e) {}
    dbInstance = new Database(dbPath);
    try {
      dbInstance.pragma('journal_mode = WAL');
    } catch (e) {
      console.warn('SQLite WAL mode could not be set:', e);
    }
    // Automatically run init every time a new DB instance is opened
    _runInit(dbInstance);
  }
  return dbInstance;
}

export const db = {
  prepare: (sql: string) => {
    try {
      return getDB().prepare(sql)
    } catch (e: any) {
      // Attempt to recover from disk I/O / stale handle by closing and reopening DB once
      try { if (dbInstance) { dbInstance.close(); dbInstance = null } } catch (closeErr) { /* ignore */ }
      // try again
      return getDB().prepare(sql)
    }
  },
  exec: (sql: string) => {
    try {
      return getDB().exec(sql)
    } catch (e: any) {
      try { if (dbInstance) { dbInstance.close(); dbInstance = null } } catch (closeErr) { /* ignore */ }
      return getDB().exec(sql)
    }
  },
  transaction: (fn: any) => getDB().transaction(fn),
  pragma: (sql: string) => getDB().pragma(sql),
  close: () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }
};

export function getDbPath() {
  return dbPath;
}

// Gunakan user_version di database sebagai flag migrasi (lebih reliabel dari variabel in-memory)
const SCHEMA_VERSION = 3;

function _runInit(instance: any) {
  try {
    let currentVersion = instance.pragma('user_version', { simple: true });
    if (currentVersion >= SCHEMA_VERSION) return;

    instance.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT,
      nama_lengkap TEXT,
      role TEXT,
      pin TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      nama TEXT,
      alamat TEXT,
      no_hp TEXT,
      ciri_ciri TEXT,
      foto_url TEXT,
      status TEXT,
      total_hutang INTEGER,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      total_harga INTEGER,
      tanggal INTEGER,
      status TEXT,
      created_by TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT,
      item_tag_name TEXT,
      nama_barang TEXT,
      qty INTEGER,
      harga_satuan INTEGER,
      subtotal INTEGER,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      nominal_bayar INTEGER,
      tanggal_bayar INTEGER,
      created_by TEXT,
      sisa_hutang INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS item_tags (
      id TEXT PRIMARY KEY,
      nama_barang TEXT,
      harga_default INTEGER,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER
    );
  `);

    if (currentVersion < 2) {
      const columns = instance.prepare("PRAGMA table_info(payments)").all();
      const hasSisaHutang = columns.some((col: any) => col.name === 'sisa_hutang');
      if (!hasSisaHutang) {
        instance.exec('ALTER TABLE payments ADD COLUMN sisa_hutang INTEGER DEFAULT 0');
      }

      const customers = instance.prepare('SELECT id, total_hutang FROM customers').all();
      for (const customer of customers) {
        let remaining = customer.total_hutang || 0;
        const payments = instance.prepare(
          'SELECT id, nominal_bayar FROM payments WHERE customer_id = ? AND deleted_at IS NULL ORDER BY tanggal_bayar DESC'
        ).all(customer.id);
        for (const payment of payments) {
          instance.prepare('UPDATE payments SET sisa_hutang = ? WHERE id = ?')
            .run(remaining, payment.id);
          remaining += payment.nominal_bayar || 0;
        }
      }
    }

    // Tandai migrasi selesai di database itu sendiri
    instance.pragma(`user_version = ${SCHEMA_VERSION}`);
  } catch (e) {
    console.error('SQLite initialization error:', e);
  }
}

// Tetap ekspor initDB() agar API route yang sudah ada tidak perlu diubah
export function initDB() {
  getDB(); // cukup panggil getDB() — inisialisasi sudah terjadi di sana
}

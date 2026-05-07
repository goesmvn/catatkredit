import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

// Buat atau buka database file di root project (atau volume docker)
const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'catatbon.db');
let dbInstance: any = null;

function getDB() {
  if (!dbInstance || !dbInstance.open) {
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
  prepare: (sql: string) => getDB().prepare(sql),
  exec: (sql: string) => getDB().exec(sql),
  transaction: (fn: any) => getDB().transaction(fn),
  pragma: (sql: string) => getDB().pragma(sql),
  close: () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }
};

// Gunakan user_version di database sebagai flag migrasi (lebih reliabel dari variabel in-memory)
const SCHEMA_VERSION = 1;

function _runInit(instance: any) {
  try {
    const currentVersion = instance.pragma('user_version', { simple: true });
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
  `);

    // Seed default users jika belum ada
    const adminExists = instance.prepare("SELECT id FROM profiles WHERE username = 'admin'").get();
    if (!adminExists) {
      const now = Date.now();
      instance.prepare(
        `INSERT INTO profiles (id, username, nama_lengkap, role, pin, created_at, updated_at)
         VALUES (?, 'admin', 'Admin Toko', 'ADMIN', '123456', ?, ?)`
      ).run(crypto.randomUUID(), now, now);

      instance.prepare(
        `INSERT INTO profiles (id, username, nama_lengkap, role, pin, created_at, updated_at)
         VALUES (?, 'superadmin', 'Super Administrator', 'SUPERADMIN', '888888', ?, ?)`
      ).run(crypto.randomUUID(), now, now);
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

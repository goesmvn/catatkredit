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

let isInitialized = false;

// Migrasi skema (Eksekusi sekali saat server mulai)
export function initDB() {
  if (isInitialized) return;
  try {
    db.exec(`
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
  const adminExists = db.prepare("SELECT id FROM profiles WHERE username = 'admin'").get();
  if (!adminExists) {
    const now = Date.now();
    // Default Admin
    db.prepare(
      `INSERT INTO profiles (id, username, nama_lengkap, role, pin, created_at, updated_at)
       VALUES (?, 'admin', 'Admin Toko', 'ADMIN', '123456', ?, ?)`
    ).run(crypto.randomUUID(), now, now);
    
    // Default Super Admin (for maintenance)
    db.prepare(
      `INSERT INTO profiles (id, username, nama_lengkap, role, pin, created_at, updated_at)
       VALUES (?, 'superadmin', 'Super Administrator', 'SUPERADMIN', '888888', ?, ?)`
    ).run(crypto.randomUUID(), now, now);
  }
    isInitialized = true;
  } catch (e) {
    console.warn('SQLite initialization skipped or failed (possibly during build):', e);
  }
}



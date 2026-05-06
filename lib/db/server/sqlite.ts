// @ts-ignore
import Database from 'better-sqlite3';
import path from 'path';

// Buat atau buka database file di root project (atau volume docker)
const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'catatbon.db');
const db = new Database(dbPath);

// Konfigurasi performa SQLite
db.pragma('journal_mode = WAL');

// Migrasi skema (Eksekusi sekali saat server mulai)
export function initDB() {
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

  // Seed admin default jika belum ada
  const adminExists = db.prepare("SELECT id FROM profiles WHERE username = 'admin'").get();
  if (!adminExists) {
    const now = Date.now();
    db.prepare(
      `INSERT INTO profiles (id, username, nama_lengkap, role, pin, created_at, updated_at)
       VALUES ('admin-local-id', 'admin', 'Admin Utama', 'ADMIN', '123456', ?, ?)`
    ).run(now, now);
  }
}

export { db };

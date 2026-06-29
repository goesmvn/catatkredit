import { db } from './sqlite';
import { calculateCustomerStatus } from '../../utils/status';

/**
 * Recalculates and updates the customer's status in the database.
 * Call this after customer transactions or payments are added, updated, or deleted.
 */
export function syncCustomerStatusInDB(customerId: string, now: number = Date.now()) {
  const customer = db.prepare('SELECT status, total_hutang FROM customers WHERE id = ?').get(customerId) as any;
  if (!customer) return;

  const transactions = db.prepare('SELECT total_harga, tanggal FROM transactions WHERE customer_id = ? AND deleted_at IS NULL').all(customerId) as any[];
  const payments = db.prepare('SELECT nominal_bayar, tanggal_bayar FROM payments WHERE customer_id = ? AND deleted_at IS NULL').all(customerId) as any[];

  // Get settings to find batas_menunggak_hari
  const settingsRows = (db.prepare('SELECT key, value FROM settings').all() as any[]) || [];
  const settings: any = {};
  settingsRows.forEach(r => {
    if (r && r.key) {
      settings[r.key] = r.value;
    }
  });
  const batasMenunggakHari = parseInt(settings.batas_menunggak_hari, 10) || 30;

  const dynamicStatus = calculateCustomerStatus(customer, transactions, payments, batasMenunggakHari, now);

  db.prepare('UPDATE customers SET status = ?, updated_at = ? WHERE id = ?')
    .run(dynamicStatus, now, customerId);
}

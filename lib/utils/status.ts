export interface CustomerStatusInput {
  status: string;
  total_hutang: number;
}

export interface TransactionStatusInput {
  total_harga: number;
  tanggal: any;
}

export interface PaymentStatusInput {
  nominal_bayar: number;
  tanggal_bayar: any;
}

const parseTimestamp = (val: any): number => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) return parseInt(val, 10);
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Calculates customer dynamic status using FIFO transaction matching against total payments.
 */
export function calculateCustomerStatus(
  customer: CustomerStatusInput,
  transactions: TransactionStatusInput[],
  payments: PaymentStatusInput[],
  batasDays: number,
  nowMs: number = Date.now()
): 'LANCAR' | 'BLACKLIST' | 'MENUNGGAK' {
  if (customer.status === 'BLACKLIST') return 'BLACKLIST';
  if (Number(customer.total_hutang) <= 0) return 'LANCAR';

  const batasMs = (batasDays || 30) * 86400000;

  // Filter and sort transactions (oldest first)
  const sortedTxs = [...transactions]
    .filter(t => (Number(t.total_harga) || 0) > 0)
    .map(t => ({
      total_harga: Number(t.total_harga) || 0,
      tanggal: parseTimestamp(t.tanggal)
    }))
    .sort((a, b) => a.tanggal - b.tanggal);

  // Sum up all payments
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.nominal_bayar) || 0), 0);

  let remainingPaid = totalPaid;

  for (const tx of sortedTxs) {
    if (remainingPaid >= tx.total_harga) {
      remainingPaid -= tx.total_harga;
    } else {
      // This transaction is not fully covered by the customer's total payments.
      // Check if its age exceeds the grace period.
      if ((nowMs - tx.tanggal) > batasMs) {
        return 'MENUNGGAK';
      }
      // If the oldest unpaid transaction is not overdue, newer ones won't be either.
      return 'LANCAR';
    }
  }

  // Fallback for edge cases where total_hutang is positive but transactions are covered
  if (sortedTxs.length > 0) {
    const oldestTx = sortedTxs[0];
    if ((nowMs - oldestTx.tanggal) > batasMs) {
      return 'MENUNGGAK';
    }
  }

  return 'LANCAR';
}

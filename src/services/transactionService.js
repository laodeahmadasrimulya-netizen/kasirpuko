import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { generateInvoiceCode } from '../utils/invoice';
import { isToday } from '../utils/date';
import { storeService, DEFAULT_STORE_ID } from './storeService';

const getStorageKey = () => {
  const storeId = storeService.getActiveStoreId();
  return storeId === DEFAULT_STORE_ID ? 'transactions' : `transactions_${storeId}`;
};

const mapFromDB = (tx) => ({
  id: String(tx.id),
  store_id: tx.store_id || DEFAULT_STORE_ID,
  storeId: tx.store_id || DEFAULT_STORE_ID,
  timestamp: tx.timestamp,
  cashierName: tx.cashier_name || tx.cashierName || 'Kasir 01',
  cashier_name: tx.cashier_name || tx.cashierName || 'Kasir 01',
  customerName: tx.customer_name || tx.customerName || '',
  customer_name: tx.customer_name || tx.customerName || '',
  paymentMethod: tx.payment_method || tx.paymentMethod || 'TUNAI',
  payment_method: tx.payment_method || tx.paymentMethod || 'TUNAI',
  subtotal: Number(tx.subtotal) || 0,
  discount: Number(tx.discount) || 0,
  total: Number(tx.total) || 0,
  amountPaid: Number(tx.amount_paid ?? tx.amountPaid ?? 0),
  amount_paid: Number(tx.amount_paid ?? tx.amountPaid ?? 0),
  change: Number(tx.change) || 0,
  status: tx.status || 'COMPLETED',
  items: Array.isArray(tx.items) ? tx.items : [],
});

const mapToDB = (tx) => {
  const storeId = tx.store_id || tx.storeId || storeService.getActiveStoreId();
  return {
    id: String(tx.id),
    store_id: storeId,
    timestamp: tx.timestamp || new Date().toISOString(),
    cashier_name: tx.cashierName || tx.cashier_name || 'Kasir 01',
    customer_name: tx.customerName || tx.customer_name || '',
    payment_method: tx.paymentMethod || tx.payment_method || 'TUNAI',
    subtotal: Number(tx.subtotal) || 0,
    discount: Number(tx.discount) || 0,
    total: Number(tx.total) || 0,
    amount_paid: Number(tx.amountPaid ?? tx.amount_paid ?? 0),
    change: Number(tx.change) || 0,
    status: tx.status || 'COMPLETED',
    items: Array.isArray(tx.items) ? tx.items : [],
  };
};
const DAY_MS = 1000 * 60 * 60 * 24;
const now = Date.now();

// Initial realistic seed transactions distributed across 7 days (1 week)
const INITIAL_TRANSACTIONS = [
  // HARI INI (Day 0)
  {
    id: 'PUKO-20260921-1012',
    timestamp: new Date(now - 1000 * 60 * 30).toISOString(), // 30 mins ago
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Kak Reza',
    paymentMethod: 'QRIS',
    items: [
      {
        id: 'puko-02',
        name: 'Alpukat Kocok Coklat',
        nama: 'Alpukat Kocok Coklat',
        price: 18000,
        harga: 18000,
        qty: 2,
        notes: 'Es sedikit',
        subtotal: 36000,
        gambar: '/images/alpukat_coklat.jpg',
      },
      {
        id: 'puko-t01',
        name: 'Extra Keju Gondrong',
        nama: 'Extra Keju Gondrong',
        price: 4000,
        harga: 4000,
        qty: 1,
        notes: '',
        subtotal: 4000,
        gambar: '/images/topping_keju.jpg',
      }
    ],
    subtotal: 40000,
    discount: 0,
    total: 40000,
    amountPaid: 40000,
    change: 0,
    status: 'COMPLETED'
  },
  {
    id: 'PUKO-20260921-0988',
    timestamp: new Date(now - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Ibu Maya',
    paymentMethod: 'TUNAI',
    items: [
      {
        id: 'puko-04',
        name: 'Alpukat Kocok Keju',
        nama: 'Alpukat Kocok Keju',
        price: 20000,
        harga: 20000,
        qty: 2,
        notes: 'Manis sedang',
        subtotal: 40000,
        gambar: '/images/alpukat_keju.jpg',
      },
      {
        id: 'puko-01',
        name: 'Alpukat Kocok Original',
        nama: 'Alpukat Kocok Original',
        price: 15000,
        harga: 15000,
        qty: 1,
        notes: '',
        subtotal: 15000,
        gambar: '/images/alpukat_original.jpg',
      }
    ],
    subtotal: 55000,
    discount: 5000,
    total: 50000,
    amountPaid: 50000,
    change: 0,
    status: 'COMPLETED'
  },
  {
    id: 'PUKO-20260921-0850',
    timestamp: new Date(now - 1000 * 60 * 180).toISOString(), // 3 hours ago
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Kak Budi',
    paymentMethod: 'QRIS',
    items: [
      {
        id: 'puko-03',
        name: 'Alpukat Kocok Milo',
        nama: 'Alpukat Kocok Milo',
        price: 18000,
        harga: 18000,
        qty: 3,
        notes: 'Milo banyak',
        subtotal: 54000,
        gambar: '/images/alpukat_milo.jpg',
      }
    ],
    subtotal: 54000,
    discount: 0,
    total: 54000,
    amountPaid: 54000,
    change: 0,
    status: 'COMPLETED'
  },
  // KEMARIN (Day -1)
  {
    id: 'PUKO-20260920-0041',
    timestamp: new Date(now - DAY_MS * 1 - 1000 * 60 * 120).toISOString(),
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Pak Hendra',
    paymentMethod: 'TUNAI',
    items: [
      {
        id: 'puko-01',
        name: 'Alpukat Kocok Original',
        nama: 'Alpukat Kocok Original',
        price: 15000,
        harga: 15000,
        qty: 4,
        subtotal: 60000,
        gambar: '/images/alpukat_original.jpg',
      },
      {
        id: 'puko-02',
        name: 'Alpukat Kocok Coklat',
        nama: 'Alpukat Kocok Coklat',
        price: 18000,
        harga: 18000,
        qty: 2,
        subtotal: 36000,
        gambar: '/images/alpukat_coklat.jpg',
      }
    ],
    subtotal: 96000,
    discount: 6000,
    total: 90000,
    amountPaid: 100000,
    change: 10000,
    status: 'COMPLETED'
  },
  {
    id: 'PUKO-20260920-0042',
    timestamp: new Date(now - DAY_MS * 1 - 1000 * 60 * 300).toISOString(),
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Mbak Rina',
    paymentMethod: 'QRIS',
    items: [
      {
        id: 'puko-05',
        name: 'Alpukat Kocok Oreo',
        nama: 'Alpukat Kocok Oreo',
        price: 20000,
        harga: 20000,
        qty: 3,
        subtotal: 60000,
        gambar: '/images/alpukat_oreo.jpg',
      }
    ],
    subtotal: 60000,
    discount: 0,
    total: 60000,
    amountPaid: 60000,
    change: 0,
    status: 'COMPLETED'
  },
  // 2 HARI LALU (Day -2)
  {
    id: 'PUKO-20260919-0033',
    timestamp: new Date(now - DAY_MS * 2 - 1000 * 60 * 180).toISOString(),
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Kak Doni',
    paymentMethod: 'TRANSFER',
    items: [
      {
        id: 'puko-03',
        name: 'Alpukat Kocok Milo',
        nama: 'Alpukat Kocok Milo',
        price: 18000,
        harga: 18000,
        qty: 4,
        subtotal: 72000,
        gambar: '/images/alpukat_milo.jpg',
      },
      {
        id: 'puko-m01',
        name: 'Es Teh Melati Manis',
        nama: 'Es Teh Melati Manis',
        price: 6000,
        harga: 6000,
        qty: 3,
        subtotal: 18000,
        gambar: '/images/es_teh_manis.jpg',
      }
    ],
    subtotal: 90000,
    discount: 0,
    total: 90000,
    amountPaid: 90000,
    change: 0,
    status: 'COMPLETED'
  },
  // 3 HARI LALU (Day -3)
  {
    id: 'PUKO-20260918-0021',
    timestamp: new Date(now - DAY_MS * 3 - 1000 * 60 * 240).toISOString(),
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Kak Sarah',
    paymentMethod: 'QRIS',
    items: [
      {
        id: 'puko-04',
        name: 'Alpukat Kocok Keju',
        nama: 'Alpukat Kocok Keju',
        price: 20000,
        harga: 20000,
        qty: 3,
        subtotal: 60000,
        gambar: '/images/alpukat_keju.jpg',
      },
      {
        id: 'puko-02',
        name: 'Alpukat Kocok Coklat',
        nama: 'Alpukat Kocok Coklat',
        price: 18000,
        harga: 18000,
        qty: 2,
        subtotal: 36000,
        gambar: '/images/alpukat_coklat.jpg',
      }
    ],
    subtotal: 96000,
    discount: 10000,
    total: 86000,
    amountPaid: 86000,
    change: 0,
    status: 'COMPLETED'
  },
  // 4 HARI LALU (Day -4)
  {
    id: 'PUKO-20260917-0015',
    timestamp: new Date(now - DAY_MS * 4 - 1000 * 60 * 200).toISOString(),
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Mas Fajar',
    paymentMethod: 'TUNAI',
    items: [
      {
        id: 'puko-01',
        name: 'Alpukat Kocok Original',
        nama: 'Alpukat Kocok Original',
        price: 15000,
        harga: 15000,
        qty: 5,
        subtotal: 75000,
        gambar: '/images/alpukat_original.jpg',
      }
    ],
    subtotal: 75000,
    discount: 0,
    total: 75000,
    amountPaid: 100000,
    change: 25000,
    status: 'COMPLETED'
  },
  // 5 HARI LALU (Day -5)
  {
    id: 'PUKO-20260916-0009',
    timestamp: new Date(now - DAY_MS * 5 - 1000 * 60 * 150).toISOString(),
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Ibu Ratna',
    paymentMethod: 'QRIS',
    items: [
      {
        id: 'puko-02',
        name: 'Alpukat Kocok Coklat',
        nama: 'Alpukat Kocok Coklat',
        price: 18000,
        harga: 18000,
        qty: 3,
        subtotal: 54000,
        gambar: '/images/alpukat_coklat.jpg',
      },
      {
        id: 'puko-03',
        name: 'Alpukat Kocok Milo',
        nama: 'Alpukat Kocok Milo',
        price: 18000,
        harga: 18000,
        qty: 2,
        subtotal: 36000,
        gambar: '/images/alpukat_milo.jpg',
      }
    ],
    subtotal: 90000,
    discount: 5000,
    total: 85000,
    amountPaid: 85000,
    change: 0,
    status: 'COMPLETED'
  },
  // 6 HARI LALU (Day -6)
  {
    id: 'PUKO-20260915-0002',
    timestamp: new Date(now - DAY_MS * 6 - 1000 * 60 * 300).toISOString(),
    cashierName: 'Kasir 01 (Dita)',
    customerName: 'Kak Tania',
    paymentMethod: 'TUNAI',
    items: [
      {
        id: 'puko-05',
        name: 'Alpukat Kocok Oreo',
        nama: 'Alpukat Kocok Oreo',
        price: 20000,
        harga: 20000,
        qty: 3,
        subtotal: 60000,
        gambar: '/images/alpukat_oreo.jpg',
      },
      {
        id: 'puko-01',
        name: 'Alpukat Kocok Original',
        nama: 'Alpukat Kocok Original',
        price: 15000,
        harga: 15000,
        qty: 2,
        subtotal: 30000,
        gambar: '/images/alpukat_original.jpg',
      }
    ],
    subtotal: 90000,
    discount: 0,
    total: 90000,
    amountPaid: 100000,
    change: 10000,
    status: 'COMPLETED'
  }
];

export const transactionService = {
  /**
   * Mengambil semua transaksi dari Supabase (terbaru di atas)
   */
  async getAll() {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();

    try {
      let { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', storeId)
        .order('timestamp', { ascending: false });

      if (error && (error.message?.includes('store_id') || error.code === '42703')) {
        if (storeId === DEFAULT_STORE_ID) {
          const retry = await supabase
            .from('transactions')
            .select('*')
            .order('timestamp', { ascending: false });
          if (!retry.error) {
            data = retry.data;
            error = null;
          }
        }
      }

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapFromDB);
        storageService.set(storageKey, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[transactionService] Gagal load dari Supabase, memakai cache lokal:', err.message);
    }

    let list = storageService.get(storageKey, []);
    return Array.isArray(list) ? list.map(mapFromDB) : [];
  },

  /**
   * Menyimpan transaksi penjualan baru ke Supabase dan cache lokal
   */
  async create(payload) {
    const storeId = storeService.getActiveStoreId();
    const newTx = {
      ...payload,
      id: payload.id || generateInvoiceCode(),
      storeId: storeId,
      store_id: storeId,
      timestamp: payload.timestamp || new Date().toISOString(),
      cashierName: payload.cashierName || 'Kasir 01',
      customerName: payload.customerName?.trim() || '',
      paymentMethod: payload.paymentMethod || 'TUNAI',
      items: payload.items || [],
      subtotal: payload.subtotal || 0,
      discount: payload.discount || 0,
      total: payload.total || 0,
      amountPaid: payload.amountPaid || 0,
      change: payload.change || 0,
      status: 'COMPLETED',
      bankName: payload.bankName || null,
      referenceNo: payload.referenceNo || null,
    };
    const dbPayload = mapToDB(newTx);

    // Simpan ke Supabase
    try {
      const { error } = await supabase.from('transactions').insert([dbPayload]);
      if (error) {
        if (error.message?.includes('store_id')) {
          const { store_id, ...withoutStore } = dbPayload;
          await supabase.from('transactions').insert([withoutStore]);
        } else {
          console.warn('[transactionService] create error di Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('[transactionService] create error:', err);
    }

    // Simpan ke cache lokal
    const transactions = await this.getAll();
    const updated = [newTx, ...transactions.filter((t) => t.id !== newTx.id)];
    storageService.set(getStorageKey(), updated);
    return newTx;
  },

  /**
   * Calculate summary metrics for Dashboard
   */
  async getSummary() {
    const list = await this.getAll();
    const todayTransactions = list.filter((tx) => isToday(tx.timestamp));

    const todayRevenue = todayTransactions.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const todayOrdersCount = todayTransactions.length;

    // Count items sold today
    const itemsCount = todayTransactions.reduce((acc, curr) => {
      return acc + curr.items.reduce((sum, item) => sum + (item.qty || 1), 0);
    }, 0);

    const averageOrderValue = todayOrdersCount > 0 ? Math.round(todayRevenue / todayOrdersCount) : 0;

    return {
      todayRevenue,
      todayOrdersCount,
      itemsCount,
      averageOrderValue,
      totalAllTime: list.reduce((acc, curr) => acc + (curr.total || 0), 0),
    };
  },

  /**
   * Delete transactions by IDs (for deleting a specific filtered batch)
   */
  async deleteTransactions(ids) {
    if (!ids || ids.length === 0) return true;
    try {
      await supabase.from('transactions').delete().in('id', ids);
    } catch (err) {
      console.warn('[transactionService] deleteTransactions error di Supabase:', err);
    }
    const current = storageService.get(getStorageKey(), []);
    const updated = current.filter((t) => !ids.includes(t.id));
    storageService.set(getStorageKey(), updated);
    return true;
  },

  /**
   * Clear transaction history (for testing / reset)
   */
  async clearHistory() {
    const storeId = storeService.getActiveStoreId();
    try {
      if (storeId === DEFAULT_STORE_ID) {
        await supabase.from('transactions').delete().or(`store_id.eq.${storeId},store_id.is.null`);
      } else {
        await supabase.from('transactions').delete().eq('store_id', storeId);
      }
    } catch (err) {
      console.warn('[transactionService] clearHistory error di Supabase:', err);
    }
    storageService.set(getStorageKey(), []);
    return true;
  },
};

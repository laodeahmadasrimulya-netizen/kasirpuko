import { storageService } from './storageService';
import { DUMMY_PRODUCTS } from '../data/dummyProducts';
import { DEMO_STORE_ID } from './storeService';
import { DEFAULT_SETTINGS } from '../data/dummySettings';
import { DEFAULT_INGREDIENTS } from './ingredientService';

const now = Date.now();
const DAY_MS = 1000 * 60 * 60 * 24;

export const DEMO_TRANSACTIONS_SEED = [
  // HARI INI
  {
    id: 'PUKO-DEMO-001',
    store_id: DEMO_STORE_ID,
    storeId: DEMO_STORE_ID,
    timestamp: new Date(now - 1000 * 60 * 25).toISOString(), // 25 mins ago
    cashierName: 'Kasir Demo (Dita)',
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
        id: 'puko-01',
        name: 'Alpukat Kocok Original',
        nama: 'Alpukat Kocok Original',
        price: 15000,
        harga: 15000,
        qty: 1,
        notes: '',
        subtotal: 15000,
        gambar: '/images/alpukat_original.jpg',
      },
    ],
    subtotal: 51000,
    discount: 0,
    total: 51000,
    amountPaid: 51000,
    change: 0,
    status: 'COMPLETED',
  },
  {
    id: 'PUKO-DEMO-002',
    store_id: DEMO_STORE_ID,
    storeId: DEMO_STORE_ID,
    timestamp: new Date(now - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    cashierName: 'Kasir Demo (Dita)',
    customerName: 'Kak Sarah',
    paymentMethod: 'TUNAI',
    items: [
      {
        id: 'puko-04',
        name: 'Alpukat Kocok Keju',
        nama: 'Alpukat Kocok Keju',
        price: 20000,
        harga: 20000,
        qty: 2,
        notes: 'Keju gondrong melimpah',
        subtotal: 40000,
        gambar: '/images/alpukat_keju.jpg',
      },
    ],
    subtotal: 40000,
    discount: 5000,
    total: 35000,
    amountPaid: 50000,
    change: 15000,
    status: 'COMPLETED',
  },
  {
    id: 'PUKO-DEMO-003',
    store_id: DEMO_STORE_ID,
    storeId: DEMO_STORE_ID,
    timestamp: new Date(now - 1000 * 60 * 240).toISOString(), // 4 hours ago
    cashierName: 'Kasir Demo (Dita)',
    customerName: 'Pak Hendra',
    paymentMethod: 'QRIS',
    items: [
      {
        id: 'puko-03',
        name: 'Alpukat Kocok Milo',
        nama: 'Alpukat Kocok Milo',
        price: 18000,
        harga: 18000,
        qty: 3,
        notes: 'Manis sedang',
        subtotal: 54000,
        gambar: '/images/alpukat_milo.jpg',
      },
    ],
    subtotal: 54000,
    discount: 0,
    total: 54000,
    amountPaid: 54000,
    change: 0,
    status: 'COMPLETED',
  },

  // KEMARIN
  {
    id: 'PUKO-DEMO-004',
    store_id: DEMO_STORE_ID,
    storeId: DEMO_STORE_ID,
    timestamp: new Date(now - DAY_MS - 1000 * 60 * 120).toISOString(),
    cashierName: 'Kasir Demo (Dita)',
    customerName: 'Kak Nadia',
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
        id: 'puko-05',
        name: 'Alpukat Kocok Oreo',
        nama: 'Alpukat Kocok Oreo',
        price: 20000,
        harga: 20000,
        qty: 2,
        subtotal: 40000,
        gambar: '/images/alpukat_oreo.jpg',
      },
    ],
    subtotal: 100000,
    discount: 10000,
    total: 90000,
    amountPaid: 100000,
    change: 10000,
    status: 'COMPLETED',
  },
  {
    id: 'PUKO-DEMO-005',
    store_id: DEMO_STORE_ID,
    storeId: DEMO_STORE_ID,
    timestamp: new Date(now - DAY_MS * 2 - 1000 * 60 * 180).toISOString(),
    cashierName: 'Kasir Demo (Dita)',
    customerName: 'Mas Dimas',
    paymentMethod: 'QRIS',
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
    ],
    subtotal: 72000,
    discount: 0,
    total: 72000,
    amountPaid: 72000,
    change: 0,
    status: 'COMPLETED',
  },
];

export const DEMO_EXPENSES_SEED = [
  {
    id: 'demo-exp-1',
    store_id: DEMO_STORE_ID,
    storeId: DEMO_STORE_ID,
    timestamp: new Date(now - 1000 * 60 * 180).toISOString(),
    title: 'Beli Es Batu Kristal 2 Bal',
    category: 'ES_AIR',
    amount: 20000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir Demo',
    notes: 'Untuk stok siang - sore',
  },
  {
    id: 'demo-exp-2',
    store_id: DEMO_STORE_ID,
    storeId: DEMO_STORE_ID,
    timestamp: new Date(now - DAY_MS - 1000 * 60 * 300).toISOString(),
    title: 'Cup Plastik 16oz + Sedotan Steril',
    category: 'KEMASAN',
    amount: 45000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir Demo',
    notes: 'Restock kemasan',
  },
];

export const DEMO_SETTINGS_SEED = {
  ...DEFAULT_SETTINGS,
  storeName: 'PUKO (mode demo)',
  tagline: 'Alpukat Kocok No Serat No Pahit',
  branch: 'Outlet Demo',
  address: 'Jl. Contoh Demo No. 8, Kendari',
  phone: '085652103647',
  cashierName: 'Kasir Demo (Dita)',
  receiptFooter: 'Terima kasih telah mencoba Kasir PUKO! (Mode Demo)',
  taxRate: 0,
  serviceRate: 0,
  enableSound: true,
  autoPrintReceipt: false,
};

export const demoService = {
  /**
   * Pastikan semua data seed demo tersedia di LocalStorage
   */
  ensureDemoData() {
    // 1. Produk Demo
    const prodKey = `products_${DEMO_STORE_ID}`;
    const existingProducts = storageService.get(prodKey);
    if (!existingProducts || !Array.isArray(existingProducts) || existingProducts.length === 0) {
      const demoProducts = DUMMY_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `demo-p-${idx + 1}`,
        store_id: DEMO_STORE_ID,
        storeId: DEMO_STORE_ID,
      }));
      storageService.set(prodKey, demoProducts);
    }

    // 2. Transaksi Demo
    const txKey = `transactions_${DEMO_STORE_ID}`;
    const existingTx = storageService.get(txKey);
    if (!existingTx || !Array.isArray(existingTx) || existingTx.length === 0) {
      storageService.set(txKey, DEMO_TRANSACTIONS_SEED);
    }

    // 3. Pengeluaran Demo
    const expKey = `expenses_${DEMO_STORE_ID}`;
    const existingExp = storageService.get(expKey);
    if (!existingExp || !Array.isArray(existingExp) || existingExp.length === 0) {
      storageService.set(expKey, DEMO_EXPENSES_SEED);
    }

    // 4. Bahan Baku Demo
    const ingKey = `puko_ingredients_${DEMO_STORE_ID}`;
    const existingIng = storageService.get(ingKey);
    if (!existingIng || typeof existingIng !== 'object') {
      storageService.set(ingKey, DEFAULT_INGREDIENTS);
    }

    // 5. Pengaturan Demo
    const setKey = `settings_${DEMO_STORE_ID}`;
    const existingSet = storageService.get(setKey);
    if (!existingSet) {
      storageService.set(setKey, DEMO_SETTINGS_SEED);
    }
  },

  /**
   * Reset seluruh data demo ke kondisi awal bersih
   */
  resetDemoData() {
    const demoProducts = DUMMY_PRODUCTS.map((p, idx) => ({
      ...p,
      id: `demo-p-${idx + 1}`,
      store_id: DEMO_STORE_ID,
      storeId: DEMO_STORE_ID,
    }));

    storageService.set(`products_${DEMO_STORE_ID}`, demoProducts);
    storageService.set(`transactions_${DEMO_STORE_ID}`, DEMO_TRANSACTIONS_SEED);
    storageService.set(`expenses_${DEMO_STORE_ID}`, DEMO_EXPENSES_SEED);
    storageService.set(`puko_ingredients_${DEMO_STORE_ID}`, DEFAULT_INGREDIENTS);
    storageService.set(`settings_${DEMO_STORE_ID}`, DEMO_SETTINGS_SEED);
    return true;
  },
};

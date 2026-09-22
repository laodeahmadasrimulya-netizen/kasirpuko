import { storageService } from './storageService';
import { isToday, isYesterday } from '../utils/date';

const STORAGE_KEY = 'expenses';
const now = Date.now();
const DAY_MS = 1000 * 60 * 60 * 24;

export const EXPENSE_CATEGORIES = [
  { id: 'BAHAN_BAKU', label: 'Bahan Baku', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'ES_AIR', label: 'Es Batu & Air', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { id: 'KEMASAN', label: 'Kemasan & Cup', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'OPERASIONAL', label: 'Operasional', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'KEBERSIHAN', label: 'Kebersihan & Toko', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  { id: 'LAINNYA', label: 'Lain-lain', color: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export const PAYMENT_SOURCES = [
  { id: 'KAS_KASIR', label: 'Kas Toko (Tunai)' },
  { id: 'TRANSFER', label: 'Transfer Bank' },
  { id: 'PRIBADI', label: 'Uang Kasir / Pribadi' },
];

// Initial realistic seed expenses
const INITIAL_EXPENSES = [
  {
    id: `exp-1`,
    timestamp: new Date().toISOString(), // today
    title: 'Beli Es Batu 2 Bal',
    category: 'ES_AIR',
    amount: 20000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir',
    notes: '',
  },
  {
    id: `exp-2`,
    timestamp: new Date(now - DAY_MS - 1000 * 60 * 300).toISOString(), // Yesterday
    title: 'Beli Kantong Kresek & Sedotan',
    category: 'KEMASAN',
    amount: 25000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir',
    notes: '',
  },
  {
    id: `exp-${now - DAY_MS - 1000 * 60 * 180}`,
    timestamp: new Date(now - DAY_MS - 1000 * 60 * 180).toISOString(), // Yesterday
    title: 'Air Galon Isi Ulang (2 Galon)',
    category: 'ES_AIR',
    amount: 14000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir',
    notes: '',
  },
  {
    id: `exp-${now - DAY_MS * 2 - 1000 * 60 * 60}`,
    timestamp: new Date(now - DAY_MS * 2 - 1000 * 60 * 60).toISOString(), // 2 days ago
    title: 'Susu Kental Manis Carnation 3 Kaleng',
    category: 'BAHAN_BAKU',
    amount: 42000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Admin',
    notes: '',
  },
  {
    id: `exp-${now - DAY_MS * 3 - 1000 * 60 * 90}`,
    timestamp: new Date(now - DAY_MS * 3 - 1000 * 60 * 90).toISOString(), // 3 days ago
    title: 'Sabun Cuci Sunlight & Tisu Gulung',
    category: 'KEBERSIHAN',
    amount: 18000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir',
    notes: '',
  },
];

export const expenseService = {
  /**
   * Get all expenses sorted by date descending (newest first)
   */
  async getAll() {
    let expenses = storageService.get(STORAGE_KEY);
    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      expenses = INITIAL_EXPENSES;
      storageService.set(STORAGE_KEY, expenses);
    } else {
      let changed = false;
      expenses = expenses.map((item) => {
        let updated = item;
        if (item.title === 'Beli Es Batu Bal 2 Karung') {
          changed = true;
          updated = { ...updated, title: 'Beli Es Batu 2 Bal' };
        }
        const role = (item.loggedBy || '').toLowerCase().includes('admin') ? 'Admin' : 'Kasir';
        if (item.loggedBy !== role) {
          changed = true;
          updated = { ...updated, loggedBy: role };
        }
        return updated;
      });
      if (changed) {
        storageService.set(STORAGE_KEY, expenses);
      }
    }
    // Return sorted newest first
    return [...expenses].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /**
   * Get expense by ID
   */
  async getById(id) {
    const list = await this.getAll();
    return list.find((item) => item.id === id) || null;
  },

  /**
   * Create a new expense record
   */
  async create(data) {
    const list = await this.getAll();
    const newExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: data.timestamp || new Date().toISOString(),
      title: data.title?.trim() || 'Pengeluaran Tanpa Nama',
      category: data.category || 'LAINNYA',
      amount: Math.max(0, Number(data.amount) || 0),
      paymentSource: data.paymentSource || 'KAS_KASIR',
      loggedBy: data.loggedBy || 'Kasir',
      notes: data.notes?.trim() || '',
    };

    const updated = [newExpense, ...list];
    storageService.set(STORAGE_KEY, updated);
    return newExpense;
  },

  /**
   * Update existing expense record
   */
  async update(id, data) {
    const list = await this.getAll();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('Data pengeluaran tidak ditemukan');
    }

    const updatedExpense = {
      ...list[index],
      ...data,
      amount: Math.max(0, Number(data.amount) || 0),
      title: data.title?.trim() || list[index].title,
    };

    list[index] = updatedExpense;
    storageService.set(STORAGE_KEY, list);
    return updatedExpense;
  },

  /**
   * Delete expense record
   */
  async delete(id) {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    storageService.set(STORAGE_KEY, filtered);
    return true;
  },

  /**
   * Get expense summary metrics
   */
  async getSummary() {
    const list = await this.getAll();
    const nowDate = new Date();
    const currentMonth = nowDate.getMonth();
    const currentYear = nowDate.getFullYear();

    let todayTotal = 0;
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    let allTimeTotal = 0;

    const categoryBreakdown = {};

    list.forEach((item) => {
      const amt = Number(item.amount) || 0;
      const date = new Date(item.timestamp);
      allTimeTotal += amt;

      if (isToday(item.timestamp)) {
        todayTotal += amt;
        todayCount += 1;
      }

      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        monthTotal += amt;
        monthCount += 1;
      }

      const cat = item.category || 'LAINNYA';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;
    });

    return {
      todayTotal,
      todayCount,
      monthTotal,
      monthCount,
      allTimeTotal,
      totalCount: list.length,
      categoryBreakdown,
    };
  },

  /**
   * Reset data to initial demo data
   */
  async reset() {
    storageService.set(STORAGE_KEY, INITIAL_EXPENSES);
    return INITIAL_EXPENSES;
  },
};

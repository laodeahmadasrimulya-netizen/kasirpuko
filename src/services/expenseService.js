import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { isToday, isYesterday } from '../utils/date';
import { storeService, DEFAULT_STORE_ID } from './storeService';

const getStorageKey = () => {
  const storeId = storeService.getActiveStoreId();
  return storeId === DEFAULT_STORE_ID ? 'expenses' : `expenses_${storeId}`;
};

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

// Initial seed expenses untuk outlet default
const INITIAL_EXPENSES = [
  {
    id: `exp-1`,
    timestamp: new Date().toISOString(),
    title: 'Beli Es Batu 2 Bal',
    category: 'ES_AIR',
    amount: 20000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir',
    notes: '',
  },
  {
    id: `exp-2`,
    timestamp: new Date(now - DAY_MS - 1000 * 60 * 300).toISOString(),
    title: 'Beli Kantong Kresek & Sedotan',
    category: 'KEMASAN',
    amount: 25000,
    paymentSource: 'KAS_KASIR',
    loggedBy: 'Kasir',
    notes: '',
  },
];

const mapFromDB = (item) => ({
  id: String(item.id),
  store_id: item.store_id || DEFAULT_STORE_ID,
  storeId: item.store_id || DEFAULT_STORE_ID,
  timestamp: item.timestamp,
  title: item.title,
  category: item.category,
  amount: Number(item.amount) || 0,
  paymentSource: item.payment_source || item.paymentSource || 'KAS_KASIR',
  payment_source: item.payment_source || item.paymentSource || 'KAS_KASIR',
  loggedBy: item.logged_by || item.loggedBy || 'Kasir',
  logged_by: item.logged_by || item.loggedBy || 'Kasir',
  notes: item.notes || '',
});

const mapToDB = (item) => {
  const storeId = item.store_id || item.storeId || storeService.getActiveStoreId();
  return {
    id: String(item.id),
    store_id: storeId,
    timestamp: item.timestamp || new Date().toISOString(),
    title: item.title?.trim() || 'Pengeluaran Tanpa Nama',
    category: item.category || 'LAINNYA',
    amount: Math.max(0, Number(item.amount) || 0),
    payment_source: item.paymentSource || item.payment_source || 'KAS_KASIR',
    logged_by: item.loggedBy || item.logged_by || 'Kasir',
    notes: item.notes?.trim() || '',
  };
};

export const expenseService = {
  /**
   * Mengambil semua pengeluaran dari Supabase (terbaru di atas)
   */
  async getAll() {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();

    try {
      let { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .order('timestamp', { ascending: false });

      if (error && (error.message?.includes('store_id') || error.code === '42703')) {
        if (storeId === DEFAULT_STORE_ID) {
          const retry = await supabase
            .from('expenses')
            .select('*')
            .order('timestamp', { ascending: false });
          if (!retry.error) {
            data = retry.data;
            error = null;
          }
        }
      }

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const mapped = data.map(mapFromDB);
          storageService.set(storageKey, mapped);
          return mapped;
        }
        if (storeId !== DEFAULT_STORE_ID) {
          const cached = storageService.get(storageKey, []);
          return cached.map(mapFromDB);
        }
      }
    } catch (err) {
      console.warn('[expenseService] Gagal load dari Supabase, memakai cache lokal:', err.message);
    }

    let expenses = storageService.get(storageKey);
    if (!expenses || !Array.isArray(expenses)) {
      expenses = storeId === DEFAULT_STORE_ID ? INITIAL_EXPENSES : [];
      storageService.set(storageKey, expenses);
    }
    return expenses.map(mapFromDB).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /**
   * Ambil pengeluaran berdasarkan ID
   */
  async getById(id) {
    const list = await this.getAll();
    return list.find((item) => item.id === id) || null;
  },

  /**
   * Catat pengeluaran baru ke Supabase & cache
   */
  async create(data) {
    const storeId = storeService.getActiveStoreId();
    const newExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      storeId: storeId,
      store_id: storeId,
      timestamp: data.timestamp || new Date().toISOString(),
      title: data.title?.trim() || 'Pengeluaran Tanpa Nama',
      category: data.category || 'LAINNYA',
      amount: Math.max(0, Number(data.amount) || 0),
      paymentSource: data.paymentSource || 'KAS_KASIR',
      loggedBy: data.loggedBy || 'Kasir',
      notes: data.notes?.trim() || '',
    };
    const dbPayload = mapToDB(newExpense);

    try {
      const { error } = await supabase.from('expenses').insert([dbPayload]);
      if (error) {
        if (error.message?.includes('store_id')) {
          const { store_id, ...withoutStore } = dbPayload;
          await supabase.from('expenses').insert([withoutStore]);
        } else {
          console.warn('[expenseService] create error di Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('[expenseService] create error:', err);
    }

    const list = await this.getAll();
    const updated = [newExpense, ...list.filter((x) => x.id !== newExpense.id)];
    storageService.set(getStorageKey(), updated);
    return newExpense;
  },

  /**
   * Edit pengeluaran yang ada
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
    const dbPayload = mapToDB(updatedExpense);

    try {
      const { error } = await supabase
        .from('expenses')
        .update(dbPayload)
        .eq('id', id);

      if (error) {
        if (error.message?.includes('store_id')) {
          const { store_id, ...withoutStore } = dbPayload;
          await supabase.from('expenses').update(withoutStore).eq('id', id);
        } else {
          console.warn('[expenseService] update error di Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('[expenseService] update error:', err);
    }

    list[index] = updatedExpense;
    storageService.set(getStorageKey(), list);
    return updatedExpense;
  },

  /**
   * Hapus pengeluaran
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) console.warn('[expenseService] delete error di Supabase:', error);
    } catch (err) {
      console.warn('[expenseService] delete error:', err);
    }

    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    storageService.set(getStorageKey(), filtered);
    return true;
  },

  /**
   * Ringkasan metrik pengeluaran
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
   * Reset data demo
   */
  async reset() {
    const storageKey = getStorageKey();
    storageService.set(storageKey, INITIAL_EXPENSES);
    return INITIAL_EXPENSES;
  },
};

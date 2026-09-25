import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { DEFAULT_SETTINGS } from '../data/dummySettings';
import { storeService, DEFAULT_STORE_ID } from './storeService';

const getStorageKey = () => {
  const storeId = storeService.getActiveStoreId();
  return storeId === DEFAULT_STORE_ID ? 'settings' : `settings_${storeId}`;
};

// Pemetaan dari kolom Supabase (snake_case) ke format aplikasi (camelCase)
const mapFromDB = (data) => ({
  storeName: data.store_name || DEFAULT_SETTINGS.storeName,
  tagline: data.tagline || DEFAULT_SETTINGS.tagline,
  branch: data.branch || DEFAULT_SETTINGS.branch,
  address: data.address || DEFAULT_SETTINGS.address,
  phone: data.phone || DEFAULT_SETTINGS.phone,
  cashierName: data.cashier_name || DEFAULT_SETTINGS.cashierName,
  receiptFooter: data.receipt_footer || DEFAULT_SETTINGS.receiptFooter,
  taxRate: Number(data.tax_rate ?? DEFAULT_SETTINGS.taxRate),
  serviceRate: Number(data.service_rate ?? DEFAULT_SETTINGS.serviceRate),
  enableSound: data.enable_sound ?? DEFAULT_SETTINGS.enableSound,
  autoPrintReceipt: data.auto_print_receipt ?? DEFAULT_SETTINGS.autoPrintReceipt,
});

// Pemetaan dari format aplikasi (camelCase) ke kolom Supabase (snake_case)
const mapToDB = (data) => ({
  id: 1,
  store_name: data.storeName,
  tagline: data.tagline,
  branch: data.branch,
  address: data.address,
  phone: data.phone,
  cashier_name: data.cashierName,
  receipt_footer: data.receiptFooter,
  tax_rate: Number(data.taxRate || 0),
  service_rate: Number(data.serviceRate || 0),
  enable_sound: data.enableSound ?? true,
  auto_print_receipt: data.autoPrintReceipt ?? false,
  updated_at: new Date().toISOString(),
});

export const settingsService = {
  /**
   * Mengambil konfigurasi toko aktif dari Supabase / Local Storage
   */
  async get() {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();

    let storeInfo = null;
    try {
      storeInfo = await storeService.getStore(storeId);
    } catch {
      // ignore
    }

    if (storeId === DEFAULT_STORE_ID) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (!error && data) {
          const mapped = mapFromDB(data);
          storageService.set(storageKey, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[settingsService] Gagal load dari Supabase, memakai cache lokal:', err.message);
      }
    }

    let settings = storageService.get(storageKey);
    if (!settings) {
      settings = {
        ...DEFAULT_SETTINGS,
        storeName: storeInfo?.name || (storeId === DEFAULT_STORE_ID ? 'PUKO' : 'Toko Baru'),
        tagline: storeInfo?.tagline || (storeId === DEFAULT_STORE_ID ? 'Alpukat Kocok No Serat No Pahit' : 'Kasir POS Modern'),
        phone: storeInfo?.phone || (storeId === DEFAULT_STORE_ID ? '085652103647' : ''),
        address: storeInfo?.address || (storeId === DEFAULT_STORE_ID ? 'Kendari' : ''),
      };
      storageService.set(storageKey, settings);
    }
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  /**
   * Menyimpan pembaruan konfigurasi ke Supabase dan cache lokal
   */
  async update(newData) {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();
    const current = await this.get();
    const updated = { ...current, ...newData };

    // Update profil toko di storeService
    if (newData.storeName !== undefined || newData.tagline !== undefined || newData.phone !== undefined || newData.address !== undefined) {
      try {
        await storeService.updateStore(storeId, {
          name: updated.storeName,
          tagline: updated.tagline,
          phone: updated.phone,
          address: updated.address,
        });
      } catch (err) {
        console.warn('[settingsService] updateStore notice:', err);
      }
    }

    if (storeId === DEFAULT_STORE_ID) {
      const dbPayload = mapToDB(updated);
      try {
        const { error } = await supabase
          .from('store_settings')
          .upsert(dbPayload);

        if (error) console.warn('[settingsService] upsert error di Supabase:', error);
      } catch (err) {
        console.warn('[settingsService] update error:', err);
      }
    }

    storageService.set(storageKey, updated);
    return updated;
  },

  /**
   * Reset konfigurasi ke nilai default
   */
  async reset() {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();
    if (storeId === DEFAULT_STORE_ID) {
      const defaultData = mapToDB(DEFAULT_SETTINGS);
      try {
        await supabase.from('store_settings').upsert(defaultData);
      } catch (err) {
        console.warn('[settingsService] reset error di Supabase:', err);
      }
    }

    storageService.set(storageKey, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },
};

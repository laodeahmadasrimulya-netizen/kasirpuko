import { storageService } from './storageService';
import { DEFAULT_SETTINGS } from '../data/dummySettings';

const STORAGE_KEY = 'settings';

export const settingsService = {
  /**
   * Get store and POS configuration
   */
  async get() {
    let settings = storageService.get(STORAGE_KEY);
    if (!settings) {
      settings = DEFAULT_SETTINGS;
      storageService.set(STORAGE_KEY, settings);
    } else {
      let changed = false;
      // Auto-migrate old default address/phone/footer
      if (settings.branch === 'Outlet Depan SMK Negeri 1 Kendari') {
        settings.branch = DEFAULT_SETTINGS.branch;
        changed = true;
      }
      if (settings.address === 'Jalan Jenderal Ahmad Yani No. 1, Kendari') {
        settings.address = DEFAULT_SETTINGS.address;
        changed = true;
      }
      if (settings.phone === '0852-4056-1234') {
        settings.phone = DEFAULT_SETTINGS.phone;
        changed = true;
      }
      if (!settings.receiptFooter || settings.receiptFooter.includes('@puko.alpukat') || settings.receiptFooter.includes('Sensasi Alpukat Asli, Segar & Kental.')) {
        settings.receiptFooter = DEFAULT_SETTINGS.receiptFooter;
        changed = true;
      }
      if (changed) {
        storageService.set(STORAGE_KEY, { ...DEFAULT_SETTINGS, ...settings });
      }
    }
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  /**
   * Update configuration
   */
  async update(newData) {
    const current = await this.get();
    const updated = { ...current, ...newData };
    storageService.set(STORAGE_KEY, updated);
    return updated;
  },

  /**
   * Reset configuration to default
   */
  async reset() {
    storageService.set(STORAGE_KEY, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },
};

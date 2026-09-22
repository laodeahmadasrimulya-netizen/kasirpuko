import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import { storageService } from '../services/storageService';
import { DEFAULT_SETTINGS } from '../data/dummySettings';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = storageService.get('settings');
      if (saved) {
        const merged = { ...DEFAULT_SETTINGS, ...saved };
        if (merged.branch === 'Outlet Depan SMK Negeri 1 Kendari') {
          merged.branch = DEFAULT_SETTINGS.branch;
        }
        if (merged.address === 'Jalan Jenderal Ahmad Yani No. 1, Kendari') {
          merged.address = DEFAULT_SETTINGS.address;
        }
        if (merged.phone === '0852-4056-1234') {
          merged.phone = DEFAULT_SETTINGS.phone;
        }
        if (!merged.receiptFooter || merged.receiptFooter.includes('@puko.alpukat') || merged.receiptFooter.includes('Sensasi Alpukat Asli, Segar & Kental.')) {
          merged.receiptFooter = DEFAULT_SETTINGS.receiptFooter;
        }
        return merged;
      }
    } catch (e) {
      console.error('Failed to load initial settings:', e);
    }
    return DEFAULT_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await settingsService.get();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newData) => {
    try {
      const updated = await settingsService.update(newData);
      setSettings(updated);
      return updated;
    } catch (err) {
      console.error('Failed to update settings', err);
      throw err;
    }
  };

  const resetSettings = async () => {
    try {
      const defaultData = await settingsService.reset();
      setSettings(defaultData);
      return defaultData;
    } catch (err) {
      console.error('Failed to reset settings', err);
    }
  };

  const value = {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

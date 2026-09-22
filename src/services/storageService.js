/**
 * Safe LocalStorage Service Wrapper
 * Handles JSON serialization, error boundaries, and key prefixing.
 */

const PREFIX = 'puko_pos_';

export const storageService = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(`${PREFIX}${key}`);
      if (item === null) return fallback;
      return JSON.parse(item);
    } catch (error) {
      console.error(`[storageService] Error reading key "${key}":`, error);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[storageService] Error writing key "${key}":`, error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(`${PREFIX}${key}`);
      return true;
    } catch (error) {
      console.error(`[storageService] Error removing key "${key}":`, error);
      return false;
    }
  },

  clear() {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(PREFIX)) {
          localStorage.removeItem(k);
        }
      });
      return true;
    } catch (error) {
      console.error('[storageService] Error clearing storage:', error);
      return false;
    }
  },
};

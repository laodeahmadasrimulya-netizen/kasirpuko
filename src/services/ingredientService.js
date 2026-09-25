import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { storeService, DEFAULT_STORE_ID } from './storeService';

const getStorageKey = () => {
  const storeId = storeService.getActiveStoreId();
  return storeId === DEFAULT_STORE_ID ? 'puko_ingredients_v1' : `puko_ingredients_${storeId}`;
};

// Sinkronisasi data bahan baku ke Supabase di latar belakang
const syncToSupabase = async (ingredientsObj) => {
  if (!ingredientsObj || typeof ingredientsObj !== 'object') return;
  const storeId = storeService.getActiveStoreId();
  try {
    const rows = Object.values(ingredientsObj).map((ing) => ({
      id: storeId === DEFAULT_STORE_ID ? String(ing.id) : `${storeId}_${ing.id}`,
      store_id: storeId,
      name: ing.name,
      category: ing.category || 'Bahan Utama',
      unit: ing.unit || 'kg',
      base_unit: ing.baseUnit || ing.unit || 'gram',
      initial_stock: Number(ing.initialStock || ing.maxStock || 0),
      current_stock: Number(ing.currentStock || 0),
      max_stock: Number(ing.maxStock || 0),
      min_stock_alert: Number(ing.minStockAlert || 0),
      portion_per_cup: Number(ing.portionPerCup || 0),
      icon: ing.icon || '📦',
      color: ing.color || 'emerald',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('ingredients').upsert(rows);
    if (error && error.message?.includes('store_id')) {
      const rowsWithoutStore = rows.map(({ store_id, ...rest }) => rest);
      await supabase.from('ingredients').upsert(rowsWithoutStore);
    }
  } catch (err) {
    console.warn('[ingredientService] syncToSupabase error:', err);
  }
};

export const DEFAULT_INGREDIENTS = {
  alpukat: {
    id: 'alpukat',
    name: 'Alpukat',
    category: 'Buah Utama',
    unit: 'kg',
    baseUnit: 'gram',
    initialStock: 7000, // 7.000 gram (7 kg)
    currentStock: 7000,
    maxStock: 7000,
    minStockAlert: 1500, // Peringatan jika < 1.5 kg
    portionPerCup: 110, // 110 gram per cup
    icon: '🥑',
    color: 'emerald',
    isDefault: true,
  },
  susuUht: {
    id: 'susuUht',
    name: 'Susu UHT',
    category: 'Dairy',
    unit: 'L',
    baseUnit: 'ml',
    initialStock: 5000, // 5.000 ml (5 Liter)
    currentStock: 5000,
    maxStock: 5000,
    minStockAlert: 1000, // Peringatan jika < 1 Liter
    portionPerCup: 25, // 25 ml per cup
    icon: '🥛',
    color: 'emerald',
    isDefault: true,
  },
  skm: {
    id: 'skm',
    name: 'Susu Kental Manis',
    category: 'Pemanis & Creamer',
    unit: 'L',
    baseUnit: 'ml',
    initialStock: 5000, // 5.000 ml (5 Liter)
    currentStock: 5000,
    maxStock: 5000,
    minStockAlert: 1000, // Peringatan jika < 1 Liter
    portionPerCup: 50, // 50 ml per cup
    icon: '🥫',
    color: 'emerald',
    isDefault: true,
  },
};

import { isToppingItem } from '../utils/productUtils';

/**
 * Checks whether an ordered item consumes avocado shake ingredients
 */
export const isAlpukatShakeItem = (item) => {
  if (!item) return false;
  // If item is topping or extra, it doesn't consume the base avocado cup
  if (isToppingItem(item)) return false;

  const category = (item.category || item.kategori || '').toLowerCase();
  const name = (item.nama || item.name || '').toLowerCase();

  // If item is specifically in Alpukat Kocok category
  if (category.includes('alpukat kocok')) return true;

  // Otherwise check if name contains alpukat
  return name.includes('alpukat');
};

export const ingredientService = {
  /**
   * Get all ingredients from storage
   */
  getAll() {
    const storageKey = getStorageKey();
    let rawData = storageService.get(storageKey, null);

    if (!rawData || typeof rawData !== 'object' || !rawData.alpukat || !rawData.susuUht || !rawData.skm) {
      storageService.set(storageKey, DEFAULT_INGREDIENTS);
      storageService.set('puko_baseline_v4_synced', true);
      return DEFAULT_INGREDIENTS;
    }

    // Clean out any non-ingredient entries (such as boolean flags or metadata like _sync_...)
    const cleanData = {};
    Object.keys(rawData).forEach((k) => {
      const item = rawData[k];
      if (!k.startsWith('_') && item && typeof item === 'object' && item.name) {
        cleanData[k] = item;
      }
    });

    let data = cleanData;
    let changed = false;

    // Remove any legacy polluted keys from localStorage
    if (Object.keys(rawData).length !== Object.keys(cleanData).length) {
      changed = true;
    }

    const isSynced = storageService.get('puko_baseline_v4_synced', false);
    if (!isSynced) {
      data.alpukat = {
        ...(data.alpukat || {}),
        id: 'alpukat',
        name: 'Alpukat',
        unit: 'kg',
        baseUnit: 'gram',
        initialStock: 7000,
        currentStock: 7000,
        maxStock: 7000,
        portionPerCup: 110,
        icon: '🥑',
      };

      data.susuUht = {
        ...(data.susuUht || {}),
        id: 'susuUht',
        name: 'Susu UHT',
        unit: 'L',
        baseUnit: 'ml',
        initialStock: 5000,
        currentStock: 5000,
        maxStock: 5000,
        portionPerCup: 25,
        icon: '🥛',
      };

      data.skm = {
        ...(data.skm || {}),
        id: 'skm',
        name: 'Susu Kental Manis',
        unit: 'L',
        baseUnit: 'ml',
        initialStock: 5000,
        currentStock: 5000,
        maxStock: 5000,
        portionPerCup: 50,
        icon: '🥫',
      };

      storageService.set('puko_baseline_v4_synced', true);
      changed = true;
    }

    if (changed) {
      storageService.set(storageKey, data);
    }

    return data;
  },

  /**
   * Save ingredients to storage and sync to Supabase
   */
  save(ingredients) {
    storageService.set(getStorageKey(), ingredients);
    // Sinkronisasi otomatis ke Supabase di background
    syncToSupabase(ingredients);
    return ingredients;
  },

  /**
   * Ambil stok terbaru dari Supabase
   */
  async fetchFromSupabase() {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();
    try {
      let { data, error } = await supabase.from('ingredients').select('*').eq('store_id', storeId);
      if (error && (error.message?.includes('store_id') || error.code === '42703')) {
        if (storeId === DEFAULT_STORE_ID) {
          const retry = await supabase.from('ingredients').select('*');
          if (!retry.error) {
            data = retry.data;
            error = null;
          }
        }
      }
      if (!error && Array.isArray(data) && data.length > 0) {
        const current = this.getAll();
        const updated = { ...current };
        data.forEach((row) => {
          const key = row.id.replace(`${storeId}_`, '');
          updated[key] = {
            ...(updated[key] || {}),
            id: key,
            name: row.name,
            category: row.category,
            unit: row.unit,
            baseUnit: row.base_unit || row.unit,
            initialStock: Number(row.initial_stock || row.max_stock || 0),
            currentStock: Number(row.current_stock || 0),
            maxStock: Number(row.max_stock || 0),
            minStockAlert: Number(row.min_stock_alert || 0),
            portionPerCup: Number(row.portion_per_cup || 0),
            icon: row.icon || '📦',
            color: row.color || 'emerald',
          };
        });
        storageService.set(storageKey, updated);
        return updated;
      }
    } catch (err) {
      console.warn('[ingredientService] fetchFromSupabase error:', err);
    }
    return this.getAll();
  },

  /**
   * Deduct ingredients according to ordered items
   */
  deductForOrder(items) {
    if (!Array.isArray(items) || items.length === 0) return this.getAll();

    // Count how many avocado drink cups were ordered
    let totalCups = 0;
    items.forEach((item) => {
      if (isAlpukatShakeItem(item)) {
        totalCups += Number(item.qty) || 1;
      }
    });

    if (totalCups <= 0) return this.getAll();

    const current = this.getAll();
    const updated = {};

    Object.keys(current).forEach((key) => {
      const ing = current[key];
      const portion = Number(ing.portionPerCup) || 0;
      if (portion > 0) {
        const deduction = totalCups * portion;
        updated[key] = {
          ...ing,
          currentStock: Math.max(0, (ing.currentStock || 0) - deduction),
          usedStock: (ing.usedStock || 0) + deduction,
        };
      } else {
        updated[key] = { ...ing };
      }
    });

    this.save(updated);
    return {
      ingredients: updated,
      totalCupsDeducted: totalCups,
    };
  },

  /**
   * Adjust stock by adding or subtracting an amount
   * delta > 0 for addition, delta < 0 for subtraction
   */
  adjustStock(ingredientId, delta) {
    const current = this.getAll();
    if (!current[ingredientId]) return current;

    const deltaNum = Number(delta) || 0;
    const currentVal = Number(current[ingredientId].currentStock) || 0;
    const newStock = Math.max(0, currentVal + deltaNum);
    const newMax = Math.max(current[ingredientId].maxStock || newStock, newStock);

    const updated = {
      ...current,
      [ingredientId]: {
        ...current[ingredientId],
        currentStock: newStock,
        maxStock: newMax,
      },
    };

    this.save(updated);
    return updated;
  },

  /**
   * Directly update/set exact custom stock level & initial stock
   */
  updateStock(ingredientId, newStockValue, newInitialStock = null) {
    const current = this.getAll();
    if (!current[ingredientId]) return current;

    const val = Math.max(0, Number(newStockValue) || 0);
    const targetInit =
      newInitialStock !== null
        ? Math.max(0, Number(newInitialStock) || 0)
        : (current[ingredientId].initialStock || val);
    const newMax = Math.max(targetInit, val);

    const updated = {
      ...current,
      [ingredientId]: {
        ...current[ingredientId],
        currentStock: val,
        initialStock: targetInit,
        maxStock: newMax,
      },
    };

    this.save(updated);
    return updated;
  },

  /**
   * Add a new raw ingredient
   */
  addIngredient(data) {
    const current = this.getAll();
    const id = data.id || `ing_${Date.now()}`;
    const initialStock = Math.max(0, Number(data.currentStock) || 0);
    const portion = Math.max(0, Number(data.portionPerCup) || 0);

    const newIng = {
      id,
      name: data.name?.trim() || 'Bahan Baku Baru',
      category: data.category || 'Bahan Lain',
      unit: data.unit || 'gram',
      baseUnit: data.baseUnit || data.unit || 'gram',
      currentStock: initialStock,
      maxStock: Math.max(initialStock, Number(data.maxStock) || (initialStock > 0 ? initialStock * 1.5 : 5000)),
      minStockAlert: Number(data.minStockAlert) || Math.round(initialStock * 0.2) || 500,
      portionPerCup: portion,
      icon: data.icon?.trim() || '📦',
      color: 'slate',
      isCustom: true,
    };

    const updated = {
      ...current,
      [id]: newIng,
    };

    this.save(updated);
    return updated;
  },

  /**
   * Delete custom raw ingredient
   */
  deleteIngredient(ingredientId) {
    const current = this.getAll();
    if (!current[ingredientId]) return current;

    const updated = { ...current };
    delete updated[ingredientId];

    this.save(updated);
    return updated;
  },

  /**
   * Update portion/recipe per cup
   */
  updatePortion(ingredientId, newPortionValue) {
    const current = this.getAll();
    if (!current[ingredientId]) return current;

    const val = Math.max(0, Number(newPortionValue) || 0);

    const updated = {
      ...current,
      [ingredientId]: {
        ...current[ingredientId],
        portionPerCup: val,
      },
    };

    this.save(updated);
    return updated;
  },

  /**
   * Reset to default seed
   */
  resetToDefault() {
    this.save(DEFAULT_INGREDIENTS);
    return DEFAULT_INGREDIENTS;
  },

  /**
   * Format friendly display string for stock
   */
  formatStock(ingredient) {
    if (!ingredient) return '0';
    const val = Number(ingredient.currentStock) || 0;
    const base = (ingredient.baseUnit || ingredient.unit || '').toLowerCase();

    if (base === 'gram' || ingredient.unit === 'kg') {
      if (val >= 1000) {
        const inKg = (val / 1000).toLocaleString('id-ID', {
          minimumFractionDigits: val % 1000 === 0 ? 0 : 1,
          maximumFractionDigits: 2,
        });
        return `${inKg} kg`;
      }
      return `${val.toLocaleString('id-ID')} gram`;
    }

    if (base === 'ml' || ingredient.unit === 'l' || ingredient.unit === 'liter') {
      if (val >= 1000) {
        const inLiter = (val / 1000).toLocaleString('id-ID', {
          minimumFractionDigits: val % 1000 === 0 ? 0 : 1,
          maximumFractionDigits: 2,
        });
        return `${inLiter} Liter`;
      }
      return `${val.toLocaleString('id-ID')} ml`;
    }

    return `${val.toLocaleString('id-ID')} ${ingredient.unit || ingredient.baseUnit || 'pcs'}`;
  },

  /**
   * Get total amount of ingredient used
   */
  getUsedAmount(ingredient) {
    if (!ingredient) return 0;
    if (ingredient.usedStock !== undefined && ingredient.usedStock > 0) {
      return ingredient.usedStock;
    }
    // Calculate from storage transactions if available
    const txList = storageService.get('transactions', []);
    if (Array.isArray(txList) && ingredient.portionPerCup > 0) {
      let totalCups = 0;
      txList.forEach((tx) => {
        if (Array.isArray(tx.items)) {
          tx.items.forEach((item) => {
            if (isAlpukatShakeItem(item)) {
              totalCups += Number(item.qty) || 1;
            }
          });
        }
      });
      return totalCups * ingredient.portionPerCup;
    }
    if (ingredient.maxStock && ingredient.maxStock > ingredient.currentStock) {
      return ingredient.maxStock - ingredient.currentStock;
    }
    return 0;
  },

  /**
   * Format used amount
   */
  formatUsed(ingredient) {
    if (!ingredient) return '0';
    const val = this.getUsedAmount(ingredient);
    const base = (ingredient.baseUnit || ingredient.unit || '').toLowerCase();

    if (base === 'gram' || ingredient.unit === 'kg') {
      if (val >= 1000) {
        const inKg = (val / 1000).toLocaleString('id-ID', {
          minimumFractionDigits: val % 1000 === 0 ? 0 : 1,
          maximumFractionDigits: 2,
        });
        return `${inKg} kg`;
      }
      return `${val.toLocaleString('id-ID')} gram`;
    }

    if (base === 'ml' || ingredient.unit === 'l' || ingredient.unit === 'liter') {
      if (val >= 1000) {
        const inLiter = (val / 1000).toLocaleString('id-ID', {
          minimumFractionDigits: val % 1000 === 0 ? 0 : 1,
          maximumFractionDigits: 2,
        });
        return `${inLiter} Liter`;
      }
      return `${val.toLocaleString('id-ID')} ml`;
    }

    return `${val.toLocaleString('id-ID')} ${ingredient.unit || ingredient.baseUnit || 'pcs'}`;
  },

  /**
   * Format any custom amount for an ingredient
   */
  formatAmount(amount, ingredient) {
    if (!ingredient) return '0';
    const val = Number(amount) || 0;
    const base = (ingredient.baseUnit || ingredient.unit || '').toLowerCase();

    if (base === 'gram' || ingredient.unit === 'kg') {
      if (val >= 1000) {
        const inKg = (val / 1000).toLocaleString('id-ID', {
          minimumFractionDigits: val % 1000 === 0 ? 0 : (val % 100 === 0 ? 1 : 2),
          maximumFractionDigits: 2,
        });
        return `${inKg} kg`;
      }
      return `${val.toLocaleString('id-ID')} gram`;
    }

    if (base === 'ml' || ingredient.unit === 'l' || ingredient.unit === 'liter') {
      if (val >= 1000) {
        const inLiter = (val / 1000).toLocaleString('id-ID', {
          minimumFractionDigits: val % 1000 === 0 ? 0 : (val % 100 === 0 ? 1 : 2),
          maximumFractionDigits: 2,
        });
        return `${inLiter} Liter`;
      }
      return `${val.toLocaleString('id-ID')} ml`;
    }

    return `${val.toLocaleString('id-ID')} ${ingredient.unit || ingredient.baseUnit || 'pcs'}`;
  },

  /**
   * Calculate how many cups can be made
   */
  calcCups(ingredient) {
    if (!ingredient || !ingredient.portionPerCup || ingredient.portionPerCup <= 0) return null;
    return Math.floor((ingredient.currentStock || 0) / ingredient.portionPerCup);
  },

  /**
   * Calculate bottleneck (minimum cups across ingredients that have portionPerCup > 0)
   */
  calcBottleneckCups(ingredients) {
    if (!ingredients) return 0;
    const cupsList = Object.values(ingredients)
      .map((ing) => this.calcCups(ing))
      .filter((c) => c !== null);

    if (cupsList.length === 0) return 0;
    return Math.min(...cupsList);
  },
};

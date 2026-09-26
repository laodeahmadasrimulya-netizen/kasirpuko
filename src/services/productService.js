import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { DUMMY_PRODUCTS } from '../data/dummyProducts';
import { storeService, DEFAULT_STORE_ID } from './storeService';

const getStorageKey = () => {
  const storeId = storeService.getActiveStoreId();
  return storeId === DEFAULT_STORE_ID ? 'products' : `products_${storeId}`;
};

// Helper pemetaan data dari Supabase ke format objek aplikasi
const mapFromDB = (p) => ({
  ...p,
  id: String(p.id),
  store_id: p.store_id || DEFAULT_STORE_ID,
  storeId: p.store_id || DEFAULT_STORE_ID,
  name: p.nama || p.name,
  nama: p.nama || p.name,
  price: Number(p.harga ?? p.price ?? 0),
  harga: Number(p.harga ?? p.price ?? 0),
  costPrice: Number(p.cost_price ?? p.costPrice ?? 0),
  cost_price: Number(p.cost_price ?? p.costPrice ?? 0),
  category: p.kategori || p.category || 'Alpukat Kocok',
  kategori: p.kategori || p.category || 'Alpukat Kocok',
  description: p.deskripsi || p.description || '',
  deskripsi: p.deskripsi || p.description || '',
  image: p.gambar || p.image || '',
  gambar: p.gambar || p.image || '',
  isAvailable: p.is_available ?? p.isAvailable ?? true,
  is_available: p.is_available ?? p.isAvailable ?? true,
  badge: p.badge || null,
});

// Helper pemetaan data dari aplikasi ke kolom tabel Supabase
const mapToDB = (p) => {
  const storeId = p.store_id || p.storeId || storeService.getActiveStoreId();
  return {
    id: String(p.id),
    store_id: storeId,
    name: p.nama || p.name,
    nama: p.nama || p.name,
    price: Number(p.harga ?? p.price ?? 0),
    harga: Number(p.harga ?? p.price ?? 0),
    cost_price: Number(p.costPrice ?? p.cost_price ?? 0),
    category: p.kategori || p.category || 'Alpukat Kocok',
    kategori: p.kategori || p.category || 'Alpukat Kocok',
    description: p.deskripsi || p.description || '',
    deskripsi: p.deskripsi || p.description || '',
    image: p.gambar || p.image || '',
    gambar: p.gambar || p.image || '',
    is_available: p.isAvailable ?? p.is_available ?? true,
    badge: p.badge || null,
    updated_at: new Date().toISOString(),
  };
};

/**
 * Product Service Layer (Multi-tenant Supabase + Local Cache Fallback)
 */
export const productService = {
  /**
   * Mengambil semua produk toko aktif dari Supabase (dengan fallback ke cache lokal jika offline)
   */
  async getAll() {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();

    // Mode Demo: 100% Sandbox LocalStorage (TIDAK AKAN memanggil Supabase)
    if (storeService.isDemoStore(storeId)) {
      let localProducts = storageService.get(storageKey);
      if (!localProducts || !Array.isArray(localProducts) || localProducts.length === 0) {
        localProducts = DUMMY_PRODUCTS.map((p, idx) => ({
          ...p,
          id: `demo-p-${idx + 1}`,
          store_id: storeId,
          storeId: storeId,
        }));
        storageService.set(storageKey, localProducts);
      }
      return localProducts.map(mapFromDB);
    }

    try {
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: true });

      // Fallback jika user belum menjalankan query SQL migration (kolom store_id belum ada)
      if (error && (error.message?.includes('store_id') || error.code === '42703')) {
        if (storeId === DEFAULT_STORE_ID) {
          const retry = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: true });
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
        // Jika toko baru belum memiliki data di Supabase, cek cache lokal
        if (storeId !== DEFAULT_STORE_ID) {
          const cached = storageService.get(storageKey, []);
          if (cached && cached.length > 0) {
            return cached.map(mapFromDB);
          }
        }
      }
    } catch (err) {
      console.warn('[productService] Gagal load dari Supabase, memakai cache lokal:', err.message);
    }

    // Fallback: gunakan storage lokal atau default starter
    let localProducts = storageService.get(storageKey);
    if (!localProducts || !Array.isArray(localProducts) || localProducts.length === 0) {
      localProducts = storeId === DEFAULT_STORE_ID ? DUMMY_PRODUCTS : [];
      storageService.set(storageKey, localProducts);
    }
    return localProducts.map(mapFromDB);
  },

  /**
   * Ambil 1 produk berdasarkan ID
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) return mapFromDB(data);
    } catch (err) {
      console.warn('[productService] getById error:', err);
    }

    const all = await this.getAll();
    return all.find((p) => p.id === id) || null;
  },

  /**
   * Toggle ketersediaan produk (Tersedia / Habis)
   */
  async toggleAvailability(id) {
    const storeId = storeService.getActiveStoreId();
    const all = await this.getAll();
    const target = all.find((p) => p.id === id);
    const newStatus = target ? !target.isAvailable : false;

    // Update di Supabase hanya jika bukan demo
    if (!storeService.isDemoStore(storeId)) {
      try {
        await supabase
          .from('products')
          .update({ is_available: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('[productService] toggleAvailability error di Supabase:', err);
      }
    }

    // Update di cache lokal
    const updated = all.map((item) =>
      item.id === id ? { ...item, isAvailable: newStatus, is_available: newStatus } : item
    );
    storageService.set(getStorageKey(), updated);
    return updated.find((p) => p.id === id);
  },

  /**
   * Edit rincian produk
   */
  async update(id, data) {
    const storeId = storeService.getActiveStoreId();
    const dbPayload = mapToDB({ ...data, id });

    // Update di Supabase hanya jika bukan demo
    if (!storeService.isDemoStore(storeId)) {
      try {
        const { error } = await supabase
          .from('products')
          .update(dbPayload)
          .eq('id', id);

        if (error) {
          if (error.message?.includes('store_id')) {
            const { store_id, ...withoutStore } = dbPayload;
            await supabase.from('products').update(withoutStore).eq('id', id);
          } else {
            console.warn('[productService] update error di Supabase:', error);
          }
        }
      } catch (err) {
        console.warn('[productService] update error:', err);
      }
    }

    // Update di cache lokal
    const all = await this.getAll();
    const index = all.findIndex((p) => p.id === id);
    const mappedUpdated = mapFromDB(dbPayload);

    if (index !== -1) {
      all[index] = { ...all[index], ...mappedUpdated };
      storageService.set(getStorageKey(), all);
    }
    return mappedUpdated;
  },

  /**
   * Tambah produk baru
   */
  async create(productData) {
    const storeId = storeService.getActiveStoreId();
    const newId = productData.id || `puko-${Date.now()}`;
    const newProduct = {
      ...productData,
      id: newId,
      store_id: storeId,
      storeId: storeId,
      isAvailable: productData.isAvailable ?? true,
      colorScheme: productData.colorScheme || 'from-emerald-500 to-green-600',
    };
    const dbPayload = mapToDB(newProduct);

    // Insert ke Supabase hanya jika bukan demo
    if (!storeService.isDemoStore(storeId)) {
      try {
        const { error } = await supabase
          .from('products')
          .insert([dbPayload]);

        if (error) {
          if (error.message?.includes('store_id')) {
            const { store_id, ...withoutStore } = dbPayload;
            await supabase.from('products').insert([withoutStore]);
          } else {
            console.warn('[productService] create error di Supabase:', error);
          }
        }
      } catch (err) {
        console.warn('[productService] create error:', err);
      }
    }

    // Update cache lokal
    const all = await this.getAll();
    const mappedCreated = mapFromDB(newProduct);
    const updated = [mappedCreated, ...all];
    storageService.set(getStorageKey(), updated);
    return mappedCreated;
  },

  /**
   * Hapus produk
   */
  async delete(id) {
    const storeId = storeService.getActiveStoreId();
    // Delete di Supabase hanya jika bukan demo
    if (!storeService.isDemoStore(storeId)) {
      try {
        await supabase
          .from('products')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('[productService] delete error di Supabase:', err);
      }
    }

    const all = await this.getAll();
    const updated = all.filter((p) => p.id !== id);
    storageService.set(getStorageKey(), updated);
    return true;
  },

  /**
   * Reset ke data bawaan
   */
  async reset() {
    const storeId = storeService.getActiveStoreId();
    const storageKey = getStorageKey();
    const resetProducts = DUMMY_PRODUCTS.map((p, idx) => ({
      ...p,
      id: storeService.isDemoStore(storeId) ? `demo-p-${idx + 1}` : p.id,
      store_id: storeId,
      storeId: storeId,
    }));
    storageService.set(storageKey, resetProducts);
    return resetProducts.map(mapFromDB);
  },
};

import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { DUMMY_PRODUCTS } from '../data/dummyProducts';

const STORAGE_KEY = 'products';

// Helper pemetaan data dari Supabase ke format objek aplikasi
const mapFromDB = (p) => ({
  ...p,
  id: String(p.id),
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
const mapToDB = (p) => ({
  id: String(p.id),
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
});

/**
 * Product Service Layer (Supabase + Local Cache Fallback)
 */
export const productService = {
  /**
   * Mengambil semua produk dari Supabase (dengan fallback ke cache lokal jika offline)
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapFromDB);
        // Simpan ke cache lokal agar tetap bisa dibuka offline
        storageService.set(STORAGE_KEY, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[productService] Gagal load dari Supabase, memakai cache lokal:', err.message);
    }

    // Fallback: gunakan storage lokal atau dummy
    let localProducts = storageService.get(STORAGE_KEY);
    if (!localProducts || !Array.isArray(localProducts) || localProducts.length === 0) {
      localProducts = DUMMY_PRODUCTS;
      storageService.set(STORAGE_KEY, localProducts);
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
    const all = await this.getAll();
    const target = all.find((p) => p.id === id);
    const newStatus = target ? !target.isAvailable : false;

    // Update di Supabase
    try {
      await supabase
        .from('products')
        .update({ is_available: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('[productService] toggleAvailability error di Supabase:', err);
    }

    // Update di cache lokal
    const updated = all.map((item) =>
      item.id === id ? { ...item, isAvailable: newStatus, is_available: newStatus } : item
    );
    storageService.set(STORAGE_KEY, updated);
    return updated.find((p) => p.id === id);
  },

  /**
   * Edit rincian produk
   */
  async update(id, data) {
    const dbPayload = mapToDB({ ...data, id });

    // Update di Supabase
    try {
      const { error } = await supabase
        .from('products')
        .update(dbPayload)
        .eq('id', id);

      if (error) console.warn('[productService] update error di Supabase:', error);
    } catch (err) {
      console.warn('[productService] update error:', err);
    }

    // Update di cache lokal
    const all = await this.getAll();
    const index = all.findIndex((p) => p.id === id);
    const mappedUpdated = mapFromDB(dbPayload);

    if (index !== -1) {
      all[index] = { ...all[index], ...mappedUpdated };
      storageService.set(STORAGE_KEY, all);
    }
    return mappedUpdated;
  },

  /**
   * Tambah produk baru
   */
  async create(productData) {
    const newId = productData.id || `puko-${Date.now()}`;
    const newProduct = {
      ...productData,
      id: newId,
      isAvailable: productData.isAvailable ?? true,
      colorScheme: productData.colorScheme || 'from-emerald-500 to-green-600',
    };
    const dbPayload = mapToDB(newProduct);

    // Insert ke Supabase
    try {
      const { error } = await supabase
        .from('products')
        .insert([dbPayload]);

      if (error) console.warn('[productService] create error di Supabase:', error);
    } catch (err) {
      console.warn('[productService] create error:', err);
    }

    // Update cache lokal
    const all = await this.getAll();
    const mappedCreated = mapFromDB(newProduct);
    const updated = [mappedCreated, ...all];
    storageService.set(STORAGE_KEY, updated);
    return mappedCreated;
  },

  /**
   * Hapus produk
   */
  async delete(id) {
    try {
      await supabase
        .from('products')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('[productService] delete error di Supabase:', err);
    }

    const all = await this.getAll();
    const updated = all.filter((p) => p.id !== id);
    storageService.set(STORAGE_KEY, updated);
    return true;
  },

  /**
   * Reset ke data bawaan
   */
  async reset() {
    storageService.set(STORAGE_KEY, DUMMY_PRODUCTS);
    return DUMMY_PRODUCTS.map(mapFromDB);
  },
};

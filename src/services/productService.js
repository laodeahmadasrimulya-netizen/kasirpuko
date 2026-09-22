import { storageService } from './storageService';
import { DUMMY_PRODUCTS } from '../data/dummyProducts';

const STORAGE_KEY = 'products';

/**
 * Product Service Layer
 * Architecture Note: All methods return Promises to ensure smooth migration
 * to backend REST API or Supabase/Firebase in the future.
 */
export const productService = {
  /**
   * Fetch all products from storage (or seed with dummy data)
   */
  async getAll() {
    let products = storageService.get(STORAGE_KEY);
    // Jika storage kosong atau masih versi lama yang belum memiliki kategori baru
    if (
      !products ||
      !Array.isArray(products) ||
      products.length === 0 ||
      !products.some((p) => p.category === 'Alpukat Kocok' || p.kategori === 'Alpukat Kocok')
    ) {
      products = DUMMY_PRODUCTS;
      storageService.set(STORAGE_KEY, products);
    } else {
      // Pastikan item yang sudah dihapus (keju gondrong, es teh, air mineral) otomatis dibersihkan dari storage
      const REMOVED_IDS = ['puko-t01', 'puko-m01', 'puko-m02'];
      const hasRemoved = products.some((p) => REMOVED_IDS.includes(p.id));
      if (hasRemoved) {
        products = products.filter((p) => !REMOVED_IDS.includes(p.id));
        storageService.set(STORAGE_KEY, products);
      }
    }
    return products;
  },

  /**
   * Fetch single product by id
   */
  async getById(id) {
    const products = await this.getAll();
    return products.find((p) => p.id === id) || null;
  },

  /**
   * Toggle product availability (Tersedia / Habis)
   */
  async toggleAvailability(id) {
    const products = await this.getAll();
    const updated = products.map((item) =>
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    );
    storageService.set(STORAGE_KEY, updated);
    return updated.find((p) => p.id === id);
  },

  /**
   * Update product detail
   */
  async update(id, data) {
    const products = await this.getAll();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Produk tidak ditemukan');

    products[index] = { ...products[index], ...data };
    storageService.set(STORAGE_KEY, products);
    return products[index];
  },

  /**
   * Add new product
   */
  async create(productData) {
    const products = await this.getAll();
    const newProduct = {
      ...productData,
      id: `puko-${Date.now()}`,
      isAvailable: productData.isAvailable ?? true,
      colorScheme: productData.colorScheme || 'from-emerald-500 to-green-600',
    };
    const updated = [newProduct, ...products];
    storageService.set(STORAGE_KEY, updated);
    return newProduct;
  },

  /**
   * Delete product
   */
  async delete(id) {
    const products = await this.getAll();
    const updated = products.filter((p) => p.id !== id);
    storageService.set(STORAGE_KEY, updated);
    return true;
  },

  /**
   * Reset to initial dummy data
   */
  async reset() {
    storageService.set(STORAGE_KEY, DUMMY_PRODUCTS);
    return DUMMY_PRODUCTS;
  },
};

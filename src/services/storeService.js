import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { DUMMY_PRODUCTS } from '../data/dummyProducts';

export const DEFAULT_STORE_ID = 'store_default';
const ACTIVE_STORE_KEY = 'puko_active_store_id';

export const storeService = {
  /**
   * Mendapatkan Store ID yang sedang aktif
   */
  getActiveStoreId(user = null) {
    if (user?.storeId) return user.storeId;
    if (user?.store_id) return user.store_id;

    // Jika user admin lama PUKO
    if (user?.id === 'usr-admin' || user?.email?.toLowerCase() === 'alpukatkocokpuko@gmail.com') {
      return DEFAULT_STORE_ID;
    }

    try {
      const saved = localStorage.getItem(ACTIVE_STORE_KEY);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return DEFAULT_STORE_ID;
  },

  /**
   * Menyimpan Store ID yang sedang aktif
   */
  setActiveStoreId(storeId) {
    try {
      localStorage.setItem(ACTIVE_STORE_KEY, storeId || DEFAULT_STORE_ID);
    } catch {
      // ignore
    }
  },

  /**
   * Mengambil data toko berdasarkan storeId
   */
  async getStore(storeId = DEFAULT_STORE_ID) {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('[storeService] getStore error di Supabase:', err);
    }

    // Fallback data toko lokal
    const localStores = storageService.get('puko_stores_list', {});
    return (
      localStores[storeId] || {
        id: storeId,
        name: storeId === DEFAULT_STORE_ID ? 'PUKO' : 'Toko Saya',
        tagline: storeId === DEFAULT_STORE_ID ? 'Alpukat Kocok No Serat No Pahit' : 'Kasir POS Modern',
        phone: storeId === DEFAULT_STORE_ID ? '085652103647' : '',
        address: storeId === DEFAULT_STORE_ID ? 'Kendari' : '',
      }
    );
  },

  /**
   * Mengambil atau otomatis membuat toko untuk Owner yang login
   */
  async getOrCreateStoreForOwner(ownerId, ownerEmail, storeName) {
    if (ownerId === 'usr-admin' || ownerEmail?.toLowerCase() === 'alpukatkocokpuko@gmail.com') {
      this.setActiveStoreId(DEFAULT_STORE_ID);
      return await this.getStore(DEFAULT_STORE_ID);
    }

    const cleanEmail = (ownerEmail || '').trim().toLowerCase();

    // 1. Cek di tabel stores Supabase
    try {
      let query = supabase.from('stores').select('*');
      if (ownerId && cleanEmail) {
        query = query.or(`owner_id.eq.${ownerId},owner_email.eq.${cleanEmail}`);
      } else if (cleanEmail) {
        query = query.eq('owner_email', cleanEmail);
      } else if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        this.setActiveStoreId(data.id);
        return data;
      }
    } catch (err) {
      console.warn('[storeService] getOrCreateStore Supabase notice:', err);
    }

    // 2. Cek di cache local storage
    const localStores = storageService.get('puko_stores_list', {});
    const existing = Object.values(localStores).find(
      (s) => (ownerId && s.owner_id === ownerId) || (cleanEmail && s.owner_email === cleanEmail)
    );
    if (existing) {
      this.setActiveStoreId(existing.id);
      return existing;
    }

    // 3. Jika belum pernah ada toko, buat toko baru
    return await this.createStoreForOwner(ownerId, cleanEmail, storeName);
  },

  /**
   * Membuat toko baru untuk Owner yang baru mendaftar
   */
  async createStoreForOwner(ownerId, ownerEmail, storeName) {
    const cleanEmail = (ownerEmail || '').trim().toLowerCase();
    const cleanId = (ownerId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 14);
    const storeId = `store_${cleanId}_${Date.now().toString(36)}`;
    const newStore = {
      id: storeId,
      owner_id: ownerId,
      owner_email: cleanEmail,
      name: storeName ? `${storeName}'s Store` : 'Toko Baru',
      tagline: 'Usaha Minuman & Makanan',
      phone: '',
      address: '',
      created_at: new Date().toISOString(),
    };

    // Simpan ke Supabase di background
    try {
      await supabase.from('stores').insert(newStore);
    } catch (err) {
      console.warn('[storeService] createStore Supabase fallback:', err);
    }

    // Simpan di local storage
    const localStores = storageService.get('puko_stores_list', {});
    localStores[storeId] = newStore;
    storageService.set('puko_stores_list', localStores);

    this.setActiveStoreId(storeId);

    // Otomatis seed starter produk agar kasir toko baru langsung bisa dipakai
    await this.seedProductsForNewStore(storeId);

    return newStore;
  },

  /**
   * Menyalin starter produk untuk toko baru
   */
  async seedProductsForNewStore(storeId) {
    try {
      const starterProducts = DUMMY_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `${storeId}-prod-${idx + 1}`,
        store_id: storeId,
      }));

      // Simpan di cache lokal toko baru
      storageService.set(`products_${storeId}`, starterProducts);

      // Simpan ke Supabase
      const dbRows = starterProducts.map((p) => ({
        id: p.id,
        store_id: storeId,
        nama: p.nama || p.name,
        name: p.nama || p.name,
        harga: Number(p.harga || p.price || 0),
        price: Number(p.harga || p.price || 0),
        cost_price: Number(p.costPrice || 0),
        kategori: p.kategori || p.category || 'Alpukat Kocok',
        category: p.kategori || p.category || 'Alpukat Kocok',
        deskripsi: p.deskripsi || p.description || '',
        description: p.deskripsi || p.description || '',
        gambar: p.gambar || p.image || '',
        image: p.gambar || p.image || '',
        is_available: true,
        badge: p.badge || null,
        created_at: new Date().toISOString(),
      }));

      await supabase.from('products').insert(dbRows);
    } catch (err) {
      console.warn('[storeService] seedProducts error:', err);
    }
  },

  /**
   * Update profil toko
   */
  async updateStore(storeId, updateData) {
    try {
      await supabase.from('stores').update(updateData).eq('id', storeId);
    } catch (err) {
      console.warn('[storeService] updateStore Supabase fallback:', err);
    }

    const localStores = storageService.get('puko_stores_list', {});
    localStores[storeId] = { ...(localStores[storeId] || {}), ...updateData };
    storageService.set('puko_stores_list', localStores);
    return localStores[storeId];
  },
};

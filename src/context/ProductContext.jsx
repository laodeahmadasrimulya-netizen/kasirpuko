import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';
import { CATEGORIES } from '../data/dummyProducts';

const ProductContext = createContext(null);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories] = useState(CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load products on mount
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load products', err);
      setError('Gagal memuat daftar produk');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Toggle availability (Tersedia / Habis)
  const toggleAvailability = async (id) => {
    try {
      const updated = await productService.toggleAvailability(id);
      setProducts((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      console.error('Failed to toggle availability', err);
    }
  };

  // Add new product
  const addProduct = async (productData) => {
    try {
      const formatted = {
        ...productData,
        name: productData.nama || productData.name,
        nama: productData.nama || productData.name,
        price: Number(productData.harga || productData.price),
        harga: Number(productData.harga || productData.price),
        category: productData.category || productData.kategori || 'Alpukat Kocok',
        kategori: productData.category || productData.kategori || 'Alpukat Kocok',
        gambar: productData.gambar || productData.image || null,
        image: productData.gambar || productData.image || null,
        deskripsi: productData.deskripsi || productData.description || '',
        description: productData.deskripsi || productData.description || '',
      };
      const newProduct = await productService.create(formatted);
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      console.error('Failed to add product', err);
      throw err;
    }
  };

  // Edit existing product
  const editProduct = async (id, productData) => {
    try {
      const formatted = {
        ...productData,
        name: productData.nama || productData.name,
        nama: productData.nama || productData.name,
        price: Number(productData.harga || productData.price),
        harga: Number(productData.harga || productData.price),
        category: productData.category || productData.kategori || 'Alpukat Kocok',
        kategori: productData.category || productData.kategori || 'Alpukat Kocok',
        gambar: productData.gambar || productData.image || null,
        image: productData.gambar || productData.image || null,
        deskripsi: productData.deskripsi || productData.description || '',
        description: productData.deskripsi || productData.description || '',
      };
      const updated = await productService.update(id, formatted);
      setProducts((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    } catch (err) {
      console.error('Failed to edit product', err);
      throw err;
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete product', err);
      throw err;
    }
  };

  // Reset to default dummy products
  const resetProducts = async () => {
    setIsLoading(true);
    try {
      const defaultProducts = await productService.reset();
      setProducts(defaultProducts);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered products based on search and category
  const filteredProducts = products.filter((product) => {
    const itemCat = product.category || product.kategori || '';
    const matchesCategory =
      selectedCategory === 'Semua' || itemCat === selectedCategory;
    const nameStr = (product.nama || product.name || '').toLowerCase();
    const descStr = (product.deskripsi || product.description || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = nameStr.includes(q) || descStr.includes(q);
    return matchesCategory && matchesSearch;
  });

  const value = {
    products,
    filteredProducts,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refreshProducts: fetchProducts,
    toggleAvailability,
    addProduct,
    editProduct,
    deleteProduct,
    resetProducts,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

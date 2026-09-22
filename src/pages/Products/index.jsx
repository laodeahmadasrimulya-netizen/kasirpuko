import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Coffee,
  CheckCircle2,
  XCircle,
  Tag,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { formatIDR } from '../../utils/currency';
import { handleImageError } from '../../utils/imageFallback';
import { ProductFormModal } from './ProductFormModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const ProductsPage = () => {
  const {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    filteredProducts,
    toggleAvailability,
    addProduct,
    editProduct,
    deleteProduct,
  } = useProducts();

  // State for Form Modal (Tambah & Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };

  // Open modal for Delete
  const handleOpenDelete = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Handle Form Submit (Tambah or Edit)
  const handleFormSubmit = async (formData) => {
    if (editingProduct) {
      await editProduct(editingProduct.id, formData);
    } else {
      await addProduct(formData);
    }
  };

  // Handle Delete confirm
  const handleConfirmDelete = async (id) => {
    await deleteProduct(id);
  };

  // Quick stats
  const totalCount = products.length;
  const alpukatCount = products.filter(
    (p) => (p.category || p.kategori) === 'Alpukat Kocok'
  ).length;
  const toppingCount = products.filter(
    (p) => (p.category || p.kategori) === 'Topping'
  ).length;
  const minumanCount = products.filter(
    (p) => (p.category || p.kategori) === 'Minuman Tambahan'
  ).length;
  const outOfStockCount = products.filter((p) => !p.isAvailable).length;

  return (
    <div className="space-y-6">
      {/* Top Actions: Tombol Memanjang */}
      <div>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={handleOpenAdd}
          icon={Plus}
          className="w-full shadow-md shadow-puko-700/20 font-bold py-3 text-sm rounded-2xl cursor-pointer flex items-center justify-center gap-2"
        >
          Tambah Menu Baru
        </Button>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedCategory('Semua')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedCategory === 'Semua'
              ? 'bg-puko-700 text-white border-puko-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:border-puko-300'
          }`}
        >
          <span className="text-[11px] font-semibold block opacity-80 uppercase tracking-wider">
            Semua Kategori
          </span>
          <span className="text-xl font-extrabold mt-0.5 block">{totalCount}</span>
        </div>

        <div
          onClick={() => setSelectedCategory('Alpukat Kocok')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedCategory === 'Alpukat Kocok'
              ? 'bg-puko-700 text-white border-puko-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:border-puko-300'
          }`}
        >
          <span className="text-[11px] font-semibold block opacity-80 uppercase tracking-wider">
            Alpukat Kocok
          </span>
          <span className="text-xl font-extrabold mt-0.5 block">{alpukatCount}</span>
        </div>

        <div
          onClick={() => setSelectedCategory('Topping')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedCategory === 'Topping'
              ? 'bg-puko-700 text-white border-puko-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:border-puko-300'
          }`}
        >
          <span className="text-[11px] font-semibold block opacity-80 uppercase tracking-wider">
            Topping
          </span>
          <span className="text-xl font-extrabold mt-0.5 block">{toppingCount}</span>
        </div>

        <div
          onClick={() => setSelectedCategory('Minuman Tambahan')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedCategory === 'Minuman Tambahan'
              ? 'bg-puko-700 text-white border-puko-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:border-puko-300'
          }`}
        >
          <span className="text-[11px] font-semibold block opacity-80 uppercase tracking-wider">
            Minuman Tambahan
          </span>
          <span className="text-xl font-extrabold mt-0.5 block">{minumanCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card padding={false} className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Cari menu berdasarkan nama atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 select-none
                  ${
                    selectedCategory === cat
                      ? 'bg-puko-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Products Table Card */}
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Menu Produk</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-right">Harga Jual</th>
                <th className="py-3.5 px-4 text-right">Modal (HPP)</th>
                <th className="py-3.5 px-4 text-center">Status Stok</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Coffee className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada menu ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba ganti kata kunci pencarian atau tambah menu baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const itemName = item.nama || item.name;
                  const itemPrice = item.harga || item.price;
                  const itemCost = item.costPrice || Math.round(itemPrice * 0.5);
                  const itemImage = item.gambar || item.image;
                  const itemCategory = item.category || item.kategori;
                  const itemDesc = item.deskripsi || item.description;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Product Thumbnail & Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={itemName}
                                className="w-full h-full object-cover"
                                onError={handleImageError}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">
                                🥑
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {itemName}
                              </span>
                              {item.badge && (
                                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                              {itemDesc || 'Tidak ada deskripsi'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            itemCategory === 'Alpukat Kocok'
                              ? 'brand'
                              : itemCategory === 'Topping'
                              ? 'warning'
                              : 'info'
                          }
                          size="sm"
                        >
                          {itemCategory}
                        </Badge>
                      </td>

                      {/* Harga Jual */}
                      <td className="py-3 px-4 text-right font-extrabold text-puko-800 text-sm">
                        {formatIDR(itemPrice)}
                      </td>

                      {/* Estimasi HPP */}
                      <td className="py-3 px-4 text-right text-slate-400 font-medium">
                        {formatIDR(itemCost)}
                      </td>

                      {/* Status Stok Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAvailability(item.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                          title="Klik untuk ubah status ketersediaan"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {item.isAvailable ? 'Tersedia' : 'Habis'}
                        </button>
                      </td>

                      {/* Aksi: Edit & Hapus */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-puko-700 hover:bg-puko-50 transition-colors"
                            title="Edit Menu"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Menu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Tambah & Edit Menu */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingProduct}
        categories={categories}
      />

      {/* Modal Konfirmasi Hapus */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        product={productToDelete}
      />
    </div>
  );
};

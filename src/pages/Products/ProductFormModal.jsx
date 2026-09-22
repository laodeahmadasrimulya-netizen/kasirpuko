import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Check,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

const PRESET_IMAGES = [
  { label: 'Original', src: '/images/alpukat_original.jpg' },
  { label: 'Coklat', src: '/images/alpukat_coklat.jpg' },
  { label: 'Milo', src: '/images/alpukat_milo.jpg' },
  { label: 'Keju', src: '/images/alpukat_keju.jpg' },
  { label: 'Oreo', src: '/images/alpukat_oreo.jpg' },
  { label: 'Topping Keju', src: '/images/topping_keju.jpg' },
  { label: 'Es Teh Manis', src: '/images/es_teh_manis.jpg' },
];

export const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  categories = ['Alpukat Kocok', 'Topping', 'Minuman Tambahan'],
}) => {
  const [formData, setFormData] = useState({
    nama: '',
    category: 'Alpukat Kocok',
    harga: '',
    costPrice: '',
    deskripsi: '',
    isAvailable: true,
    badge: '',
    gambar: '',
  });

  const [imagePreview, setImagePreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Sync initialData when opening for edit or create
  useEffect(() => {
    if (initialData) {
      setFormData({
        nama: initialData.nama || initialData.name || '',
        category: initialData.category || initialData.kategori || 'Alpukat Kocok',
        harga: initialData.harga || initialData.price || '',
        costPrice: initialData.costPrice || '',
        deskripsi: initialData.deskripsi || initialData.description || '',
        isAvailable: initialData.isAvailable ?? true,
        badge: initialData.badge || '',
        gambar: initialData.gambar || initialData.image || '',
      });
      setImagePreview(initialData.gambar || initialData.image || '');
    } else {
      setFormData({
        nama: '',
        category: 'Alpukat Kocok',
        harga: '',
        costPrice: '',
        deskripsi: '',
        isAvailable: true,
        badge: '',
        gambar: '',
      });
      setImagePreview('');
    }
    setUploadError('');
  }, [initialData, isOpen]);

  // Handle local file upload via FileReader (Base64)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 2MB for localStorage safety
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Ukuran gambar maksimal 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (JPG, PNG, WEBP).');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setFormData((prev) => ({ ...prev, gambar: base64String }));
    };
    reader.readAsDataURL(file);
  };

  // Select preset image
  const handleSelectPreset = (src) => {
    setImagePreview(src);
    setFormData((prev) => ({ ...prev, gambar: src }));
    setUploadError('');
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData((prev) => ({ ...prev, gambar: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.harga) return;

    onSubmit({
      ...formData,
      harga: Number(formData.harga),
      price: Number(formData.harga),
      costPrice: Number(formData.costPrice) || Math.round(Number(formData.harga) * 0.5),
      name: formData.nama,
      kategori: formData.category,
      image: formData.gambar,
      description: formData.deskripsi,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Menu Produk' : 'Tambah Menu Baru'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Kolom Kiri: Informasi Menu */}
          <div className="space-y-4">
            <Input
              label="Nama Menu *"
              placeholder="Contoh: Alpukat Kocok Durian"
              value={formData.nama}
              onChange={(e) =>
                setFormData({ ...formData, nama: e.target.value })
              }
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Kategori Menu *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 font-medium"
              >
                {categories
                  .filter((c) => c !== 'Semua')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Harga Jual (Rp) *"
                type="number"
                placeholder="20000"
                value={formData.harga}
                onChange={(e) =>
                  setFormData({ ...formData, harga: e.target.value })
                }
                required
              />

              <Input
                label="Estimasi HPP (Rp)"
                type="number"
                placeholder="10000"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: e.target.value })
                }
                helperText="Modal pokok bahan"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Badge Promosi
                </label>
                <select
                  value={formData.badge}
                  onChange={(e) =>
                    setFormData({ ...formData, badge: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500"
                >
                  <option value="">Tanpa Badge</option>
                  <option value="Favorit">Favorit</option>
                  <option value="Best Seller">Best Seller</option>
                  <option value="Menu Baru">Menu Baru</option>
                  <option value="Promo">Promo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status Stok
                </label>
                <select
                  value={formData.isAvailable ? 'true' : 'false'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isAvailable: e.target.value === 'true',
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500"
                >
                  <option value="true">Tersedia (Ready)</option>
                  <option value="false">Habis (Kosong)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Deskripsi Menu
              </label>
              <textarea
                rows={2}
                placeholder="Rasa khas, topping, atau komposisi alpukat..."
                value={formData.deskripsi}
                onChange={(e) =>
                  setFormData({ ...formData, deskripsi: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-puko-500"
              />
            </div>
          </div>

          {/* Kolom Kanan: Upload Gambar Menu */}
          <div className="space-y-3 flex flex-col">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Foto / Gambar Menu
            </label>

            {/* Preview Box & Upload Trigger */}
            <div className="relative border-2 border-dashed border-slate-300 hover:border-puko-500 rounded-2xl p-4 bg-slate-50/60 flex flex-col items-center justify-center min-h-[190px] transition-colors overflow-hidden group">
              {imagePreview ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden shadow-inner">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-bold rounded-lg shadow-sm"
                    >
                      Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm"
                      title="Hapus Foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer text-center space-y-2 py-4"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-puko-100 text-puko-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Klik untuk Upload Foto Menu
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, atau WEBP (Maksimal 2MB)
                    </p>
                  </div>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {uploadError && (
              <div className="text-xs text-rose-500 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Quick Preset Selector */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Atau Pilih Contoh Foto PUKO:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.src}
                    type="button"
                    onClick={() => handleSelectPreset(preset.src)}
                    className={`relative rounded-xl overflow-hidden border text-[10px] text-left transition-all h-14 ${
                      imagePreview === preset.src
                        ? 'ring-2 ring-puko-600 border-puko-600'
                        : 'border-slate-200 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset.src}
                      alt={preset.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-1">
                      <span className="text-white font-semibold truncate leading-none">
                        {preset.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" type="submit" className="px-6 font-bold">
            {initialData ? 'Perbarui Menu' : 'Simpan Menu Baru'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

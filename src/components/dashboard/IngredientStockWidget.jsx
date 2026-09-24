import React, { useState } from 'react';
import {
  Boxes,
  Pencil,
  Sliders,
  CheckCircle2,
  X,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  ArrowLeft,
} from 'lucide-react';
import { useIngredients } from '../../context/IngredientContext';

const formatCompactStock = (val, ingredient) => {
  const num = Number(val) || 0;
  const base = (ingredient?.baseUnit || ingredient?.unit || '').toLowerCase();

  if (base === 'gram' || ingredient?.unit === 'kg') {
    if (num >= 1000) {
      const inKg = (num / 1000).toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
      return `${inKg} kg`;
    }
    return `${num} g`;
  }

  if (base === 'ml' || ingredient?.unit === 'l' || ingredient?.unit === 'liter') {
    if (num >= 1000) {
      const inLiter = (num / 1000).toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
      return `${inLiter} L`;
    }
    return `${num} ml`;
  }

  return `${num.toLocaleString('id-ID')} ${ingredient?.unit || ingredient?.baseUnit || 'pcs'}`;
};

export const IngredientStockWidget = () => {
  const {
    ingredients,
    adjustStock,
    updateStock,
    addIngredient,
    deleteIngredient,
    updatePortion,
    resetIngredients,
    formatStock,
    formatAmount,
    getUsedAmount,
    calcCups,
  } = useIngredients();

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPortionModalOpen, setIsPortionModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('adjust'); // 'adjust' | 'new'

  // Selected ingredient to edit - filter out any non-ingredient metadata
  const ingredientList = Object.values(ingredients).filter(
    (item) => item && typeof item === 'object' && item.name && typeof item.name === 'string' && item.id && !item.id.startsWith('_')
  );
  const [selectedKey, setSelectedKey] = useState('alpukat');

  // Stock edit states
  const [initialStockBase, setInitialStockBase] = useState(7000);
  const [initialStockDisplayInput, setInitialStockDisplayInput] = useState('7');
  const [currentStockBase, setCurrentStockBase] = useState(7000);
  const [stockDisplayInput, setStockDisplayInput] = useState('7');
  const [activeUnit, setActiveUnit] = useState('kg');

  // Add new stock item state
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [newStockName, setNewStockName] = useState('');
  const [newStockIcon, setNewStockIcon] = useState('🍫');
  const [newStockType, setNewStockType] = useState('weight'); // 'weight' | 'volume' | 'pcs'
  const [newStockInitial, setNewStockInitial] = useState('5');
  const [newStockPortion, setNewStockPortion] = useState('20');

  // Portions draft state
  const [portionDraft, setPortionDraft] = useState({});

  // Toast notification
  const [successToast, setSuccessToast] = useState('');
  // Delete confirmation state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const currentSelected = ingredients[selectedKey] || ingredientList[0] || null;

  // Helper check if item is weight-based (Alpukat) or volume-based (Susu UHT / SKM)
  const isWeightUnit = (item) => {
    const base = (item?.baseUnit || '').toLowerCase();
    return base === 'gram' || item?.unit === 'kg';
  };

  // Helper get available units for an item
  const getAvailableUnits = (item) => {
    const base = (item?.baseUnit || item?.unit || '').toLowerCase();
    if (base === 'gram' || item?.unit === 'kg') return ['gram', 'kg'];
    if (base === 'ml' || item?.unit === 'l' || item?.unit === 'L' || item?.unit === 'liter') return ['ml', 'L'];
    return [item?.unit || 'pcs'];
  };

  // Helper convert base (gram/ml) to display value for a unit
  const toDisplayVal = (baseAmount, unit) => {
    const isLarge = unit === 'kg' || unit === 'L';
    if (isLarge) {
      const num = baseAmount / 1000;
      return String(Math.round(num * 100) / 100);
    }
    return String(Math.round(baseAmount));
  };

  // When changing selected ingredient in modal
  const handleSelectIngredient = (key) => {
    setSelectedKey(key);
    const target = ingredients[key] || ingredients['alpukat'];
    const currentVal = target ? Number(target.currentStock) || 0 : 0;
    const initialVal = target
      ? Number(target.initialStock) || Number(target.maxStock) || currentVal
      : currentVal;

    setCurrentStockBase(currentVal);
    setInitialStockBase(initialVal);

    const isW = isWeightUnit(target);
    const isV = (target?.baseUnit || '').toLowerCase() === 'ml' || target?.unit === 'l' || target?.unit === 'L';
    const defaultUnit = isW ? 'kg' : isV ? 'L' : (target?.unit || 'pcs');
    setActiveUnit(defaultUnit);
    setStockDisplayInput(toDisplayVal(currentVal, defaultUnit));
    setInitialStockDisplayInput(toDisplayVal(initialVal, defaultUnit));
  };

  // Open Edit Modal
  const handleOpenEditModal = (key = 'alpukat') => {
    const targetKey = ingredients[key] ? key : 'alpukat';
    setIsAddStockOpen(false);
    handleSelectIngredient(targetKey);
    setIsEditModalOpen(true);
  };

  // When changing unit (e.g. gram <-> kg, or ml <-> L)
  const handleUnitChange = (newUnit) => {
    setActiveUnit(newUnit);
    setStockDisplayInput(toDisplayVal(currentStockBase, newUnit));
    setInitialStockDisplayInput(toDisplayVal(initialStockBase, newUnit));
  };

  // When user directly changes "Stok Awal"
  const handleDirectInitialStockChange = (e) => {
    const val = e.target.value;
    setInitialStockDisplayInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const isLarge = activeUnit === 'kg' || activeUnit === 'L';
      setInitialStockBase(isLarge ? Math.round(num * 1000) : Math.round(num));
    }
  };

  // When user directly changes "Stok Sekarang (Patokan)"
  const handleDirectStockChange = (e) => {
    const val = e.target.value;
    setStockDisplayInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const isLarge = activeUnit === 'kg' || activeUnit === 'L';
      setCurrentStockBase(isLarge ? Math.round(num * 1000) : Math.round(num));
    }
  };

  // When user clicks "Tambah Stok":
  // jika kg / L -> tambah 1 kg / 1 L (+1000 base)
  // jika gram / ml -> tambah 100 gram / 100 ml (+100 base)
  // jika pcs -> tambah 1 pcs (+1 base)
  const handleAddStock = () => {
    const isLarge = activeUnit === 'kg' || activeUnit === 'L';
    const delta = isLarge ? 1000 : (activeUnit === 'pcs' ? 1 : 100);
    const nextVal = currentStockBase + delta;
    setCurrentStockBase(nextVal);
    setStockDisplayInput(toDisplayVal(nextVal, activeUnit));
  };

  // When user clicks "Kurang Stok":
  // jika kg / L -> kurang 1 kg / 1 L (-1000 base)
  // jika gram / ml -> kurang 100 gram / 100 ml (-100 base)
  // jika pcs -> kurang 1 pcs (-1 base)
  const handleSubtractStock = () => {
    const isLarge = activeUnit === 'kg' || activeUnit === 'L';
    const delta = isLarge ? 1000 : (activeUnit === 'pcs' ? 1 : 100);
    const nextVal = Math.max(0, currentStockBase - delta);
    setCurrentStockBase(nextVal);
    setStockDisplayInput(toDisplayVal(nextVal, activeUnit));
  };

  // Save changes
  const handleSaveStock = (e) => {
    e?.preventDefault();
    if (!currentSelected) return;

    updateStock(selectedKey, currentStockBase, initialStockBase);
    showToast(
      `Stok ${currentSelected.name} berhasil disimpan!`
    );
    setIsEditModalOpen(false);
  };

  // Handle Add New Stock item
  const handleAddNewStock = (e) => {
    e?.preventDefault();
    if (!newStockName.trim()) return;

    let baseStock = Number(newStockInitial) || 0;
    let baseUnit = 'gram';
    let unit = 'kg';

    if (newStockType === 'volume') {
      baseUnit = 'ml';
      unit = 'L';
      baseStock = Math.round(baseStock * 1000);
    } else if (newStockType === 'weight') {
      baseUnit = 'gram';
      unit = 'kg';
      baseStock = Math.round(baseStock * 1000);
    } else {
      baseUnit = 'pcs';
      unit = 'pcs';
      baseStock = Math.round(baseStock);
    }

    const id = `ing_${Date.now()}`;
    const newIngredientData = {
      id,
      name: newStockName.trim(),
      category: 'Bahan Tambahan',
      unit,
      baseUnit,
      currentStock: baseStock,
      initialStock: baseStock,
      maxStock: baseStock > 0 ? baseStock : 5000,
      minStockAlert: Math.round(baseStock * 0.2) || 500,
      portionPerCup: Number(newStockPortion) || 0,
      icon: newStockIcon.trim() || '📦',
      isCustom: true,
    };

    addIngredient(newIngredientData);
    showToast(`Bahan "${newStockName.trim()}" berhasil ditambahkan ke stok pantauan!`);
    setIsAddStockOpen(false);
    setIsEditModalOpen(false);
    handleSelectIngredient(id);
    setNewStockName('');
    setNewStockIcon('');
  };

  // Execute delete after confirmation
  const handleExecuteDelete = () => {
    if (!deleteConfirmTarget) return;
    const { id, name } = deleteConfirmTarget;
    deleteIngredient(id);
    showToast(`Bahan baku "${name}" telah dihapus!`);
    setDeleteConfirmTarget(null);

    const remaining = ingredientList.filter((item) => item.id !== id);
    if (remaining.length > 0) {
      handleSelectIngredient(remaining[0].id);
    } else {
      setIsEditModalOpen(false);
    }
  };

  // Open Portion Modal
  const handleOpenPortion = () => {
    const draft = {};
    Object.keys(ingredients).forEach((k) => {
      draft[k] = ingredients[k].portionPerCup || 0;
    });
    setPortionDraft(draft);
    setIsPortionModalOpen(true);
  };

  // Save Portions
  const handleSavePortion = (e) => {
    e?.preventDefault();
    Object.keys(portionDraft).forEach((k) => {
      updatePortion(k, portionDraft[k]);
    });
    showToast('Takaran resep berhasil disimpan!');
    setIsPortionModalOpen(false);
  };

  // Reset to default
  const handleReset = () => {
    if (window.confirm('Kembalikan stok dan takaran ke pengaturan awal (default PUKO)?')) {
      resetIngredients();
      showToast('Stok dan takaran di-reset ke nilai awal!');
      setIsPortionModalOpen(false);
    }
  };

  const EMOJI_PRESETS = ['🥑', '🥛', '🥫', '🧀', '🍫', '🥤', '🥥', '🧊', '🍓', '☕', '📦'];

  return (
    <div className="space-y-3.5 select-none">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Widget Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-4 sm:p-5">
        {/* Header Bar: Clean icon without black wrapper, 'Stok PUKO' title, single 'Edit Stok' button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-slate-800 shrink-0" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Stok PUKO
            </h3>
          </div>

          {/* Action Buttons: Clean single Edit Stok button + Atur Takaran */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenEditModal('alpukat')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Stok</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPortion}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Atur Takaran</span>
            </button>
          </div>
        </div>

        {/* Dynamic Ingredient Stock Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
          {ingredientList.map((data) => {
            const key = data.id;
            const cupsRemaining = calcCups(data);
            const isLow = data.currentStock <= data.minStockAlert;
            const isCritical = data.currentStock <= 0;

            const usedVal = getUsedAmount(data);
            const currentVal = Number(data.currentStock) || 0;
            const baselineVal = Number(data.initialStock) || Number(data.maxStock) || currentVal;
            const totalVal = Math.max(baselineVal, currentVal);
            const pct = totalVal > 0 ? Math.min(100, Math.max(0, Math.round((currentVal / totalVal) * 100))) : 100;

            return (
              <div
                key={key}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-soft transition-all relative group"
              >
                {/* Top Row: Icon & Name */}
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-2xs">
                    {data.icon}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    {data.name}
                  </h4>
                </div>

                {/* Middle Row: Current Stock / Total Initial Stock on Left, Percentage badge on Right */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                      {formatCompactStock(currentVal, data)}
                    </span>
                    <span className="text-slate-400 font-medium text-sm sm:text-base">
                      / {formatCompactStock(totalVal, data)}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-700">
                    {pct}%
                  </span>
                </div>

                {/* Progress Bar (no interactive popup on press) */}
                <div className="mt-2.5">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCritical
                          ? 'bg-rose-500'
                          : isLow
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Cup Outline Icon & Estimasi tersisa XX cup */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 3h12l-1.5 16a2 2 0 0 1-2 1.8H9.5a2 2 0 0 1-2-1.8L6 3z" />
                  </svg>
                  <span>
                    {cupsRemaining !== null
                      ? `Estimasi tersisa ${cupsRemaining} cup`
                      : 'Stok inventaris aktif'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL EDIT STOK */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            {!isAddStockOpen ? (
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Kelola & Edit Stok</h3>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-extrabold text-slate-900 text-base">Tambah Stok Pantauan</h3>
              </div>
            )}

            {isAddStockOpen ? (
              <div>
                <form onSubmit={handleAddNewStock} className="space-y-3.5">
                  {/* Nama Bahan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="misal: Coklat Bubuk, Keju, Gula Aren..."
                      value={newStockName}
                      onChange={(e) => setNewStockName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-puko-500 text-sm font-bold text-slate-900"
                    />
                  </div>

                  {/* Pilihan Ikon */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ikon:
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shrink-0 select-none shadow-2xs">
                        {newStockIcon.trim() || '📦'}
                      </div>
                      <input
                        type="text"
                        value={newStockIcon}
                        onChange={(e) => setNewStockIcon(e.target.value)}
                        placeholder="Pilih atau ketik ikon dari HP (misal: 🍫, 🧀)"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-puko-500 text-sm font-bold text-slate-900"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">Contoh:</span>
                      {['🍫', '🧀', '🍯', '🥥', '🍓', '☕', '🥤', '🧊', '📦'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewStockIcon(emoji)}
                          className={`w-6 h-6 rounded-md text-xs flex items-center justify-center transition-all cursor-pointer ${
                            newStockIcon === emoji
                              ? 'bg-slate-800 text-white shadow-2xs scale-105'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Satuan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Satuan:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: 'weight', label: 'Berat (kg / g)' },
                        { type: 'volume', label: 'Cairan (L / ml)' },
                        { type: 'pcs', label: 'Satuan (pcs)' },
                      ].map((t) => (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => {
                            setNewStockType(t.type);
                            if (t.type === 'weight') setNewStockInitial('5');
                            if (t.type === 'volume') setNewStockInitial('5');
                            if (t.type === 'pcs') setNewStockInitial('50');
                          }}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                            newStockType === t.type
                              ? 'border-slate-800 bg-slate-100 text-slate-900 font-extrabold ring-1 ring-slate-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stok Awal & Takaran per Cup */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Stok Awal ({newStockType === 'weight' ? 'kg' : newStockType === 'volume' ? 'Liter' : 'pcs'}):
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={newStockType === 'pcs' ? '1' : '0.1'}
                        required
                        value={newStockInitial}
                        onChange={(e) => setNewStockInitial(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-puko-500 text-sm font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Takaran per Cup:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newStockPortion}
                        onChange={(e) => setNewStockPortion(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-puko-500 text-sm font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {newStockType === 'weight' ? 'gram / cup' : newStockType === 'volume' ? 'ml / cup' : 'pcs / cup'}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddStockOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-puko-600 hover:bg-puko-700 text-white shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      + Tambahkan Bahan
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <form onSubmit={handleSaveStock} className="space-y-4">
                {/* Pilihan Bahan Baku + Tombol + di Samping Kanan Susu Kental Manis */}
                <div className="grid grid-cols-4 gap-2">
                  {ingredientList.map((item) => {
                    const isSelected = selectedKey === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectIngredient(item.id)}
                        className={`p-2 sm:p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                          isSelected
                            ? 'border-slate-800 bg-slate-50 text-slate-900 font-extrabold shadow-xs ring-1 ring-slate-800'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-bold'
                        }`}
                      >
                        <span className="text-xl sm:text-2xl">{item.icon}</span>
                        <span className="text-[10px] sm:text-[11px] leading-tight truncate w-full text-center">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}

                  {/* Tombol + di Samping Kanan Susu Kental Manis */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewStockName('');
                      setNewStockIcon('');
                      setNewStockType('weight');
                      setNewStockInitial('5');
                      setNewStockPortion('20');
                      setIsAddStockOpen(true);
                    }}
                    className="p-2 sm:p-2.5 rounded-2xl border border-dashed border-slate-300 hover:border-slate-700 hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
                    title="Tambah stok yang ingin dipantau"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate w-full text-center">
                      Tambah
                    </span>
                  </button>
                </div>

                {/* Stok Awal (Bisa diedit sebagai patokan kapasitas) */}
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Stok Awal:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={activeUnit === 'kg' || activeUnit === 'L' ? '0.1' : '1'}
                      min="0"
                      value={initialStockDisplayInput}
                      onChange={handleDirectInitialStockChange}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-puko-500 text-sm font-extrabold text-slate-900 pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      {activeUnit}
                    </span>
                  </div>
                </div>

                {/* Stok Sekarang (Patokan - bisa diedit langsung) dengan pemilih satuan di sebelah kanannya */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Stok Sekarang:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step={activeUnit === 'kg' || activeUnit === 'L' ? '0.1' : '1'}
                        min="0"
                        value={stockDisplayInput}
                        onChange={handleDirectStockChange}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-puko-500 text-sm font-extrabold text-slate-900"
                      />
                    </div>

                    {/* Pilihan Satuan di sebelah kanan input Stok Sekarang */}
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0 items-center">
                      {getAvailableUnits(currentSelected).map((unit) => {
                        const isUnitSelected = activeUnit === unit;
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => handleUnitChange(unit)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              isUnitSelected
                                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {unit}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Tombol Kurang Stok (Kiri) & Tambah Stok (Kanan) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSubtractStock}
                    className="py-2.5 px-3 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Kurang Stok</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddStock}
                    className="py-2.5 px-3 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Stok</span>
                  </button>
                </div>

                {/* Tombol Aksi di bawah: Hapus di kiri, Batal & Simpan di kanan */}
                <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmTarget({
                        id: selectedKey,
                        name: currentSelected?.name || 'bahan ini',
                      })
                    }
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-puko-600 hover:bg-puko-700 text-white shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ATUR TAKARAN PER CUP (RECIPE) */}
      {isPortionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsPortionModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Atur Takaran Resep per Cup</h3>
              </div>
            </div>

            <form onSubmit={handleSavePortion} className="space-y-4">
              {ingredientList.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>{item.icon}</span> {item.name}
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={portionDraft[item.id] !== undefined ? portionDraft[item.id] : item.portionPerCup}
                      onChange={(e) =>
                        setPortionDraft({ ...portionDraft, [item.id]: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-puko-500 text-sm font-bold text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {item.baseUnit} / cup
                    </span>
                  </div>
                </div>
              ))}

              {/* Quick Reset to Standard Recipe */}
              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setPortionDraft({
                      alpukat: 110,
                      susuUht: 25,
                      skm: 50,
                    })
                  }
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Set Standar PUKO (110g / 25ml / 50ml)</span>
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                >
                  Reset Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPortionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-extrabold bg-puko-600 hover:bg-puko-700 text-white shadow-md transition-all cursor-pointer"
                  >
                    Simpan Takaran
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deleteConfirmTarget && (
        <div
          style={{ zIndex: 9999 }}
          className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-150 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base mb-1.5">
              Konfirmasi Hapus
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus stok pantauan{' '}
              <span className="font-bold text-slate-900">"{deleteConfirmTarget.name}"</span>?
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

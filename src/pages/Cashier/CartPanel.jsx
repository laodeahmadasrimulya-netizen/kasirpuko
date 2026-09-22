import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  AlertCircle,
  Tag,
  ArrowRight,
  X,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTransactions } from '../../context/TransactionContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';
import { formatIDR } from '../../utils/currency';
import { handleImageError } from '../../utils/imageFallback';
import { Button } from '../../components/common/Button';
import { PaymentModal } from './PaymentModal';

export const CartPanel = () => {
  const { user } = useAuth();
  const {
    items,
    subtotal,
    discount,
    setDiscount,
    total,
    totalItemsCount,
    customerName,
    setCustomerName,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    changeAmount,
    isCartEmpty,
    addItem,
    increaseItem,
    removeItem,
    deleteItem,
    updateItemNotes,
    clearCart,
  } = useCart();

  const { recordTransaction } = useTransactions();
  const { settings } = useSettings();

  const [activeItemNoteModal, setActiveItemNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Open note edit
  const openNoteDialog = (item) => {
    setActiveItemNoteModal(item.id);
    setNoteText(item.notes || '');
  };

  // Save note
  const saveNote = (itemId) => {
    updateItemNotes(itemId, noteText);
    setActiveItemNoteModal(null);
  };

  // Open payment modal
  const handleOpenPayment = () => {
    if (isCartEmpty) {
      setErrorMessage('Keranjang masih kosong, silakan pilih menu terlebih dahulu.');
      return;
    }
    setErrorMessage('');
    setIsPaymentModalOpen(true);
  };

  // Callback from PaymentModal when payment is confirmed
  const handleConfirmPayment = async (paymentDetails) => {
    try {
      const cashierName = user
        ? (user.role === 'ADMIN'
            ? (user.name === 'Owner / Supervisor' ? 'Owner' : (user.name || 'Owner'))
            : (user.name || 'Kasir 01'))
        : (settings?.cashierName || 'Kasir 01');

      await recordTransaction({
        cashierName,
        customerName: paymentDetails.customerName?.trim() || customerName?.trim() || '',
        paymentMethod: paymentDetails.paymentMethod,
        items,
        subtotal,
        discount: Number(discount) || 0,
        total,
        amountPaid: paymentDetails.amountPaid,
        change: paymentDetails.change,
        bankName: paymentDetails.bankName,
        referenceNo: paymentDetails.referenceNo,
      });

      // Clear cart and close mobile sheet
      clearCart();
      setIsMobileCartOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMessage('Terjadi kesalahan saat memproses transaksi.');
    }
  };

  // Render items list helper
  const renderItemList = () => {
    if (isCartEmpty) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-3">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-600">Keranjang Masih Kosong</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
            Klik menu produk di sebelah kiri untuk menambahkan ke pesanan
          </p>
        </div>
      );
    }

    return items.map((item) => {
      const itemName = item.nama || item.name;
      const itemPrice = item.harga || item.price;
      const itemImage = item.gambar || item.image;

      return (
        <div
          key={item.id}
          className="p-3 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200/80 transition-all shadow-2xs group"
        >
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
              {itemImage ? (
                <img
                  src={itemImage}
                  alt={itemName}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg bg-puko-50 text-puko-600">
                  🥑
                </div>
              )}
            </div>

            {/* Name and Price */}
            <div className="min-w-0 flex-1">
              <h5 className="font-bold text-xs text-slate-800 truncate">
                {itemName}
              </h5>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  {formatIDR(itemPrice)}
                </span>
              </div>
            </div>

            {/* Subtotal Item */}
            <div className="text-right shrink-0">
              <span className="font-extrabold text-xs text-puko-900 block">
                {formatIDR(item.subtotal)}
              </span>
            </div>
          </div>

          {/* Bottom row: Note & Quantity Controls */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            {/* Note edit */}
            {activeItemNoteModal === item.id ? (
              <div className="flex-1 flex items-center gap-1.5 mr-2">
                <input
                  type="text"
                  placeholder="Catatan (misal: Less Sugar)..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 text-[11px] px-2 py-1 bg-white border border-puko-300 rounded-lg focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveNote(item.id)}
                  className="px-2 py-1 bg-puko-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openNoteDialog(item)}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] italic max-w-[130px] truncate cursor-pointer"
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {item.notes ? `"${item.notes}"` : '+ Catatan'}
                </span>
              </button>
            )}

            {/* Plus / Minus Qty Controls */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all font-bold cursor-pointer"
                title="Kurangi 1"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="w-7 text-center font-extrabold text-xs text-slate-800">
                {item.qty}
              </span>

              <button
                type="button"
                onClick={() => increaseItem(item.id)}
                className="w-7 h-7 rounded-lg bg-puko-600 text-white flex items-center justify-center hover:bg-puko-700 active:scale-95 transition-all font-bold cursor-pointer"
                title="Tambah 1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                className="w-7 h-7 ml-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                title="Hapus dari keranjang"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. DESKTOP CART PANEL (Hidden on mobile < lg)              */}
      {/* ========================================================= */}
      <div className="hidden lg:flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
        {/* Header Cart */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-puko-100 text-puko-800 flex items-center justify-center font-bold shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                Keranjang Belanja
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {totalItemsCount} item dipilih
              </p>
            </div>
          </div>

          {!isCartEmpty && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="Kosongkan Keranjang"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Items List (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {renderItemList()}
        </div>

        {/* Calculations & Trigger Payment Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3 shrink-0">
          {/* Subtotal & Diskon */}
          <div className="space-y-1.5 text-xs text-slate-600 border-b border-slate-200 pb-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Subtotal Pesanan:</span>
              <span className="font-bold text-slate-800 text-sm">{formatIDR(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Tag className="w-3 h-3 text-amber-500" /> Diskon Promo (Rp):
              </span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={discount || ''}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 text-right px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-puko-500 font-semibold text-slate-700"
              />
            </div>

            <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200/60">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Total Tagihan:
                </span>
                <span className="text-[10px] text-slate-400">
                  ({totalItemsCount} item)
                </span>
              </div>
              <span className="text-xl text-puko-800 font-black tracking-tight">
                {formatIDR(total)}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={isCartEmpty}
            onClick={handleOpenPayment}
            className="shadow-lg shadow-puko-700/25 bg-puko-600 hover:bg-puko-700 py-3.5 text-base font-extrabold tracking-wide cursor-pointer"
          >
            <span>Pilih Pembayaran • {formatIDR(total)}</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FLOATING PAYMENT BAR ON MOBILE (Above BottomNav)       */}
      {/* ========================================================= */}
      {!isCartEmpty && (
        <div className="lg:hidden fixed bottom-[3.75rem] left-0 right-0 z-20 px-3 pb-1 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center justify-between gap-3 animate-slideUp">
            {/* Left side: Cart Icon & Total (Click icon to open Mobile Cart Sheet) */}
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity active:scale-95 cursor-pointer"
              title="Lihat rincian pesanan"
            >
              <div className="w-10 h-10 rounded-xl bg-puko-600 flex items-center justify-center text-white shrink-0 relative shadow-sm">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow">
                  {totalItemsCount}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white tracking-tight truncate block">
                  {formatIDR(total)}
                </span>
              </div>
            </button>

            {/* Right side: Direct Action Button "Pilih Pembayaran" */}
            <button
              type="button"
              onClick={handleOpenPayment}
              className="px-4 py-2.5 rounded-xl bg-puko-500 hover:bg-puko-400 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-puko-950/40 transition-all shrink-0 cursor-pointer"
            >
              <span>Pilih Pembayaran</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MOBILE CART DETAILS DRAWER / SHEET                     */}
      {/* ========================================================= */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop click */}
          <div className="fixed inset-0" onClick={() => setIsMobileCartOpen(false)} />

          {/* Bottom Sheet Card */}
          <div className="relative w-full max-w-lg bg-white rounded-t-[1.75rem] shadow-2xl border-t border-slate-100 overflow-hidden z-10 flex flex-col max-h-[85vh] animate-slideUp">
            {/* Pull Handle Indicator */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-puko-100 text-puko-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Rincian Keranjang
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {totalItemsCount} item dipilih
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isCartEmpty && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {renderItemList()}
            </div>

            {/* Footer Summary & Checkout Button */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/90 space-y-2.5 shrink-0">
              {/* Subtotal & Diskon */}
              <div className="space-y-1 text-xs text-slate-600 border-b border-slate-200 pb-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Subtotal Pesanan:</span>
                  <span className="font-bold text-slate-800">{formatIDR(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Tag className="w-3 h-3 text-amber-500" /> Diskon Promo (Rp):
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-20 text-right px-2 py-0.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-puko-500 font-semibold text-slate-700"
                  />
                </div>

                <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-slate-900">Total Tagihan:</span>
                  <span className="text-lg text-puko-800 font-black tracking-tight">
                    {formatIDR(total)}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={isCartEmpty}
                onClick={() => {
                  setIsMobileCartOpen(false);
                  handleOpenPayment();
                }}
                className="shadow-lg shadow-puko-700/25 bg-puko-600 hover:bg-puko-700 py-3 text-sm font-extrabold cursor-pointer"
              >
                <span>Lanjut ke Pembayaran • {formatIDR(total)}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PAYMENT MODAL (Floating Bottom Sheet on HP / Centered on Desktop) */}
      {/* ========================================================= */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        subtotal={subtotal}
        discount={discount}
        customerName={customerName}
        totalItemsCount={totalItemsCount}
        onConfirmPayment={handleConfirmPayment}
      />
    </>
  );
};

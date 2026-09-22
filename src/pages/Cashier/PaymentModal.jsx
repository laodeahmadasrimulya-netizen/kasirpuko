import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Banknote,
  QrCode,
  AlertCircle,
  Check,
  ShieldCheck,
  Upload,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { formatIDR } from '../../utils/currency';
import { storageService } from '../../services/storageService';

export const PaymentModal = ({
  isOpen,
  onClose,
  total,
  subtotal,
  discount = 0,
  customerName = '',
  totalItemsCount = 0,
  onConfirmPayment,
}) => {
  // QRIS custom image state stored in localStorage
  const [qrisImage, setQrisImage] = useState(() => storageService.get('qris_image', null));
  const fileInputRef = useRef(null);

  // Sync QRIS image from storage when modal opens
  useEffect(() => {
    if (isOpen) {
      setQrisImage(storageService.get('qris_image', null));
    }
  }, [isOpen]);

  const handleQrisUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 800;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        setQrisImage(compressed);
        storageService.set('qris_image', compressed);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQris = (e) => {
    e.stopPropagation();
    setQrisImage(null);
    storageService.remove('qris_image');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Setup React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      paymentMethod: 'TUNAI',
      amountPaid: '',
      customerName: customerName || '',
    },
    mode: 'onChange',
  });

  const watchedMethod = watch('paymentMethod');
  const watchedAmountPaid = watch('amountPaid');

  // Sync form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        paymentMethod: 'TUNAI',
        amountPaid: '',
        customerName: customerName || '',
      });
    }
  }, [isOpen, customerName, reset]);

  // When switching method to QRIS, auto-fill amountPaid
  const handleSelectMethod = (method) => {
    setValue('paymentMethod', method, { shouldValidate: true });
    if (method === 'QRIS') {
      setValue('amountPaid', total, { shouldValidate: true });
    } else {
      setValue('amountPaid', '', { shouldValidate: true });
    }
  };

  // Quick cash buttons
  const handleQuickCash = (val) => {
    setValue('amountPaid', val, { shouldValidate: true });
    trigger('amountPaid');
  };

  const currentPaidNum = Number(watchedAmountPaid) || 0;
  const isQuickActive = (val) => currentPaidNum === Number(val);

  // Calculate change automatically
  const change = useMemo(() => {
    if (watchedMethod !== 'TUNAI') return 0;
    const paid = Number(watchedAmountPaid) || 0;
    return paid >= total ? paid - total : 0;
  }, [watchedMethod, watchedAmountPaid, total]);

  // Submit handler
  const onSubmit = (data) => {
    const finalPaid =
      data.paymentMethod === 'TUNAI' ? Number(data.amountPaid) : total;

    onConfirmPayment({
      paymentMethod: data.paymentMethod,
      amountPaid: finalPaid,
      customerName: data.customerName?.trim() || '',
      change: data.paymentMethod === 'TUNAI' ? finalPaid - total : 0,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Floating Bottom Sheet on Mobile / Centered Dialog on Laptop & Tablet */}
      <div className="relative w-full max-w-xl bg-white rounded-t-[1.75rem] sm:rounded-2xl shadow-2xl border-t sm:border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[88vh] sm:max-h-[90vh] animate-slideUp sm:animate-none">
        {/* Mobile Pull Handle Indicator */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-4 border-b border-slate-100 shrink-0 bg-white">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-800">
              Sistem Pembayaran Kasir
            </h3>
            <span className="text-[10px] text-slate-400 block sm:hidden">
              Konfirmasi transaksi & metode bayar
            </span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4.5">
            {/* Total Display Banner */}
            <div className="bg-gradient-to-br from-puko-900 to-puko-800 text-white p-3.5 sm:p-5 rounded-2xl shadow-soft flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {formatIDR(total)}
                </h2>
                {discount > 0 && (
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Hemat diskon: {formatIDR(discount)}
                  </p>
                )}
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-xs text-slate-300">Pelanggan</span>
                <p className="font-bold text-sm text-white">
                  {watch('customerName')?.trim() || '-'}
                </p>
              </div>
            </div>

            {/* Payment Methods Selector Tabs */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectMethod('TUNAI')}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-bold cursor-pointer ${
                    watchedMethod === 'TUNAI'
                      ? 'bg-puko-600 text-white border-puko-600 shadow-md shadow-puko-900/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMethod('QRIS')}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-bold cursor-pointer ${
                    watchedMethod === 'QRIS'
                      ? 'bg-puko-600 text-white border-puko-600 shadow-md shadow-puko-900/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span>QRIS</span>
                </button>
              </div>
            </div>

            {/* TUNAI View */}
            {watchedMethod === 'TUNAI' && (
              <div className="space-y-3 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200/80">
                {/* Quick Cash Buttons */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Uang Pecahan Cepat:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickCash(total)}
                      className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                        isQuickActive(total)
                          ? 'bg-puko-600 text-white border-puko-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-puko-50 hover:text-puko-700 hover:border-puko-300'
                      }`}
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(20000)}
                      className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                        isQuickActive(20000)
                          ? 'bg-puko-600 text-white border-puko-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-puko-50 hover:text-puko-700 hover:border-puko-300'
                      }`}
                    >
                      20.000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(50000)}
                      className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                        isQuickActive(50000)
                          ? 'bg-puko-600 text-white border-puko-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-puko-50 hover:text-puko-700 hover:border-puko-300'
                      }`}
                    >
                      50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(100000)}
                      className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                        isQuickActive(100000)
                          ? 'bg-puko-600 text-white border-puko-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-puko-50 hover:text-puko-700 hover:border-puko-300'
                      }`}
                    >
                      100.000
                    </button>
                  </div>
                </div>

                {/* Input Nominal Pembayaran (No autoFocus so keyboard does not push layout on mobile) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nominal Pembayaran
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-slate-400 text-sm">
                      Rp
                    </span>
                    <input
                      type="number"
                      placeholder={`Contoh: ${total}`}
                      {...register('amountPaid', {
                        required: 'Nominal pembayaran wajib diisi!',
                        validate: (value) => {
                          const num = Number(value);
                          if (isNaN(num) || num <= 0) {
                            return 'Masukkan nominal angka yang valid!';
                          }
                          if (num < total) {
                            return `Pembayaran kurang ${formatIDR(
                              total - num
                            )} dari total tagihan!`;
                          }
                          return true;
                        },
                      })}
                      className={`w-full bg-white border rounded-xl pl-11 pr-4 py-2.5 sm:py-3 text-base font-extrabold transition-colors focus:outline-none focus:ring-2 ${
                        errors.amountPaid
                          ? 'border-rose-400 text-rose-700 focus:ring-rose-400 focus:border-rose-400'
                          : 'border-slate-300 text-slate-900 focus:ring-puko-500 focus:border-puko-500'
                      }`}
                    />
                  </div>

                  {/* Error Notification */}
                  {errors.amountPaid && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{errors.amountPaid.message}</span>
                    </div>
                  )}
                </div>

                {/* Kembalian Banner */}
                <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                      Uang Kembalian:
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-emerald-900">
                      {formatIDR(change)}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-200/60 text-emerald-800 flex items-center justify-center font-bold">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )}

            {/* QRIS View */}
            {watchedMethod === 'QRIS' && (
              <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 text-center space-y-2.5">
                {/* Hidden File Input for QRIS Image */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleQrisUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* QRIS Image Container */}
                <div className="relative inline-block group">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-puko-400 transition-all overflow-hidden"
                    title="Klik untuk mengganti gambar QRIS"
                  >
                    {qrisImage ? (
                      <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center bg-white rounded-xl overflow-hidden">
                        <img
                          src={qrisImage}
                          alt="QRIS Toko"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1">
                          <Pencil className="w-5 h-5" />
                          <span>Klik untuk Ganti Foto</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-40 h-40 sm:w-48 sm:h-48 bg-slate-900 rounded-xl p-3 flex flex-col justify-between items-center text-white relative">
                        <div className="w-full flex justify-between">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-white rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white" />
                          </div>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-white rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white" />
                          </div>
                        </div>

                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-[10px] sm:text-xs shadow-md border-2 border-slate-900">
                          PUKO
                        </div>

                        <div className="w-full flex justify-between items-end">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-white rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white" />
                          </div>
                          <span className="text-[8px] sm:text-[9px] font-mono text-emerald-300">
                            QRIS RESMI
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit / Upload Controls */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-puko-700 bg-puko-50 hover:bg-puko-100 border border-puko-200/80 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{qrisImage ? 'Ganti Gambar QRIS' : 'Unggah Gambar QRIS'}</span>
                  </button>

                  {qrisImage && (
                    <button
                      type="button"
                      onClick={handleRemoveQris}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                      title="Reset ke tampilan bawaan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Nominal Pas Terverifikasi: {formatIDR(total)}</span>
                </div>
              </div>
            )}

            {/* Customer name input */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Pelanggan
              </label>
              <input
                type="text"
                placeholder="Kosongkan jika tidak ada..."
                {...register('customerName')}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-puko-500 font-medium"
              />
            </div>
          </div>

          {/* Sticky Footer: Always visible without scrolling */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 shadow-lg sm:shadow-none">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm cursor-pointer"
            >
              Batal
            </Button>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting || Boolean(errors.amountPaid && watchedMethod === 'TUNAI')}
              className="flex-1 sm:flex-initial px-6 py-2.5 font-extrabold bg-puko-600 hover:bg-puko-700 shadow-md shadow-puko-700/20 text-xs sm:text-sm cursor-pointer"
            >
              Konfirmasi Pembayaran • {formatIDR(total)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

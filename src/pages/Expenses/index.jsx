import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wallet,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useExpenses } from '../../context/ExpenseContext';
import { useAuth } from '../../hooks/useAuth';
import { formatIDR, formatNumber } from '../../utils/currency';
import { formatDateOnly, isToday, formatTime, getDateStringInStoreTZ } from '../../utils/date';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const ExpensesPage = () => {
  const { expenses, summary, addExpense } = useExpenses();
  const { user } = useAuth();

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form Fields: Cukup Nominal dan Keterangan
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formError, setFormError] = useState('');

  // Toast feedback helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Open modal for new expense
  const handleOpenAddModal = () => {
    setFormError('');
    setFormTitle('');
    setFormAmount('');
    setIsFormOpen(true);
  };

  // Auto format thousand separator with dot (contoh: 1000 -> 1.000)
  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setFormAmount('');
      return;
    }
    const formatted = Number(raw).toLocaleString('id-ID');
    setFormAmount(formatted);
  };

  // Submit Form: Hanya mencatat pengeluaran untuk hari ini (realtime sekarang)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanTitle = formTitle.trim();
    const cleanAmount = Number(formAmount.replace(/\D/g, ''));

    if (!cleanAmount || cleanAmount <= 0) {
      setFormError('Nominal harus lebih besar dari 0.');
      return;
    }

    if (!cleanTitle) {
      setFormError('Keterangan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: cleanTitle,
        amount: cleanAmount,
        category: 'LAINNYA',
        paymentSource: 'KAS_KASIR',
        notes: '',
        timestamp: new Date().toISOString(), // Hanya untuk hari saat ini (tidak bisa hari lampau)
        loggedBy: user?.role === 'ADMIN' ? 'Admin' : 'Kasir',
      };

      await addExpense(payload);
      showToast('Pengeluaran berhasil dicatat!');
      setSelectedDate(todayDateStr); // Otomatis aktifkan tanggal hari ini
      if (pengeluaranScrollRef.current) {
        pengeluaranScrollRef.current.scrollTo({
          left: pengeluaranScrollRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
      setIsFormOpen(false);
    } catch (err) {
      setFormError('Gagal menyimpan pengeluaran. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to determine role label: "Kasir" or "Admin"
  const getRoleLabel = (loggedBy) => {
    const str = (loggedBy || '').toLowerCase();
    if (str.includes('admin')) {
      return 'Admin';
    }
    return 'Kasir';
  };

  // Helper to format time display: "00.19 WITA" or "21 Sep 2026, 14.30 WITA"
  const formatExpenseTime = (isoString) => {
    if (!isoString) return '';
    const timeStr = formatTime(isoString);
    if (isToday(isoString)) {
      return timeStr;
    }
    return `${formatDateOnly(isoString)}, ${timeStr}`;
  };

  const pengeluaranScrollRef = useRef(null);

  // Today's date string in YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    return getDateStringInStoreTZ(new Date());
  }, []);

  // Generate 30 hari ke belakang berakhir di hari ini (urutan: hari terlama -> hari ini di paling kanan)
  const past30Days = useMemo(() => {
    const days = [];
    const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const [tYear, tMonth, tDay] = (todayDateStr || '2026-01-01').split('-').map(Number);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.UTC(tYear, tMonth - 1, tDay - i));
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayName: DAY_NAMES[d.getUTCDay()], // e.g. "Jum", "Sab"
        dayNumber: d.getUTCDate(), // e.g. 18, 23
        isToday: i === 0,
      });
    }
    return days;
  }, [todayDateStr]);

  // Otomatis geser scroll ke paling kanan (Hari Ini) saat pertama buka
  useEffect(() => {
    if (pengeluaranScrollRef.current) {
      pengeluaranScrollRef.current.scrollLeft = pengeluaranScrollRef.current.scrollWidth;
    }
  }, []);

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState(todayDateStr);

  // Helper to match expense timestamp with selectedDate string
  const isSameDate = (isoString, targetDateStr) => {
    if (!isoString || !targetDateStr) return false;
    return getDateStringInStoreTZ(isoString) === targetDateStr;
  };

  // Filter expenses for selected date
  const selectedDayExpenses = useMemo(() => {
    return expenses.filter((expense) => isSameDate(expense.timestamp, selectedDate));
  }, [expenses, selectedDate]);

  // Total amount for selected date
  const selectedDayTotal = useMemo(() => {
    return selectedDayExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [selectedDayExpenses]);

  // Count of transactions for selected date
  const selectedDayCount = selectedDayExpenses.length;

  return (
    <div className="space-y-4 pb-20 lg:pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header: Pengeluaran PUKO tanpa icon, tombol catat pengeluaran dengan bayangan hijau */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-soft">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          Pengeluaran PUKO
        </h1>

        {/* Action Button dengan bayangan hijau */}
        <Button
          onClick={handleOpenAddModal}
          variant="primary"
          className="bg-puko-600 hover:bg-puko-700 text-white border-none py-2 px-3.5 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-puko-600/35 transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Catat Pengeluaran</span>
        </Button>
      </div>

      {/* Card: Day Selector seperti kereta, Nominal di kiri dan 'X transaksi' di kanan agar sisi kanan tidak kosong */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft space-y-3.5">
        {/* Selector Hari & Tanggal (Scrollable seperti kereta, hari ini di kanan berbalut hijau) */}
        <div
          ref={pengeluaranScrollRef}
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 scroll-smooth no-scrollbar [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {past30Days.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate(day.dateStr)}
                className={`w-[56px] sm:w-[64px] h-[56px] sm:h-[60px] py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer select-none shrink-0 text-center ${
                  isSelected
                    ? 'border-2 border-puko-700 bg-puko-600 text-white shadow-sm font-black scale-[1.02]'
                    : day.isToday
                    ? 'border-2 border-puko-600 bg-puko-50/90 text-puko-800 font-extrabold hover:bg-puko-100 shadow-2xs'
                    : 'border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span
                  className={`text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider ${
                    isSelected
                      ? 'text-puko-100'
                      : day.isToday
                      ? 'text-puko-700 font-black'
                      : 'text-slate-400'
                  }`}
                >
                  {day.dayName}
                </span>
                <span
                  className={`text-xs sm:text-sm mt-0.5 ${
                    isSelected
                      ? 'text-white font-black'
                      : day.isToday
                      ? 'text-puko-900 font-black'
                      : 'text-slate-700 font-bold'
                  }`}
                >
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row: Nominal di kiri (- 3.000 tanpa Rp), 'X transaksi' di kanan */}
        <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-rose-600 tracking-tight">
              - {Number(selectedDayTotal || 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs sm:text-sm font-bold text-slate-600">
              {selectedDayCount} transaksi
            </span>
          </div>
        </div>
      </div>

      {/* Expenses List: Hanya pengeluaran hari yang dipilih, Kasir tanpa titik lalu disampingnya jam (00.19) */}
      <div className="space-y-2.5">
        {selectedDayExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-soft">
            <Wallet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Belum Ada Pengeluaran</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tidak ada catatan pengeluaran pada tanggal ini.
            </p>
          </div>
        ) : (
          selectedDayExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-soft flex items-center justify-between gap-3"
            >
              {/* Left side: Kasir tanpa titik lalu disampingnya waktu (00.19), di bawahnya nama pengeluaran */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">
                    {getRoleLabel(expense.loggedBy)}
                  </span>
                  <span className="text-slate-400 font-medium">
                    {formatExpenseTime(expense.timestamp)}
                  </span>
                </div>

                <h4 className="font-bold text-sm sm:text-base text-slate-800 mt-0.5 truncate">
                  {expense.title}
                </h4>
              </div>

              {/* Right side: Nominal pengeluaran (- 20.000) dengan warna merah */}
              <div className="text-right shrink-0">
                <p className="text-sm sm:text-base font-bold text-rose-600 tracking-tight">
                  - {formatNumber(expense.amount)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form: Catat Pengeluaran Baru */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Catat Pengeluaran Baru"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Nominal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nominal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formAmount}
                onChange={handleAmountChange}
                placeholder="Masukkan nominal"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg sm:text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-puko-500/20 focus:border-puko-600 transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:font-normal"
                required
                autoFocus
              />
            </div>
          </div>

          {/* 2. Keterangan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Keterangan
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Contoh: Beli Es Batu 2 Bal"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-puko-500/20 focus:border-puko-600 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsFormOpen(false)}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="bg-puko-600 hover:bg-puko-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-puko-700/25 border-none cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Catat Pengeluaran'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

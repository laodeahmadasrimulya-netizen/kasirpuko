import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { formatDateOnly, formatDateInput } from '../../utils/date';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_UPPER = [
  'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
  'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'
];

const DAY_NAMES = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

/**
 * Helper to format date object to YYYY-MM-DD
 */
const toDateStr = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

/**
 * CalendarFilterModal (Tema Putih - Hijau PUKO)
 *
 * View 1: Kalender Bulanan (35 Kolom Rapi, Navigasi Geser/Arrow Bulan, Warna Bersih)
 * View 2: Pemilih 12 Bulan Lingkaran (Putih & Hijau)
 */
export const CalendarFilterModal = ({
  isOpen,
  onClose,
  initialStartDate,
  initialEndDate,
  onConfirm,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth(); // 0-indexed
  const todayDate = today.getDate();
  const todayStr = useMemo(() => formatDateInput(today), [today]);

  // View state
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'months'
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth); // 0-indexed

  // Selection state
  const [selectedStart, setSelectedStart] = useState(initialStartDate || todayStr);
  const [selectedEnd, setSelectedEnd] = useState(initialEndDate || todayStr);
  const [isFullMonthSelected, setIsFullMonthSelected] = useState(true);

  // Touch swipe support
  const [touchStartX, setTouchStartX] = useState(null);

  // Sync with initial props when opened
  useEffect(() => {
    if (isOpen) {
      const s = initialStartDate || todayStr;
      const e = initialEndDate || todayStr;
      setSelectedStart(s);
      setSelectedEnd(e);

      if (s) {
        const parts = s.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y) && !isNaN(m)) {
            setViewYear(y);
            setViewMonth(m);
          }
        }
      } else {
        setViewYear(todayYear);
        setViewMonth(todayMonth);
      }
      setViewMode('calendar');
    }
  }, [isOpen, initialStartDate, initialEndDate, todayStr, todayYear, todayMonth]);

  // Navigasi ke bulan sebelumnya
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      const newY = viewYear - 1;
      const newM = 11;
      setViewYear(newY);
      setViewMonth(newM);
      handleSelectMonthRange(newY, newM);
    } else {
      const newM = viewMonth - 1;
      setViewMonth(newM);
      handleSelectMonthRange(viewYear, newM);
    }
  };

  // Navigasi ke bulan berikutnya
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      const newY = viewYear + 1;
      const newM = 0;
      setViewYear(newY);
      setViewMonth(newM);
      handleSelectMonthRange(newY, newM);
    } else {
      const newM = viewMonth + 1;
      setViewMonth(newM);
      handleSelectMonthRange(viewYear, newM);
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (deltaX > 45) {
      // Geser ke kanan -> bulan sebelumnya
      handlePrevMonth();
    } else if (deltaX < -45) {
      // Geser ke kiri -> bulan berikutnya
      handleNextMonth();
    }
    setTouchStartX(null);
  };

  // Hitung sel tanggal (maksimal 35 kolom/sel agar rapi, 42 hanya bila sangat diperlukan)
  const calendarCells = useMemo(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // 1. Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = toDateStr(prevYear, prevMonth, day);
      cells.push({
        day,
        month: prevMonth,
        year: prevYear,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: (firstDayOfWeek - 1 - i) % 7,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = toDateStr(viewYear, viewMonth, day);
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
      cells.push({
        day,
        month: viewMonth,
        year: viewYear,
        dateStr,
        isCurrentMonth: true,
        dayOfWeek,
      });
    }

    // 3. Next month leading days - batasi sampai 35 sel agar tidak terlalu banyak tanggal bulan depan
    const targetCells = (firstDayOfWeek + daysInCurrentMonth) > 35 ? 42 : 35;
    const remaining = targetCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = toDateStr(nextYear, nextMonth, day);
      cells.push({
        day,
        month: nextMonth,
        year: nextYear,
        dateStr,
        isCurrentMonth: false,
        dayOfWeek: cells.length % 7,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Handle selecting a date cell
  const handleCellClick = (cell) => {
    if (!cell.isCurrentMonth) {
      setViewYear(cell.year);
      setViewMonth(cell.month);
    }
    setSelectedStart(cell.dateStr);
    setSelectedEnd(cell.dateStr);
    setIsFullMonthSelected(false);
  };

  // Helper to select month range (1st to today if same month, or 1st to end if other month)
  const handleSelectMonthRange = (year = viewYear, month = viewMonth) => {
    const isCurrent = year === todayYear && month === todayMonth;
    const startStr = toDateStr(year, month, 1);
    let endStr;

    if (isCurrent) {
      endStr = toDateStr(year, month, todayDate);
    } else {
      const lastDay = new Date(year, month + 1, 0).getDate();
      endStr = toDateStr(year, month, lastDay);
    }

    setSelectedStart(startStr);
    setSelectedEnd(endStr);
    setIsFullMonthSelected(true);
  };

  // Handle month click from Month Picker (View 2)
  const handleMonthCircleClick = (monthIndex) => {
    setViewMonth(monthIndex);
    handleSelectMonthRange(viewYear, monthIndex);
    setViewMode('calendar');
  };

  // Confirm and apply selection
  const handleApply = () => {
    if (!selectedStart) return;
    const start = selectedStart;
    const end = selectedEnd || selectedStart;

    let label = '';
    const isCurrent = viewYear === todayYear && viewMonth === todayMonth;

    if (isFullMonthSelected) {
      if (isCurrent) {
        label = `Bulan Ini (1 - ${todayDate} ${MONTH_NAMES_SHORT[todayMonth]} ${todayYear})`;
      } else {
        label = `Bulan ${MONTH_NAMES_SHORT[viewMonth]} ${viewYear}`;
      }
    } else if (start === end) {
      label = formatDateOnly(start);
    } else {
      label = `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
    }

    onConfirm({
      startDate: start,
      endDate: end,
      label,
      isFullMonth: isFullMonthSelected,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        // Klik di luar kolom kalender untuk batal / tutup
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="bg-white text-slate-800 rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-200/90 relative overflow-hidden flex flex-col cursor-default animate-in zoom-in-95 duration-150"
      >
        {/* ============================================================== */}
        {/* VIEW 1: KALENDER BULANAN (Tema Putih & Hijau Bersih)             */}
        {/* ============================================================== */}
        {viewMode === 'calendar' ? (
          <div>
            {/* Header Top Bar dengan Navigasi Panah Kiri/Kanan untuk Geser Bulan */}
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100">
              {/* Tombol X di kiri atas untuk Batal */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                title="Tutup / Batal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Panah Kiri, Nama Bulan (Bisa diklik), Panah Kanan */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('months')}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-puko-50 hover:bg-puko-100 border border-puko-200/80 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Klik untuk memilih bulan lain"
                >
                  <span className="text-lg sm:text-xl font-black tracking-wider text-puko-800">
                    {MONTH_NAMES_UPPER[viewMonth]}
                  </span>
                  <span className="text-xs font-extrabold text-puko-600">
                    {viewYear}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-puko-600 group-hover:translate-y-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Right Action: Today Date Pill */}
              <button
                type="button"
                onClick={() => {
                  setViewYear(todayYear);
                  setViewMonth(todayMonth);
                  handleSelectMonthRange(todayYear, todayMonth);
                }}
                className="px-2.5 py-1 rounded-lg border border-puko-300 bg-puko-50 hover:bg-puko-100 text-xs font-black text-puko-700 transition-all cursor-pointer"
                title="Kembali ke Bulan Ini"
              >
                {todayDate}
              </button>
            </div>

            {/* Days of Week Header (MIN, SEN, SEL, RAB, KAM, JUM, SAB - Rapi & Bersih) */}
            <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
              {DAY_NAMES.map((dayName) => (
                <div
                  key={dayName}
                  className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider py-1 text-slate-500"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid (Maksimal 35 sel agar rapi tanpa kepanjangan tanggal bulan depan) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarCells.map((cell, idx) => {
                const isSelectedStart = cell.dateStr === selectedStart;
                const isSelectedEnd = cell.dateStr === selectedEnd;
                const inRange =
                  selectedStart &&
                  selectedEnd &&
                  cell.dateStr >= selectedStart &&
                  cell.dateStr <= selectedEnd;

                return (
                  <button
                    key={`${cell.dateStr}_${idx}`}
                    type="button"
                    onClick={() => handleCellClick(cell)}
                    className={`
                      aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer p-1
                      ${
                        cell.isCurrentMonth
                          ? 'bg-slate-50 hover:bg-puko-50 text-slate-800 font-bold'
                          : 'bg-slate-100/50 text-slate-400 hover:text-slate-600'
                      }
                      ${
                        inRange
                          ? 'bg-puko-100/80 border border-puko-500/80 ring-1 ring-puko-500/20 text-puko-900 font-extrabold'
                          : 'border border-slate-200/70'
                      }
                      ${
                        isSelectedStart || isSelectedEnd
                          ? '!bg-puko-600 !text-white !font-black shadow-md border-2 !border-puko-700 ring-2 ring-puko-400 scale-105'
                          : ''
                      }
                    `}
                  >
                    {/* Day Number (Semua tanggal berwarna normal bersih, tidak ada warna merah) */}
                    <span
                      className={`text-xs sm:text-sm ${
                        isSelectedStart || isSelectedEnd
                          ? '!text-white font-black'
                          : inRange
                          ? 'text-puko-900 font-extrabold'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.day}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Row: Hanya Tombol Konfirmasi Saja (Bersih, Rapi & Elegan) */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-3 px-5 rounded-2xl text-xs sm:text-sm font-extrabold bg-puko-600 hover:bg-puko-700 text-white shadow-md shadow-puko-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Konfirmasi</span>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* VIEW 2: PILIH BULAN (Tema Putih & Hijau)                        */
          /* ============================================================== */
          <div className="py-1">
            {/* Header: < 2026 ▾ > */}
            <div className="flex items-center justify-between mb-6 px-1">
              <button
                type="button"
                onClick={() => setViewYear((prev) => prev - 1)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                title="Tahun Sebelumnya"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-slate-900 tracking-wide">
                  {viewYear}
                </span>
                <ChevronDown className="w-4 h-4 text-puko-600" />
              </div>

              <button
                type="button"
                onClick={() => setViewYear((prev) => prev + 1)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                title="Tahun Berikutnya"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* 12 Circular Month Buttons (3 rows x 4 cols) */}
            <div className="grid grid-cols-4 gap-y-5 gap-x-3 place-items-center mb-6">
              {MONTH_NAMES_SHORT.map((name, idx) => {
                const isSelected = viewMonth === idx;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleMonthCircleClick(idx)}
                    className={`
                      w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all cursor-pointer
                      ${
                        isSelected
                          ? 'bg-puko-600 text-white font-black shadow-lg shadow-puko-600/30 scale-105 border-none'
                          : 'border-2 border-slate-200 text-slate-700 hover:border-puko-500 hover:bg-puko-50 hover:text-puko-800 active:scale-95'
                      }
                    `}
                  >
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions for Month Picker */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setViewYear(todayYear);
                  setViewMonth(todayMonth);
                }}
                className="text-xs text-puko-700 hover:text-puko-800 font-bold cursor-pointer underline"
              >
                Setel Tahun Ini ({todayYear})
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                Kembali ke Kalender
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

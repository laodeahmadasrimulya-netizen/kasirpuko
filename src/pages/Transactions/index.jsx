import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Receipt,
  Eye,
  Calendar,
  Trash2,
  Filter,
  Download,
  Loader2,
  CalendarRange,
  RotateCcw,
  Banknote,
  QrCode,
  Coffee,
  Coins,
  FileText,
  Clock,
  Printer,
  X,
  CheckCircle2,
  Sliders,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useTransactions } from '../../context/TransactionContext';
import { useSettings } from '../../context/SettingsContext';
import { useExpenses } from '../../context/ExpenseContext';
import { useIngredients } from '../../context/IngredientContext';
import { isAlpukatShakeItem } from '../../services/ingredientService';
import { countCups, isToppingItem } from '../../utils/productUtils';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { formatIDR } from '../../utils/currency';
import {
  formatDate,
  formatDateOnly,
  formatTime,
  isToday,
  isYesterday,
  formatDateInput,
} from '../../utils/date';
import { playPrintReceiptSound } from '../../utils/sound';
import { useAuth } from '../../hooks/useAuth';
import { CalendarFilterModal } from '../../components/transactions/CalendarFilterModal';

export const TransactionsPage = () => {
  const { transactions, setActiveReceipt, clearHistory, deleteTransactions } = useTransactions();
  const { settings } = useSettings();
  const { user, isAdmin } = useAuth();
  const { expenses } = useExpenses();
  const { ingredients, formatStock } = useIngredients();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'MONTH'
  const [customStartDate, setCustomStartDate] = useState(
    formatDateInput(new Date())
  );
  const [customEndDate, setCustomEndDate] = useState(
    formatDateInput(new Date())
  );
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [monthFilterLabel, setMonthFilterLabel] = useState('');

  const currentMonthName = useMemo(() => {
    const INDO_MONTHS_FULL = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    if (customStartDate) {
      const parts = customStartDate.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          return INDO_MONTHS_FULL[mIdx];
        }
      }
    }
    const now = new Date();
    return INDO_MONTHS_FULL[now.getMonth()];
  }, [customStartDate]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState('mobile'); // 'mobile' (Pas Layar HP) | 'a4' (Standar A4)

  const reportRef = useRef(null);

  // Filter transactions based on date, payment method, and search keyword
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.timestamp);

      // 1. Date Filter
      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        matchesDate = isToday(tx.timestamp);
      } else if (dateFilter === 'YESTERDAY') {
        matchesDate = isYesterday(tx.timestamp);
      } else if (dateFilter === 'LAST_7_DAYS') {
        const now = new Date();
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        matchesDate = txDate >= start && txDate <= end;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const now = new Date();
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 29,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        matchesDate = txDate >= start && txDate <= end;
      } else if (dateFilter === 'MONTH' || dateFilter === 'CUSTOM') {
        if (customStartDate && customEndDate) {
          const s = new Date(customStartDate + 'T00:00:00');
          const e = new Date(customEndDate + 'T23:59:59.999');
          matchesDate = txDate >= s && txDate <= e;
        } else if (customStartDate) {
          const s = new Date(customStartDate + 'T00:00:00');
          const e = new Date(customStartDate + 'T23:59:59.999');
          matchesDate = txDate >= s && txDate <= e;
        } else if (customEndDate) {
          const e = new Date(customEndDate + 'T23:59:59.999');
          matchesDate = txDate <= e;
        }
      }

      // 2. Payment Method Filter
      const matchesMethod =
        selectedMethod === 'ALL' ||
        (tx.paymentMethod || 'TUNAI').toUpperCase() === selectedMethod;

      // 3. Search Query Filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.id.toLowerCase().includes(q) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
        (tx.cashierName && tx.cashierName.toLowerCase().includes(q)) ||
        tx.items?.some((i) =>
          (i.name || i.nama || '').toLowerCase().includes(q)
        );

      return matchesDate && matchesMethod && matchesSearch;
    });
  }, [
    transactions,
    dateFilter,
    customStartDate,
    customEndDate,
    selectedMethod,
    searchQuery,
  ]);

  // Aggregate summary calculations for filtered transactions
  const summary = useMemo(() => {
    let totalOmzet = 0;
    let totalTunai = 0;
    let totalQris = 0;
    let totalTransfer = 0;
    let totalCup = 0;

    filteredTransactions.forEach((tx) => {
      const amt = tx.total || 0;
      totalOmzet += amt;
      const method = (tx.paymentMethod || 'TUNAI').toUpperCase();
      if (method === 'TUNAI') totalTunai += amt;
      else if (method === 'QRIS') totalQris += amt;
      else if (method === 'TRANSFER') totalTransfer += amt;

      totalCup += countCups(tx.items);
    });

    return {
      count: filteredTransactions.length,
      totalOmzet,
      totalTunai,
      totalQris,
      totalTransfer,
      totalCup,
    };
  }, [filteredTransactions]);

  // Filter data pengeluaran berdasarkan periode waktu yang dipilih
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((exp) => {
      if (!exp.timestamp) return false;
      const expDate = new Date(exp.timestamp);

      if (dateFilter === 'TODAY') {
        return isToday(exp.timestamp);
      } else if (dateFilter === 'YESTERDAY') {
        return isYesterday(exp.timestamp);
      } else if (dateFilter === 'LAST_7_DAYS') {
        const now = new Date();
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        return expDate >= start && expDate <= end;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const now = new Date();
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 29,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        return expDate >= start && expDate <= end;
      } else if (dateFilter === 'MONTH' || dateFilter === 'CUSTOM') {
        if (customStartDate && customEndDate) {
          const s = new Date(customStartDate + 'T00:00:00');
          const e = new Date(customEndDate + 'T23:59:59.999');
          return expDate >= s && expDate <= e;
        } else if (customStartDate) {
          const s = new Date(customStartDate + 'T00:00:00');
          return expDate >= s;
        } else if (customEndDate) {
          const e = new Date(customEndDate + 'T23:59:59.999');
          return expDate <= e;
        }
      }
      return true;
    });
  }, [expenses, dateFilter, customStartDate, customEndDate]);

  // Total nominal pengeluaran untuk periode terpilih
  const totalPengeluaran = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, exp) => sum + (Number(exp.amount) || 0),
      0
    );
  }, [filteredExpenses]);

  // Total Pendapatan Bersih (Omzet dikurangi Pengeluaran)
  const totalPendapatanBersih = useMemo(() => {
    return summary.totalOmzet - totalPengeluaran;
  }, [summary.totalOmzet, totalPengeluaran]);

  // Menu sales breakdown for the filtered period
  const menuBreakdown = useMemo(() => {
    const map = {};
    filteredTransactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        const name = item.nama || item.name;
        if (!name) return;
        if (!map[name]) {
          map[name] = { name, qty: 0, revenue: 0 };
        }
        map[name].qty += item.qty || 1;
        map[name].revenue +=
          item.subtotal || (item.harga || item.price || 0) * (item.qty || 1);
      });
    });

    const list = Object.values(map);
    list.sort((a, b) => b.qty - a.qty);
    return list;
  }, [filteredTransactions]);

  // Hitung jumlah cup minuman pada transaksi yang terfilter
  const totalDrinkCups = useMemo(() => {
    let cups = 0;
    filteredTransactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        if (isAlpukatShakeItem(item)) {
          cups += Number(item.qty) || 1;
        }
      });
    });
    // Fallback jika tidak ada item spesifik alpukat (misal data legacy), gunakan summary.totalCup
    return cups > 0 ? cups : summary.totalCup;
  }, [filteredTransactions, summary.totalCup]);

  // Hitung rincian pemakaian stok bahan baku untuk transaksi yang terfilter
  const ingredientUsageList = useMemo(() => {
    if (!ingredients || typeof ingredients !== 'object') return [];

    const list = Object.values(ingredients).filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        item.name &&
        typeof item.name === 'string' &&
        item.id &&
        !String(item.id).startsWith('_')
    );

    return list.map((ing) => {
      const portion = Number(ing.portionPerCup) || 0;
      let totalUsed = totalDrinkCups * portion;

      // Jika portionPerCup === 0, cek apakah ada item transaksi yang namanya cocok dengan bahan baku ini (misal Topping)
      if (portion === 0) {
        let directQty = 0;
        const ingNameLower = (ing.name || '').toLowerCase();
        filteredTransactions.forEach((tx) => {
          tx.items?.forEach((item) => {
            const itemNameLower = (item.nama || item.name || '').toLowerCase();
            if (
              itemNameLower.includes(ingNameLower) ||
              ingNameLower.includes(itemNameLower)
            ) {
              directQty += Number(item.qty) || 1;
            }
          });
        });
        totalUsed = directQty;
      }

      const baseUnit = (ing.baseUnit || ing.unit || '').toLowerCase();

      // Format Takaran / Cup
      let portionLabel = '-';
      if (portion > 0) {
        if (baseUnit === 'gram' || ing.unit === 'kg') {
          portionLabel = `${portion} gr / cup`;
        } else if (
          baseUnit === 'ml' ||
          ing.unit === 'l' ||
          ing.unit === 'L' ||
          ing.unit === 'liter'
        ) {
          portionLabel = `${portion} ml / cup`;
        } else {
          portionLabel = `${portion} ${ing.unit || 'pcs'} / cup`;
        }
      } else {
        portionLabel = 'Sesuai Porsi';
      }

      // Format Total Pemakaian
      let usedLabel = '0';
      let usedShort = '0';

      if (totalUsed === 0) {
        const u = ing.unit || ing.baseUnit || 'pcs';
        usedLabel = `0 ${u}`;
        usedShort = `0 ${u}`;
      } else if (baseUnit === 'gram' || ing.unit === 'kg') {
        if (totalUsed >= 1000) {
          const inKg = (totalUsed / 1000).toLocaleString('id-ID', {
            minimumFractionDigits: totalUsed % 1000 === 0 ? 0 : 1,
            maximumFractionDigits: 2,
          });
          usedLabel = `${inKg} kg (${totalUsed.toLocaleString('id-ID')} gr)`;
          usedShort = `${inKg} kg`;
        } else {
          usedLabel = `${totalUsed.toLocaleString('id-ID')} gram`;
          usedShort = `${totalUsed.toLocaleString('id-ID')} g`;
        }
      } else if (
        baseUnit === 'ml' ||
        ing.unit === 'l' ||
        ing.unit === 'L' ||
        ing.unit === 'liter'
      ) {
        if (totalUsed >= 1000) {
          const inL = (totalUsed / 1000).toLocaleString('id-ID', {
            minimumFractionDigits: totalUsed % 1000 === 0 ? 0 : 1,
            maximumFractionDigits: 2,
          });
          usedLabel = `${inL} Liter (${totalUsed.toLocaleString('id-ID')} ml)`;
          usedShort = `${inL} L`;
        } else {
          usedLabel = `${totalUsed.toLocaleString('id-ID')} ml`;
          usedShort = `${totalUsed.toLocaleString('id-ID')} ml`;
        }
      } else {
        const u = ing.unit || ing.baseUnit || 'pcs';
        usedLabel = `${totalUsed.toLocaleString('id-ID')} ${u}`;
        usedShort = `${totalUsed.toLocaleString('id-ID')} ${u}`;
      }

      return {
        id: ing.id,
        name: ing.name,
        icon: ing.icon || '📦',
        category: ing.category || 'Bahan Baku',
        portion,
        portionLabel,
        totalUsed,
        usedLabel,
        usedShort,
        currentStockDisplay: formatStock(ing),
      };
    });
  }, [ingredients, totalDrinkCups, filteredTransactions, formatStock]);

  // Readable label for the current period
  const periodLabel = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'TODAY') {
      return `Hari Ini (${formatDateOnly(now)})`;
    }
    if (dateFilter === 'YESTERDAY') {
      const yesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1
      );
      return `Kemarin (${formatDateOnly(yesterday)})`;
    }
    if (dateFilter === 'LAST_7_DAYS') {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6
      );
      return `7 Hari Terakhir (${formatDateOnly(start)} - ${formatDateOnly(now)})`;
    }
    if (dateFilter === 'LAST_30_DAYS') {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 29
      );
      return `30 Hari Terakhir (${formatDateOnly(start)} - ${formatDateOnly(now)})`;
    }
    if (dateFilter === 'MONTH' || dateFilter === 'CUSTOM') {
      if (monthFilterLabel) return monthFilterLabel;
      if (customStartDate && customEndDate) {
        if (customStartDate === customEndDate) {
          return formatDateOnly(customStartDate);
        }
        return `${formatDateOnly(customStartDate)} s/d ${formatDateOnly(customEndDate)}`;
      }
      if (customStartDate) {
        return `Tanggal: ${formatDateOnly(customStartDate)}`;
      }
      return 'Bulan Ini';
    }
    return 'Semua Waktu';
  }, [dateFilter, customStartDate, customEndDate, monthFilterLabel]);

  // Label for who printed the report: Admin if admin, cashier name if cashier
  const printedBy = useMemo(() => {
    if (isAdmin || user?.role === 'ADMIN') {
      return 'Admin';
    }
    const name = user?.name || user?.username || settings?.cashierName || 'Kasir 01';
    return name.toLowerCase().includes('kasir') ? name : `Kasir (${name})`;
  }, [isAdmin, user, settings]);

  // Download PDF using html2pdf.js with mobile (pas layar HP) or A4 layout
  const handleSavePdf = async () => {
    const element = reportRef.current;
    if (!element) return;
    setIsExportingPdf(true);

    const prevScrollY = window.scrollY;
    const prevScrollX = window.scrollX;

    try {
      // Reset scroll position temporarily to prevent html2canvas blank page/offset issue
      window.scrollTo(0, 0);
      if (element.parentElement) {
        element.parentElement.scrollLeft = 0;
      }
      const scrollableParent = element.closest('.overflow-y-auto');
      const prevParentScrollTop = scrollableParent ? scrollableParent.scrollTop : 0;
      if (scrollableParent) {
        scrollableParent.scrollTop = 0;
      }

      const isMobileFormat = reportFormat === 'mobile';
      const safeLabel = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Laporan_Transaksi_PUKO_${isMobileFormat ? 'Mobile_' : ''}${safeLabel}.pdf`;

      // Measure the real rendered dimensions
      const renderedWidth = element.offsetWidth || (isMobileFormat ? 420 : 750);
      const renderedHeight = element.offsetHeight || 600;

      let opt;
      if (isMobileFormat) {
        // Continuous single-page height calibrated to 108mm width (+ 4mm bottom buffer)
        const targetWidthMm = 108;
        const targetHeightMm = Math.ceil((renderedHeight / renderedWidth) * targetWidthMm) + 4;

        opt = {
          margin: [3, 2, 3, 2],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc) => {
              const el = clonedDoc.getElementById('printable-report');
              if (el) {
                el.style.boxShadow = 'none';
                el.style.borderRadius = '0';
                if (el.parentElement) {
                  el.parentElement.style.overflow = 'visible';
                }
              }
            },
          },
          jsPDF: {
            unit: 'mm',
            format: [targetWidthMm, targetHeightMm],
            orientation: 'portrait',
          },
        };
      } else {
        opt = {
          margin: [8, 6, 8, 6],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc) => {
              const el = clonedDoc.getElementById('printable-report');
              if (el) {
                el.style.boxShadow = 'none';
                el.style.borderRadius = '0';
                if (el.parentElement) {
                  el.parentElement.style.overflow = 'visible';
                }
              }
            },
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
          },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            avoid: ['tr'],
          },
        };
      }

      await html2pdf().set(opt).from(element).save();

      if (scrollableParent) {
        scrollableParent.scrollTop = prevParentScrollTop;
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Terjadi kesalahan saat generate PDF. Membuka dialog print browser...');
      window.print();
    } finally {
      window.scrollTo(prevScrollX, prevScrollY);
      setIsExportingPdf(false);
    }
  };

  // Direct print action
  const handlePrint = () => {
    playPrintReceiptSound();
    window.print();
  };

  const handleClearHistory = async () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada transaksi pada filter periode ini untuk dibersihkan.');
      return;
    }

    const isAllSelected =
      dateFilter === 'ALL' && filteredTransactions.length === transactions.length;
    const confirmMsg = isAllSelected
      ? `Apakah Anda yakin ingin menghapus seluruh (${transactions.length}) riwayat transaksi?`
      : `Apakah Anda yakin ingin menghapus ${filteredTransactions.length} transaksi pada periode "${periodLabel}"?`;

    if (window.confirm(confirmMsg)) {
      if (isAllSelected) {
        await clearHistory();
      } else {
        const idsToDelete = filteredTransactions.map((t) => t.id);
        await deleteTransactions(idsToDelete);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800">
            Riwayat Transaksi
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (filteredTransactions.length === 0) {
                alert('Tidak ada transaksi untuk diekspor pada filter ini.');
                return;
              }
              setIsReportModalOpen(true);
            }}
            icon={FileText}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
          >
            Ekspor PDF, Excel, atau Kirim lewat WA
          </Button>

          {isAdmin && transactions.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearHistory}
              icon={Trash2}
            >
              Bersihkan Riwayat
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Card */}
      <Card padding={false} className="p-4 space-y-4 shadow-sm">
        {/* Row 1: Filter Waktu (Hari Ini, Kemarin, 7 Hari, 30 Hari, Pilih Tanggal) */}
        <div className="space-y-2.5">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-puko-600" />
              Pilih Waktu
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'TODAY', label: 'Hari Ini' },
              { id: 'YESTERDAY', label: 'Kemarin' },
              { id: 'MONTH', label: 'Bulan Ini' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  if (btn.id === 'MONTH') {
                    // Set default to 1st of month until today (if same month)
                    const now = new Date();
                    const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                    const endStr = formatDateInput(now);
                    setCustomStartDate(startStr);
                    setCustomEndDate(endStr);
                    setDateFilter('MONTH');
                    // Do not open calendar modal directly to avoid disturbing the user
                  } else {
                    setDateFilter(btn.id);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none flex items-center gap-1.5 cursor-pointer ${
                  dateFilter === btn.id
                    ? 'bg-puko-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.id === 'MONTH' && <Calendar className="w-3.5 h-3.5" />}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Box Bulan Terpilih (Warna hijau PUKO, klik langsung buka kalender) */}
          {dateFilter === 'MONTH' && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsCalendarModalOpen(true)}
              className="p-3 sm:p-3.5 bg-puko-600 hover:bg-puko-700 text-white rounded-2xl flex items-center justify-between shadow-soft cursor-pointer transition-all active:scale-[0.99] border border-puko-500/40 group select-none animate-fadeIn"
              title="Klik untuk membuka kalender atau ganti bulan"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-sm sm:text-base font-extrabold text-white capitalize tracking-wide">
                  {currentMonthName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-white/90 bg-white/15 px-3 py-1.5 rounded-xl group-hover:bg-white/25 transition-colors">
                <span>Ubah</span>
                <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Search Input & Payment Method Filters */}
        <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-slate-100">
          <div className="flex-1">
            <Input
              placeholder="Cari No. Struk (PUKO-...), nama pelanggan, atau menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'ALL', label: 'Semua Metode' },
              { id: 'TUNAI', label: 'Tunai' },
              { id: 'QRIS', label: 'QRIS' },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id)}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none
                  ${
                    selectedMethod === method.id
                      ? 'bg-puko-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Mini Summary Cards of Filtered Transactions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total {summary.count} Transaksi
          </p>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {formatIDR(summary.totalOmzet)}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Tunai
          </p>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {formatIDR(summary.totalTunai)}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            QRIS
          </p>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {formatIDR(summary.totalQris)}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Cup
          </p>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {summary.totalCup}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Pengeluaran
          </p>
          <p className="text-base sm:text-lg font-black text-rose-600 mt-0.5">
            - {Number(totalPengeluaran || 0).toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Bersih
          </p>
          <p className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
            {formatIDR(totalPendapatanBersih)}
          </p>
        </div>
      </div>

      {/* Transactions Table Card */}
      <Card padding={false} className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">No. Struk</th>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Detail Pesanan</th>
                <th className="py-3.5 px-4">Metode Bayar</th>
                <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">
                      Belum ada transaksi yang sesuai dengan filter.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti filter periode tanggal atau kata kunci pencarian.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('ALL');
                        setSelectedMethod('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Reset Semua Filter
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {tx.id}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(tx.timestamp)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {tx.customerName || 'Pelanggan Umum'}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {tx.cashierName}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 max-w-xs">
                        {tx.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-slate-600 truncate"
                          >
                            <span className="font-bold">{item.qty}x</span>{' '}
                            {item.name || item.nama}
                            {item.notes && (
                              <span className="text-slate-400 italic ml-1">
                                ({item.notes})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          tx.paymentMethod === 'QRIS'
                            ? 'info'
                            : tx.paymentMethod === 'TUNAI'
                            ? 'success'
                            : 'brand'
                        }
                        size="sm"
                      >
                        {tx.paymentMethod}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-puko-800 text-sm">
                      {formatIDR(tx.total)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveReceipt(tx)}
                        icon={Eye}
                      >
                        Struk
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL PRATINJAU & EXPORT PDF LAPORAN TRANSAKSI */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Pratinjau & Cetak Laporan Penjualan"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Format Switcher & Action Header Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-100 rounded-2xl">
            {/* Paper Size / View Format Switcher */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 pl-1.5 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-puko-600" /> Format:
              </span>
              <button
                type="button"
                onClick={() => setReportFormat('mobile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reportFormat === 'mobile'
                    ? 'bg-puko-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Pas Layar HP
              </button>
              <button
                type="button"
                onClick={() => setReportFormat('a4')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reportFormat === 'a4'
                    ? 'bg-puko-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Standar A4
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePdf}
                disabled={isExportingPdf}
                icon={isExportingPdf ? Loader2 : Download}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 sm:flex-none shadow-sm"
              >
                {isExportingPdf
                  ? 'Sedang Mengunduh...'
                  : reportFormat === 'mobile'
                  ? 'Download PDF (Layar HP)'
                  : 'Download PDF (A4)'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={Printer}
                className="flex-1 sm:flex-none"
              >
                Cetak Printer
              </Button>
            </div>
          </div>

          {/* Printable Sheet View */}
          <div className="overflow-x-auto bg-slate-200/60 p-2 sm:p-6 rounded-2xl flex justify-center">
            <div
              id="printable-report"
              ref={reportRef}
              style={{
                width: '100%',
                maxWidth: reportFormat === 'mobile' ? '430px' : '750px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: reportFormat === 'mobile' ? '16px 14px' : '28px 32px',
                fontFamily:
                  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: reportFormat === 'mobile' ? '10px' : '11px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
                boxSizing: 'border-box',
              }}
            >
              {/* Header Dokumen Laporan */}
              <div
                style={{
                  borderBottom: '1px solid #94a3b8',
                  paddingBottom: reportFormat === 'mobile' ? '10px' : '14px',
                  marginBottom: reportFormat === 'mobile' ? '12px' : '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: reportFormat === 'mobile' ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: reportFormat === 'mobile' ? 'flex-start' : 'center',
                    gap: reportFormat === 'mobile' ? '8px' : '0px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src="/logo.png"
                      alt="Logo PUKO"
                      style={{
                        width: reportFormat === 'mobile' ? '38px' : '44px',
                        height: reportFormat === 'mobile' ? '38px' : '44px',
                        objectFit: 'contain',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                          color: '#0f172a',
                          fontWeight: '700',
                        }}
                      >
                        {settings?.tagline || 'Alpukat Kocok No Serat No Pahit'}
                      </p>
                      <p
                        style={{
                          margin: '2px 0 0 0',
                          fontSize: reportFormat === 'mobile' ? '8.5px' : '9.5px',
                          color: '#64748b',
                          fontWeight: 'normal',
                        }}
                      >
                        {settings?.branch || 'Outlet Kendari'} •{' '}
                        {settings?.address || 'Kendari, Sulawesi Tenggara'}
                      </p>
                      <p
                        style={{
                          margin: '1px 0 0 0',
                          fontSize: reportFormat === 'mobile' ? '8.5px' : '9.5px',
                          color: '#64748b',
                          fontWeight: 'normal',
                        }}
                      >
                        Telp: {settings?.phone || '-'}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: reportFormat === 'mobile' ? 'left' : 'right',
                      width: reportFormat === 'mobile' ? '100%' : 'auto',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: reportFormat === 'mobile' ? '12px' : '14px',
                        fontWeight: '700',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                      }}
                    >
                      Laporan Penjualan & Keuangan
                    </h2>
                    <div
                      style={{
                        marginTop: '3px',
                        fontSize: reportFormat === 'mobile' ? '8.5px' : '9.5px',
                        color: '#64748b',
                        fontWeight: 'normal',
                      }}
                    >
                      Tanggal Cetak: {formatDate(new Date())}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter Filter Bar (Ala Word, Clean & Hemat Tinta) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: reportFormat === 'mobile' ? '5px 8px' : '6px 12px',
                  marginBottom: reportFormat === 'mobile' ? '12px' : '16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: reportFormat === 'mobile' ? '8.5px' : '9.5px',
                  fontWeight: 'normal',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Periode: </span>
                  <span style={{ color: '#0f172a' }}>{periodLabel}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Metode: </span>
                  <span style={{ color: '#0f172a' }}>
                    {selectedMethod === 'ALL' ? 'Semua' : selectedMethod}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Transaksi: </span>
                  <span style={{ color: '#0f172a' }}>
                    {filteredTransactions.length} Data
                  </span>
                </div>
              </div>

              {/* Tabel Ringkasan Keuangan Toko (Ala Word, Clean & Hemat Tinta) */}
              <div
                style={{
                  marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div
                  style={{
                    fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  Ringkasan Keuangan Toko:
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                    backgroundColor: '#ffffff',
                    tableLayout: 'fixed',
                    lineHeight: '1.5',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #cbd5e1',
                      }}
                    >
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 4px' : '6px 8px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#334155',
                          width: reportFormat === 'mobile' ? '24px' : '30px',
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#334155',
                        }}
                      >
                        Uraian / Indikator Keuangan
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#334155',
                          width: reportFormat === 'mobile' ? '135px' : '190px',
                        }}
                      >
                        Jumlah / Nominal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '5px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                        }}
                      >
                        1
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          fontWeight: '700',
                          color: '#0f172a',
                        }}
                      >
                        Total Omzet Penjualan (Kotor)
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '700',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalOmzet)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '5px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                        }}
                      >
                        2
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                        }}
                      >
                        - Pembayaran Tunai (Cash)
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          color: '#334155',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalTunai)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '5px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                        }}
                      >
                        3
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                        }}
                      >
                        - Pembayaran Non-Tunai (QRIS)
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          color: '#334155',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalQris)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '5px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                        }}
                      >
                        4
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                        }}
                      >
                        Total Cup Minuman Terjual
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {summary.totalCup} Cup
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '5px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#dc2626',
                        }}
                      >
                        5
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          fontWeight: '700',
                          color: '#dc2626',
                        }}
                      >
                        Total Pengeluaran Toko
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 8px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '700',
                          color: '#dc2626',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        - {formatIDR(totalPengeluaran)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f0fdf4', borderTop: '1px solid #cbd5e1' }}>
                      <td
                        colSpan={2}
                        style={{
                          padding: reportFormat === 'mobile' ? '7px 8px' : '8px 10px',
                          fontWeight: '800',
                          color: '#15803d',
                          fontSize: reportFormat === 'mobile' ? '9.5px' : '11px',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        TOTAL PENDAPATAN BERSIH:
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '7px 8px' : '8px 10px',
                          textAlign: 'right',
                          fontWeight: '800',
                          color: '#15803d',
                          fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        = {formatIDR(totalPendapatanBersih)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tabel Word: Pemakaian Stok Bahan Baku */}
              <div
                style={{
                  marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div
                  style={{
                    fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  Pemakaian Stok Bahan Baku:
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    fontSize: reportFormat === 'mobile' ? '8.5px' : '9.5px',
                    backgroundColor: '#ffffff',
                    tableLayout: 'fixed',
                    lineHeight: '1.4',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #cbd5e1',
                      }}
                    >
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 2px' : '6px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#334155',
                          width: reportFormat === 'mobile' ? '24px' : '32px',
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 6px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#334155',
                        }}
                      >
                        Nama Bahan Baku
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 6px' : '6px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#334155',
                          width: reportFormat === 'mobile' ? '110px' : '180px',
                        }}
                      >
                        Total Pemakaian
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientUsageList.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 2px' : '5px 4px',
                            border: '1px solid #cbd5e1',
                            textAlign: 'center',
                            color: '#64748b',
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 6px' : '5px 10px',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                          }}
                        >
                          <div style={{ fontWeight: '600' }}>
                            <span>{item.name}</span>
                          </div>
                          {reportFormat === 'a4' && item.category && (
                            <div
                              style={{
                                fontSize: '8px',
                                color: '#64748b',
                                marginTop: '1px',
                              }}
                            >
                              {item.category}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 6px' : '5px 10px',
                            border: '1px solid #cbd5e1',
                            textAlign: 'right',
                            fontWeight: '700',
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {reportFormat === 'mobile' ? item.usedShort : item.usedLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tabel Tambahan: Total Cup Terpakai */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                    lineHeight: '1.5',
                    marginTop: '5px',
                  }}
                >
                  <tbody>
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          color: '#15803d',
                          fontWeight: '700',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Total Cup Terpakai
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          color: '#15803d',
                          fontWeight: '800',
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                          width: reportFormat === 'mobile' ? '110px' : '180px',
                        }}
                      >
                        {totalDrinkCups} Cup
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Transaksi Penjualan */}
              <div style={{ marginBottom: reportFormat === 'mobile' ? '14px' : '20px' }}>
                <div
                  style={{
                    fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  Daftar Transaksi Penjualan:
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    fontSize: reportFormat === 'mobile' ? '8.5px' : '9.5px',
                    tableLayout: 'fixed',
                    backgroundColor: '#ffffff',
                    lineHeight: '1.4',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #cbd5e1',
                        textAlign: 'left',
                        color: '#334155',
                      }}
                    >
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 2px' : '6px 4px',
                          width: reportFormat === 'mobile' ? '20px' : '26px',
                          textAlign: 'center',
                          fontWeight: '600',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                          width: reportFormat === 'mobile' ? '68px' : '110px',
                          fontWeight: '600',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        No. Struk
                      </th>
                      {reportFormat === 'a4' && (
                        <th style={{ padding: '6px', width: '80px', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                          Waktu
                        </th>
                      )}
                      {reportFormat === 'a4' && (
                        <th style={{ padding: '6px', width: '90px', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                          Pelanggan
                        </th>
                      )}
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                          fontWeight: '600',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Detail Pesanan
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 2px' : '6px',
                          width: reportFormat === 'mobile' ? '44px' : '60px',
                          textAlign: 'center',
                          fontWeight: '600',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Metode
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                          width: reportFormat === 'mobile' ? '82px' : '100px',
                          textAlign: 'right',
                          fontWeight: '600',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Total (Rp)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, idx) => (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 2px' : '5px',
                            textAlign: 'center',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 3px' : '5px',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            wordBreak: 'break-all',
                            fontSize: reportFormat === 'mobile' ? '8px' : '9px',
                          }}
                        >
                          <div>{tx.id}</div>
                          {reportFormat === 'mobile' && (
                            <div style={{ color: '#64748b', fontSize: '7.5px' }}>
                              {formatTime(tx.timestamp)}
                            </div>
                          )}
                        </td>
                        {reportFormat === 'a4' && (
                          <td style={{ padding: '5px', color: '#475569', border: '1px solid #cbd5e1' }}>
                            {formatDate(tx.timestamp)}
                          </td>
                        )}
                        {reportFormat === 'a4' && (
                          <td style={{ padding: '5px', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                            <div>{tx.customerName || 'Pelanggan Umum'}</div>
                            <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                              {tx.cashierName}
                            </div>
                          </td>
                        )}
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 4px' : '5px',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {reportFormat === 'mobile' && tx.customerName && (
                            <div
                              style={{
                                color: '#64748b',
                                fontSize: '7.5px',
                                marginBottom: '2px',
                              }}
                            >
                              Pelanggan: {tx.customerName}
                            </div>
                          )}
                          {tx.items?.map((item, i) => (
                            <div key={i} style={{ lineHeight: '1.3' }}>
                              <span>{item.qty}x</span>{' '}
                              <span>{item.name || item.nama}</span>
                              {item.notes ? (
                                <span
                                  style={{
                                    color: '#64748b',
                                    fontStyle: 'italic',
                                    fontSize: '7.5px',
                                  }}
                                >
                                  {' '}
                                  ({item.notes})
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 2px' : '5px',
                            textAlign: 'center',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                          }}
                        >
                          {tx.paymentMethod}
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '4px 4px' : '5px',
                            textAlign: 'right',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatIDR(tx.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        borderTop: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <td
                        colSpan={reportFormat === 'mobile' ? 4 : 6}
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 5px' : '7px 6px',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        TOTAL OMZET:
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 5px' : '7px 6px',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '10px' : '11.5px',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalOmzet)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Rincian Pengeluaran */}
              {filteredExpenses.length > 0 && (
                <div
                  style={{
                    marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                      fontWeight: '700',
                      color: '#0f172a',
                      marginBottom: '5px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}
                  >
                    Rincian Pengeluaran:
                  </div>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #cbd5e1',
                      fontSize: reportFormat === 'mobile' ? '8.5px' : '9.5px',
                      tableLayout: 'fixed',
                      backgroundColor: '#ffffff',
                      lineHeight: '1.4',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#f8fafc',
                          borderBottom: '1px solid #cbd5e1',
                          textAlign: 'left',
                          color: '#334155',
                        }}
                      >
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 2px' : '6px 4px',
                            width: reportFormat === 'mobile' ? '20px' : '26px',
                            textAlign: 'center',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          No
                        </th>
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                            width: reportFormat === 'mobile' ? '60px' : '100px',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Waktu
                        </th>
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Keterangan
                        </th>
                        {reportFormat === 'a4' && (
                          <th style={{ padding: '6px', width: '85px', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                            Dicatat Oleh
                          </th>
                        )}
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                            width: reportFormat === 'mobile' ? '82px' : '100px',
                            textAlign: 'right',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Nominal (Rp)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((exp, idx) => (
                        <tr
                          key={exp.id || idx}
                          style={{
                            borderBottom: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '4px 2px' : '5px',
                              textAlign: 'center',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '4px 3px' : '5px',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {reportFormat === 'mobile'
                              ? formatTime(exp.timestamp)
                              : formatDate(exp.timestamp)}
                          </td>
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '4px 4px' : '5px',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            <div>{exp.category || exp.keterangan || 'Pengeluaran Operasional'}</div>
                            {reportFormat === 'mobile' && exp.user && (
                              <div
                                style={{
                                  fontSize: '7.5px',
                                  color: '#64748b',
                                }}
                              >
                                Oleh: {exp.user}
                              </div>
                            )}
                          </td>
                          {reportFormat === 'a4' && (
                            <td style={{ padding: '5px', color: '#475569', border: '1px solid #cbd5e1' }}>
                              {exp.user || 'Kasir'}
                            </td>
                          )}
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '4px 4px' : '5px',
                              textAlign: 'right',
                              color: '#dc2626',
                              border: '1px solid #cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            - {formatIDR(exp.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr
                        style={{
                          borderTop: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <td
                          colSpan={reportFormat === 'mobile' ? 3 : 4}
                          style={{
                            padding: reportFormat === 'mobile' ? '6px 5px' : '7px 6px',
                            fontWeight: '800',
                            textAlign: 'right',
                            fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          TOTAL PENGELUARAN:
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '6px 5px' : '7px 6px',
                            fontWeight: '800',
                            textAlign: 'right',
                            fontSize: reportFormat === 'mobile' ? '10px' : '11.5px',
                            color: '#dc2626',
                            border: '1px solid #cbd5e1',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          - {formatIDR(totalPengeluaran)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Tabel Word: Total Pendapatan, Pengeluaran dan Pendapatan Bersih */}
              <div
                style={{
                  marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                  pageBreakInside: 'avoid',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                    lineHeight: '1.5',
                  }}
                >
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          color: '#0f172a',
                          fontWeight: '700',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Total Pendapatan
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          color: '#0f172a',
                          fontWeight: '700',
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalOmzet)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          color: '#dc2626',
                          fontWeight: '700',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Pengeluaran
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          color: '#dc2626',
                          fontWeight: '700',
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        - {formatIDR(totalPengeluaran)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '7px 8px' : '8px 10px',
                          color: '#15803d',
                          fontWeight: '800',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Pendapatan Bersih
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '7px 8px' : '8px 10px',
                          color: '#15803d',
                          fontWeight: '800',
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        = {formatIDR(totalPendapatanBersih)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL KALENDER & PEMILIH BULAN (SESUAI GAMBAR 1 & 2) */}
      <CalendarFilterModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
        transactions={transactions}
        onConfirm={({ startDate, endDate, label }) => {
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
          setMonthFilterLabel(label);
          setDateFilter('MONTH');
        }}
      />
    </div>
  );
};

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
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useTransactions } from '../../context/TransactionContext';
import { useSettings } from '../../context/SettingsContext';
import { useExpenses } from '../../context/ExpenseContext';
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

export const TransactionsPage = () => {
  const { transactions, setActiveReceipt, clearHistory } = useTransactions();
  const { settings } = useSettings();
  const { user, isAdmin } = useAuth();
  const { expenses } = useExpenses();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState(
    formatDateInput(new Date())
  );
  const [customEndDate, setCustomEndDate] = useState(
    formatDateInput(new Date())
  );
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
      } else if (dateFilter === 'CUSTOM') {
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

      tx.items?.forEach((item) => {
        const cat = (item.category || item.kategori || '').toLowerCase();
        const id = String(item.id || '');
        const name = (item.nama || item.name || '').toLowerCase();
        const isTopping =
          cat.includes('topping') ||
          id.startsWith('puko-t') ||
          name.startsWith('extra ') ||
          name.includes('topping');

        if (!isTopping) {
          totalCup += item.qty || 1;
        }
      });
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
      } else if (dateFilter === 'CUSTOM') {
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
    if (dateFilter === 'CUSTOM') {
      if (customStartDate && customEndDate) {
        return `Rentang: ${formatDateOnly(customStartDate)} s/d ${formatDateOnly(customEndDate)}`;
      }
      if (customStartDate) {
        return `Tanggal: ${formatDateOnly(customStartDate)}`;
      }
      return 'Tanggal Ditentukan';
    }
    return 'Semua Waktu';
  }, [dateFilter, customStartDate, customEndDate]);

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

  const handleClearHistory = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin menghapus seluruh riwayat transaksi sementara di LocalStorage?'
      )
    ) {
      clearHistory();
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
            Pratinjau & Export PDF
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
              { id: 'CUSTOM', label: 'Pilih Waktu' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateFilter(btn.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
                  dateFilter === btn.id
                    ? 'bg-puko-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Form Pemilihan Tanggal jika CUSTOM dipilih */}
          {dateFilter === 'CUSTOM' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2.5 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <CalendarRange className="w-4 h-4 text-slate-500" />
                <span>Pilih Rentang Tanggal:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs shadow-2xs">
                  <span className="text-slate-500 font-medium text-[11px]">Dari:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border-none bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
                <span className="text-slate-500 text-xs font-bold">s/d</span>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs shadow-2xs">
                  <span className="text-slate-500 font-medium text-[11px]">Sampai:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border-none bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const todayStr = formatDateInput(new Date());
                  setCustomStartDate(todayStr);
                  setCustomEndDate(todayStr);
                }}
                className="text-xs text-puko-700 hover:text-puko-800 underline font-bold ml-auto"
              >
                Setel ke Hari Ini
              </button>
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
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {formatIDR(totalPengeluaran)}
          </p>
        </div>

        <div className="bg-puko-600 rounded-2xl p-3 border border-puko-700/60 text-white">
          <p className="text-[11px] font-bold text-puko-100 uppercase tracking-wider">
            Pendapatan Bersih
          </p>
          <p className="text-base sm:text-lg font-black text-white mt-0.5">
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
                  borderBottom: '2.5px solid #0f172a',
                  paddingBottom: reportFormat === 'mobile' ? '12px' : '16px',
                  marginBottom: reportFormat === 'mobile' ? '12px' : '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: reportFormat === 'mobile' ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: reportFormat === 'mobile' ? 'flex-start' : 'flex-start',
                    gap: reportFormat === 'mobile' ? '10px' : '0px',
                  }}
                >
                  <div>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: reportFormat === 'mobile' ? '18px' : '22px',
                        fontWeight: '900',
                        color: '#0f172a',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      🥑 {settings?.storeName || 'PUKO POS'}
                    </h1>
                    <p
                      style={{
                        margin: '2px 0 0 0',
                        fontSize: reportFormat === 'mobile' ? '10px' : '11px',
                        color: '#475569',
                        fontWeight: '700',
                      }}
                    >
                      {settings?.tagline || 'Alpukat Kocok No Serat No Pahit'}
                    </p>
                    <p
                      style={{
                        margin: '2px 0 0 0',
                        fontSize: '9.5px',
                        color: '#64748b',
                      }}
                    >
                      {settings?.branch || 'Outlet Kendari'} •{' '}
                      {settings?.address || 'Kendari, Sulawesi Tenggara'}
                    </p>
                    <p
                      style={{
                        margin: '1px 0 0 0',
                        fontSize: '9.5px',
                        color: '#64748b',
                      }}
                    >
                      Telp: {settings?.phone || '-'}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: reportFormat === 'mobile' ? 'left' : 'right',
                      width: reportFormat === 'mobile' ? '100%' : 'auto',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        justifyContent: reportFormat === 'mobile' ? 'flex-start' : 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          border: '1.5px solid #0f172a',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontWeight: '800',
                          fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Laporan Penjualan & Keuangan
                      </div>
                      <div
                        style={{
                          border: '1.5px solid #0f172a',
                          backgroundColor: '#f8fafc',
                          color: '#0f172a',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontWeight: '900',
                          fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {printedBy}
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: '5px',
                        fontSize: reportFormat === 'mobile' ? '9px' : '9.5px',
                        color: '#475569',
                        lineHeight: '1.5',
                      }}
                    >
                      <div>
                        <strong>Tanggal Cetak:</strong> {formatDate(new Date())}
                      </div>
                      <div>
                        <strong>Dicetak Oleh:</strong>{' '}
                        <span style={{ fontWeight: '800', color: '#0f172a' }}>
                          {printedBy}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter Filter Bar (Ala Word, Clean & Hemat Tinta) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #94a3b8',
                  padding: reportFormat === 'mobile' ? '6px 8px' : '8px 12px',
                  marginBottom: reportFormat === 'mobile' ? '12px' : '16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                }}
              >
                <div>
                  <span style={{ color: '#475569', fontWeight: '700' }}>PERIODE: </span>
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>{periodLabel}</span>
                </div>
                <div>
                  <span style={{ color: '#475569', fontWeight: '700' }}>METODE: </span>
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>
                    {selectedMethod === 'ALL' ? 'Semua' : selectedMethod}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#475569', fontWeight: '700' }}>TOTAL: </span>
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>
                    {filteredTransactions.length} Transaksi
                  </span>
                </div>
              </div>

              {/* Tabel Ringkasan Keuangan (Simpel & Rapi ala Tabel Word, Hemat Tinta, Angka 100% Utuh Tidak Terpotong) */}
              <div
                style={{
                  marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div
                  style={{
                    fontSize: reportFormat === 'mobile' ? '10px' : '11px',
                    fontWeight: '800',
                    color: '#0f172a',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Ringkasan Keuangan Toko:
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1.5px solid #334155',
                    fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                    backgroundColor: '#ffffff',
                    tableLayout: 'fixed',
                    lineHeight: '1.5',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1.5px solid #334155',
                      }}
                    >
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 4px' : '7px 8px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          fontWeight: '800',
                          color: '#0f172a',
                          width: reportFormat === 'mobile' ? '26px' : '32px',
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'left',
                          fontWeight: '800',
                          color: '#0f172a',
                        }}
                      >
                        Uraian / Indikator Keuangan
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '800',
                          color: '#0f172a',
                          width: reportFormat === 'mobile' ? '140px' : '200px',
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
                          padding: '6px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                          fontWeight: '600',
                        }}
                      >
                        1
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          fontWeight: '700',
                          color: '#0f172a',
                        }}
                      >
                        Total Omzet Penjualan (Kotor)
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '900',
                          color: '#0f172a',
                          fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalOmzet)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '6px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                          fontWeight: '600',
                        }}
                      >
                        2
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: '600',
                        }}
                      >
                        - Pembayaran Tunai (Cash)
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '800',
                          color: '#334155',
                          fontSize: reportFormat === 'mobile' ? '10px' : '11.5px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalTunai)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '6px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                          fontWeight: '600',
                        }}
                      >
                        3
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: '600',
                        }}
                      >
                        - Pembayaran Non-Tunai (QRIS)
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '800',
                          color: '#334155',
                          fontSize: reportFormat === 'mobile' ? '10px' : '11.5px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatIDR(summary.totalQris)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '6px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#64748b',
                          fontWeight: '600',
                        }}
                      >
                        4
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: '600',
                        }}
                      >
                        Total Cup Minuman Terjual
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '800',
                          color: '#0f172a',
                          fontSize: reportFormat === 'mobile' ? '10px' : '11.5px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {summary.totalCup} Cup
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1.5px solid #334155' }}>
                      <td
                        style={{
                          padding: '6px 4px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          color: '#dc2626',
                          fontWeight: '700',
                        }}
                      >
                        5
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          fontWeight: '700',
                          color: '#dc2626',
                        }}
                      >
                        Total Pengeluaran Toko (Biaya Operasional)
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 8px' : '7px 10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: '900',
                          color: '#dc2626',
                          fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        - {formatIDR(totalPengeluaran)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <td
                        colSpan={2}
                        style={{
                          padding: reportFormat === 'mobile' ? '8px 8px' : '9px 10px',
                          fontWeight: '900',
                          color: '#15803d',
                          fontSize: reportFormat === 'mobile' ? '10px' : '11.5px',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        PENDAPATAN BERSIH (LABA BERSIH):
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '8px 8px' : '9px 10px',
                          textAlign: 'right',
                          fontWeight: '900',
                          color: '#15803d',
                          fontSize: reportFormat === 'mobile' ? '11px' : '13px',
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

              {/* Tabel Lengkap Rincian Transaksi */}
              <div style={{ marginBottom: reportFormat === 'mobile' ? '14px' : '20px' }}>
                <div
                  style={{
                    fontSize: reportFormat === 'mobile' ? '10px' : '11px',
                    fontWeight: '800',
                    color: '#0f172a',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Daftar Transaksi Penjualan:
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #334155',
                    fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                    tableLayout: 'fixed',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1.5px solid #334155',
                        textAlign: 'left',
                        color: '#0f172a',
                      }}
                    >
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 3px' : '7px 6px',
                          width: reportFormat === 'mobile' ? '20px' : '28px',
                          textAlign: 'center',
                          fontWeight: '800',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 4px' : '7px 6px',
                          width: reportFormat === 'mobile' ? '75px' : '120px',
                          fontWeight: '800',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        No. Struk
                      </th>
                      {reportFormat === 'a4' && (
                        <th style={{ padding: '7px 6px', width: '90px', fontWeight: '800', border: '1px solid #cbd5e1' }}>
                          Waktu
                        </th>
                      )}
                      {reportFormat === 'a4' && (
                        <th style={{ padding: '7px 6px', width: '95px', fontWeight: '800', border: '1px solid #cbd5e1' }}>
                          Pelanggan
                        </th>
                      )}
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 4px' : '7px 6px',
                          fontWeight: '800',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        {reportFormat === 'mobile' ? 'Pesanan & Pelanggan' : 'Detail Menu Pesanan'}
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 2px' : '7px 6px',
                          width: reportFormat === 'mobile' ? '46px' : '65px',
                          textAlign: 'center',
                          fontWeight: '800',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Metode
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 4px' : '7px 6px',
                          width: reportFormat === 'mobile' ? '86px' : '105px',
                          textAlign: 'right',
                          fontWeight: '800',
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
                            padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: '#0f172a',
                            fontSize: reportFormat === 'mobile' ? '8px' : '9.5px',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {tx.id}
                          {reportFormat === 'mobile' && (
                            <div style={{ color: '#64748b', fontSize: '7.5px', marginTop: '1px' }}>
                              {formatTime(tx.timestamp)}
                            </div>
                          )}
                        </td>
                        {reportFormat === 'a4' && (
                          <td style={{ padding: '6px', color: '#475569', border: '1px solid #cbd5e1' }}>
                            {formatDate(tx.timestamp)}
                          </td>
                        )}
                        {reportFormat === 'a4' && (
                          <td style={{ padding: '6px', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                            <div style={{ fontWeight: '700' }}>
                              {tx.customerName || 'Pelanggan Umum'}
                            </div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>
                              {tx.cashierName}
                            </div>
                          </td>
                        )}
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {reportFormat === 'mobile' && tx.customerName && (
                            <div
                              style={{
                                fontWeight: '700',
                                color: '#0f172a',
                                fontSize: '8.5px',
                                marginBottom: '2px',
                              }}
                            >
                              {tx.customerName}
                            </div>
                          )}
                          {tx.items?.map((item, i) => (
                            <div key={i} style={{ lineHeight: '1.3' }}>
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>
                                {item.qty}x
                              </span>{' '}
                              {item.name || item.nama}
                              {item.notes ? (
                                <span
                                  style={{
                                    color: '#64748b',
                                    fontStyle: 'italic',
                                    fontSize: '8px',
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
                            padding: reportFormat === 'mobile' ? '5px 2px' : '6px',
                            textAlign: 'center',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          <span
                            style={{
                              padding: '1px 4px',
                              fontSize: reportFormat === 'mobile' ? '8px' : '9px',
                              fontWeight: '700',
                              color: '#0f172a',
                            }}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                            textAlign: 'right',
                            fontWeight: '800',
                            color: '#0f172a',
                            fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                            border: '1px solid #cbd5e1',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.4',
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
                        borderTop: '1.5px solid #334155',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <td
                        colSpan={reportFormat === 'mobile' ? 4 : 6}
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 5px' : '8px 6px',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '9.5px' : '11px',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        TOTAL OMZET:
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 5px' : '8px 6px',
                          fontWeight: '900',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
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

              {/* Tabel Rincian Pengeluaran Toko (Jika Ada) */}
              {filteredExpenses.length > 0 && (
                <div
                  style={{
                    marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '10px' : '11px',
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Daftar Rincian Pengeluaran Toko:
                  </div>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #334155',
                      fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                      tableLayout: 'fixed',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#f8fafc',
                          borderBottom: '1.5px solid #334155',
                          textAlign: 'left',
                          color: '#0f172a',
                        }}
                      >
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '7px 6px',
                            width: reportFormat === 'mobile' ? '20px' : '28px',
                            textAlign: 'center',
                            fontWeight: '800',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          No
                        </th>
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '7px 6px',
                            width: reportFormat === 'mobile' ? '65px' : '120px',
                            fontWeight: '800',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Waktu
                        </th>
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '7px 6px',
                            fontWeight: '800',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Keterangan / Keperluan
                        </th>
                        {reportFormat === 'a4' && (
                          <th style={{ padding: '7px 6px', width: '90px', fontWeight: '800', border: '1px solid #cbd5e1' }}>
                            Dicatat Oleh
                          </th>
                        )}
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '7px 6px',
                            width: reportFormat === 'mobile' ? '86px' : '105px',
                            textAlign: 'right',
                            fontWeight: '800',
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
                              padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                              textAlign: 'center',
                              color: '#64748b',
                              fontWeight: '600',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                              color: '#475569',
                              fontSize: reportFormat === 'mobile' ? '8px' : '9.5px',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {reportFormat === 'mobile'
                              ? formatTime(exp.timestamp)
                              : formatDate(exp.timestamp)}
                          </td>
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                              color: '#0f172a',
                              fontWeight: '600',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            <div>{exp.category || exp.keterangan || 'Pengeluaran Operasional'}</div>
                            {reportFormat === 'mobile' && exp.user && (
                              <div
                                style={{
                                  fontSize: '7.5px',
                                  color: '#64748b',
                                  fontWeight: 'normal',
                                }}
                              >
                                Oleh: {exp.user}
                              </div>
                            )}
                          </td>
                          {reportFormat === 'a4' && (
                            <td style={{ padding: '6px', color: '#475569', border: '1px solid #cbd5e1' }}>
                              {exp.user || 'Kasir'}
                            </td>
                          )}
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '5px 4px' : '6px',
                              textAlign: 'right',
                              fontWeight: '800',
                              color: '#dc2626',
                              fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                              border: '1px solid #cbd5e1',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.4',
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
                          borderTop: '1.5px solid #334155',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <td
                          colSpan={reportFormat === 'mobile' ? 3 : 4}
                          style={{
                            padding: reportFormat === 'mobile' ? '6px 5px' : '7px 6px',
                            fontWeight: '800',
                            textAlign: 'right',
                            fontSize: reportFormat === 'mobile' ? '9.5px' : '11px',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          TOTAL PENGELUARAN:
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '6px 5px' : '7px 6px',
                            fontWeight: '900',
                            textAlign: 'right',
                            fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
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

              {/* Kotak Rekapitulasi Keuangan Bersih (Struktur Jelas & Rapi ala Tabel Word) */}
              <div
                style={{
                  marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div
                  style={{
                    fontSize: reportFormat === 'mobile' ? '10px' : '11px',
                    fontWeight: '900',
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    letterSpacing: '0.5px',
                  }}
                >
                  REKAPITULASI KEUANGAN BERSIH:
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1.5px solid #0f172a',
                    backgroundColor: '#ffffff',
                    fontSize: reportFormat === 'mobile' ? '9.5px' : '10.5px',
                  }}
                >
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '7px 10px',
                          color: '#0f172a',
                          fontWeight: '700',
                        }}
                      >
                        1. Total Omzet Penjualan (Kotor)
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          color: '#0f172a',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                        }}
                      >
                        {formatIDR(summary.totalOmzet)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td
                        style={{
                          padding: '7px 10px',
                          color: '#dc2626',
                          fontWeight: '700',
                        }}
                      >
                        2. Total Pengeluaran / Biaya Operasional
                      </td>
                      <td
                        style={{
                          padding: '7px 10px',
                          color: '#dc2626',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                        }}
                      >
                        - {formatIDR(totalPengeluaran)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <td
                        style={{
                          padding: '8px 10px',
                          color: '#15803d',
                          fontWeight: '900',
                          fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                        }}
                      >
                        3. TOTAL PENDAPATAN BERSIH
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          color: '#15803d',
                          fontWeight: '900',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '12px' : '14px',
                        }}
                      >
                        = {formatIDR(totalPendapatanBersih)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Keterangan Sistem */}
              <div
                style={{
                  marginTop: reportFormat === 'mobile' ? '12px' : '20px',
                  textAlign: 'center',
                  fontSize: '8.5px',
                  color: '#94a3b8',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '6px',
                }}
              >
                Dokumen resmi ini dicetak secara otomatis dari Aplikasi Kasir Digital PUKO POS
                • {settings?.branch || 'PUKO Kendari'}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

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

  // Download PDF using html2pdf.js with mobile (pas layar HP) or A4 layout
  const handleSavePdf = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);

    let clone = null;
    try {
      const original = reportRef.current;
      const safeLabel = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
      const isMobileFormat = reportFormat === 'mobile';
      const filename = `Laporan_Transaksi_PUKO_${isMobileFormat ? 'Mobile_' : ''}${safeLabel}.pdf`;

      // If mobile format: target width is 420px (~108mm, perfect for phone screens)
      // If A4 format: target width is 794px (210mm A4 standard)
      const targetWidthPx = isMobileFormat ? 420 : 794;
      const targetWidthMm = isMobileFormat ? 108 : 210;

      // Create an off-screen clone with exact printable styling
      clone = original.cloneNode(true);
      clone.id = 'report-pdf-clone';
      clone.style.width = `${targetWidthPx}px`;
      clone.style.minWidth = `${targetWidthPx}px`;
      clone.style.maxWidth = `${targetWidthPx}px`;
      clone.style.margin = '0';
      clone.style.padding = isMobileFormat ? '14px 14px' : '24px 28px';
      clone.style.borderRadius = '0';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.zIndex = '-9999';

      // Avoid table rows being sliced across page breaks
      const rows = clone.querySelectorAll('tr');
      rows.forEach((row) => {
        row.style.pageBreakInside = 'avoid';
        row.style.breakInside = 'avoid';
      });

      document.body.appendChild(clone);

      const renderedWidth = clone.offsetWidth || targetWidthPx;
      const renderedHeight = clone.offsetHeight || 600;

      let opt;
      if (isMobileFormat) {
        // Continuous single-page height calibrated to 108mm width (+ 4mm bottom buffer)
        const targetHeightMm = Math.ceil((renderedHeight / renderedWidth) * targetWidthMm) + 4;
        opt = {
          margin: [3, 2, 3, 2],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: targetWidthPx,
            windowWidth: targetWidthPx,
            scrollX: 0,
            scrollY: 0,
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
            width: targetWidthPx,
            windowWidth: targetWidthPx,
            scrollX: 0,
            scrollY: 0,
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

      await html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Terjadi kesalahan saat generate PDF. Membuka dialog print browser...');
      window.print();
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
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
                        display: 'inline-block',
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontWeight: '800',
                        fontSize: reportFormat === 'mobile' ? '10px' : '11px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Laporan Penjualan & Keuangan
                    </div>
                    <div
                      style={{
                        display: reportFormat === 'mobile' ? 'flex' : 'block',
                        justifyContent: 'space-between',
                        marginTop: '4px',
                        fontSize: '9.5px',
                        color: '#475569',
                      }}
                    >
                      <span>
                        <strong>Cetak:</strong> {formatDate(new Date())}
                      </span>
                      <span>
                        Kasir: {settings?.cashierName || 'Kasir 01'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter Filter Bar */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: reportFormat === 'mobile' ? '7px 10px' : '10px 14px',
                  marginBottom: reportFormat === 'mobile' ? '12px' : '16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: reportFormat === 'mobile' ? '9px' : '10.5px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontWeight: '700' }}>PERIODE: </span>
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>{periodLabel}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: '700' }}>METODE: </span>
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>
                    {selectedMethod === 'ALL' ? 'Semua' : selectedMethod}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: '700' }}>TOTAL: </span>
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>
                    {filteredTransactions.length} Transaksi
                  </span>
                </div>
              </div>

              {/* 6 KPI Ringkasan Keuangan (Monokrom Hitam, Merah untuk Pengeluaran, Hijau untuk Pendapatan Bersih) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    reportFormat === 'mobile' ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
                  gap: '6px',
                  marginBottom: reportFormat === 'mobile' ? '14px' : '20px',
                }}
              >
                {/* 1. Total Omzet */}
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 7px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#475569',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Omzet
                  </div>
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '11px' : '12px',
                      fontWeight: '900',
                      color: '#0f172a',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatIDR(summary.totalOmzet)}
                  </div>
                </div>

                {/* 2. Tunai */}
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 7px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#475569',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Tunai
                  </div>
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '11px' : '12px',
                      fontWeight: '900',
                      color: '#0f172a',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatIDR(summary.totalTunai)}
                  </div>
                </div>

                {/* 3. QRIS */}
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 7px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#475569',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    QRIS
                  </div>
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '11px' : '12px',
                      fontWeight: '900',
                      color: '#0f172a',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatIDR(summary.totalQris)}
                  </div>
                </div>

                {/* 4. Total Cup */}
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 7px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#475569',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Cup
                  </div>
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '11px' : '12px',
                      fontWeight: '900',
                      color: '#0f172a',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {summary.totalCup} Cup
                  </div>
                </div>

                {/* 5. Pengeluaran (WARNA MERAH AGAR KELIHATAN JELAS) */}
                <div
                  style={{
                    border: '1.5px solid #ef4444',
                    borderRadius: '6px',
                    padding: '6px 7px',
                    backgroundColor: '#fef2f2',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#dc2626',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Pengeluaran
                  </div>
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '11px' : '12px',
                      fontWeight: '900',
                      color: '#dc2626',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatIDR(totalPengeluaran)}
                  </div>
                </div>

                {/* 6. Pendapatan Bersih (WARNA HIJAU AGAR KELIHATAN JELAS) */}
                <div
                  style={{
                    border: '1.5px solid #16a34a',
                    borderRadius: '6px',
                    padding: '6px 7px',
                    backgroundColor: '#f0fdf4',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#15803d',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Pendapatan Bersih
                  </div>
                  <div
                    style={{
                      fontSize: reportFormat === 'mobile' ? '11px' : '12px',
                      fontWeight: '900',
                      color: '#15803d',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatIDR(totalPendapatanBersih)}
                  </div>
                </div>
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
                    fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                    tableLayout: 'fixed',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f1f5f9',
                        borderTop: '2px solid #0f172a',
                        borderBottom: '2px solid #0f172a',
                        textAlign: 'left',
                        color: '#0f172a',
                      }}
                    >
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 3px' : '8px 6px',
                          width: reportFormat === 'mobile' ? '18px' : '28px',
                          textAlign: 'center',
                          fontWeight: '800',
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 3px' : '8px 6px',
                          width: reportFormat === 'mobile' ? '70px' : '130px',
                          fontWeight: '800',
                        }}
                      >
                        No. Struk
                      </th>
                      {reportFormat === 'a4' && (
                        <th style={{ padding: '8px 6px', width: '95px', fontWeight: '800' }}>
                          Waktu
                        </th>
                      )}
                      {reportFormat === 'a4' && (
                        <th style={{ padding: '8px 6px', width: '100px', fontWeight: '800' }}>
                          Pelanggan
                        </th>
                      )}
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 4px' : '8px 6px',
                          fontWeight: '800',
                        }}
                      >
                        {reportFormat === 'mobile' ? 'Pesanan & Pelanggan' : 'Detail Pesanan'}
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 2px' : '8px 6px',
                          width: reportFormat === 'mobile' ? '42px' : '65px',
                          textAlign: 'center',
                          fontWeight: '800',
                        }}
                      >
                        Metode
                      </th>
                      <th
                        style={{
                          padding: reportFormat === 'mobile' ? '5px 3px' : '8px 6px',
                          width: reportFormat === 'mobile' ? '68px' : '85px',
                          textAlign: 'right',
                          fontWeight: '800',
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
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor:
                            idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontWeight: '600',
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: '#0f172a',
                            fontSize: reportFormat === 'mobile' ? '8px' : '10px',
                            wordBreak: 'break-all',
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
                          <td style={{ padding: '6px', color: '#475569' }}>
                            {formatDate(tx.timestamp)}
                          </td>
                        )}
                        {reportFormat === 'a4' && (
                          <td style={{ padding: '6px', color: '#0f172a' }}>
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
                            <div key={i} style={{ lineHeight: '1.25' }}>
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
                          }}
                        >
                          <span
                            style={{
                              padding: '1px 4px',
                              borderRadius: '4px',
                              fontSize: reportFormat === 'mobile' ? '7.5px' : '9px',
                              fontWeight: '700',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                            }}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                            textAlign: 'right',
                            fontWeight: '800',
                            color: '#0f172a',
                            fontSize: reportFormat === 'mobile' ? '9px' : '10px',
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
                        borderTop: '2px solid #0f172a',
                        borderBottom: '2px solid #0f172a',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <td
                        colSpan={reportFormat === 'mobile' ? 4 : 6}
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 4px' : '8px 6px',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '9.5px' : '11px',
                          color: '#0f172a',
                        }}
                      >
                        TOTAL OMZET:
                      </td>
                      <td
                        style={{
                          padding: reportFormat === 'mobile' ? '6px 4px' : '8px 6px',
                          fontWeight: '900',
                          textAlign: 'right',
                          fontSize: reportFormat === 'mobile' ? '10px' : '12px',
                          color: '#0f172a',
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
                      fontSize: reportFormat === 'mobile' ? '9px' : '10px',
                      tableLayout: 'fixed',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#f1f5f9',
                          borderTop: '2px solid #0f172a',
                          borderBottom: '2px solid #0f172a',
                          textAlign: 'left',
                          color: '#0f172a',
                        }}
                      >
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '7px 6px',
                            width: reportFormat === 'mobile' ? '18px' : '28px',
                            textAlign: 'center',
                            fontWeight: '800',
                          }}
                        >
                          No
                        </th>
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '7px 6px',
                            width: reportFormat === 'mobile' ? '65px' : '130px',
                            fontWeight: '800',
                          }}
                        >
                          Waktu
                        </th>
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 4px' : '7px 6px',
                            fontWeight: '800',
                          }}
                        >
                          Keterangan / Keperluan
                        </th>
                        {reportFormat === 'a4' && (
                          <th style={{ padding: '7px 6px', width: '90px', fontWeight: '800' }}>
                            Dicatat Oleh
                          </th>
                        )}
                        <th
                          style={{
                            padding: reportFormat === 'mobile' ? '5px 3px' : '7px 6px',
                            width: reportFormat === 'mobile' ? '72px' : '100px',
                            textAlign: 'right',
                            fontWeight: '800',
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
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor:
                              idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          }}
                        >
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                              textAlign: 'center',
                              color: '#64748b',
                              fontWeight: '600',
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                              color: '#475569',
                              fontSize: reportFormat === 'mobile' ? '8px' : '9.5px',
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
                            <td style={{ padding: '6px', color: '#475569' }}>
                              {exp.user || 'Kasir'}
                            </td>
                          )}
                          <td
                            style={{
                              padding: reportFormat === 'mobile' ? '5px 3px' : '6px',
                              textAlign: 'right',
                              fontWeight: '800',
                              color: '#dc2626',
                              fontSize: reportFormat === 'mobile' ? '9px' : '10px',
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
                          borderTop: '2px solid #0f172a',
                          borderBottom: '2px solid #0f172a',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <td
                          colSpan={reportFormat === 'mobile' ? 3 : 4}
                          style={{
                            padding: reportFormat === 'mobile' ? '6px 4px' : '7px 6px',
                            fontWeight: '800',
                            textAlign: 'right',
                            fontSize: reportFormat === 'mobile' ? '9.5px' : '11px',
                            color: '#0f172a',
                          }}
                        >
                          TOTAL PENGELUARAN:
                        </td>
                        <td
                          style={{
                            padding: reportFormat === 'mobile' ? '6px 4px' : '7px 6px',
                            fontWeight: '900',
                            textAlign: 'right',
                            fontSize: reportFormat === 'mobile' ? '10px' : '12px',
                            color: '#dc2626',
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

              {/* Kotak Rekapitulasi Keuangan Bersih (Struktur Jelas & Rapi) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #0f172a',
                  borderRadius: '6px',
                  padding: reportFormat === 'mobile' ? '10px 12px' : '12px 16px',
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 0',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      fontSize: reportFormat === 'mobile' ? '9.5px' : '11px',
                      color: '#0f172a',
                      fontWeight: '700',
                    }}
                  >
                    1. Total Omzet Penjualan (Kotor)
                  </span>
                  <span
                    style={{
                      fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                      color: '#0f172a',
                      fontWeight: '800',
                    }}
                  >
                    {formatIDR(summary.totalOmzet)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 0',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      fontSize: reportFormat === 'mobile' ? '9.5px' : '11px',
                      color: '#dc2626',
                      fontWeight: '700',
                    }}
                  >
                    2. Total Pengeluaran / Biaya
                  </span>
                  <span
                    style={{
                      fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                      color: '#dc2626',
                      fontWeight: '800',
                    }}
                  >
                    - {formatIDR(totalPengeluaran)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0 2px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: reportFormat === 'mobile' ? '10.5px' : '12px',
                      color: '#15803d',
                      fontWeight: '900',
                    }}
                  >
                    3. TOTAL PENDAPATAN BERSIH
                  </span>
                  <span
                    style={{
                      fontSize: reportFormat === 'mobile' ? '12px' : '14px',
                      color: '#15803d',
                      fontWeight: '900',
                    }}
                  >
                    = {formatIDR(totalPendapatanBersih)}
                  </span>
                </div>
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

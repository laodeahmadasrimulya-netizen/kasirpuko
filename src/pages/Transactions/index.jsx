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
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useTransactions } from '../../context/TransactionContext';
import { useSettings } from '../../context/SettingsContext';
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

  // Download PDF using html2pdf.js with standard A4 off-screen clone
  const handleSavePdf = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);

    let clone = null;
    try {
      const original = reportRef.current;
      const safeLabel = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Laporan_Transaksi_PUKO_${safeLabel}.pdf`;

      // Standard A4 width in px (at 96 DPI, 210mm = ~794px)
      const targetA4WidthPx = 794;

      // Create an off-screen clone with exact A4 printable styling
      clone = original.cloneNode(true);
      clone.id = 'report-pdf-clone';
      clone.style.width = `${targetA4WidthPx}px`;
      clone.style.minWidth = `${targetA4WidthPx}px`;
      clone.style.maxWidth = `${targetA4WidthPx}px`;
      clone.style.margin = '0';
      clone.style.padding = '24px 28px';
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

      const opt = {
        margin: [8, 6, 8, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: targetA4WidthPx,
          windowWidth: targetA4WidthPx,
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          {/* Action Header Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-100 rounded-2xl">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-800">
                {filteredTransactions.length} Transaksi Terfilter
              </span>{' '}
              • {periodLabel}
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
                {isExportingPdf ? 'Sedang Mengunduh...' : 'Download File PDF'}
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

          {/* Printable Sheet View (Visible to ensure html2canvas rasterizes all elements with 100% precision) */}
          <div className="overflow-x-auto bg-slate-200/60 p-3 sm:p-6 rounded-2xl flex justify-center">
            <div
              id="printable-report"
              ref={reportRef}
              style={{
                width: '100%',
                maxWidth: '750px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '32px',
                fontFamily:
                  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '11px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Header Dokumen Laporan */}
              <div
                style={{
                  borderBottom: '2.5px solid #15803d',
                  paddingBottom: '16px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: '22px',
                        fontWeight: '800',
                        color: '#15803d',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      🥑 {settings?.storeName || 'PUKO POS'}
                    </h1>
                    <p
                      style={{
                        margin: '3px 0 0 0',
                        fontSize: '11px',
                        color: '#475569',
                        fontWeight: '700',
                      }}
                    >
                      {settings?.tagline || 'Alpukat Kocok No Serat No Pahit'}
                    </p>
                    <p
                      style={{
                        margin: '2px 0 0 0',
                        fontSize: '10px',
                        color: '#64748b',
                      }}
                    >
                      {settings?.branch || 'Outlet Kendari'} •{' '}
                      {settings?.address || 'Kendari, Sulawesi Tenggara'}
                    </p>
                    <p
                      style={{
                        margin: '1px 0 0 0',
                        fontSize: '10px',
                        color: '#64748b',
                      }}
                    >
                      Telp: {settings?.phone || '-'}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontWeight: '800',
                        fontSize: '11px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      Laporan Penjualan Kasir
                    </div>
                    <p
                      style={{
                        margin: '6px 0 0 0',
                        fontSize: '10px',
                        color: '#475569',
                      }}
                    >
                      <strong>Tanggal Cetak:</strong> {formatDate(new Date())}
                    </p>
                    <p
                      style={{
                        margin: '2px 0 0 0',
                        fontSize: '10px',
                        color: '#64748b',
                      }}
                    >
                      Kasir: {settings?.cashierName || 'Kasir 01'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parameter Filter Bar */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#64748b',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    Periode Laporan:{' '}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#0f172a',
                      fontWeight: '800',
                    }}
                  >
                    {periodLabel}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#64748b',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    Metode Bayar:{' '}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#0f172a',
                      fontWeight: '800',
                    }}
                  >
                    {selectedMethod === 'ALL' ? 'Semua Metode' : selectedMethod}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#64748b',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Data:{' '}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#15803d',
                      fontWeight: '800',
                    }}
                  >
                    {filteredTransactions.length} Transaksi
                  </span>
                </div>
              </div>

              {/* 4 KPI Ringkasan Keuangan */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '10px',
                    backgroundColor: '#f0fdf4',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#166534',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Omzet Bersih
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#14532d',
                      marginTop: '3px',
                    }}
                  >
                    {formatIDR(summary.totalOmzet)}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '10px',
                    backgroundColor: '#fffbeb',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#92400e',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Pembayaran Tunai
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#78350f',
                      marginTop: '3px',
                    }}
                  >
                    {formatIDR(summary.totalTunai)}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    padding: '10px',
                    backgroundColor: '#f0f9ff',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#075985',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Pembayaran QRIS
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#0c4a6e',
                      marginTop: '3px',
                    }}
                  >
                    {formatIDR(summary.totalQris)}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid #e9d5ff',
                    borderRadius: '8px',
                    padding: '10px',
                    backgroundColor: '#faf5ff',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#6b21a8',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Cup Terjual
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#581c87',
                      marginTop: '3px',
                    }}
                  >
                    {summary.totalCup} Cup
                  </div>
                </div>
              </div>

              {/* Tabel Lengkap Rincian Transaksi */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#0f172a',
                    marginBottom: '8px',
                  }}
                >
                  Daftar Rincian Transaksi:
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '10px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f1f5f9',
                        borderTop: '1px solid #cbd5e1',
                        borderBottom: '2px solid #cbd5e1',
                        textAlign: 'left',
                      }}
                    >
                      <th
                        style={{
                          padding: '8px 6px',
                          width: '28px',
                          textAlign: 'center',
                        }}
                      >
                        No
                      </th>
                      <th style={{ padding: '8px 6px', width: '130px' }}>
                        No. Struk
                      </th>
                      <th style={{ padding: '8px 6px', width: '95px' }}>
                        Waktu
                      </th>
                      <th style={{ padding: '8px 6px', width: '100px' }}>
                        Pelanggan
                      </th>
                      <th style={{ padding: '8px 6px' }}>Detail Pesanan</th>
                      <th
                        style={{
                          padding: '8px 6px',
                          width: '65px',
                          textAlign: 'center',
                        }}
                      >
                        Metode
                      </th>
                      <th
                        style={{
                          padding: '8px 6px',
                          width: '85px',
                          textAlign: 'right',
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
                            padding: '6px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontWeight: '600',
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: '#1e293b',
                          }}
                        >
                          {tx.id}
                        </td>
                        <td style={{ padding: '6px', color: '#475569' }}>
                          {formatDate(tx.timestamp)}
                        </td>
                        <td style={{ padding: '6px', color: '#1e293b' }}>
                          <div style={{ fontWeight: '700' }}>
                            {tx.customerName || 'Pelanggan Umum'}
                          </div>
                          <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                            {tx.cashierName}
                          </div>
                        </td>
                        <td style={{ padding: '6px', color: '#334155' }}>
                          {tx.items?.map((item, i) => (
                            <div key={i} style={{ lineHeight: '1.3' }}>
                              <span style={{ fontWeight: '700' }}>
                                {item.qty}x
                              </span>{' '}
                              {item.name || item.nama}
                              {item.notes ? (
                                <span
                                  style={{
                                    color: '#94a3b8',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  {' '}
                                  ({item.notes})
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              fontWeight: '700',
                              backgroundColor:
                                tx.paymentMethod === 'QRIS'
                                  ? '#dbeafe'
                                  : tx.paymentMethod === 'TUNAI'
                                  ? '#dcfce7'
                                  : '#e0e7ff',
                              color:
                                tx.paymentMethod === 'QRIS'
                                  ? '#1e40af'
                                  : tx.paymentMethod === 'TUNAI'
                                  ? '#166534'
                                  : '#3730a3',
                            }}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            textAlign: 'right',
                            fontWeight: '800',
                            color: '#0f172a',
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
                        colSpan={6}
                        style={{
                          padding: '8px 6px',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: '11px',
                        }}
                      >
                        GRAND TOTAL PENJUALAN:
                      </td>
                      <td
                        style={{
                          padding: '8px 6px',
                          fontWeight: '800',
                          textAlign: 'right',
                          fontSize: '12px',
                          color: '#15803d',
                        }}
                      >
                        {formatIDR(summary.totalOmzet)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Rincian Porsi Menu Terjual pada Periode Tersebut */}
              {menuBreakdown.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '24px',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🥑 Rincian Menu & Porsi Terjual:</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '6px 16px',
                      fontSize: '10px',
                    }}
                  >
                    {menuBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderBottom: '1px dashed #e2e8f0',
                          paddingBottom: '3px',
                        }}
                      >
                        <span style={{ color: '#334155', fontWeight: '600' }}>
                          {item.name}
                        </span>
                        <span>
                          <strong style={{ color: '#0f172a' }}>
                            {item.qty} Cup
                          </strong>{' '}
                          <span style={{ color: '#64748b' }}>
                            ({formatIDR(item.revenue)})
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kolom Tanda Tangan Pengesahan */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '32px',
                  padding: '0 24px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '10px',
                      color: '#475569',
                      fontWeight: '600',
                    }}
                  >
                    Dibuat Oleh (Kasir / Petugas),
                  </p>
                  <div style={{ height: '55px' }}></div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      fontWeight: '800',
                      borderTop: '1px solid #64748b',
                      paddingTop: '4px',
                      color: '#0f172a',
                    }}
                  >
                    {settings?.cashierName || 'Kasir PUKO'}
                  </p>
                </div>

                <div style={{ textAlign: 'center', width: '200px' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '10px',
                      color: '#475569',
                      fontWeight: '600',
                    }}
                  >
                    Disetujui Oleh (Owner / SPV),
                  </p>
                  <div style={{ height: '55px' }}></div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      fontWeight: '800',
                      borderTop: '1px solid #64748b',
                      paddingTop: '4px',
                      color: '#0f172a',
                    }}
                  >
                    ( ..................................... )
                  </p>
                </div>
              </div>

              {/* Footer Keterangan Sistem */}
              <div
                style={{
                  marginTop: '24px',
                  textAlign: 'center',
                  fontSize: '9px',
                  color: '#94a3b8',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '8px',
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

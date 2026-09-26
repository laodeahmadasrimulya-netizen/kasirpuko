import XLSX from 'xlsx-js-style';
import { formatDate } from './date';
import { countCups } from './productUtils';

// =========================================================================
// DEFINISI PALET WARNA & STYLE EXCEL RESMI PUKO
// =========================================================================

// Border styles
const borderThin = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const borderDoubleBottomGreen = {
  top: { style: 'thin', color: { rgb: '86EFAC' } },
  bottom: { style: 'double', color: { rgb: '15803D' } },
  left: { style: 'thin', color: { rgb: '86EFAC' } },
  right: { style: 'thin', color: { rgb: '86EFAC' } },
};

const borderDoubleBottomRed = {
  top: { style: 'thin', color: { rgb: 'FCA5A5' } },
  bottom: { style: 'double', color: { rgb: 'B91C1C' } },
  left: { style: 'thin', color: { rgb: 'FCA5A5' } },
  right: { style: 'thin', color: { rgb: 'FCA5A5' } },
};

const styles = {
  // Banner Judul Dokumen (HIJAU PUKO)
  docTitleGreen: {
    font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '15803D' } }, // Emerald Green
    alignment: { horizontal: 'center', vertical: 'center' },
  },

  // Banner Judul Dokumen Pengeluaran (MERAH)
  docTitleRed: {
    font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'B91C1C' } }, // Crimson Red
    alignment: { horizontal: 'center', vertical: 'center' },
  },

  // Subtitle / Info Outlet
  subtitle: {
    font: { name: 'Calibri', sz: 9.5, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },

  // Header Bagian / Section Header (HIJAU TUA)
  sectionHeaderGreen: {
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '166534' } }, // Dark Forest Green
    alignment: { horizontal: 'left', vertical: 'center' },
  },

  // Header Bagian Pengeluaran (MERAH TUA)
  sectionHeaderRed: {
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '991B1B' } }, // Dark Red
    alignment: { horizontal: 'left', vertical: 'center' },
  },

  // Header Kolom Tabel (HIJAU MUDA SEGAR)
  tableHeaderGreen: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '14532D' } },
    fill: { fgColor: { rgb: 'DCFCE7' } }, // Mint Green
    border: borderThin,
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  },

  // Header Kolom Tabel Pengeluaran (MERAH MUDA)
  tableHeaderRed: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '991B1B' } },
    fill: { fgColor: { rgb: 'FEE2E2' } }, // Soft Red
    border: borderThin,
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  },

  // POIN PENTING: Pendapatan Bersih (HIJAU SEGAR)
  netIncomeRow: (align = 'left') => ({
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '14532D' } },
    fill: { fgColor: { rgb: 'BBF7D0' } }, // Light Green
    border: borderDoubleBottomGreen,
    alignment: { horizontal: align, vertical: 'center' },
  }),

  // POIN PENTING: Total Pengeluaran (MERAH MUDA)
  expenseHighlightRow: (align = 'left') => ({
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'B91C1C' } },
    fill: { fgColor: { rgb: 'FEE2E2' } }, // Light Red
    border: borderThin,
    alignment: { horizontal: align, vertical: 'center' },
  }),

  // Omzet Penjualan (Aksen Hijau Lembut)
  omzetHighlightRow: (align = 'left') => ({
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '047857' } },
    fill: { fgColor: { rgb: 'F0FDF4' } },
    border: borderThin,
    alignment: { horizontal: align, vertical: 'center' },
  }),

  // Baris Total Tabel Hijau
  totalRowGreen: (align = 'left') => ({
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '14532D' } },
    fill: { fgColor: { rgb: 'DCFCE7' } },
    border: borderDoubleBottomGreen,
    alignment: { horizontal: align, vertical: 'center' },
  }),

  // Baris Total Tabel Merah
  totalRowRed: (align = 'left') => ({
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'B91C1C' } },
    fill: { fgColor: { rgb: 'FEE2E2' } },
    border: borderDoubleBottomRed,
    alignment: { horizontal: align, vertical: 'center' },
  }),

  // Sel Normal
  cellLeft: {
    font: { name: 'Calibri', sz: 9.5, color: { rgb: '0F172A' } },
    border: borderThin,
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  cellCenter: {
    font: { name: 'Calibri', sz: 9.5, color: { rgb: '0F172A' } },
    border: borderThin,
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  cellRight: {
    font: { name: 'Calibri', sz: 9.5, color: { rgb: '0F172A' } },
    border: borderThin,
    alignment: { horizontal: 'right', vertical: 'center' },
  },
  cellRightBold: {
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0F172A' } },
    border: borderThin,
    alignment: { horizontal: 'right', vertical: 'center' },
  },
  cellCenterBold: {
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0F172A' } },
    border: borderThin,
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  cellRed: {
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: 'DC2626' } },
    border: borderThin,
    alignment: { horizontal: 'right', vertical: 'center' },
  },
  infoLabel: {
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    border: borderThin,
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  infoValue: {
    font: { name: 'Calibri', sz: 9.5, color: { rgb: '0F172A' } },
    border: borderThin,
    alignment: { horizontal: 'left', vertical: 'center' },
  },
};

// Helper untuk menyematkan style ke sel
const applyStyle = (ws, r, c, style) => {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (!ws[addr]) {
    ws[addr] = { t: 's', v: '' };
  }
  ws[addr].s = style;
};

// Helper untuk menyematkan style ke satu rentang baris
const styleRow = (ws, r, startCol, endCol, styleOrFn) => {
  for (let c = startCol; c <= endCol; c++) {
    const s = typeof styleOrFn === 'function' ? styleOrFn(c) : styleOrFn;
    applyStyle(ws, r, c, s);
  }
};

/**
 * Ekspor data transaksi dan operasional kasir ke file Excel (.xlsx) resmi dengan tabel rapi dan pewarnaan poin penting
 * - Judul & Kolom Utama: Berwarna Hijau
 * - Pendapatan Bersih: Berwarna Hijau PUKO
 * - Pengeluaran Toko: Berwarna Merah
 */
export const exportTransactionsToExcel = (
  transactionsOrOptions,
  periodLabelParam = '',
  summaryParam = null,
  extraOptions = {}
) => {
  let transactions = [];
  let periodLabel = '';
  let summary = null;
  let menuBreakdown = [];
  let ingredientUsageList = [];
  let expenses = [];
  let totalPengeluaran = 0;
  let totalPendapatanBersih = 0;
  let storeSettings = {};
  let printedBy = 'Kasir';

  // Support both object arguments & positional arguments
  if (Array.isArray(transactionsOrOptions)) {
    transactions = transactionsOrOptions;
    periodLabel = periodLabelParam;
    summary = summaryParam;
    menuBreakdown = extraOptions.menuBreakdown || [];
    ingredientUsageList = extraOptions.ingredientUsageList || [];
    expenses = extraOptions.expenses || [];
    totalPengeluaran = extraOptions.totalPengeluaran || 0;
    totalPendapatanBersih = extraOptions.totalPendapatanBersih || 0;
    storeSettings = extraOptions.storeSettings || {};
    printedBy = extraOptions.printedBy || 'Kasir';
  } else if (transactionsOrOptions && typeof transactionsOrOptions === 'object') {
    transactions = transactionsOrOptions.transactions || [];
    periodLabel = transactionsOrOptions.periodLabel || '';
    summary = transactionsOrOptions.summary || null;
    menuBreakdown = transactionsOrOptions.menuBreakdown || [];
    ingredientUsageList = transactionsOrOptions.ingredientUsageList || [];
    expenses = transactionsOrOptions.expenses || [];
    totalPengeluaran = transactionsOrOptions.totalPengeluaran || 0;
    totalPendapatanBersih = transactionsOrOptions.totalPendapatanBersih || 0;
    storeSettings = transactionsOrOptions.storeSettings || {};
    printedBy = transactionsOrOptions.printedBy || 'Kasir';
  }

  if (!transactions || transactions.length === 0) {
    alert('Tidak ada transaksi untuk diekspor ke Excel.');
    return;
  }

  // 1. Akumulasi & fallback perhitungan data
  const totalOmzet =
    summary?.totalOmzet ?? transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  const totalCups =
    summary?.totalCup ?? transactions.reduce((sum, tx) => sum + countCups(tx.items), 0);
  const totalCash =
    summary?.totalCash ??
    transactions
      .filter((tx) => (tx.paymentMethod || 'TUNAI').toUpperCase() === 'TUNAI')
      .reduce((sum, tx) => sum + (tx.total || 0), 0);
  const totalQris =
    summary?.totalQris ??
    transactions
      .filter((tx) => (tx.paymentMethod || '').toUpperCase() === 'QRIS')
      .reduce((sum, tx) => sum + (tx.total || 0), 0);
  const totalTransfer =
    summary?.totalTransfer ??
    transactions
      .filter((tx) => (tx.paymentMethod || '').toUpperCase() === 'TRANSFER')
      .reduce((sum, tx) => sum + (tx.total || 0), 0);

  // Jika menuBreakdown kosong, hitung otomatis dari transaksi
  if (!menuBreakdown || menuBreakdown.length === 0) {
    const map = {};
    transactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        const name = item.nama || item.name;
        if (!name) return;
        if (!map[name]) {
          map[name] = { name, qty: 0, revenue: 0 };
        }
        map[name].qty += Number(item.qty) || 1;
        map[name].revenue +=
          Number(item.subtotal) || (Number(item.harga || item.price) || 0) * (Number(item.qty) || 1);
      });
    });
    menuBreakdown = Object.values(map).sort((a, b) => b.qty - a.qty);
  }

  // Jika totalPengeluaran belum dihitung tetapi ada data expenses
  if (totalPengeluaran === 0 && expenses && expenses.length > 0) {
    totalPengeluaran = expenses.reduce(
      (sum, exp) => sum + (Number(exp.amount) || 0),
      0
    );
  }
  if (!totalPendapatanBersih) {
    totalPendapatanBersih = totalOmzet - totalPengeluaran;
  }

  const exportTimestamp = formatDate(new Date());
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const cleanPeriod = (periodLabel || 'Semua').replace(/[^a-zA-Z0-9]/g, '_');

  // Inisialisasi Workbook
  const wb = XLSX.utils.book_new();

  // =========================================================================
  // SHEET 1: RINGKASAN LAPORAN (FINANSIAL, MENU, BAHAN BAKU & PENGELUARAN)
  // =========================================================================
  const ringkasanData = [];
  const merges1 = [];

  // Row 0: Title banner (HIJAU)
  ringkasanData.push(['LAPORAN PENJUALAN & KEUANGAN PUKO', '', '', '', '', '']);
  merges1.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  // Row 1: Subtitle
  const subtitleStore = storeSettings.storeName
    ? `${storeSettings.storeName} - ${storeSettings.tagline || 'Alpukat Kocok No Serat No Pahit'}`
    : 'PUKO - Alpukat Kocok No Serat No Pahit';
  ringkasanData.push([subtitleStore, '', '', '', '', '']);
  merges1.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

  // Row 2: Outlet Info
  const outletInfo = [
    storeSettings.branch || 'Outlet Kendari',
    storeSettings.address || 'Kendari, Sulawesi Tenggara',
    storeSettings.phone ? `Telp: ${storeSettings.phone}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
  ringkasanData.push([outletInfo, '', '', '', '', '']);
  merges1.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } });

  // Row 3: Blank
  ringkasanData.push([]);

  // Row 4: Parameter Header
  ringkasanData.push(['PARAMETER & INFORMASI LAPORAN', '', '', '', '', '']);
  merges1.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });

  // Rows 5-8: Parameter Values
  ringkasanData.push(['Periode Laporan', periodLabel || 'Semua Waktu', '', '', '', '']);
  ringkasanData.push(['Tanggal & Waktu Ekspor', `${exportTimestamp} WITA`, '', '', '', '']);
  ringkasanData.push(['Petugas / Kasir', printedBy || 'Kasir', '', '', '', '']);
  ringkasanData.push(['Total Transaksi Selesai', `${transactions.length} Transaksi`, '', '', '', '']);

  // Row 9: Blank
  ringkasanData.push([]);

  // Section 1 Header (HIJAU TUA)
  const sec1HeaderRow = ringkasanData.length;
  ringkasanData.push(['1. RINGKASAN KEUANGAN & OPERASIONAL TOKO', '', '', '', '', '']);
  merges1.push({ s: { r: sec1HeaderRow, c: 0 }, e: { r: sec1HeaderRow, c: 2 } });

  // Section 1 Table Headers (HIJAU MUDA)
  const sec1TableHeadRow = ringkasanData.length;
  ringkasanData.push(['No', 'Indikator Keuangan / Uraian', 'Jumlah / Nominal', '', '', '']);

  // Financial KPI rows
  const finRows = [
    { no: 1, label: 'Total Omzet Penjualan (Kotor)', val: totalOmzet, type: 'omzet' },
    { no: 2, label: '- Pembayaran Tunai (Cash)', val: totalCash, type: 'normal' },
    { no: 3, label: '- Pembayaran Non-Tunai (QRIS)', val: totalQris, type: 'normal' },
  ];
  if (totalTransfer > 0) {
    finRows.push({
      no: finRows.length + 1,
      label: '- Pembayaran Transfer Bank',
      val: totalTransfer,
      type: 'normal',
    });
  }
  finRows.push({
    no: finRows.length + 1,
    label: 'Total Cup Minuman Terjual',
    val: `${totalCups} Cup`,
    type: 'text',
  });
  finRows.push({
    no: finRows.length + 1,
    label: 'Rata-rata Penjualan per Transaksi (AOV)',
    val: transactions.length > 0 ? Math.round(totalOmzet / transactions.length) : 0,
    type: 'normal',
  });
  finRows.push({
    no: finRows.length + 1,
    label: 'Total Pengeluaran Toko',
    val: totalPengeluaran,
    type: 'expense', // WARNA MERAH
  });
  finRows.push({
    no: finRows.length + 1,
    label: 'PENDAPATAN BERSIH (Omzet - Pengeluaran)',
    val: totalPendapatanBersih,
    type: 'netIncome', // WARNA HIJAU
  });

  const finStartRow = ringkasanData.length;
  finRows.forEach((item) => {
    ringkasanData.push([item.no, item.label, item.val, '', '', '']);
  });

  // Section 2: Penjualan per Menu
  ringkasanData.push([]);
  const sec2HeaderRow = ringkasanData.length;
  ringkasanData.push(['2. RINCIAN PENJUALAN PER MENU MINUMAN', '', '', '', '', '']);
  merges1.push({ s: { r: sec2HeaderRow, c: 0 }, e: { r: sec2HeaderRow, c: 4 } });

  const sec2TableHeadRow = ringkasanData.length;
  ringkasanData.push([
    'No',
    'Nama Menu Produk',
    'Qty Terjual (Cup)',
    'Total Penjualan (Rp)',
    'Kontribusi Omzet (%)',
    '',
  ]);

  const menuStartRow = ringkasanData.length;
  menuBreakdown.forEach((m, idx) => {
    const pct = totalOmzet > 0 ? `${((m.revenue / totalOmzet) * 100).toFixed(1)}%` : '0%';
    ringkasanData.push([idx + 1, m.name, m.qty, m.revenue, pct, '']);
  });
  const menuTotalRow = ringkasanData.length;
  ringkasanData.push([
    '',
    'TOTAL PENJUALAN MENU',
    menuBreakdown.reduce((sum, m) => sum + (m.qty || 0), 0),
    menuBreakdown.reduce((sum, m) => sum + (m.revenue || 0), 0),
    '100.0%',
    '',
  ]);

  // Section 3: Pemakaian Bahan Baku
  let ingStartRow = null;
  let ingTableHeadRow = null;
  let ingCount = 0;
  if (ingredientUsageList && ingredientUsageList.length > 0) {
    ringkasanData.push([]);
    const sec3HeaderRow = ringkasanData.length;
    ringkasanData.push(['3. ESTIMASI PEMAKAIAN BAHAN BAKU (STOK)', '', '', '', '', '']);
    merges1.push({ s: { r: sec3HeaderRow, c: 0 }, e: { r: sec3HeaderRow, c: 5 } });

    ingTableHeadRow = ringkasanData.length;
    ringkasanData.push([
      'No',
      'Nama Bahan Baku',
      'Kategori',
      'Porsi per Cup',
      'Estimasi Total Terpakai',
      'Sisa Stok di Sistem',
    ]);
    ingStartRow = ringkasanData.length;
    ingCount = ingredientUsageList.length;
    ingredientUsageList.forEach((ing, idx) => {
      ringkasanData.push([
        idx + 1,
        ing.name,
        ing.category || 'Bahan Baku',
        ing.portionLabel || '-',
        ing.usedLabel || '0',
        ing.currentStockDisplay || '-',
      ]);
    });
  }

  // Section 4: Ringkasan Pengeluaran
  let expStartRow = null;
  let expTableHeadRow = null;
  let expTotalRow = null;
  let expCount = 0;
  if (expenses && expenses.length > 0) {
    ringkasanData.push([]);
    const sec4HeaderRow = ringkasanData.length;
    ringkasanData.push(['4. RINCIAN PENGELUARAN TOKO', '', '', '', '', '']);
    merges1.push({ s: { r: sec4HeaderRow, c: 0 }, e: { r: sec4HeaderRow, c: 5 } });

    expTableHeadRow = ringkasanData.length;
    ringkasanData.push([
      'No',
      'Tanggal & Waktu',
      'Kategori',
      'Keterangan / Keperluan',
      'Dicatat Oleh',
      'Nominal (Rp)',
    ]);
    expStartRow = ringkasanData.length;
    expCount = expenses.length;
    expenses.forEach((exp, idx) => {
      ringkasanData.push([
        idx + 1,
        formatDate(exp.timestamp || exp.date),
        exp.category || 'Operasional',
        exp.note || exp.description || '-',
        exp.recordedBy || exp.cashierName || '-',
        Number(exp.amount) || 0,
      ]);
    });
    expTotalRow = ringkasanData.length;
    ringkasanData.push(['', 'TOTAL PENGELUARAN TOKO', '', '', '', totalPengeluaran]);
    merges1.push({ s: { r: expTotalRow, c: 1 }, e: { r: expTotalRow, c: 4 } });
  }

  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
  wsRingkasan['!merges'] = merges1;
  wsRingkasan['!cols'] = [
    { wch: 6 },  // No
    { wch: 38 }, // Indikator / Nama Menu / Bahan
    { wch: 22 }, // Qty / Waktu
    { wch: 24 }, // Total Penjualan / Kategori
    { wch: 22 }, // Kontribusi / Keterangan
    { wch: 22 }, // Sisa Stok / Nominal
  ];

  // APLIKASIKAN STYLING SHEET 1 (RINGKASAN LAPORAN)
  styleRow(wsRingkasan, 0, 0, 5, styles.docTitleGreen);
  styleRow(wsRingkasan, 1, 0, 5, styles.subtitle);
  styleRow(wsRingkasan, 2, 0, 5, styles.subtitle);

  // Parameter Info
  styleRow(wsRingkasan, 4, 0, 2, styles.sectionHeaderGreen);
  for (let r = 5; r <= 8; r++) {
    applyStyle(wsRingkasan, r, 0, styles.infoLabel);
    applyStyle(wsRingkasan, r, 1, styles.infoValue);
    applyStyle(wsRingkasan, r, 2, styles.infoValue);
  }

  // Section 1: Ringkasan Finansial
  styleRow(wsRingkasan, sec1HeaderRow, 0, 2, styles.sectionHeaderGreen);
  styleRow(wsRingkasan, sec1TableHeadRow, 0, 2, styles.tableHeaderGreen);

  finRows.forEach((item, idx) => {
    const r = finStartRow + idx;
    if (item.type === 'netIncome') {
      // POIN PENTING PENDAPATAN BERSIH (HIJAU)
      applyStyle(wsRingkasan, r, 0, styles.netIncomeRow('center'));
      applyStyle(wsRingkasan, r, 1, styles.netIncomeRow('left'));
      applyStyle(wsRingkasan, r, 2, styles.netIncomeRow('right'));
    } else if (item.type === 'expense') {
      // POIN PENTING TOTAL PENGELUARAN (MERAH)
      applyStyle(wsRingkasan, r, 0, styles.expenseHighlightRow('center'));
      applyStyle(wsRingkasan, r, 1, styles.expenseHighlightRow('left'));
      applyStyle(wsRingkasan, r, 2, styles.expenseHighlightRow('right'));
    } else if (item.type === 'omzet') {
      applyStyle(wsRingkasan, r, 0, styles.omzetHighlightRow('center'));
      applyStyle(wsRingkasan, r, 1, styles.omzetHighlightRow('left'));
      applyStyle(wsRingkasan, r, 2, styles.omzetHighlightRow('right'));
    } else {
      applyStyle(wsRingkasan, r, 0, styles.cellCenter);
      applyStyle(wsRingkasan, r, 1, styles.cellLeft);
      applyStyle(
        wsRingkasan,
        r,
        2,
        item.type === 'text' ? styles.cellCenter : styles.cellRight
      );
    }
  });

  // Section 2: Penjualan per Menu
  styleRow(wsRingkasan, sec2HeaderRow, 0, 4, styles.sectionHeaderGreen);
  styleRow(wsRingkasan, sec2TableHeadRow, 0, 4, styles.tableHeaderGreen);
  for (let i = 0; i < menuBreakdown.length; i++) {
    const r = menuStartRow + i;
    applyStyle(wsRingkasan, r, 0, styles.cellCenter);
    applyStyle(wsRingkasan, r, 1, styles.cellLeft);
    applyStyle(wsRingkasan, r, 2, styles.cellCenter);
    applyStyle(wsRingkasan, r, 3, styles.cellRightBold);
    applyStyle(wsRingkasan, r, 4, styles.cellCenter);
  }
  // Total Baris Menu (HIJAU MUDA)
  applyStyle(wsRingkasan, menuTotalRow, 0, styles.totalRowGreen('center'));
  applyStyle(wsRingkasan, menuTotalRow, 1, styles.totalRowGreen('left'));
  applyStyle(wsRingkasan, menuTotalRow, 2, styles.totalRowGreen('center'));
  applyStyle(wsRingkasan, menuTotalRow, 3, styles.totalRowGreen('right'));
  applyStyle(wsRingkasan, menuTotalRow, 4, styles.totalRowGreen('center'));

  // Section 3: Bahan Baku (jika ada)
  if (ingStartRow !== null) {
    styleRow(wsRingkasan, ingTableHeadRow - 1, 0, 5, styles.sectionHeaderGreen);
    styleRow(wsRingkasan, ingTableHeadRow, 0, 5, styles.tableHeaderGreen);
    for (let i = 0; i < ingCount; i++) {
      const r = ingStartRow + i;
      applyStyle(wsRingkasan, r, 0, styles.cellCenter);
      applyStyle(wsRingkasan, r, 1, styles.cellLeft);
      applyStyle(wsRingkasan, r, 2, styles.cellLeft);
      applyStyle(wsRingkasan, r, 3, styles.cellCenter);
      applyStyle(wsRingkasan, r, 4, styles.cellRightBold);
      applyStyle(wsRingkasan, r, 5, styles.cellCenter);
    }
  }

  // Section 4: Pengeluaran (jika ada) (WARNA MERAH)
  if (expStartRow !== null) {
    styleRow(wsRingkasan, expTableHeadRow - 1, 0, 5, styles.sectionHeaderRed);
    styleRow(wsRingkasan, expTableHeadRow, 0, 5, styles.tableHeaderRed);
    for (let i = 0; i < expCount; i++) {
      const r = expStartRow + i;
      applyStyle(wsRingkasan, r, 0, styles.cellCenter);
      applyStyle(wsRingkasan, r, 1, styles.cellCenter);
      applyStyle(wsRingkasan, r, 2, styles.cellLeft);
      applyStyle(wsRingkasan, r, 3, styles.cellLeft);
      applyStyle(wsRingkasan, r, 4, styles.cellLeft);
      applyStyle(wsRingkasan, r, 5, styles.cellRed); // Nominal Pengeluaran Merah
    }
    // Total Pengeluaran (MERAH)
    applyStyle(wsRingkasan, expTotalRow, 0, styles.totalRowRed('center'));
    applyStyle(wsRingkasan, expTotalRow, 1, styles.totalRowRed('left'));
    applyStyle(wsRingkasan, expTotalRow, 2, styles.totalRowRed('left'));
    applyStyle(wsRingkasan, expTotalRow, 3, styles.totalRowRed('left'));
    applyStyle(wsRingkasan, expTotalRow, 4, styles.totalRowRed('left'));
    applyStyle(wsRingkasan, expTotalRow, 5, styles.totalRowRed('right'));
  }

  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan Laporan');

  // =========================================================================
  // SHEET 2: DAFTAR TRANSAKSI (TABEL LENGKAP TRANSAKSI PENJUALAN)
  // =========================================================================
  const txData = [];
  const merges2 = [];

  // Row 0: Title banner (HIJAU)
  txData.push(['DAFTAR TRANSAKSI PENJUALAN PUKO', '', '', '', '', '', '', '', '', '', '', '', '']);
  merges2.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } });

  // Row 1: Subtitle
  txData.push([
    `Periode: ${periodLabel || 'Semua Waktu'} | Kasir: ${printedBy || 'Kasir'} | Dicetak: ${exportTimestamp} WITA`,
    '', '', '', '', '', '', '', '', '', '', '', '',
  ]);
  merges2.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 12 } });

  // Row 2: Blank
  txData.push([]);

  // Row 3: Column Headers (HIJAU MUDA)
  const txHeadRow = 3;
  txData.push([
    'No',
    'No. Struk',
    'Waktu Transaksi',
    'Kasir',
    'Pelanggan',
    'Detail Pesanan',
    'Jumlah Cup',
    'Metode Bayar',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'Total (Rp)',
    'Bayar (Rp)',
    'Kembalian (Rp)',
  ]);

  const txStartRow = 4;
  transactions.forEach((tx, idx) => {
    const itemsDescription = Array.isArray(tx.items)
      ? tx.items
          .map((item) => {
            const name = item.nama || item.name || '';
            const qty = item.qty || 1;
            const notes = item.notes ? ` (${item.notes})` : '';
            return `${qty}x ${name}${notes}`;
          })
          .join(', ')
      : '';

    const cupCount = countCups(tx.items);

    txData.push([
      idx + 1,
      tx.id,
      formatDate(tx.timestamp),
      tx.cashierName || tx.cashier_name || 'Kasir',
      tx.customerName || tx.customer_name || 'Pelanggan Umum',
      itemsDescription,
      cupCount,
      (tx.paymentMethod || tx.payment_method || 'TUNAI').toUpperCase(),
      tx.subtotal || 0,
      tx.discount || 0,
      tx.total || 0,
      tx.amountPaid ?? tx.amount_paid ?? 0,
      tx.change || 0,
    ]);
  });

  // Summary Rows at Bottom of Sheet 2
  const txTotalRow = txData.length;
  txData.push([
    'TOTAL',
    `Akumulasi ${transactions.length} Transaksi`,
    '',
    '',
    '',
    '',
    totalCups,
    '',
    transactions.reduce((s, tx) => s + (tx.subtotal || 0), 0),
    transactions.reduce((s, tx) => s + (tx.discount || 0), 0),
    totalOmzet,
    totalCash + totalQris + totalTransfer,
    '',
  ]);
  merges2.push({ s: { r: txTotalRow, c: 1 }, e: { r: txTotalRow, c: 5 } });

  // Metrik Rincian Metode Bayar di Bawah Tabel Transaksi
  const txTunaiRow = txData.length;
  txData.push(['', 'Total Pembayaran Tunai (Cash)', '', '', '', '', '', 'TUNAI', '', '', totalCash, '', '']);
  merges2.push({ s: { r: txTunaiRow, c: 1 }, e: { r: txTunaiRow, c: 6 } });

  const txQrisRow = txData.length;
  txData.push(['', 'Total Pembayaran QRIS', '', '', '', '', '', 'QRIS', '', '', totalQris, '', '']);
  merges2.push({ s: { r: txQrisRow, c: 1 }, e: { r: txQrisRow, c: 6 } });

  let txTfRow = null;
  if (totalTransfer > 0) {
    txTfRow = txData.length;
    txData.push(['', 'Total Pembayaran Transfer', '', '', '', '', '', 'TRANSFER', '', '', totalTransfer, '', '']);
    merges2.push({ s: { r: txTfRow, c: 1 }, e: { r: txTfRow, c: 6 } });
  }

  const wsTransaksi = XLSX.utils.aoa_to_sheet(txData);
  wsTransaksi['!merges'] = merges2;
  wsTransaksi['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // No. Struk
    { wch: 22 }, // Waktu Transaksi
    { wch: 16 }, // Kasir
    { wch: 18 }, // Pelanggan
    { wch: 42 }, // Detail Pesanan
    { wch: 12 }, // Jumlah Cup
    { wch: 14 }, // Metode Bayar
    { wch: 14 }, // Subtotal
    { wch: 12 }, // Diskon
    { wch: 16 }, // Total
    { wch: 15 }, // Bayar
    { wch: 15 }, // Kembalian
  ];

  // APLIKASIKAN STYLING SHEET 2
  styleRow(wsTransaksi, 0, 0, 12, styles.docTitleGreen);
  styleRow(wsTransaksi, 1, 0, 12, styles.subtitle);
  styleRow(wsTransaksi, txHeadRow, 0, 12, styles.tableHeaderGreen);

  transactions.forEach((tx, idx) => {
    const r = txStartRow + idx;
    applyStyle(wsTransaksi, r, 0, styles.cellCenter);
    applyStyle(wsTransaksi, r, 1, styles.cellCenterBold);
    applyStyle(wsTransaksi, r, 2, styles.cellCenter);
    applyStyle(wsTransaksi, r, 3, styles.cellLeft);
    applyStyle(wsTransaksi, r, 4, styles.cellLeft);
    applyStyle(wsTransaksi, r, 5, styles.cellLeft);
    applyStyle(wsTransaksi, r, 6, styles.cellCenter);
    applyStyle(wsTransaksi, r, 7, styles.cellCenterBold);
    applyStyle(wsTransaksi, r, 8, styles.cellRight);
    applyStyle(wsTransaksi, r, 9, tx.discount > 0 ? styles.cellRed : styles.cellRight);
    applyStyle(wsTransaksi, r, 10, styles.cellRightBold);
    applyStyle(wsTransaksi, r, 11, styles.cellRight);
    applyStyle(wsTransaksi, r, 12, styles.cellRight);
  });

  // Baris Total Transaksi (HIJAU)
  styleRow(wsTransaksi, txTotalRow, 0, 12, (c) => {
    if (c === 0 || c === 6 || c === 7) return styles.totalRowGreen('center');
    if (c >= 8) return styles.totalRowGreen('right');
    return styles.totalRowGreen('left');
  });

  // Baris Tunai & QRIS Breakdown
  styleRow(wsTransaksi, txTunaiRow, 0, 12, (c) => (c === 10 ? styles.cellRightBold : (c === 7 ? styles.cellCenterBold : styles.cellLeft)));
  styleRow(wsTransaksi, txQrisRow, 0, 12, (c) => (c === 10 ? styles.cellRightBold : (c === 7 ? styles.cellCenterBold : styles.cellLeft)));
  if (txTfRow !== null) {
    styleRow(wsTransaksi, txTfRow, 0, 12, (c) => (c === 10 ? styles.cellRightBold : (c === 7 ? styles.cellCenterBold : styles.cellLeft)));
  }

  XLSX.utils.book_append_sheet(wb, wsTransaksi, 'Daftar Transaksi');

  // =========================================================================
  // SHEET 3: RINCIAN ITEM TERJUAL (BARIS PER ITEM MENU)
  // =========================================================================
  const itemData = [];
  const merges3 = [];

  // Row 0: Title banner (HIJAU)
  itemData.push(['RINCIAN ITEM PRODUK TERJUAL PUKO', '', '', '', '', '', '', '', '', '']);
  merges3.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });

  // Row 1: Subtitle
  itemData.push([
    `Periode: ${periodLabel || 'Semua Waktu'} | Total Transaksi: ${transactions.length} | Dicetak: ${exportTimestamp} WITA`,
    '', '', '', '', '', '', '', '', '',
  ]);
  merges3.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });

  // Row 2: Blank
  itemData.push([]);

  // Row 3: Column Headers (HIJAU MUDA)
  const itemHeadRow = 3;
  itemData.push([
    'No',
    'No. Struk',
    'Waktu Transaksi',
    'Kasir',
    'Pelanggan',
    'Nama Menu Produk',
    'Qty (Cup)',
    'Harga Satuan (Rp)',
    'Subtotal (Rp)',
    'Catatan Tambahan',
  ]);

  let itemCounter = 1;
  let totalItemQty = 0;
  let totalItemRevenue = 0;
  const itemStartRow = 4;

  transactions.forEach((tx) => {
    if (Array.isArray(tx.items)) {
      tx.items.forEach((item) => {
        const itemName = item.nama || item.name || '-';
        const qty = Number(item.qty) || 1;
        const price = Number(item.harga || item.price) || 0;
        const subtotal = Number(item.subtotal) || price * qty;

        totalItemQty += qty;
        totalItemRevenue += subtotal;

        itemData.push([
          itemCounter++,
          tx.id,
          formatDate(tx.timestamp),
          tx.cashierName || tx.cashier_name || 'Kasir',
          tx.customerName || tx.customer_name || 'Pelanggan Umum',
          itemName,
          qty,
          price,
          subtotal,
          item.notes || '-',
        ]);
      });
    }
  });

  // Total Row Sheet 3
  const itemTotalRow = itemData.length;
  itemData.push([
    'TOTAL',
    `Akumulasi ${itemData.length - itemStartRow} Item Terjual`,
    '',
    '',
    '',
    '',
    totalItemQty,
    '',
    totalItemRevenue,
    '',
  ]);
  merges3.push({ s: { r: itemTotalRow, c: 1 }, e: { r: itemTotalRow, c: 5 } });

  const wsItems = XLSX.utils.aoa_to_sheet(itemData);
  wsItems['!merges'] = merges3;
  wsItems['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // No. Struk
    { wch: 22 }, // Waktu Transaksi
    { wch: 16 }, // Kasir
    { wch: 18 }, // Pelanggan
    { wch: 34 }, // Nama Menu
    { wch: 12 }, // Qty
    { wch: 16 }, // Harga Satuan
    { wch: 16 }, // Subtotal
    { wch: 26 }, // Catatan
  ];

  // APLIKASIKAN STYLING SHEET 3
  styleRow(wsItems, 0, 0, 9, styles.docTitleGreen);
  styleRow(wsItems, 1, 0, 9, styles.subtitle);
  styleRow(wsItems, itemHeadRow, 0, 9, styles.tableHeaderGreen);

  for (let r = itemStartRow; r < itemTotalRow; r++) {
    applyStyle(wsItems, r, 0, styles.cellCenter);
    applyStyle(wsItems, r, 1, styles.cellCenterBold);
    applyStyle(wsItems, r, 2, styles.cellCenter);
    applyStyle(wsItems, r, 3, styles.cellLeft);
    applyStyle(wsItems, r, 4, styles.cellLeft);
    applyStyle(wsItems, r, 5, styles.cellLeft);
    applyStyle(wsItems, r, 6, styles.cellCenter);
    applyStyle(wsItems, r, 7, styles.cellRight);
    applyStyle(wsItems, r, 8, styles.cellRightBold);
    applyStyle(wsItems, r, 9, styles.cellLeft);
  }

  // Baris Total Item Terjual (HIJAU)
  styleRow(wsItems, itemTotalRow, 0, 9, (c) => {
    if (c === 0 || c === 6) return styles.totalRowGreen('center');
    if (c === 8) return styles.totalRowGreen('right');
    return styles.totalRowGreen('left');
  });

  XLSX.utils.book_append_sheet(wb, wsItems, 'Rincian Item Terjual');

  // =========================================================================
  // SHEET 4: DATA PENGELUARAN (JIKA ADA DATA PENGELUARAN PADA PERIODE INI) (WARNA MERAH)
  // =========================================================================
  if (expenses && expenses.length > 0) {
    const expData = [];
    const merges4 = [];

    // Row 0: Title banner (MERAH PENGELUARAN)
    expData.push(['DATA PENGELUARAN OPERASIONAL TOKO PUKO', '', '', '', '', '']);
    merges4.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

    // Row 1: Subtitle
    expData.push([
      `Periode: ${periodLabel || 'Semua Waktu'} | Total Catatan: ${expenses.length} | Dicetak: ${exportTimestamp} WITA`,
      '', '', '', '', '',
    ]);
    merges4.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

    // Row 2: Blank
    expData.push([]);

    // Row 3: Column Headers (MERAH MUDA)
    const expHeadRow = 3;
    expData.push([
      'No',
      'Tanggal & Waktu',
      'Kategori Pengeluaran',
      'Keterangan / Keperluan',
      'Dicatat Oleh',
      'Nominal (Rp)',
    ]);

    const expSheetStartRow = 4;
    expenses.forEach((exp, idx) => {
      expData.push([
        idx + 1,
        formatDate(exp.timestamp || exp.date),
        exp.category || 'Operasional',
        exp.note || exp.description || '-',
        exp.recordedBy || exp.cashierName || '-',
        Number(exp.amount) || 0,
      ]);
    });

    // Summary Row Sheet 4 (MERAH)
    const expSheetTotalRow = expData.length;
    expData.push(['TOTAL', `Akumulasi ${expenses.length} Catatan Pengeluaran`, '', '', '', totalPengeluaran]);
    merges4.push({ s: { r: expSheetTotalRow, c: 1 }, e: { r: expSheetTotalRow, c: 4 } });

    const wsExpenses = XLSX.utils.aoa_to_sheet(expData);
    wsExpenses['!merges'] = merges4;
    wsExpenses['!cols'] = [
      { wch: 6 },  // No
      { wch: 22 }, // Tanggal & Waktu
      { wch: 24 }, // Kategori
      { wch: 40 }, // Keterangan
      { wch: 18 }, // Dicatat Oleh
      { wch: 20 }, // Nominal
    ];

    // APLIKASIKAN STYLING SHEET 4 (PENGELUARAN WARNA MERAH)
    styleRow(wsExpenses, 0, 0, 5, styles.docTitleRed);
    styleRow(wsExpenses, 1, 0, 5, styles.subtitle);
    styleRow(wsExpenses, expHeadRow, 0, 5, styles.tableHeaderRed);

    for (let r = expSheetStartRow; r < expSheetTotalRow; r++) {
      applyStyle(wsExpenses, r, 0, styles.cellCenter);
      applyStyle(wsExpenses, r, 1, styles.cellCenter);
      applyStyle(wsExpenses, r, 2, styles.cellLeft);
      applyStyle(wsExpenses, r, 3, styles.cellLeft);
      applyStyle(wsExpenses, r, 4, styles.cellLeft);
      applyStyle(wsExpenses, r, 5, styles.cellRed); // Nominal Pengeluaran Teks Merah Tebal
    }

    // Baris Total Pengeluaran (MERAH)
    applyStyle(wsExpenses, expSheetTotalRow, 0, styles.totalRowRed('center'));
    applyStyle(wsExpenses, expSheetTotalRow, 1, styles.totalRowRed('left'));
    applyStyle(wsExpenses, expSheetTotalRow, 2, styles.totalRowRed('left'));
    applyStyle(wsExpenses, expSheetTotalRow, 3, styles.totalRowRed('left'));
    applyStyle(wsExpenses, expSheetTotalRow, 4, styles.totalRowRed('left'));
    applyStyle(wsExpenses, expSheetTotalRow, 5, styles.totalRowRed('right'));

    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Data Pengeluaran');
  }

  // Format Nama File Resmi
  const filename = `Laporan-Lengkap-PUKO-${cleanPeriod}-${dateStr}.xlsx`;

  // Download langsung ke perangkat pengguna dengan style aktif
  XLSX.writeFile(wb, filename);
};

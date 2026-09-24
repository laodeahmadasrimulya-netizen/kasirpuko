import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Banknote,
  QrCode,
  Coffee,
  Store,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart as PieIcon,
  Crown,
  Flame,
  Award,
} from 'lucide-react';

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const INDO_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];
const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const formatIndonesianDateLong = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const dateObj = new Date(y, m - 1, d);
  return `${INDO_DAYS[dateObj.getDay()]}, ${d} ${INDO_MONTHS[m - 1]} ${y}`;
};

const formatIndonesianMonthYear = (monthStr) => {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return `${INDO_MONTHS[m - 1]} ${y}`;
};

const formatIndonesianMonthShortYear = (monthStr) => {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return `${INDO_MONTHS_SHORT[m - 1]} ${y}`;
};
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useTransactions } from '../../context/TransactionContext';
import { useProducts } from '../../context/ProductContext';
import { useSettings } from '../../context/SettingsContext';
import { useExpenses } from '../../context/ExpenseContext';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatIDR, formatNumber } from '../../utils/currency';
import { formatDate, isToday } from '../../utils/date';
import { handleImageError } from '../../utils/imageFallback';
import { BannerCarousel } from '../../components/dashboard/BannerCarousel';
import { IngredientStockWidget } from '../../components/dashboard/IngredientStockWidget';



/**
 * Color mapper for menu items to give each avocado / topping variant
 * its distinctive, cool, and recognizable color palette.
 * - Keju: Kuning cerah / cheddar gold
 * - Original: Putih susu / soft pearl ivory (dengan outline slate)
 * - Coklat: Cokelat Belgia pekat
 * - Milo: Cokelat malt amber / bronze
 * - Oreo: Charcoal dark cookies & cream
 */
const getProductColor = (productName) => {
  const name = (productName || '').toLowerCase();

  // 1. Keju -> Kuning (Sesuai permintaan: "kalau keju warna kuning")
  if (name.includes('keju') || name.includes('cheese')) {
    return {
      fill: '#facc15', // Vibrant yellow
      stroke: '#ca8a04',
    };
  }

  // 2. Original -> Putih / Pearl Ivory (Sesuai permintaan: "original warna putih")
  if (name.includes('original')) {
    return {
      fill: '#f8fafc', // Soft white / ivory
      stroke: '#94a3b8', // Subtle border so it contrasts crisply on light cards
    };
  }

  // 3. Coklat -> Cokelat Belgia
  if (name.includes('coklat') || name.includes('chocolate')) {
    return {
      fill: '#78350f',
      stroke: '#451a03',
    };
  }

  // 4. Milo -> Cokelat Malt / Bronze
  if (name.includes('milo')) {
    return {
      fill: '#c2410c',
      stroke: '#7c2d12',
    };
  }

  // 5. Oreo -> Charcoal Cookies & Cream
  if (name.includes('oreo')) {
    return {
      fill: '#334155',
      stroke: '#0f172a',
    };
  }

  // 6. Matcha / Green Tea -> Hijau Segar
  if (name.includes('matcha') || name.includes('green tea') || name.includes('teh')) {
    return {
      fill: '#16a34a',
      stroke: '#14532d',
    };
  }

  // 7. Durian -> Kuning Emas
  if (name.includes('durian')) {
    return {
      fill: '#eab308',
      stroke: '#a16207',
    };
  }

  // 8. Kopi -> Espresso Dark Brown
  if (name.includes('kopi') || name.includes('coffee')) {
    return {
      fill: '#451a03',
      stroke: '#270e02',
    };
  }

  // 9. Stroberi -> Pink Merah
  if (name.includes('stroberi') || name.includes('strawberry')) {
    return {
      fill: '#f43f5e',
      stroke: '#be123c',
    };
  }

  // 10. Mangga -> Orange Segar
  if (name.includes('mangga') || name.includes('mango')) {
    return {
      fill: '#f97316',
      stroke: '#c2410c',
    };
  }

  // 11. Red Velvet -> Ruby Red
  if (name.includes('red velvet')) {
    return {
      fill: '#e11d48',
      stroke: '#9f1239',
    };
  }

  // 12. Alpukat Segar / Minuman Alpukat Lainnya -> Hijau Alpukat
  if (name.includes('alpukat') || name.includes('avocado')) {
    return {
      fill: '#22c55e',
      stroke: '#15803d',
    };
  }

  // Palette modern fallback jika nama menu baru
  const FALLBACK_PALETTE = [
    { fill: '#10b981', stroke: '#047857' },
    { fill: '#06b6d4', stroke: '#0e7490' },
    { fill: '#8b5cf6', stroke: '#6d28d9' },
    { fill: '#ec4899', stroke: '#be185d' },
    { fill: '#3b82f6', stroke: '#1d4ed8' },
    { fill: '#14b8a6', stroke: '#0f766e' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { transactions, setActiveReceipt } = useTransactions();
  const { products } = useProducts();
  const { settings } = useSettings();
  const { expenses } = useExpenses();

  // State info hari terpilih saat diagram batang diklik
  const [selectedChartDay, setSelectedChartDay] = useState(null);

  // Handler klik batang diagram / hari grafik
  const handleBarClick = (entry) => {
    if (!entry) {
      setSelectedChartDay(null);
      return;
    }
    const hasTransactions =
      (entry.pemasukan || 0) > 0 ||
      (entry.pengeluaran || 0) > 0 ||
      (entry.transaksi || 0) > 0;

    if (hasTransactions) {
      setSelectedChartDay(entry);
    } else {
      // Jika hari belum ada transaksi / hari esok, sembunyikan floating info
      setSelectedChartDay(null);
    }
  };

  const handleChartClick = (state) => {
    if (state && state.activePayload && state.activePayload.length) {
      const clickedItem = state.activePayload[0].payload;
      handleBarClick(clickedItem);
    } else {
      setSelectedChartDay(null);
    }
  };

  // Mode filter: 'harian' (Daily) atau 'bulanan' (Monthly)
  const [filterMode, setFilterMode] = useState('harian');

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const isSameDate = (isoString, targetDateStr) => {
    if (!isoString || !targetDateStr) return false;
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === targetDateStr;
  };

  const isSameMonth = (isoString, targetMonthStr) => {
    if (!isoString || !targetMonthStr) return false;
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}` === targetMonthStr;
  };

  const harianScrollRef = useRef(null);

  // Generate 30 hari ke belakang berakhir di hari ini (urutan: hari terlama -> hari ini di paling kanan)
  const past30Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayName: INDO_DAYS_SHORT[d.getDay()],
        dayNumber: d.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  // Saat mode Harian aktif, otomatis geser scroll ke paling kanan (Hari Ini)
  useEffect(() => {
    if (filterMode === 'harian' && harianScrollRef.current) {
      harianScrollRef.current.scrollLeft = harianScrollRef.current.scrollWidth;
    }
  }, [filterMode]);

  // Navigasi Bulan (Sebelumnya & Berikutnya)
  const handlePrevMonth = () => {
    const parts = selectedMonth.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const prev = new Date(y, m - 2, 1);
    const py = prev.getFullYear();
    const pm = String(prev.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${py}-${pm}`);
  };

  const handleNextMonth = () => {
    if (selectedMonth >= currentMonthStr) return;
    const parts = selectedMonth.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const next = new Date(y, m, 1);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, '0');
    const nextStr = `${ny}-${nm}`;
    if (nextStr <= currentMonthStr) {
      setSelectedMonth(nextStr);
    }
  };

  // 1. Filter Transaksi pada Tanggal atau Bulan yang Dipilih
  const selectedTransactions = useMemo(() => {
    if (filterMode === 'bulanan') {
      return transactions.filter((tx) => isSameMonth(tx.timestamp, selectedMonth));
    }
    return transactions.filter((tx) => isSameDate(tx.timestamp, selectedDate));
  }, [transactions, filterMode, selectedDate, selectedMonth]);

  // Transaksi Hari Ini
  const todayTransactions = useMemo(() => {
    return transactions.filter((tx) => isSameDate(tx.timestamp, todayDateStr));
  }, [transactions, todayDateStr]);

  // 2. Total Transaksi Terpilih
  const totalTransaksiTerpilih = selectedTransactions.length;

  // Total Pengeluaran pada Tanggal atau Bulan yang Dipilih
  const totalPengeluaranTerpilih = useMemo(() => {
    if (filterMode === 'bulanan') {
      return (expenses || [])
        .filter((exp) => isSameMonth(exp.timestamp, selectedMonth))
        .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }
    return (expenses || [])
      .filter((exp) => isSameDate(exp.timestamp, selectedDate))
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses, filterMode, selectedDate, selectedMonth]);

  // 3. Total Pendapatan Bersih (Sudah dikurangi pengeluaran / biaya pada tanggal/bulan yang dipilih)
  const totalPendapatanBersih = useMemo(() => {
    const kotor = selectedTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
    return kotor - totalPengeluaranTerpilih;
  }, [selectedTransactions, totalPengeluaranTerpilih]);

  // Pembayaran Tunai pada Tanggal yang Dipilih
  const { totalTunaiTerpilih, countTunaiTerpilih } = useMemo(() => {
    const tunaiTxs = selectedTransactions.filter(
      (tx) => (tx.paymentMethod || 'TUNAI').toUpperCase() === 'TUNAI'
    );
    return {
      totalTunaiTerpilih: tunaiTxs.reduce((sum, tx) => sum + (tx.total || 0), 0),
      countTunaiTerpilih: tunaiTxs.length,
    };
  }, [selectedTransactions]);

  // Pembayaran QRIS pada Tanggal yang Dipilih
  const { totalQrisTerpilih, countQrisTerpilih } = useMemo(() => {
    const qrisTxs = selectedTransactions.filter(
      (tx) => (tx.paymentMethod || '').toUpperCase() === 'QRIS'
    );
    return {
      totalQrisTerpilih: qrisTxs.reduce((sum, tx) => sum + (tx.total || 0), 0),
      countQrisTerpilih: qrisTxs.length,
    };
  }, [selectedTransactions]);

  // Total cup porsi terjual pada Tanggal yang Dipilih
  const totalCupTerpilih = useMemo(() => {
    return selectedTransactions.reduce((sum, tx) => {
      return (
        sum +
        (tx.items?.reduce((itemSum, item) => itemSum + (item.qty || 1), 0) || 0)
      );
    }, 0);
  }, [selectedTransactions]);

  // 4. Produk Terlaris (Dihitung dari SELURUH data transaksi dari awal penggunaan sampai seterusnya)
  const topSellingProducts = useMemo(() => {
    const salesMap = {};
    transactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        const key = item.nama || item.name;
        if (!key) return;
        const cat = (item.category || item.kategori || '').toLowerCase();
        // Hanya hitung produk minuman utama (bukan topping extra)
        if (cat.includes('topping') || key.toLowerCase().startsWith('extra ')) return;

        if (!salesMap[key]) {
          salesMap[key] = {
            name: key,
            qty: 0,
            revenue: 0,
            image: item.gambar || item.image,
            category: item.category || item.kategori,
          };
        }
        salesMap[key].qty += Number(item.qty) || 1;
        salesMap[key].revenue +=
          Number(item.subtotal) || (Number(item.harga) || Number(item.price) || 0) * (Number(item.qty) || 1);
      });
    });

    const list = Object.values(salesMap);
    list.sort((a, b) => b.qty - a.qty);
    return list;
  }, [transactions]);

  const maxSoldQty = topSellingProducts[0]?.qty || 1;

  // 5. DATA GRAFIK BATANG HARIAN SELAMA 1 MINGGU (Recharts BarChart: Urut Senin - Minggu)
  const weeklyDailyBarData = useMemo(() => {
    const days = [];
    const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const FULL_DAY_NAMES = [
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
      'Minggu',
    ];

    const todayDate = new Date();
    const currentDay = todayDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    // Hitung jarak offset ke hari Senin pekan berjalan (Senin = index 0, Minggu = index 6)
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const mondayDate = new Date(todayDate);
    mondayDate.setDate(todayDate.getDate() + mondayOffset);

    const todayYear = todayDate.getFullYear();
    const todayMonth = String(todayDate.getMonth() + 1).padStart(2, '0');
    const todayDayNum = String(todayDate.getDate()).padStart(2, '0');
    const todayDateStr = `${todayYear}-${todayMonth}-${todayDayNum}`;

    // Buat 7 slot hari: berurutan dari Senin sampai Minggu
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;

      const dayName = DAY_NAMES[i];
      const fullDayName = FULL_DAY_NAMES[i];

      days.push({
        dateKey: dateStr,
        day: dayName,
        fullDayName: `${fullDayName}, ${d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        })}`,
        isToday: dateStr === todayDateStr,
        omzet: 0,
        pemasukan: 0,
        pengeluaran: 0,
        bersih: 0,
        transaksi: 0,
        cup: 0,
      });
    }

    // Akumulasi data transaksi tersimpan ke masing-masing hari (Pemasukan)
    transactions.forEach((tx) => {
      if (!tx.timestamp) return;
      const txDate = new Date(tx.timestamp);
      const year = txDate.getFullYear();
      const month = String(txDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(txDate.getDate()).padStart(2, '0');
      const txDateStr = `${year}-${month}-${dayNum}`;

      const targetDay = days.find((d) => d.dateKey === txDateStr);
      if (targetDay) {
        targetDay.pemasukan = (targetDay.pemasukan || 0) + (tx.total || 0);
        targetDay.omzet = targetDay.pemasukan;
        targetDay.transaksi += 1;
        const totalItems =
          tx.items?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;
        targetDay.cup += totalItems;
      }
    });

    // Akumulasi data pengeluaran tersimpan ke masing-masing hari (Pengeluaran)
    if (Array.isArray(expenses)) {
      expenses.forEach((exp) => {
        if (!exp.timestamp) return;
        const expDate = new Date(exp.timestamp);
        const year = expDate.getFullYear();
        const month = String(expDate.getMonth() + 1).padStart(2, '0');
        const dayNum = String(expDate.getDate()).padStart(2, '0');
        const expDateStr = `${year}-${month}-${dayNum}`;

        const targetDay = days.find((d) => d.dateKey === expDateStr);
        if (targetDay) {
          targetDay.pengeluaran = (targetDay.pengeluaran || 0) + (Number(exp.amount) || 0);
        }
      });
    }

    // Hitung pendapatan bersih per hari
    days.forEach((day) => {
      day.bersih = (day.pemasukan || 0) - (day.pengeluaran || 0);
    });

    return days;
  }, [transactions, expenses]);

  // Statistik ringkas 1 minggu (Omzet & Cup)
  const weeklyTotalRevenue = useMemo(() => {
    return weeklyDailyBarData.reduce((sum, d) => sum + d.omzet, 0);
  }, [weeklyDailyBarData]);

  const weeklyAverageRevenue = Math.round(weeklyTotalRevenue / 7);

  const weeklyTotalCups = useMemo(() => {
    return weeklyDailyBarData.reduce((sum, d) => sum + (d.cup || 0), 0);
  }, [weeklyDailyBarData]);

  const weeklyAverageCups = Math.round(weeklyTotalCups / 7);

  // Hari teramai (Peak Day) berdasarkan Omzet
  const peakDay = useMemo(() => {
    return [...weeklyDailyBarData].sort((a, b) => b.omzet - a.omzet)[0];
  }, [weeklyDailyBarData]);

  // Hari teramai (Peak Day) berdasarkan Cup
  const peakDayCup = useMemo(() => {
    return [...weeklyDailyBarData].sort((a, b) => (b.cup || 0) - (a.cup || 0))[0];
  }, [weeklyDailyBarData]);

  // Periode data grafik menu: 'today' (Hari Ini) atau 'all' (Semua Waktu)
  const [menuFilterPeriod, setMenuFilterPeriod] = useState('today');
  // State untuk interaksi klik pie chart menu terjual
  const [selectedMenuPie, setSelectedMenuPie] = useState(null);

  // Distribusi Menu Terjual untuk Donut Chart
  const menuDistributionData = useMemo(() => {
    const targetTransactions =
      menuFilterPeriod === 'today'
        ? selectedTransactions.length > 0
          ? selectedTransactions
          : todayTransactions.length > 0
          ? todayTransactions
          : transactions
        : transactions;

    const salesMap = {};
    targetTransactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        const name = item.nama || item.name;
        if (!name) return;
        if (!salesMap[name]) {
          salesMap[name] = {
            name,
            qty: 0,
            revenue: 0,
          };
        }
        salesMap[name].qty += item.qty || 1;
        salesMap[name].revenue +=
          item.subtotal || (item.harga || item.price || 0) * (item.qty || 1);
      });
    });

    const list = Object.values(salesMap);
    list.sort((a, b) => b.qty - a.qty);

    const result = list.map((item) => {
      const color = getProductColor(item.name);
      return {
        ...item,
        value: item.qty,
        color: color.fill,
        stroke: color.stroke,
      };
    });

    return result.length > 0
      ? result
      : [
        {
          name: 'Belum Ada Penjualan',
          value: 1,
          qty: 0,
          revenue: 0,
          color: '#cbd5e1',
          stroke: '#94a3b8',
        },
      ];
  }, [menuFilterPeriod, selectedTransactions, todayTransactions, transactions]);

  // Total Cup di Donut Chart
  const donutTotalCups = useMemo(() => {
    return menuDistributionData.reduce((sum, item) => sum + (item.qty || 0), 0);
  }, [menuDistributionData]);

  return (
    <div className="space-y-6">
      {/* 3-Slide Brand Banner Carousel (Menu, Logo, Booth) */}
      <BannerCarousel />

      {/* STOK BAHAN BAKU UTAMA (Alpukat, Susu UHT, SKM) */}
      <IngredientStockWidget />

      {/* Selector Bar: Pilihan Harian & Bulanan */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-soft space-y-3">
        {/* Row 1: Segmented Control (Harian & Bulanan) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start">
          <button
            type="button"
            onClick={() => setFilterMode('harian')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              filterMode === 'harian'
                ? 'bg-puko-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Harian</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('bulanan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              filterMode === 'bulanan'
                ? 'bg-puko-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Bulanan</span>
          </button>
        </div>

        {/* Row 2: Tampilan Harian (Scrollable seperti kereta, hari ini di kanan berbalut hijau) */}
        {filterMode === 'harian' && (
          <div className="animate-fadeIn">
            <div
              ref={harianScrollRef}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 scroll-smooth"
              style={{ scrollbarWidth: 'thin' }}
            >
              {past30Days.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`min-w-[56px] sm:min-w-[64px] py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer select-none shrink-0 text-center ${
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
                    {day.isToday && (
                      <span
                        className={`text-[8px] px-1 py-0.2 rounded font-extrabold mt-0.5 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-puko-600 text-white'
                        }`}
                      >
                        Hari Ini
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 2: Tampilan Bulanan (< Sep 2026 >) */}
        {filterMode === 'bulanan' && (
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between gap-2 bg-slate-50/90 p-2 sm:p-2.5 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-puko-600 transition-colors shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Pilih bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Bulan Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 text-xs sm:text-sm font-extrabold text-slate-800 shadow-2xs">
                <CalendarRange className="w-3.5 h-3.5 text-puko-600 shrink-0" />
                <span>{formatIndonesianMonthShortYear(selectedMonth)}</span>
                {selectedMonth === currentMonthStr && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold ml-1">
                    Bulan Ini
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {selectedMonth !== currentMonthStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(currentMonthStr)}
                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-puko-50 border border-puko-200 text-puko-700 hover:bg-puko-100 text-[11px] font-bold transition-colors cursor-pointer select-none"
                  >
                    Bulan Ini
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={selectedMonth >= currentMonthStr}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${
                    selectedMonth >= currentMonthStr
                      ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-puko-600 shadow-2xs cursor-pointer'
                  }`}
                  title="Pilih bulan berikutnya"
                >
                  <span className="hidden sm:inline">Bulan Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Pendapatan Bersih */}
        <StatCard
          title="Total Pendapatan Bersih"
          value={formatIDR(totalPendapatanBersih)}
          subtitle={`${totalTransaksiTerpilih} transaksi`}
          icon={TrendingUp}
          color="black"
        />

        {/* 2. Pembayaran Tunai */}
        <StatCard
          title="Pembayaran Tunai"
          value={formatIDR(totalTunaiTerpilih)}
          subtitle={`${countTunaiTerpilih} transaksi`}
          icon={Banknote}
          color="black"
        />

        {/* 3. Pembayaran QRIS */}
        <StatCard
          title="Pembayaran QRIS"
          value={formatIDR(totalQrisTerpilih)}
          subtitle={`${countQrisTerpilih} transaksi`}
          icon={QrCode}
          color="black"
        />

        {/* 4. Total Cup Terjual */}
        <StatCard
          title="Total Cup Terjual"
          value={totalCupTerpilih}
          icon={Coffee}
          color="black"
        />
      </div>

      {/* GRAFIK BATANG PENJUALAN HARIAN SELAMA 1 MINGGU (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Batang 1 Minggu (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding={false} className="p-5 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-900 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Grafik Penjualan Mingguan
                </h3>
              </div>
            </div>

            {/* Recharts BarChart Container (Fokus Grafik Harga) */}
            <div className="h-72 w-full relative">
              {/* Floating Info Card: Mengambang & Stay di TENGAH atas grafik */}
              {selectedChartDay &&
                ((selectedChartDay.pemasukan || 0) > 0 ||
                  (selectedChartDay.pengeluaran || 0) > 0 ||
                  (selectedChartDay.transaksi || 0) > 0) && (
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 px-3.5 py-2.5 text-xs min-w-[170px] select-none">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between gap-3">
                        <span>{selectedChartDay.fullDayName || selectedChartDay.day}</span>
                        {selectedChartDay.isToday && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                            Hari Ini
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 font-medium">Pemasukan:</span>
                          <span className="font-extrabold text-slate-900">
                            {formatIDR(selectedChartDay.pemasukan || selectedChartDay.omzet || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 font-medium">Pengeluaran:</span>
                          <span className="font-extrabold text-rose-600">
                            {formatIDR(selectedChartDay.pengeluaran || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-medium">Bersih:</span>
                          <span className="font-extrabold text-emerald-600">
                            {formatIDR(selectedChartDay.bersih || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyDailyBarData}
                  margin={{ top: 35, right: 12, left: 12, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis hide />
                  <Bar
                    dataKey="omzet"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                    onClick={handleBarClick}
                    style={{ outline: 'none', cursor: 'pointer' }}
                  >
                    {weeklyDailyBarData.map((entry, index) => {
                      const hasTx =
                        (entry.pemasukan || 0) > 0 ||
                        (entry.pengeluaran || 0) > 0 ||
                        (entry.transaksi || 0) > 0;
                      const isSelected = selectedChartDay?.dateKey === entry.dateKey && hasTx;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isSelected ? '#2d6a4f' : '#52b788'}
                          onClick={(e) => {
                            e?.stopPropagation?.();
                            handleBarClick(entry);
                          }}
                          style={{ outline: 'none', cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3 Metric Summary Chips di bawah grafik batang */}
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Total Omzet 1 Minggu
                </span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                  {formatIDR(weeklyTotalRevenue)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Rata-rata Penjualan / Hari
                </span>
                <span className="text-sm font-extrabold text-puko-800 mt-0.5 block">
                  {formatIDR(weeklyAverageRevenue)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Penjualan Tertinggi
                </span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block truncate">
                  {formatIDR(peakDay?.omzet || 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Distribusi Menu Terjual Donut Chart (1 Col) */}
        <div className="space-y-4">
          <Card padding={false} className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Coffee className="w-5 h-5 text-slate-900 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Menu Terjual
                </h3>
              </div>

              {/* Donut Chart */}
              <div className="h-52 w-full mt-2 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={menuDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {menuDistributionData.map((entry, index) => {
                        const isSelected = selectedMenuPie === entry.name;
                        const isDimmed = selectedMenuPie && !isSelected;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            opacity={isDimmed ? 0.35 : 1}
                            stroke={isSelected ? '#0f172a' : (entry.stroke || '#ffffff')}
                            strokeWidth={
                              isSelected
                                ? 3
                                : entry.name?.toLowerCase().includes('original')
                                ? 2
                                : 1.5
                            }
                            style={{ outline: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onClick={() =>
                              setSelectedMenuPie((prev) => (prev === entry.name ? null : entry.name))
                            }
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text in donut */}
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-base font-black text-slate-800">
                    {donutTotalCups} Cup
                  </span>
                </div>
              </div>

              {/* Legends with Custom Color Badges */}
              <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
                {menuDistributionData.map((item) => {
                  const isSelected = selectedMenuPie === item.name;
                  const isDimmed = selectedMenuPie && !isSelected;
                  return (
                    <div
                      key={item.name}
                      onClick={() =>
                        setSelectedMenuPie((prev) => (prev === item.name ? null : item.name))
                      }
                      className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'font-black bg-slate-100 text-slate-950 ring-1 ring-slate-300'
                          : isDimmed
                          ? 'opacity-35 text-slate-400'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-full shrink-0 border transition-transform ${
                            isSelected ? 'scale-110 shadow-xs' : ''
                          }`}
                          style={{
                            backgroundColor: item.color,
                            borderColor: item.stroke || item.color,
                            boxShadow: item.name?.toLowerCase().includes('original')
                              ? '0 0 0 1px #cbd5e1'
                              : undefined,
                          }}
                        />
                        <span
                          className={`truncate ${isSelected ? 'font-black text-slate-950' : 'font-medium'}`}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={isSelected ? 'font-black text-slate-950' : 'font-extrabold text-slate-900'}>
                          {item.qty} Cup
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Grid 2 Columns: Produk Terlaris & Transaksi Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Produk Terlaris (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding={false} className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-slate-900 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Produk Terlaris
                </h3>
              </div>
            </div>

            {topSellingProducts.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                Belum ada data penjualan produk.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topSellingProducts.slice(0, 5).map((item, index) => {
                  const percentage = Math.round((item.qty / maxSoldQty) * 100);

                  return (
                    <div
                      key={item.name}
                      className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      {/* Rank Number */}
                      <span className="w-5 text-center font-extrabold text-sm shrink-0 text-slate-700">
                        {index + 1}
                      </span>

                      {/* Product Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            🥑
                          </div>
                        )}
                      </div>

                      {/* Name & Progress Bar */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate mb-1.5">
                          {item.name}
                        </h4>

                        {/* Progress Bar of Sales Volume */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              index === 0
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                : 'bg-gradient-to-r from-puko-500 to-emerald-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Menampilkan jumlah cup di bawah garis */}
                        <div className="mt-1.5">
                          <span className="text-xs text-slate-500 font-semibold">
                            {Number(item.qty).toLocaleString('id-ID')} Cup
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Transaksi Terbaru (1 Col) */}
        <div className="space-y-4">
          <Card padding={false} className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Transaksi Terkini
                </h3>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/riwayat')}
                className="text-puko-700 font-bold text-xs"
              >
                Semua <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-800">
                        {tx.id}
                      </span>
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
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(tx.timestamp)} • {tx.customerName || 'Umum'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-xs text-slate-900 block">
                      {formatIDR(tx.total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveReceipt(tx)}
                      className="text-[10px] text-puko-600 hover:text-puko-800 font-bold underline decoration-dotted"
                    >
                      Lihat Struk
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

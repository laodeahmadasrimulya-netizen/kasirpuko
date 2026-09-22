import React, { useMemo, useState } from 'react';
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
  BarChart3,
  PieChart as PieIcon,
  Crown,
  Flame,
  Award,
} from 'lucide-react';
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

// Custom Minimal Tooltip for 1-Week Daily Bar Chart (Hanya nominal, sejajar di atas grafik)
const CustomWeeklyBarTooltip = ({ active, payload, metricMode = 'omzet' }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const val = metricMode === 'cup' ? data.cup : data.omzet;
    // Jika hari tidak ada omset (0), jangan tampilkan apa-apa
    if (!val || val <= 0) return null;

    return (
      <div className="bg-slate-700 text-white font-extrabold text-[11px] sm:text-xs px-2.5 py-1 rounded-lg -translate-x-1/2 whitespace-nowrap select-none pointer-events-none border border-slate-600/70 shadow-none">
        {metricMode === 'cup' ? `${data.cup} Cup` : formatNumber(data.omzet)}
      </div>
    );
  }
  return null;
};

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

  const [metricMode, setMetricMode] = useState('omzet'); // 'omzet' or 'cup'

  // Generate past 7 days ending today (1 minggu ke belakang)
  const past7Days = useMemo(() => {
    const days = [];
    const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayName: DAY_NAMES[d.getDay()], // e.g. "Jum", "Sab"
        dayNumber: d.getDate(), // e.g. 17, 18
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayDateStr);

  const isSameDate = (isoString, targetDateStr) => {
    if (!isoString || !targetDateStr) return false;
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === targetDateStr;
  };

  // 1. Filter Transaksi pada Tanggal yang Dipilih
  const selectedTransactions = useMemo(() => {
    return transactions.filter((tx) => isSameDate(tx.timestamp, selectedDate));
  }, [transactions, selectedDate]);

  // Transaksi Hari Ini
  const todayTransactions = useMemo(() => {
    return transactions.filter((tx) => isSameDate(tx.timestamp, todayDateStr));
  }, [transactions, todayDateStr]);

  // 2. Total Transaksi Terpilih (Keseluruhan transaksi: QRIS + Tunai)
  const totalTransaksiTerpilih = selectedTransactions.length;

  // Total Pengeluaran pada Tanggal yang Dipilih
  const totalPengeluaranTerpilih = useMemo(() => {
    return (expenses || [])
      .filter((exp) => isSameDate(exp.timestamp, selectedDate))
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses, selectedDate]);

  // 3. Total Pendapatan Bersih (Sudah dikurangi pengeluaran / biaya pada tanggal yang dipilih)
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

  // 4. Produk Terlaris (Dihitung dari seluruh data transaksi yang tersimpan di Local Storage)
  const topSellingProducts = useMemo(() => {
    const salesMap = {};
    transactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        const key = item.nama || item.name;
        if (!salesMap[key]) {
          salesMap[key] = {
            name: key,
            qty: 0,
            revenue: 0,
            image: item.gambar || item.image,
            category: item.category || item.kategori,
          };
        }
        salesMap[key].qty += item.qty || 1;
        salesMap[key].revenue +=
          item.subtotal || (item.harga || item.price) * (item.qty || 1);
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
        transaksi: 0,
        cup: 0,
      });
    }

    // Akumulasi data transaksi tersimpan ke masing-masing hari
    transactions.forEach((tx) => {
      if (!tx.timestamp) return;
      const txDate = new Date(tx.timestamp);
      const year = txDate.getFullYear();
      const month = String(txDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(txDate.getDate()).padStart(2, '0');
      const txDateStr = `${year}-${month}-${dayNum}`;

      const targetDay = days.find((d) => d.dateKey === txDateStr);
      if (targetDay) {
        targetDay.omzet += tx.total || 0;
        targetDay.transaksi += 1;
        const totalItems =
          tx.items?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;
        targetDay.cup += totalItems;
      }
    });

    return days;
  }, [transactions]);

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

      {/* 7-Day Selector Bar (1 minggu ke belakang) */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-200/80 shadow-soft">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {past7Days.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate(day.dateStr)}
                className={`py-1.5 px-0.5 sm:py-2 sm:px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer select-none text-center ${
                  isSelected
                    ? 'border border-puko-700/60 bg-puko-600 text-white'
                    : 'border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span
                  className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? 'text-puko-100 font-bold' : 'text-slate-400'
                  }`}
                >
                  {day.dayName}
                </span>
                <span
                  className={`text-xs sm:text-sm mt-0.5 ${
                    isSelected ? 'text-white font-black' : 'text-slate-700 font-bold'
                  }`}
                >
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-900 shrink-0" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Grafik Penjualan Mingguan
                  </h3>
                </div>
              </div>

              {/* Mode Toggle: Omzet (Rp) vs Volume Cup */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMetricMode('omzet')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${metricMode === 'omzet'
                      ? 'bg-puko-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Omzet (Rp)
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode('cup')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${metricMode === 'cup'
                      ? 'bg-puko-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Jumlah Cup
                </button>
              </div>
            </div>

            {/* Recharts BarChart Container */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyDailyBarData}
                  margin={{ top: 35, right: 12, left: 12, bottom: 0 }}
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
                  <Tooltip
                    position={{ y: 6 }}
                    cursor={false}
                    content={<CustomWeeklyBarTooltip metricMode={metricMode} />}
                  />
                  <Bar
                    dataKey={metricMode === 'omzet' ? 'omzet' : 'cup'}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                    style={{ outline: 'none', cursor: 'pointer' }}
                  >
                    {weeklyDailyBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill="#52b788"
                        style={{ outline: 'none', cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3 Metric Summary Chips di bawah grafik batang */}
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {metricMode === 'cup' ? 'Total Cup Terjual (1 Minggu)' : 'Total Omzet 1 Minggu'}
                </span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                  {metricMode === 'cup' ? `${weeklyTotalCups} Cup` : formatIDR(weeklyTotalRevenue)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Rata-rata Penjualan / Hari
                </span>
                <span className="text-sm font-extrabold text-puko-800 mt-0.5 block">
                  {metricMode === 'cup' ? `${weeklyAverageCups} Cup / Hari` : formatIDR(weeklyAverageRevenue)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Penjualan Tertinggi
                </span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block truncate">
                  {metricMode === 'cup'
                    ? `${peakDayCup?.cup || 0} Cup`
                    : formatIDR(peakDay?.omzet || 0)}
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

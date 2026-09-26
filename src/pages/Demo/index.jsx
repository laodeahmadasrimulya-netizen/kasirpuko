import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShoppingCart, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DemoPage = () => {
  const { enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Aktifkan mode demo dan siapkan sandbox
    enterDemoMode();

    const timer = setTimeout(() => {
      setIsReady(true);
      // Otomatis navigasi ke kasir dalam 1 detik
      const redirectTimer = setTimeout(() => {
        navigate('/kasir', { replace: true });
      }, 1000);

      return () => clearTimeout(redirectTimer);
    }, 400);

    return () => clearTimeout(timer);
  }, [enterDemoMode, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center text-white shadow-2xl space-y-6 animate-scaleUp">
        {/* Logo Badge */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white p-1 shadow-2xl border-2 border-emerald-400/40">
            <img
              src="/logo.png"
              alt="PUKO Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-amber-300">
            <Sparkles className="w-3 h-3" />
            <span>Demo</span>
          </div>
        </div>

        {/* Text Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Kasir PUKO POS
          </h1>
          <p className="text-emerald-300 text-sm font-semibold">
            Mode Demo Sandbox &bull; Akses Penuh
          </p>
          <p className="text-slate-300 text-xs leading-relaxed max-w-xs mx-auto pt-1">
            Anda dapat mencoba semua fitur kasir, transaksi, menu, dan laporan keuangan tanpa memengaruhi toko asli.
          </p>
        </div>

        {/* Security badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Data Toko Utama 100% Aman Terisolasi</span>
        </div>

        {/* Status / Loading Bar */}
        <div className="space-y-3 pt-2">
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-700 ease-out ${
                isReady ? 'w-full' : 'w-2/3 animate-pulse'
              }`}
            />
          </div>
          <p className="text-xs text-slate-400 animate-pulse">
            {isReady ? 'Menuju ke aplikasi kasir...' : 'Menyiapkan produk & data simulasi...'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/kasir', { replace: true })}
            className="w-full py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir POS</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full py-3 px-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-xs border border-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

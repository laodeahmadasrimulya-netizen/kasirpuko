import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard } from 'lucide-react';
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="relative max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 text-center text-slate-800 shadow-xl shadow-slate-900/5 space-y-6 animate-scaleUp">
        {/* Logo Badge */}
        <div className="relative mx-auto w-24 h-24">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white p-1 shadow-md border-2 border-puko-500/30">
            <img
              src="/logo.png"
              alt="PUKO Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          {/* Tulisan Demo Hijau Tanpa Ikon */}
          <div className="absolute -bottom-1 -right-1 bg-puko-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm tracking-wider">
            DEMO
          </div>
        </div>

        {/* Text Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Kasir PUKO POS
          </h1>
          <p className="text-puko-700 text-xs font-semibold leading-relaxed max-w-xs mx-auto">
            Anda dapat mencoba semua fitur kasir, transaksi, menu, dan laporan keuangan tanpa memengaruhi toko asli.
          </p>
        </div>

        {/* Status / Loading Bar Warna Hijau */}
        <div className="space-y-3 pt-2">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
            <div
              className={`h-full bg-puko-600 rounded-full transition-all duration-700 ease-out ${
                isReady ? 'w-full' : 'w-2/3 animate-pulse'
              }`}
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {isReady ? 'Menuju ke aplikasi kasir...' : 'Menyiapkan produk & data simulasi...'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/kasir', { replace: true })}
            className="w-full py-3 px-3 rounded-2xl bg-puko-600 hover:bg-puko-700 text-white font-extrabold text-xs shadow-md shadow-puko-900/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir POS</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

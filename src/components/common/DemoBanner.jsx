import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DemoBanner = () => {
  const { isDemo, resetDemo, exitDemoMode } = useAuth();
  const navigate = useNavigate();
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isDemo) return null;

  const handleReset = async () => {
    if (!window.confirm('Reset data demo ke kondisi awal bersih? Transaksi dan menu uji coba yang baru Anda buat akan dikembalikan ke data awal.')) {
      return;
    }
    setIsResetting(true);
    try {
      resetDemo();
      setShowSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExit = () => {
    exitDemoMode();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-amber-950 px-3 sm:px-6 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/30 shadow-xs z-30 sticky top-0">
      {/* Left: Info Demo */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="bg-amber-950 text-amber-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Mode Demo</span>
        </span>
        <p className="text-amber-950 text-xs font-medium truncate">
          <span className="font-bold">Sandbox Uji Coba</span> &bull; Bebas coba transaksi, data toko utama 100% aman
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {showSuccess ? (
          <span className="flex items-center gap-1 text-emerald-950 bg-emerald-300/80 px-2 py-1 rounded-lg text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Data Direset!</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="px-2.5 py-1 bg-white/90 hover:bg-white text-amber-950 text-xs font-extrabold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Kembalikan seluruh data demo ke kondisi awal"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleExit}
          className="px-2.5 py-1 bg-amber-950 hover:bg-black text-amber-100 text-xs font-extrabold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="Keluar dari mode demo dan kembali ke halaman login"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
};

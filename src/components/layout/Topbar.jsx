import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, LogOut, User, ArrowRightLeft } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';

export const Topbar = () => {
  const { settings } = useSettings();
  const { user, logout, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Mobile Brand / Branch Info */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-xs bg-white p-0.5 border border-puko-300/60 flex items-center justify-center">
            <img src="/logo.png" alt="PUKO" className="w-full h-full object-cover rounded-full" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-800 leading-tight">
              {settings?.storeName || 'PUKO'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              No Serat No Pahit
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full">
          <MapPin className="w-3.5 h-3.5 text-puko-600" />
          <span className="font-semibold text-slate-700">
            {settings?.branch || 'Outlet SMK 1 Kendari'}
          </span>
        </div>
      </div>

      {/* Right Side: Live Clock & User Role Profile Dropdown */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Realtime clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time || '--:--:--'}</span>
        </div>

        {/* User Role / Profile Trigger with Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 py-1 px-1 bg-transparent hover:opacity-85 transition-opacity cursor-pointer select-none outline-none focus:outline-none focus:ring-0 active:outline-none active:ring-0 border-none shadow-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            title="Klik untuk beralih akun atau keluar"
          >
            {/* Tulisan Nama Pengguna / Role: Di sebelah kiri, warna hitam tanpa bayangan kotak */}
            <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
              {user?.name || (user?.role === 'ADMIN' ? 'Admin' : 'Kasir')}
            </span>

            {/* WhatsApp-Style Default Profile Avatar: Di sebelah kanan, tanpa bayangan */}
            <div className="w-7 h-7 rounded-full bg-[#DFE5E7] border border-slate-300/70 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
              <User className="w-3.5 h-3.5 text-slate-600 fill-slate-500/80" />
            </div>
          </button>

          {/* Dropdown Menu (Logout & Switch Account) */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 py-1.5 z-50 animate-fadeIn divide-y divide-slate-100 shadow-md">
              {/* Profile Header */}
              <div className="px-3.5 py-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#DFE5E7] flex items-center justify-center text-slate-600 border border-slate-300 shrink-0">
                  <User className="w-4 h-4 text-slate-600 fill-slate-500/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800 truncate">
                    {user?.name || (user?.role === 'ADMIN' ? 'Admin' : 'Kasir 01')}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 truncate">
                    {user?.email || (user?.role === 'ADMIN' ? 'Akun Administrator' : 'Akun Kasir Outlet')}
                  </p>
                </div>
              </div>

              {/* Actions: Admin can switch to Kasir or Logout; Kasir can ONLY Logout */}
              <div className="p-1 space-y-0.5">
                {/* Tombol Akses Mode Demo Langsung */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/demo');
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-amber-50 text-amber-900 flex items-center gap-2.5 transition-colors cursor-pointer text-xs font-bold"
                >
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{user?.isDemo ? 'Menu Sandbox Demo' : 'Buka Mode Demo (Sandbox)'}</span>
                </button>

                {user?.role === 'ADMIN' && !user?.isDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      quickLogin('KASIR');
                      setIsMenuOpen(false);
                      navigate('/kasir');
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Beralih ke Akun Kasir</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 transition-colors cursor-pointer text-xs font-bold"
                >
                  <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{user?.isDemo ? 'Keluar Mode Demo' : 'Keluar (Logout)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

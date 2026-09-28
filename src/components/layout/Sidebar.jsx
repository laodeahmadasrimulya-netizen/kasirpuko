import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Wallet,
  History,
  Settings,
  LogOut,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Beranda', icon: LayoutDashboard, roles: ['ADMIN', 'KASIR'] },
  { path: '/kasir', label: 'Kasir (POS)', icon: Store, badge: 'POS', roles: ['ADMIN', 'KASIR'] },
  { path: '/pengeluaran', label: 'Pengeluaran', icon: Wallet, roles: ['ADMIN', 'KASIR'] },
  { path: '/riwayat', label: 'Riwayat Transaksi', icon: History, roles: ['ADMIN', 'KASIR'] },
  { path: '/pengaturan', label: 'Pengaturan', icon: Settings, roles: ['ADMIN'] },
];

export const Sidebar = () => {
  const { totalItemsCount } = useCart();
  const { settings } = useSettings();
  const { user, logout } = useAuth();

  // Kasir only sees Kasir POS; Admin sees all
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role || 'ADMIN')
  );

  return (
    <aside className="hidden lg:flex flex-col w-20 xl:w-64 bg-gradient-to-b from-[#143d22] via-[#0f301b] to-[#0a2313] text-puko-100 h-screen sticky top-0 border-r border-[#1d4d2c] shrink-0 z-30 select-none transition-all duration-300 shadow-xl">
      {/* Brand Header */}
      <div className="p-3.5 xl:p-6 border-b border-[#1d4d2c]">
        <div className="flex items-center justify-center xl:justify-start gap-3">
          <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-full overflow-hidden shrink-0 shadow-lg shadow-black/40 bg-white p-0.5 border border-puko-400/40 flex items-center justify-center">
            <img src="/logo.png" alt="PUKO Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <div className="hidden xl:block min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-lg text-white tracking-wider">
                {user?.isDemo ? 'PUKO (mode demo)' : (settings?.storeName || 'PUKO')}
              </h1>
              <span className="text-[10px] bg-puko-500/30 text-puko-200 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-puko-400/40">
                POS
              </span>
            </div>
            <p className="text-[11px] text-puko-200/80 truncate max-w-[140px]">
              {settings?.tagline || 'Alpukat Kocok No Serat'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 xl:px-3 py-4 xl:py-6 space-y-1.5 overflow-y-auto">
        <div className="hidden xl:flex px-3 pb-2 text-[11px] font-bold text-puko-300 uppercase tracking-wider items-center justify-between">
          <span>Menu Utama</span>
          {user?.role === 'KASIR' && (
            <span className="text-[9px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.2 rounded font-mono font-bold">
              Mode Kasir
            </span>
          )}
        </div>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) => `
                flex items-center justify-center xl:justify-between px-2 xl:px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 relative group
                ${
                  isActive
                    ? 'bg-puko-500 text-white font-extrabold shadow-lg shadow-black/30 border border-puko-400/30'
                    : 'text-puko-100/75 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <div className="flex items-center justify-center xl:justify-start gap-3">
                <div className="relative flex items-center justify-center">
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.path === '/kasir' && totalItemsCount > 0 && (
                    <span className="xl:hidden absolute -top-1.5 -right-2 bg-amber-400 text-slate-900 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {totalItemsCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline">{item.label}</span>
              </div>

              {/* Desktop xl Badges for active cart or tag */}
              {item.path === '/kasir' && totalItemsCount > 0 ? (
                <span className="hidden xl:inline-block bg-amber-400 text-slate-900 text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                  {totalItemsCount}
                </span>
              ) : item.badge ? (
                <span className="hidden xl:inline-block text-[10px] bg-black/30 text-puko-200 border border-puko-700/50 px-1.5 py-0.5 rounded font-mono">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout Button Only */}
      <div className="p-3 xl:p-4 border-t border-[#1d4d2c] mt-auto">
        <button
          type="button"
          onClick={logout}
          title="Keluar (Logout)"
          className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all cursor-pointer border border-rose-500/50"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline">Keluar (Logout)</span>
        </button>
      </div>
    </aside>
  );
};

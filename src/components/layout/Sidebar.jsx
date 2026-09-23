import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Wallet,
  Coffee,
  History,
  Settings,
  Sparkles,
  ShoppingBag,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Beranda', icon: LayoutDashboard, roles: ['ADMIN'] },
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
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 h-screen sticky top-0 border-r border-slate-800 shrink-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-lg shadow-puko-950/40 bg-white p-0.5 border border-puko-500/30 flex items-center justify-center">
            <img src="/logo.png" alt="PUKO Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-lg text-white tracking-wider">
                {settings?.storeName || 'PUKO'}
              </h1>
              <span className="text-[10px] bg-puko-500/20 text-puko-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                POS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
              {settings?.tagline || 'Alpukat Kocok No Serat'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Menu Utama</span>
          {user?.role === 'KASIR' && (
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">
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
              className={({ isActive }) => `
                flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150
                ${
                  isActive
                    ? 'bg-puko-600 text-white font-semibold shadow-md shadow-puko-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </div>

              {/* Badges for active cart or tag */}
              {item.path === '/kasir' && totalItemsCount > 0 ? (
                <span className="bg-amber-400 text-slate-900 text-xs font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                  {totalItemsCount}
                </span>
              ) : item.badge ? (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User status & Logout card */}
      <div className="p-3.5 m-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600/50 text-slate-300 flex items-center justify-center font-bold text-base shadow-xs shrink-0 overflow-hidden">
            {user?.role === 'ADMIN' ? (
              <ShieldCheck className="w-4 h-4 text-amber-300" />
            ) : user?.avatar && user.avatar !== '🥑' ? (
              user.avatar
            ) : (
              <User className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">
              {user?.name || (user?.role === 'ADMIN' ? 'Administrator' : 'Kasir 01')}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                  user?.role === 'ADMIN'
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                }`}
              >
                {user?.role === 'ADMIN' ? 'Admin' : 'Kasir'}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="w-full py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700/50 hover:border-rose-500/40 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar (Logout)</span>
        </button>
      </div>
    </aside>
  );
};

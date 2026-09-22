import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Store, History, Settings } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { path: '/kasir', label: 'Kasir', icon: Store, roles: ['ADMIN', 'KASIR'] },
  { path: '/riwayat', label: 'Riwayat', icon: History, roles: ['ADMIN', 'KASIR'] },
  { path: '/pengaturan', label: 'Setting', icon: Settings, roles: ['ADMIN'] },
];

export const BottomNav = () => {
  const { totalItemsCount } = useCart();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role || 'ADMIN')
  );

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative
                ${
                  isActive
                    ? 'text-puko-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }
              `}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.path === '/kasir' && totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItemsCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};


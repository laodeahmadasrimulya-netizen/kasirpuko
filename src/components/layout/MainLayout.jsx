import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { ReceiptModal } from '../common/ReceiptModal';
import { useTransactions } from '../../context/TransactionContext';

export const MainLayout = () => {
  const { activeReceipt, setActiveReceipt } = useTransactions();

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Navbar */}
        <Topbar />

        {/* Dynamic Page Routed Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Receipt Modal (pops up after successful order or from transaction history) */}
      <ReceiptModal
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
        transaction={activeReceipt}
      />
    </div>
  );
};

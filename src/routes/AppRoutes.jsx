import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { CashierPage } from '../pages/Cashier';
import { DashboardPage } from '../pages/Dashboard';
import { ProductsPage } from '../pages/Products';
import { TransactionsPage } from '../pages/Transactions';
import { ExpensesPage } from '../pages/Expenses';
import { SettingsPage } from '../pages/Settings';
import { LoginPage } from '../pages/Auth/Login';
import { AuthCallback } from '../pages/Auth/AuthCallback';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes: Login & Auth Callback */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected Routes wrapped in MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/kasir" replace />} />

        {/* Kasir POS: Accessible by both ADMIN and KASIR */}
        <Route
          path="/kasir"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'KASIR']}>
              <CashierPage />
            </ProtectedRoute>
          }
        />

        {/* Pengeluaran Toko: Accessible by both ADMIN and KASIR */}
        <Route
          path="/pengeluaran"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'KASIR']}>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Exclusive: Dashboard, Menu Management, Transaction History, Settings */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Navigate to="/pengaturan?tab=menu" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/riwayat"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'KASIR']}>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengaturan"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/kasir" replace />} />
    </Routes>
  );
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import { playSuccessSound } from '../utils/sound';
import { useIngredients } from './IngredientContext';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabaseClient';
import { storeService } from '../services/storeService';

const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
  const { user } = useAuth();
  const { deductForOrder } = useIngredients();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    todayRevenue: 0,
    todayOrdersCount: 0,
    itemsCount: 0,
    averageOrderValue: 0,
    totalAllTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Load transactions and summary (supports silent background sync)
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [list, sum] = await Promise.all([
        transactionService.getAll(),
        transactionService.getSummary(),
      ]);
      setTransactions(list);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, user?.storeId, user?.id]);

  // Realtime subscription via Supabase Postgres Changes
  useEffect(() => {
    const storeId = storeService.getActiveStoreId(user);
    if (storeService.isDemoStore(storeId)) return;

    const channelName = `realtime-transactions-${storeId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const itemStore = payload.new?.store_id || payload.old?.store_id;
          if (itemStore && itemStore !== storeId) return;

          // Silent background sync
          loadData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, user?.storeId, user?.id]);

  // Refetch when browser window regains focus or tab becomes visible
  useEffect(() => {
    const handleFocus = () => {
      loadData(true);
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  // Record a new transaction
  const recordTransaction = async (txData) => {
    try {
      const savedTx = await transactionService.create(txData);
      setTransactions((prev) => [savedTx, ...prev]);
      
      // Deduct raw ingredients stock automatically
      if (txData?.items && Array.isArray(txData.items)) {
        deductForOrder(txData.items);
      }

      // Play success chime
      playSuccessSound();

      // Refresh summary
      const sum = await transactionService.getSummary();
      setSummary(sum);

      // Set active receipt for printing / preview modal
      setActiveReceipt(savedTx);
      return savedTx;
    } catch (err) {
      console.error('Failed to record transaction', err);
      throw err;
    }
  };

  // Clear history
  const clearHistory = async () => {
    try {
      await transactionService.clearHistory();
      setTransactions([]);
      const sum = await transactionService.getSummary();
      setSummary(sum);
    } catch (err) {
      console.error('Failed to clear transactions', err);
    }
  };

  // Delete specific transactions by IDs
  const deleteTransactions = async (ids) => {
    try {
      await transactionService.deleteTransactions(ids);
      setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
      const sum = await transactionService.getSummary();
      setSummary(sum);
    } catch (err) {
      console.error('Failed to delete transactions', err);
    }
  };

  const value = {
    transactions,
    summary,
    isLoading,
    activeReceipt,
    setActiveReceipt,
    recordTransaction,
    clearHistory,
    deleteTransactions,
    refreshTransactions: loadData,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};

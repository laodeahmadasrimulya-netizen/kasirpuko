import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { expenseService } from '../services/expenseService';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabaseClient';
import { storeService } from '../services/storeService';

const ExpenseContext = createContext(null);

export const ExpenseProvider = ({ children }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    todayTotal: 0,
    todayCount: 0,
    monthTotal: 0,
    monthCount: 0,
    allTimeTotal: 0,
    totalCount: 0,
    categoryBreakdown: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load all expenses and summary (supports silent background sync)
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [list, sum] = await Promise.all([
        expenseService.getAll(),
        expenseService.getSummary(),
      ]);
      setExpenses(list);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load expenses:', err);
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

    const channelName = `realtime-expenses-${storeId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
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

  // Add new expense
  const addExpense = async (data) => {
    try {
      const newExp = await expenseService.create(data);
      setExpenses((prev) => [newExp, ...prev]);
      const sum = await expenseService.getSummary();
      setSummary(sum);
      return newExp;
    } catch (err) {
      console.error('Failed to add expense:', err);
      throw err;
    }
  };

  // Update existing expense
  const updateExpense = async (id, data) => {
    try {
      const updated = await expenseService.update(id, data);
      setExpenses((prev) => prev.map((item) => (item.id === id ? updated : item)));
      const sum = await expenseService.getSummary();
      setSummary(sum);
      return updated;
    } catch (err) {
      console.error('Failed to update expense:', err);
      throw err;
    }
  };

  // Delete expense
  const deleteExpense = async (id) => {
    try {
      await expenseService.delete(id);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      const sum = await expenseService.getSummary();
      setSummary(sum);
      return true;
    } catch (err) {
      console.error('Failed to delete expense:', err);
      throw err;
    }
  };

  // Delete multiple expenses
  const deleteExpenses = async (ids) => {
    try {
      await expenseService.deleteExpenses(ids);
      setExpenses((prev) => prev.filter((item) => !ids.includes(item.id)));
      const sum = await expenseService.getSummary();
      setSummary(sum);
      return true;
    } catch (err) {
      console.error('Failed to delete expenses:', err);
      throw err;
    }
  };

  // Clear all expenses
  const clearExpenses = async () => {
    try {
      await expenseService.clearHistory();
      setExpenses([]);
      setSummary({
        todayTotal: 0,
        todayCount: 0,
        monthTotal: 0,
        monthCount: 0,
        allTimeTotal: 0,
        totalCount: 0,
        categoryBreakdown: {},
      });
      return true;
    } catch (err) {
      console.error('Failed to clear expenses:', err);
      throw err;
    }
  };

  const value = {
    expenses,
    summary,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteExpenses,
    clearExpenses,
    clearHistory: clearExpenses,
    refreshExpenses: loadData,
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};

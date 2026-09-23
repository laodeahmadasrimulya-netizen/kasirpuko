import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import { playSuccessSound } from '../utils/sound';
import { useIngredients } from './IngredientContext';

const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
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

  // Load transactions and summary
  const loadData = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
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

  const value = {
    transactions,
    summary,
    isLoading,
    activeReceipt,
    setActiveReceipt,
    recordTransaction,
    clearHistory,
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

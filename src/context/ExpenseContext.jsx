import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { expenseService } from '../services/expenseService';
import { useAuth } from './AuthContext';

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

  // Load all expenses and summary
  const loadData = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, user?.storeId, user?.id]);

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

  const value = {
    expenses,
    summary,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
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

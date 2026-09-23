import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ingredientService } from '../services/ingredientService';

const IngredientContext = createContext(null);

export const IngredientProvider = ({ children }) => {
  const [ingredients, setIngredients] = useState(() => ingredientService.getAll());

  // Reload from storage
  const reloadIngredients = useCallback(() => {
    setIngredients(ingredientService.getAll());
  }, []);

  // Sync across tabs/storage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'puko_ingredients_v1') {
        reloadIngredients();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [reloadIngredients]);

  // Deduct stock for ordered items
  const deductForOrder = useCallback((items) => {
    const res = ingredientService.deductForOrder(items);
    if (res?.ingredients) {
      setIngredients(res.ingredients);
    } else if (res) {
      setIngredients(res);
    }
    return res;
  }, []);

  // Adjust stock by delta (+ or -)
  const adjustStock = useCallback((id, delta) => {
    const updated = ingredientService.adjustStock(id, delta);
    setIngredients(updated);
    return updated;
  }, []);

  // Update stock level directly (custom stock & initial stock)
  const updateStock = useCallback((id, newStock, newInitialStock) => {
    const updated = ingredientService.updateStock(id, newStock, newInitialStock);
    setIngredients(updated);
    return updated;
  }, []);

  // Add new ingredient
  const addIngredient = useCallback((data) => {
    const updated = ingredientService.addIngredient(data);
    setIngredients(updated);
    return updated;
  }, []);

  // Delete custom ingredient
  const deleteIngredient = useCallback((id) => {
    const updated = ingredientService.deleteIngredient(id);
    setIngredients(updated);
    return updated;
  }, []);

  // Update portion per cup
  const updatePortion = useCallback((id, newPortion) => {
    const updated = ingredientService.updatePortion(id, newPortion);
    setIngredients(updated);
    return updated;
  }, []);

  // Reset to default
  const resetIngredients = useCallback(() => {
    const def = ingredientService.resetToDefault();
    setIngredients(def);
    return def;
  }, []);

  const value = {
    ingredients,
    deductForOrder,
    adjustStock,
    updateStock,
    addIngredient,
    deleteIngredient,
    updatePortion,
    resetIngredients,
    formatStock: ingredientService.formatStock,
    formatUsed: (ing) => ingredientService.formatUsed(ing),
    formatAmount: (amt, ing) => ingredientService.formatAmount(amt, ing),
    getUsedAmount: (ing) => ingredientService.getUsedAmount(ing),
    calcCups: ingredientService.calcCups,
    calcBottleneckCups: () => ingredientService.calcBottleneckCups(ingredients),
  };

  return (
    <IngredientContext.Provider value={value}>
      {children}
    </IngredientContext.Provider>
  );
};

export const useIngredients = () => {
  const context = useContext(IngredientContext);
  if (!context) {
    throw new Error('useIngredients must be used within an IngredientProvider');
  }
  return context;
};

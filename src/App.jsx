import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProductProvider } from './context/ProductContext';
import { TransactionProvider } from './context/TransactionContext';
import { IngredientProvider } from './context/IngredientContext';
import { CartProvider } from './context/CartContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ProductProvider>
            <IngredientProvider>
              <TransactionProvider>
                <ExpenseProvider>
                  <CartProvider>
                    <AppRoutes />
                  </CartProvider>
                </ExpenseProvider>
              </TransactionProvider>
            </IngredientProvider>
          </ProductProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

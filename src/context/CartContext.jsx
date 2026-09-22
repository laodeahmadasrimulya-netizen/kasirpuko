import React, { createContext, useContext, useState, useMemo } from 'react';
import { playAddMenuSound } from '../utils/sound';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TUNAI');
  const [amountPaid, setAmountPaid] = useState('');

  // Add item to cart or increase quantity
  const addItem = (product) => {
    if (product.isAvailable === false) return;
    playAddMenuSound();

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === product.id);
      const unitPrice = product.harga || product.price || 0;
      const productName = product.nama || product.name;
      const productImage = product.gambar || product.image;

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const item = updated[existingIndex];
        const newQty = (item.qty || 1) + 1;
        const itemPrice = item.harga || item.price || unitPrice;
        updated[existingIndex] = {
          ...item,
          qty: newQty,
          subtotal: newQty * itemPrice,
        };
        return updated;
      }

      return [
        ...prevItems,
        {
          id: product.id,
          nama: productName,
          name: productName,
          harga: unitPrice,
          price: unitPrice,
          gambar: productImage,
          image: productImage,
          category: product.category,
          isAvailable: product.isAvailable !== false,
          qty: 1,
          notes: '',
          subtotal: unitPrice,
        },
      ];
    });
  };

  // Increase item quantity by 1
  const increaseItem = (productId) => {
    playAddMenuSound();
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === productId) {
          const newQty = (item.qty || 1) + 1;
          const itemPrice = item.harga || item.price || 0;
          return {
            ...item,
            qty: newQty,
            subtotal: newQty * itemPrice,
          };
        }
        return item;
      })
    );
  };

  // Decrease quantity or remove if 0
  const removeItem = (productId) => {
    setItems((prevItems) => {
      const existing = prevItems.find((item) => item.id === productId);
      if (!existing) return prevItems;

      if (existing.qty <= 1) {
        return prevItems.filter((item) => item.id !== productId);
      }

      return prevItems.map((item) => {
        if (item.id === productId) {
          const newQty = item.qty - 1;
          const itemPrice = item.harga || item.price || 0;
          return {
            ...item,
            qty: newQty,
            subtotal: newQty * itemPrice,
          };
        }
        return item;
      });
    });
  };

  // Remove completely
  const deleteItem = (productId) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  // Update specific quantity
  const updateItemQty = (productId, qty) => {
    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      deleteItem(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId
          ? { ...item, qty: parsedQty, subtotal: parsedQty * item.price }
          : item
      )
    );
  };

  // Update item note
  const updateItemNotes = (productId, notes) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, notes } : item
      )
    );
  };

  // Clear entire cart
  const clearCart = () => {
    setItems([]);
    setDiscount(0);
    setCustomerName('');
    setPaymentMethod('TUNAI');
    setAmountPaid('');
  };

  // Calculated totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const total = useMemo(() => {
    const finalVal = subtotal - (Number(discount) || 0);
    return finalVal > 0 ? finalVal : 0;
  }, [subtotal, discount]);

  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty, 0);
  }, [items]);

  const changeAmount = useMemo(() => {
    const paid = Number(amountPaid) || 0;
    return paid >= total ? paid - total : 0;
  }, [amountPaid, total]);

  const isCartEmpty = items.length === 0;

  const value = {
    items,
    subtotal,
    discount,
    setDiscount,
    total,
    totalItemsCount,
    customerName,
    setCustomerName,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    changeAmount,
    isCartEmpty,
    addItem,
    increaseItem,
    removeItem,
    deleteItem,
    updateItemQty,
    updateItemNotes,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

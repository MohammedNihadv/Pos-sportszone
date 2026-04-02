import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useApp } from './AppContext';
import { saveSession, recoverSession, clearSession } from '../utils/sessionRecovery';

const CartContext = createContext(null);

const TAX_RATE = 0.09; // 9% each for CGST & SGST

export function CartProvider({ children }) {
  const { addToast } = useApp();
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [recoveryOffered, setRecoveryOffered] = useState(false);

  // Check for crash recovery on mount
  useEffect(() => {
    if (recoveryOffered) return;
    const recoveredCart = recoverSession();
    if (recoveredCart && recoveredCart.length > 0) {
      setCart(recoveredCart);
      addToast(`Recovered ${recoveredCart.length} item(s) from previous session`, 'success');
    }
    setRecoveryOffered(true);
  }, []);

  // Persist cart on every change
  useEffect(() => {
    saveSession(cart);
  }, [cart]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    addToast(`${product.name} added to cart`, 'success');
  }, [addToast]);

  const updateQty = useCallback((id, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
    }
  }, []);

  const updateItemPrice = useCallback((id, price) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, price: parseFloat(price) || 0 } : i));
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount(0);
    clearSession();
  }, []);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = Math.min(discount, subtotal);
  
  // Tax-Inclusive Logic
  const grandTotal = subtotal - discountAmount;
  const taxableAmount = grandTotal / (1 + (TAX_RATE * 2));
  const cgst = (grandTotal - taxableAmount) / 2;
  const sgst = cgst;

  return (
    <CartContext.Provider value={{
      cart, addToCart, updateQty, updateItemPrice, removeFromCart, clearCart,
      discount, setDiscount,
      subtotal, discountAmount, cgst, sgst, grandTotal,
      itemCount: cart.reduce((s, i) => s + i.qty, 0),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

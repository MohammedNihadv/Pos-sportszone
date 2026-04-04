import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useApp } from './AppContext';
import { saveSession, recoverSession, clearSession } from '../utils/sessionRecovery';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { addToast, appSettings } = useApp();
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [recoveryOffered, setRecoveryOffered] = useState(false);

  // Dynamic tax from global settings
  const cgstRate = (parseFloat(appSettings?.cgstRate) || 0) / 100;
  const sgstRate = (parseFloat(appSettings?.sgstRate) || 0) / 100;

  // Check for crash recovery on mount
  useEffect(() => {
    if (recoveryOffered) return;
    const recoveredCart = recoverSession();
    if (recoveredCart && recoveredCart.length > 0) {
      setCart(recoveredCart);
      addToast(`Recovered ${recoveredCart.length} item(s) from previous session`, 'success');
    }
    setRecoveryOffered(true);
  }, [recoveryOffered, addToast]);

  // Persist cart on every change
  useEffect(() => {
    saveSession(cart);
  }, [cart]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      const currentQty = existing ? existing.qty : 0;
      
      if (currentQty >= product.stock) {
        addToast(`Cannot add more. Only ${product.stock} in stock.`, 'warning');
        return prev;
      }

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
      setCart(prev => {
        const item = prev.find(i => i.id === id);
        if (!item) return prev;
        
        // Ensure we don't exceed stock
        const maxStock = item.stock || 999; 
        const newQty = Math.min(qty, maxStock);
        
        if (qty > maxStock) {
          addToast(`Maximum stock of ${maxStock} reached.`, 'warning');
        }
        
        return prev.map(i => i.id === id ? { ...i, qty: newQty } : i);
      });
    }
  }, [addToast]);

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
  const totalTaxRate = cgstRate + sgstRate;
  const taxableAmount = totalTaxRate > 0 ? grandTotal / (1 + totalTaxRate) : grandTotal;
  const cgst = totalTaxRate > 0 ? (grandTotal - taxableAmount) * (cgstRate / totalTaxRate) : 0;
  const sgst = totalTaxRate > 0 ? (grandTotal - taxableAmount) * (sgstRate / totalTaxRate) : 0;

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

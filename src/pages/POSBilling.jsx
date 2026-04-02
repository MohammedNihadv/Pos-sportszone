import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Scan, Plus, Minus, Trash2, X, CheckCircle, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CartProvider, useCart } from '../context/CartContext';
import CheckoutModal from '../components/CheckoutModal';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../utils/sounds';

// ---- Add Product Quick Modal ----
const COMMON_EMOJIS = ['👕','👟','🩳','🧢','🏐','⚽','🏀','🏏','🎾','🏅','🎒','⌚','🛡️','🏋️'];

function QuickAddModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock: '', emoji: '👕' });
  
  const handleSave = async () => {
    if (!form.name || !form.price) return;
    const newProd = {
      ...form,
      price: parseFloat(form.price) || 0,
      cost: 0,
      category: 'Accessories',
      stock: parseInt(form.stock) || 0,
      emoji: form.emoji
    };

    if (window.api) {
      const saved = await window.api.saveProduct(newProd);
      onSave(saved);
    } else {
      onSave({ ...newProd, id: Date.now() });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-800">Quick Add Product</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {[['name','Product Name *'],['sku','SKU'],['price','Selling Price (₹) *'],['stock','Stock Qty']].map(([k,l]) => (
            <div key={k}>
              <label className="text-xs font-medium text-slate-500 mb-1 block uppercase tracking-wide">{l}</label>
              <input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                autoFocus={k === 'name'}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm transition-all" />
            </div>
          ))}
          
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block uppercase tracking-wide">Pick an Icon</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => { playSound('tap'); setForm(p => ({ ...p, emoji: em })); }}
                  className={`w-10 h-10 text-xl flex items-center justify-center rounded-xl border transition-all
                    ${form.emoji === em ? 'bg-blue-50 border-blue-500 shadow-sm scale-110' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:scale-105'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleSave} className="w-full mt-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />Save Product
        </button>
      </div>
    </div>
  );
}

function CartItem({ item }) {
  const { updateQty, updateItemPrice, removeFromCart } = useCart();
  const { darkMode } = useApp();
  const dm = darkMode;
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      className={`flex items-start gap-3 py-3 border-b last:border-b-0 ${dm ? 'border-slate-700' : 'border-slate-100'}`}
    >
      <div className="text-2xl leading-none pt-0.5">{item.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${dm ? 'text-white' : 'text-slate-800'}`}>{item.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>₹</span>
          <input 
            type="number"
            value={item.price}
            onChange={(e) => updateItemPrice(item.id, e.target.value)}
            className={`w-16 text-xs px-1 py-0.5 outline-none rounded transition-colors ${dm ? 'bg-slate-800 text-white focus:bg-slate-700' : 'bg-slate-50 text-slate-800 focus:bg-slate-200'}`}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <button onClick={() => updateQty(item.id, item.qty - 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <Minus className="w-3 h-3" />
          </button>
          <span className={`w-8 text-center text-sm font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{item.qty}</span>
          <button onClick={() => { playSound('pop'); updateQty(item.id, item.qty + 1); }}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{(item.price * item.qty).toLocaleString()}</p>
        <button onClick={() => removeFromCart(item.id)} className="mt-2 text-red-400 hover:text-red-600 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ---- Product Card with Animations ----
function ProductCard({ product, dm, onAdd }) {
  const [showPlus, setShowPlus] = useState(false);
  const timerRef = useRef(null);

  const handleClick = () => {
    playSound('pop');
    onAdd();
    setShowPlus(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowPlus(false), 500);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={`relative text-left p-3 rounded-xl border transition-shadow group ${dm ? 'bg-slate-900 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-md'}`}
    >
      <AnimatePresence>
        {showPlus && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -40, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute top-2 right-4 text-green-500 font-black text-xl z-10 pointer-events-none drop-shadow-md"
          >
            +1
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-4xl mb-2.5 transition-colors ${dm ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
        {product.emoji}
      </div>
      <p className={`font-semibold text-xs truncate ${dm ? 'text-white' : 'text-slate-800'}`}>{product.name}</p>
      <p className={`text-xs mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{product.sku}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-bold text-blue-600">₹{product.price}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${product.stock <= 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
          {product.stock}
        </span>
      </div>
    </motion.button>
  );
}

// ---- Main POS Content ----
function POSContent() {
  const { darkMode, addToast, products, setProducts, setSales } = useApp();
  const { cart, addToCart, clearCart, discount, setDiscount, subtotal, discountAmount, cgst, sgst, grandTotal } = useCart();
  const dm = darkMode;
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const searchRef = useRef(null);

  const filtered = (products || []).filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const completeSale = useCallback(async (paymentData) => {
    const saleData = {
      total: grandTotal,
      discount: discountAmount,
      items: cart,
      // Advanced payment fields
      paymentMethod: paymentData.paymentMethod,
      payments: paymentData.payments,
      amountPaid: paymentData.amountPaid,
      changeAmount: paymentData.changeAmount || 0,
      changeReturnMethod: paymentData.changeReturnMethod || null,
      paymentBreakdown: paymentData.paymentBreakdown,
    };

    if (window.api) {
      await window.api.saveSale(saleData);
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(i => i.id === p.id);
        return cartItem ? { ...p, stock: p.stock - cartItem.qty } : p;
      }));
    } else {
      // Browser-mode: save to context
      setSales(prev => [{ ...saleData, id: Date.now(), created_at: new Date().toISOString() }, ...prev]);
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(i => i.id === p.id);
        return cartItem ? { ...p, stock: p.stock - cartItem.qty } : p;
      }));
    }

    const changeInfo = paymentData.changeAmount > 0 
      ? ` | Change: ₹${paymentData.changeAmount.toFixed(2)} (${paymentData.changeReturnMethod === 'store-upi' ? 'Store UPI' : 'Cash'})` 
      : '';
    
    playSound('success');
    addToast(`Sale of ₹${grandTotal.toFixed(2)} completed! 🎉${changeInfo}`, 'success');

    // Offer receipt download
    if (window.api?.downloadReceipt) {
      const receiptSale = {
        ...saleData,
        id: window.api ? (await window.api.getSales()).find(s => Math.abs(s.total - grandTotal) < 0.01)?.id : Date.now(),
      };
      // Auto-download receipt PDF
      try {
        const result = await window.api.downloadReceipt(receiptSale);
        if (result?.success) {
          addToast('📄 Receipt saved to Documents/SportsZone/Receipts/', 'success');
        }
      } catch {}
    }

    clearCart();
    setShowCheckout(false);
    if (searchRef.current) searchRef.current.focus();
  }, [grandTotal, discountAmount, cart, addToast, clearCart, setProducts, setSales]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (showCheckout) return; // CheckoutModal handles its own shortcuts
      if (e.key === 'Escape') { clearCart(); }
      if (e.key === 'F9' || e.key === 'Enter') {
        if (e.target.tagName !== 'INPUT' && cart.length > 0) {
          e.preventDefault();
          setShowCheckout(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, showCheckout, clearCart]);

  // Auto-focus search on mount
  useEffect(() => { if (searchRef.current) searchRef.current.focus(); }, []);

  return (
    <div className={`flex h-full ${dm ? 'bg-slate-950' : 'bg-slate-50'}`} style={{height:'calc(100vh - 64px)'}}>
      {/* Left Panel: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-4 gap-3">
        {/* Search Bar */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Scan className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product name or SKU... (auto-focus)"
            className={`flex-1 outline-none bg-transparent text-sm ${dm ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          )}
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} dm={dm} onAdd={() => addToCart(product)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">No products found</p>
              <p className="text-sm">Try a different search term or add a new product</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <div className={`w-80 flex flex-col flex-shrink-0 border-l ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Cart Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <div>
            <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Current Order</h3>
            <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{cart.length} item type{cart.length !== 1 ? 's' : ''}</p>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Clear (ESC)
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto px-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <ShoppingCartIcon />
              <p className="text-sm font-medium mt-3">Cart is empty</p>
              <p className="text-xs mt-1 text-center">Click a product or search SKU to add items</p>
            </div>
          ) : (
            cart.map(item => <CartItem key={item.id} item={item} />)
          )}
        </div>



        {/* GST Summary */}
        <div className={`px-4 py-3 border-t space-y-1.5 ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
          <SummaryRow label="Subtotal" value={`₹${subtotal.toLocaleString()}`} dm={dm} />
          {discountAmount > 0 && <SummaryRow label="Discount" value={`-₹${discountAmount.toFixed(2)}`} valueClass="text-red-500" dm={dm} />}
          <SummaryRow label="CGST (9%)" value={`₹${cgst.toFixed(2)}`} dm={dm} />
          <SummaryRow label="SGST (9%)" value={`₹${sgst.toFixed(2)}`} dm={dm} />
          <div className={`pt-2 border-t flex justify-between items-center ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            <span className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-800'}`}>Grand Total</span>
            <span className="text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button — replaces old payment method buttons */}
        <div className={`px-4 py-4 border-t ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-base hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Checkout (F9)
          </button>
        </div>
      </div>

      {/* Advanced Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          onComplete={completeSale}
          dm={dm}
        />
      )}
      {showAddModal && <QuickAddModal onClose={() => setShowAddModal(false)} onSave={(p) => setProducts(prev => [...prev, p])} />}
    </div>
  );
}

function ShoppingCartIcon() {
  return (
    <svg className="w-14 h-14 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function SummaryRow({ label, value, valueClass = '', dm }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-xs font-semibold ${valueClass || (dm ? 'text-slate-300' : 'text-slate-700')}`}>{value}</span>
    </div>
  );
}

// Wrap with CartProvider
export default function POSBilling() {
  return (
    <CartProvider>
      <POSContent />
    </CartProvider>
  );
}

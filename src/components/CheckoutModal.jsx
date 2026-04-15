import { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, Banknote, Smartphone, ArrowRight, RotateCcw, Clock, AlertCircle, Download, MessageCircle, Copy, Search, User, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/sounds';

/**
 * Advanced Checkout Modal
 */

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, shortcut: 'C', color: 'emerald' },
  { id: 'upi', label: 'UPI', icon: Smartphone, shortcut: 'U', color: 'blue' },
  { id: 'credit', label: 'Pay Later', icon: Clock, shortcut: 'P', color: 'amber' },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function CheckoutModal({ onClose, onComplete, dm }) {
  const { cart, discount, setDiscount, discountAmount, grandTotal: total, subtotal, clearCart } = useCart();
  const { appSettings, customers, addToast } = useApp();
  
  // Progress State: 'method' → 'amount' → 'change' → 'receipt' → 'success'
  // Special: 'credit' step for Pay Later
  const [step, setStep] = useState('method');
  const [payments, setPayments] = useState([]); // [{method, amount}]
  const [currentMethod, setCurrentMethod] = useState(null);
  const [amountInput, setAmountInput] = useState('');
  const [changeReturnMethod, setChangeReturnMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  
  // Pay Later / Credit state
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditCustomerPhone, setCreditCustomerPhone] = useState('');
  const [creditAmountPaid, setCreditAmountPaid] = useState('0');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // WhatsApp state
  const [whatsappModal, setWhatsappModal] = useState({ open: false, phone: '' });
  
  const inputRef = useRef(null);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const overpaid = Math.max(0, totalPaid - total);
  const isFullyPaid = totalPaid >= total;

  // Focus input when entering amount step
  useEffect(() => {
    if ((step === 'amount' || step === 'credit') && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);

  const selectMethod = useCallback((method) => {
    playSound('tap');
    setCurrentMethod(method);
    if (method === 'credit') {
      setStep('credit');
    } else {
      setAmountInput(method === 'cash' ? '' : String(remaining));
      setStep('amount');
    }
  }, [remaining]);

  const addPayment = useCallback((method, amount) => {
    const newPayments = [...payments, { method, amount: parseFloat(amount) || 0 }];
    setPayments(newPayments);
    const newTotal = newPayments.reduce((s, p) => s + p.amount, 0);
    
    if (newTotal >= total) {
      const change = newTotal - total;
      if (change > 0 && newPayments.some(p => p.method === 'cash')) {
        setStep('change');
      } else {
        setStep('receipt');
      }
    } else {
      setCurrentMethod(null);
      setStep('method');
    }
  }, [payments, total]);

  const confirmAmount = useCallback(() => {
    playSound('click');
    const amt = parseFloat(amountInput);
    if (!amt || amt <= 0) return;
    addPayment(currentMethod || 'cash', amt);
  }, [amountInput, currentMethod, addPayment]);

  const payExact = () => {
    addPayment('cash', remaining);
  };

  const removePayment = (idx) => {
    playSound('click');
    setPayments(prev => prev.filter((_, i) => i !== idx));
    setStep('method');
    setChangeReturnMethod(null);
  };

  const finalize = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const salePayload = {
      total,
      items: cart,
      payments,
      amountPaid: totalPaid,
      changeAmount: overpaid,
      changeReturnMethod: overpaid > 0 ? changeReturnMethod : null,
      paymentMethod: payments.length === 1 ? payments[0].method : 'split',
      paymentBreakdown: payments,
      discount: discountAmount || 0,
      date: new Date().toISOString(),
    };
    
    setCompletedSale(salePayload);
    playSound('success');
    setStep('success');
    onComplete(salePayload);
  }, [total, cart, payments, totalPaid, overpaid, changeReturnMethod, onComplete, isProcessing, discountAmount]);

  const resetAll = () => {
    setPayments([]);
    setCurrentMethod(null);
    setAmountInput('');
    setChangeReturnMethod(null);
    setStep('method');
  };

  // Customer Filtering for Credit
  const filteredCustomers = (customers || []).filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  );

  const selectCustomer = (c) => {
    setCreditCustomerName(c.name);
    setCreditCustomerPhone(c.phone || '');
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
  };

  const finalizeCredit = useCallback(() => {
    if (!creditCustomerName.trim()) {
      addToast('Please enter or select a customer', 'warning');
      return;
    }
    const paid = parseFloat(creditAmountPaid) || 0;
    const pending = total - paid;
    
    const existing = (customers || []).find(c => c.name.toLowerCase() === creditCustomerName.toLowerCase());

    const creditSale = {
      total,
      items: cart,
      payments: paid > 0 ? [{ method: 'cash', amount: paid }] : [],
      amountPaid: paid,
      changeAmount: 0,
      changeReturnMethod: null,
      paymentMethod: 'credit',
      creditCustomer: creditCustomerName.trim(),
      customerPhone: creditCustomerPhone.trim(),
      creditPending: pending,
      discount: discountAmount || 0,
      date: new Date().toISOString(),
    };

    setCompletedSale(creditSale);
    playSound('success');
    setStep('success');
    onComplete(creditSale);
  }, [creditCustomerName, creditCustomerPhone, creditAmountPaid, total, cart, onComplete, customers, discountAmount, addToast]);

  // Keyboard shortcuts — skip when user is typing in an input/textarea/select
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (step === 'method') {
        // Only fire letter-shortcuts when NOT typing in a form field
        if (!isTyping) {
          if (e.key === 'c' || e.key === 'C') { e.preventDefault(); selectMethod('cash'); }
          if (e.key === 'u' || e.key === 'U') { e.preventDefault(); selectMethod('upi'); }
          if (e.key === 'p' || e.key === 'P') { e.preventDefault(); selectMethod('credit'); }
        }
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      }
      if (step === 'amount') {
        if (e.key === 'Enter') { e.preventDefault(); confirmAmount(); }
        if (e.key === 'Escape') { e.preventDefault(); setStep('method'); }
      }
      if (step === 'change') {
        if (!isTyping) {
          if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setChangeReturnMethod('cash'); }
          if (e.key === 'u' || e.key === 'U') { e.preventDefault(); setChangeReturnMethod('store-upi'); }
        }
        if (e.key === 'Enter' && changeReturnMethod) { e.preventDefault(); finalize(); }
      }
      if (step === 'receipt') {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      }
      if (step === 'success') {
        if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, currentMethod, changeReturnMethod, onClose, finalize, selectMethod, confirmAmount]);

  const methodLabel = (m) => {
    if (m === 'cash') return 'Cash';
    if (m === 'upi') return 'UPI';
    if (m === 'credit') return 'Pay Later';
    return m;
  };

  // ─── WhatsApp Bill Sharing ───
  const handleWhatsApp = async () => {
    playSound('pop');
    if (window.api?.getReceiptPreview && window.api?.copyToClipboard) {
      try {
        const url = await window.api.getReceiptPreview(completedSale);
        await window.api.copyToClipboard(url);
        addToast('Receipt copied! You can PASTE (Ctrl+V) it in WhatsApp.', 'info');
      } catch (err) {
        console.error('Copy preview failed:', err);
      }
    }
    setWhatsappModal({ open: true, phone: (completedSale.customerPhone || '').replace('+91', '') });
  };

  const confirmWhatsApp = async () => {
    const { phone } = whatsappModal;
    if (!phone || phone.length < 10) {
      addToast('Enter a valid 10-digit number', 'error');
      return;
    }

    try {
      const sale = completedSale;
      const now = new Date(sale.date || new Date());
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const cgstPct = parseFloat(appSettings?.cgstRate) || 0;
      const sgstPct = parseFloat(appSettings?.sgstRate) || 0;
      const taxPct = cgstPct + sgstPct;
      const grandTotal = sale.total || 0;
      const itemsSubtotal = (sale.items || []).reduce((sum, i) => sum + (i.price * i.qty), 0);
      const gstAmt = taxPct > 0 ? grandTotal - (grandTotal / (1 + (taxPct / 100))) : 0;
      
      let msg = `*${(appSettings?.businessName || 'SPORTS ZONE').toUpperCase()}*\n\n`;
      msg += `Invoice: #${sale.id || 'NEW'}\n`;
      msg += `Date: ${dateStr}\n`;
      msg += `--------------------------------\n\n`;
      msg += `*Items:*\n`;
      
      (sale.items || []).forEach(item => {
        msg += `• ${item.name} (x${item.qty}) - ₹${(item.price * item.qty).toLocaleString()}\n`;
      });
      
      msg += `\n--------------------------------\n`;
      msg += `Subtotal: ₹${itemsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}\n`;
      
      if (taxPct > 0) {
        msg += `GST (${taxPct}%): ₹${gstAmt.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}\n`;
      }
      if (sale.discount > 0) {
        msg += `Discount: -₹${sale.discount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}\n`;
      }
      
      msg += `*Total: ₹${grandTotal.toLocaleString('en-IN')}*\n`;
      msg += `--------------------------------\n\n`;
      
      let pMode = sale.paymentMethod ? methodLabel(sale.paymentMethod) : 'Cash';
      if (pMode === 'Split') pMode = (sale.paymentBreakdown || []).map(p => methodLabel(p.method)).join(' + ');
      
      msg += `Payment: ${pMode.toUpperCase()}\n`;
      msg += `Status: PAID\n\n`;
      msg += `Thank you for your purchase!\n`;
      msg += `We look forward to serving you again.\n\n`;
      msg += `${appSettings?.businessName || 'Sports Zone'}\n`;
      if (appSettings?.businessPhone) {
        msg += `+91${String(appSettings.businessPhone).replace(/^\+91/, '')}`;
      }
      
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      
      let opened = false;
      if (window.api?.openExternal) {
        try {
          await window.api.openExternal(waUrl);
          opened = true;
        } catch (e) {
          console.warn('openExternal failed, trying window.open fallback:', e);
        }
      }
      if (!opened) {
        window.open(waUrl, '_blank');
      }
      setWhatsappModal({ open: false, phone: '' });
    } catch (err) {
      addToast(`Failed to open WhatsApp: ${err.message || 'Unknown error'}`, 'error');
      console.error(err);
    }
  };

  // ─── Render ────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div onMouseDown={e => e.stopPropagation()} className={`rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden ${dm ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">
              {step === 'method' && 'Checkout'}
              {step === 'credit' && 'Record Credit (Pay Later)'}
              {step === 'amount' && `${methodLabel(currentMethod)} Payment`}
              {step === 'change' && 'Return Change'}
              {step === 'receipt' && 'Review & Pay'}
              {step === 'success' && 'Sale Complete ✓'}
            </h3>
            <p className="text-blue-100 text-xs mt-0.5">
              {step === 'method' && 'How is the customer paying?'}
              {step === 'amount' && 'Enter amount received'}
              {step === 'change' && 'How to return the change?'}
              {step === 'receipt' && 'Confirm payment breakdown'}
              {step === 'success' && 'Transaction complete!'}
            </p>
          </div>
          <button onClick={() => { playSound('click'); onClose(); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Bar */}
        <div className={`px-6 py-4 flex flex-col border-b ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex justify-between items-center mb-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
              {isFullyPaid ? '✓ Fully Paid' : `Remaining to Pay:`}
            </p>
            <p className={`text-2xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>
              ₹{(step === 'credit' ? (total - (parseFloat(creditAmountPaid) || 0)) : remaining).toFixed(2)}
            </p>
          </div>
          
          {step === 'method' && (
            <div className="flex items-center justify-between border-t border-dashed pt-3 mt-1 border-slate-200 dark:border-slate-600">
               <span className={`text-xs font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Apply Discount (₹)</span>
               <input
                type="number"
                value={discount}
                onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className={`w-28 text-right px-3 py-1.5 rounded-lg text-sm border outline-none font-bold transition-all shadow-sm
                  ${dm ? 'bg-slate-900 border-slate-700 text-red-400 focus:border-red-500' : 'bg-white border-slate-200 text-red-600 focus:border-red-400 focus:ring-2 focus:ring-red-100'}`}
              />
            </div>
          )}
        </div>

        {/* Payment Chips */}
        {payments.length > 0 && step !== 'receipt' && step !== 'success' && (
          <div className={`px-6 py-2 flex flex-wrap gap-2 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            {payments.map((p, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                ${p.method === 'cash' ? 'bg-emerald-100 text-emerald-700' : p.method === 'upi' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {methodLabel(p.method)}: ₹{p.amount.toLocaleString()}
                <button onClick={() => removePayment(i)} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        <div className="p-6">

          {/* ─── STEP 1: Payment Method Selection ─── */}
          {step === 'method' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon, shortcut, color }) => (
                  <button
                    key={id}
                    onClick={() => selectMethod(id)}
                    className={`py-5 px-3 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center gap-2 group
                      ${dm 
                        ? `bg-slate-800 border-slate-600 hover:border-${color}-500 text-white`
                        : `bg-white border-slate-200 hover:border-${color}-400 text-slate-700 hover:bg-${color}-50`
                      }`}
                  >
                    <Icon className={`w-7 h-7 text-${color}-500`} />
                    <span className="font-bold text-sm">{label}</span>
                    <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>{shortcut}</kbd>
                  </button>
                ))}
              </div>

              {remaining === total && (
                <button
                  onClick={payExact}
                  className={`w-full py-3 rounded-xl border-2 border-dashed font-semibold text-sm transition-all
                    ${dm ? 'border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-400' : 'border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600'}`}
                >
                  💵 Exact Cash (₹{total.toFixed(0)})
                </button>
              )}
            </div>
          )}

          {/* ─── STEP: Pay Later / Credit ─── */}
          {step === 'credit' && (
            <div className="space-y-4">
              <div className={`p-3 rounded-xl border flex gap-3 ${dm ? 'bg-amber-900/10 border-amber-900/50' : 'bg-amber-50 border-amber-100'}`}>
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className={`text-[11px] leading-relaxed ${dm ? 'text-amber-400' : 'text-amber-700'}`}>
                   Recoding credit requires customer identification. Please provide a name and mobile number.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className={`text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                    Customer Name *
                  </label>
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={customerSearch}
                      onChange={e => {
                        setCustomerSearch(e.target.value);
                        setCreditCustomerName(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => {
                        // Increased delay to ensure selection registers
                        setTimeout(() => setShowCustomerDropdown(false), 400);
                      }}
                      placeholder="e.g. Ramesh Kumar"
                      className={`w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-amber-500'}`}
                    />

                  {/* Dropdown */}
                  {showCustomerDropdown && (customerSearch.length > 0) && (
                    <div className={`absolute z-20 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onMouseDown={() => selectCustomer(c)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-amber-50 text-slate-800 transition-colors border-b last:border-0 ${dm ? 'border-slate-700 text-slate-300' : 'border-slate-100 text-slate-800'}`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold">{c.name}</span>
                              <span className="text-xs opacity-60">{c.phone}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-30" />
                          </button>
                        ))
                      ) : (
                        <div className={`px-4 py-3 text-xs italic ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                          New customer will be created
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="tel"
                        value={creditCustomerPhone}
                        onChange={e => setCreditCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        className={`w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all pr-10
                          ${dm ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} 
                          ${creditCustomerPhone.length === 10 
                            ? (dm ? 'border-emerald-500/50 focus:border-emerald-500 bg-emerald-500/5' : 'border-emerald-200 focus:border-emerald-500 bg-emerald-50') 
                            : 'focus:border-amber-500'}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {creditCustomerPhone.length === 10 ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 animate-in zoom-in duration-300" />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${creditCustomerPhone.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      Paid Now (₹)
                    </label>
                    <input
                      type="number"
                      value={creditAmountPaid}
                      onChange={e => setCreditAmountPaid(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-lg text-sm border outline-none font-bold transition-all ${dm ? 'bg-slate-900 border-slate-700 text-emerald-400 focus:border-emerald-500' : 'bg-white border-slate-200 text-emerald-600 focus:border-emerald-500'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Pending Preview */}
              <div className={`p-4 rounded-xl border-t-2 border-dashed flex justify-between items-center ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <span className={`font-semibold text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Bill</span>
                <span className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{total.toFixed(2)}</span>
              </div>
              
              <div className={`p-4 rounded-xl flex justify-between items-center ${dm ? 'bg-amber-900/10' : 'bg-amber-50'}`}>
                <span className={`font-bold text-sm ${dm ? 'text-amber-500' : 'text-amber-600'}`}>Pending Balance</span>
                <span className="text-xl font-bold text-amber-700">₹{(total - (parseFloat(creditAmountPaid) || 0)).toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => { setStep('method'); setCurrentMethod(null); }}
                  className={`py-2.5 rounded-xl text-sm font-semibold border ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  Cancel
                </button>
                <button
                  onClick={finalizeCredit}
                  disabled={!creditCustomerName.trim() || creditCustomerPhone.length !== 10}
                  className="py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Record Credit
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Amount Entry ─── */}
          {step === 'amount' && (
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium mb-2 block ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                  {methodLabel(currentMethod)} Received
                </label>
                <input
                  ref={inputRef}
                  type="number"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  placeholder={`Min ₹${remaining.toFixed(0)}`}
                  className={`w-full px-4 py-4 border-2 rounded-xl text-3xl font-bold text-center outline-none transition-all
                    ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.filter(a => a >= remaining * 0.5).slice(0, 6).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmountInput(String(amt))}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all
                      ${dm ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Live Change Preview */}
              {parseFloat(amountInput) > remaining && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium mb-0.5">Change to Return</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{(parseFloat(amountInput) - remaining).toFixed(2)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setStep('method'); setCurrentMethod(null); }}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all
                    ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  ← Back
                </button>
                <button
                  onClick={confirmAmount}
                  disabled={!amountInput || parseFloat(amountInput) <= 0}
                  className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  Confirm <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Change Return Method ─── */}
          {step === 'change' && (
            <div className="space-y-4">
              <div className={`text-center p-4 rounded-xl ${dm ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                <p className={`text-sm font-medium ${dm ? 'text-emerald-300' : 'text-emerald-600'}`}>Change to Return</p>
                <p className="text-4xl font-bold text-emerald-600 mt-1">₹{overpaid.toFixed(2)}</p>
              </div>

              <p className={`text-sm font-semibold text-center ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                Return change via:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setChangeReturnMethod('cash')}
                  className={`py-5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all font-bold text-sm
                    ${changeReturnMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                      : dm ? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-emerald-500' : 'border-slate-200 text-slate-600 hover:border-emerald-400'
                    }`}
                >
                  <Banknote className="w-6 h-6" />
                  Cash
                  <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>C</kbd>
                </button>
                <button
                  onClick={() => setChangeReturnMethod('store-upi')}
                  className={`py-5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all font-bold text-sm
                    ${changeReturnMethod === 'store-upi'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : dm ? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-blue-500' : 'border-slate-200 text-slate-600 hover:border-blue-400'
                    }`}
                >
                  <Smartphone className="w-6 h-6" />
                  Store UPI
                  <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>U</kbd>
                </button>
              </div>

              <button
                onClick={finalize}
                disabled={!changeReturnMethod}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-base hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg">
                <CheckCircle className="w-5 h-5" /> Complete Sale (Enter)
              </button>
            </div>
          )}

          {/* ─── STEP 4: Review Summary ─── */}
          {step === 'receipt' && (
            <div className="space-y-4">
              <div className={`text-center py-3`}>
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className={`font-bold text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>Ready to Complete</p>
              </div>

              {/* Receipt Details */}
              <div className={`rounded-xl border divide-y text-sm ${dm ? 'bg-slate-800 border-slate-700 divide-slate-700' : 'bg-slate-50 border-slate-200 divide-slate-200'}`}>
                {discount > 0 ? (
                  <>
                    <div className="px-4 py-2.5 flex justify-between">
                      <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Subtotal</span>
                      <span className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between">
                      <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Discount</span>
                      <span className="font-semibold text-red-500">-₹{discount.toFixed(2)}</span>
                    </div>
                  </>
                ) : null}
                <div className={`px-4 py-3 flex justify-between ${discount > 0 ? 'bg-emerald-50/50' : ''}`}>
                  <span className={`font-medium ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Final Bill Amount</span>
                  <span className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-900'}`}>₹{total.toFixed(2)}</span>
                </div>
                {payments.map((p, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between">
                    <span className={dm ? 'text-slate-400' : 'text-slate-500'}>{methodLabel(p.method)}</span>
                    <span className="font-semibold text-emerald-600">₹{p.amount.toLocaleString()}</span>
                  </div>
                ))}
                {overpaid > 0 && (
                  <>
                    <div className="px-4 py-2.5 flex justify-between">
                      <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Change</span>
                      <span className="font-bold text-amber-600">₹{overpaid.toFixed(2)}</span>
                    </div>
                    {changeReturnMethod && (
                      <div className="px-4 py-2.5 flex justify-between">
                        <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Return Via</span>
                        <span className={`font-semibold ${dm ? 'text-white' : 'text-slate-700'}`}>
                          {changeReturnMethod === 'cash' ? '💵 Cash' : '📱 Store UPI'}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={resetAll}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 flex items-center justify-center gap-2 transition-all
                    ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button
                  onClick={finalize}
                  disabled={isProcessing}
                  className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                  <CheckCircle className="w-5 h-5" /> Complete
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 5: Success + Share ─── */}
          {step === 'success' && completedSale && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <p className={`font-bold text-xl ${dm ? 'text-white' : 'text-slate-800'}`}>₹{completedSale.total.toFixed(2)} Paid!</p>
                <p className={`text-sm mt-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Transaction recorded successfully</p>
              </div>

              <div className={`rounded-xl border divide-y text-sm ${dm ? 'bg-slate-800 border-slate-700 divide-slate-700' : 'bg-slate-50 border-slate-200 divide-slate-200'}`}>
                {completedSale.payments.map((p, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between">
                    <span className={dm ? 'text-slate-400' : 'text-slate-500'}>{methodLabel(p.method)}</span>
                    <span className="font-semibold text-emerald-600">₹{p.amount.toLocaleString()}</span>
                  </div>
                ))}
                {completedSale.changeAmount > 0 && (
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Change</span>
                    <span className="font-bold text-amber-600">₹{completedSale.changeAmount.toFixed(2)}</span>
                  </div>
                )}
                {completedSale.creditCustomer && (
                  <div className="px-4 py-2.5 flex justify-between bg-amber-50/50">
                    <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Credit Customer</span>
                    <span className="font-bold text-amber-700">{completedSale.creditCustomer}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={async () => {
                    playSound('click');
                    if (window.api?.downloadReceiptPng) await window.api.downloadReceiptPng(completedSale);
                  }}
                  className={`py-3 rounded-xl font-semibold text-xs border-2 flex flex-col items-center justify-center gap-1.5 transition-all
                    ${dm ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-blue-500 hover:text-blue-400' : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                >
                  <Download className="w-4 h-4" /> Receipt
                </button>
                <button
                  onClick={handleWhatsApp}
                  className={`py-3 rounded-xl font-semibold text-xs border-2 flex flex-col items-center justify-center gap-1.5 transition-all
                    ${whatsappModal.open
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-green-200'
                      : dm ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-500 hover:text-emerald-400' : 'border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp
                </button>
                <button
                  onClick={() => { clearCart(); onClose(); }}
                  className="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
                >
                  <ArrowRight className="w-4 h-4" /> New Sale
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp Modal Inlay */}
          {whatsappModal.open && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setWhatsappModal({ open: false, phone: '' })}></div>
              <div className={`relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border-2 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className={`text-xl font-black tracking-tight mb-2 ${dm ? 'text-white' : 'text-slate-900'}`}>WhatsApp Receipt</h3>
                  <p className={`text-xs font-medium mb-8 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                    Receipt already copied! Just enter the customer's number and paste (Ctrl+V) on WhatsApp.
                  </p>
                  
                  <input 
                    autoFocus
                    type="tel"
                    placeholder="987xxxxxxx"
                    className={`w-full h-16 px-6 rounded-2xl text-center text-xl font-black outline-none border-4 transition-all
                      ${dm 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500/50' 
                        : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-emerald-500/50 shadow-inner'}`}
                    value={whatsappModal.phone}
                    onChange={e => setWhatsappModal({...whatsappModal, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    onKeyDown={e => e.key === 'Enter' && confirmWhatsApp()}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-8">
                    <button 
                      onClick={() => setWhatsappModal({ open: false, phone: '' })}
                      className={`h-14 rounded-2xl font-bold transition-all ${dm ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmWhatsApp}
                      disabled={whatsappModal.phone.length < 10}
                      className="h-14 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      Send Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

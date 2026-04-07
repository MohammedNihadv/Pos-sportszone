import { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, Banknote, Smartphone, ArrowRight, RotateCcw, Clock, AlertCircle, Download, MessageCircle, Copy } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { playSound } from '../utils/sounds';

/**
 * Advanced Checkout Modal
 * 
 * Supports:
 * - Single payment: Cash / UPI / Card
 * - Split payment: e.g. ₹600 UPI + ₹400 Cash
 * - Cash change calculation + change return method
 * - Keyboard shortcuts (C=Cash, U=UPI, Enter=Complete, Esc=Close)
 * - Touch-friendly large buttons
 * - Receipt summary before completion
 */

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, shortcut: 'C', color: 'emerald' },
  { id: 'upi', label: 'UPI', icon: Smartphone, shortcut: 'U', color: 'blue' },
  { id: 'credit', label: 'Pay Later', icon: Clock, shortcut: 'P', color: 'amber' },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function CheckoutModal({ onClose, onComplete, dm }) {
  const { cart, discount, setDiscount, discountAmount, grandTotal: total, subtotal, clearCart } = useCart();
  // Step: 'method' → 'amount' → 'change' → 'success'
  const [step, setStep] = useState('method');
  const [payments, setPayments] = useState([]); // [{method, amount}]
  const [currentMethod, setCurrentMethod] = useState(null);
  const [amountInput, setAmountInput] = useState('');
  const [changeReturnMethod, setChangeReturnMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  // Pay Later state
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditAmountPaid, setCreditAmountPaid] = useState('0');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [showWhatsappInput, setShowWhatsappInput] = useState(false);
  const inputRef = useRef(null);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const overpaid = Math.max(0, totalPaid - total);
  const isFullyPaid = totalPaid >= total;

  // Focus input when entering amount step
  useEffect(() => {
    if (step === 'amount' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);


  const selectMethod = (method) => {
    playSound('tap');
    setCurrentMethod(method);
    if (method === 'credit') {
      setStep('credit'); // Go to Pay Later screen
    } else {
      setAmountInput(method === 'cash' ? '' : String(remaining));
      setStep('amount');
    }
  };

  const addPayment = (method, amount) => {
    const newPayments = [...payments, { method, amount: parseFloat(amount) || 0 }];
    setPayments(newPayments);
    const newTotal = newPayments.reduce((s, p) => s + p.amount, 0);
    
    if (newTotal >= total) {
      const change = newTotal - total;
      if (change > 0 && newPayments.some(p => p.method === 'cash')) {
        setStep('change'); // Need to decide how to return change
      } else {
        setStep('receipt');
      }
    } else {
      // Need more payment — go back to method selection
      setCurrentMethod(null);
      setStep('method');
    }
  };

  const confirmAmount = () => {
    playSound('click');
    const amt = parseFloat(amountInput);
    if (!amt || amt <= 0) return;
    addPayment(currentMethod || 'cash', amt);
  };

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
  }, [total, cart, payments, totalPaid, overpaid, changeReturnMethod, onComplete, isProcessing]);

  const resetAll = () => {
    setPayments([]);
    setCurrentMethod(null);
    setAmountInput('');
    setChangeReturnMethod(null);
    setStep('method');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (step === 'method') {
        if (e.key === 'c' || e.key === 'C') { e.preventDefault(); selectMethod('cash'); }
        if (e.key === 'u' || e.key === 'U') { e.preventDefault(); selectMethod('upi'); }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); selectMethod('credit'); }
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      }
      if (step === 'amount') {
        if (e.key === 'Enter') { e.preventDefault(); confirmAmount(); }
        if (e.key === 'Escape') { e.preventDefault(); setStep('method'); }
      }
      if (step === 'change') {
        if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setChangeReturnMethod('cash'); }
        if (e.key === 'u' || e.key === 'U') { e.preventDefault(); setChangeReturnMethod('store-upi'); }
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
  });

  const methodLabel = (m) => {
    if (m === 'cash') return 'Cash';
    if (m === 'upi') return 'UPI';
    if (m === 'credit') return 'Pay Later';
    return m;
  };

  const finalizeCredit = useCallback(() => {
    if (!creditCustomerName.trim()) return;
    const paid = parseFloat(creditAmountPaid) || 0;
    const pending = total - paid;

    const creditSale = {
      total,
      items: cart,
      payments: paid > 0 ? [{ method: 'cash', amount: paid }] : [],
      amountPaid: paid,
      changeAmount: 0,
      changeReturnMethod: null,
      paymentMethod: 'credit',
      creditCustomer: creditCustomerName.trim(),
      creditPending: pending,
      discount: discountAmount || 0,
      date: new Date().toISOString(),
    };

    // Persist credit to localStorage
    const newCredit = {
      id: Date.now(),
      customer: creditCustomerName.trim(),
      total,
      paid,
      pending,
      date: new Date().toISOString().split('T')[0],
      items: cart.map(i => i.name).join(', '),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('sz_credits') || '[]');
      localStorage.setItem('sz_credits', JSON.stringify([newCredit, ...existing]));
    } catch (_) {}

    setCompletedSale(creditSale);
    playSound('success');
    setStep('success');
    onComplete(creditSale);
  }, [creditCustomerName, creditAmountPaid, total, cart, onComplete]);

  // ─── WhatsApp Bill Sharing ───
  const sendWhatsAppBill = async (sale, phone) => {
    if (window.api?.getReceiptPreview && window.api?.copyToClipboard) {
      const url = await window.api.getReceiptPreview(sale);
      await window.api.copyToClipboard(url);
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const cgstPct = parseFloat(appSettings?.cgstRate) || 0;
    const sgstPct = parseFloat(appSettings?.sgstRate) || 0;
    const taxPct = cgstPct + sgstPct;
    const grandTotal = sale.total || 0;
    const taxableAmount = taxPct > 0 ? grandTotal / (1 + (taxPct / 100)) : grandTotal;
    const gstAmt = grandTotal - taxableAmount;
    
    let msg = `🧾 *${(appSettings?.businessName || 'SPORTS ZONE').toUpperCase()}*\n\n`;
    msg += `Invoice No: #${sale.id || 'NEW'}\n`;
    msg += `Date: ${dateStr}\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;
    msg += `Items:\n`;
    
    (sale.items || []).forEach(item => {
      msg += `• ${item.name} (x${item.qty})        ₹${(item.price * item.qty).toLocaleString()}\n`;
    });
    
    msg += `\n━━━━━━━━━━━━━━━━\n\n`;
    msg += `Subtotal:              ₹${taxableAmount.toFixed(0)}\n`;
    
    if (taxPct > 0) {
      msg += `GST (${taxPct}%):             ₹${gstAmt.toFixed(0)}\n`;
    }
    if (sale.discount > 0) {
      msg += `Discount:            -₹${sale.discount.toFixed(0)}\n`;
    }
    
    msg += `*Total Amount:*        ₹${grandTotal.toLocaleString()}\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;
    
    let pMode = sale.paymentMethod ? methodLabel(sale.paymentMethod) : 'Cash';
    if (pMode === 'Split') pMode = (sale.paymentBreakdown || []).map(p => methodLabel(p.method)).join(' + ');
    
    msg += `Payment Mode: ${pMode}\n`;
    msg += `Status: ${sale.amountPaid >= grandTotal ? 'Paid ✅' : 'Pending ⏳'}\n\n`;
    msg += `Thank you for your purchase! 🙏\n`;
    msg += `We look forward to serving you again.\n\n`;
    msg += `📍 ${appSettings?.businessName || 'Sports Zone'}\n`;
    if (appSettings?.businessPhone) {
      msg += `📞 +91${appSettings.businessPhone.replace('+91', '')}`;
    }
    
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ─── Render ────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">
              {step === 'method' && 'Checkout'}
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
            <p className={`text-2xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{remaining.toFixed(2)}</p>
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

        {/* Payment Chips (show what's been paid so far) */}
        {payments.length > 0 && step !== 'receipt' && (
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
              <div className={`flex items-start gap-3 p-3 rounded-xl ${dm ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className={`text-sm ${dm ? 'text-amber-300' : 'text-amber-700'}`}>
                  Customer pays partially or fully later. A pending credit will be recorded.
                </p>
              </div>

              <div>
                <label className={`text-sm font-medium mb-2 block ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                  Customer Name *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={creditCustomerName}
                  onChange={e => setCreditCustomerName(e.target.value)}
                  placeholder="e.g. Rahul, Regular Customer..."
                  className={`w-full px-4 py-3 border-2 rounded-xl text-base outline-none transition-all
                    ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-400'}`}
                />
              </div>

              <div>
                <label className={`text-sm font-medium mb-2 block ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                  Amount Paid Now (₹) <span className={`text-xs ml-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Leave 0 for full credit</span>
                </label>
                <input
                  type="number"
                  value={creditAmountPaid}
                  onChange={e => setCreditAmountPaid(e.target.value)}
                  min="0"
                  max={total}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-2xl font-bold text-center outline-none transition-all
                    ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-400'}`}
                />
              </div>

              {/* Pending Balance Preview */}
              {(() => {
                const paid = parseFloat(creditAmountPaid) || 0;
                const pending = total - paid;
                return pending > 0 ? (
                  <div className={`flex justify-between items-center p-3 rounded-xl font-semibold ${dm ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                    <span className={`text-sm ${dm ? 'text-red-300' : 'text-red-700'}`}>Pending Balance</span>
                    <span className={`text-lg ${dm ? 'text-red-300' : 'text-red-600'}`}>₹{pending.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className={`flex justify-between items-center p-3 rounded-xl ${dm ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <span className={`text-sm font-semibold ${dm ? 'text-emerald-300' : 'text-emerald-700'}`}>✓ Fully Paid</span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setStep('method'); setCurrentMethod(null); }}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all
                    ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  ← Back
                </button>
                <button
                  onClick={finalizeCredit}
                  disabled={!creditCustomerName.trim()}
                  className="py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Record Credit
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

          {/* ─── STEP 5: Success + Receipt Download ─── */}
          {step === 'success' && completedSale && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <p className={`font-bold text-xl ${dm ? 'text-white' : 'text-slate-800'}`}>₹{completedSale.total.toFixed(2)} Paid!</p>
                <p className={`text-sm mt-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Sale recorded successfully</p>
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
              </div>

              {/* WhatsApp Phone Input (shown when clicked) */}
              {showWhatsappInput && (
                <div className={`rounded-xl border p-3 space-y-2 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-200'}`}>
                  <label className={`text-xs font-semibold block ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                    📱 Customer's WhatsApp Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      autoFocus
                      value={whatsappPhone}
                      onChange={e => setWhatsappPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className={`flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-all
                        ${dm ? 'bg-slate-900 border-slate-600 text-white focus:border-green-500' : 'bg-white border-slate-200 focus:border-green-500'}`}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && whatsappPhone.length >= 10) {
                          sendWhatsAppBill(completedSale, cart, discount, whatsappPhone);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (whatsappPhone.length >= 10) {
                          sendWhatsAppBill(completedSale, cart, discount, whatsappPhone);
                        }
                      }}
                      disabled={whatsappPhone.length < 10}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={async () => {
                    playSound('click');
                    if (window.api?.downloadReceipt) {
                       await window.api.downloadReceipt(completedSale);
                    }
                  }}
                  className={`py-3 rounded-xl font-semibold text-xs border-2 flex flex-col items-center justify-center gap-1.5 transition-all
                    ${dm ? 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400' : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                >
                  <Download className="w-4 h-4" /> Receipt
                </button>
                <button
                  onClick={() => { playSound('click'); setShowWhatsappInput(v => !v); }}
                  className={`py-3 rounded-xl font-semibold text-xs border-2 flex flex-col items-center justify-center gap-1.5 transition-all
                    ${showWhatsappInput
                      ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-200'
                      : dm ? 'border-slate-600 text-slate-300 hover:border-green-500 hover:text-green-400' : 'border-slate-200 text-slate-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    onClose();
                  }}
                  className="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 hover:bg-blue-700 transition-all"
                >
                  <ArrowRight className="w-4 h-4" /> New Sale
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

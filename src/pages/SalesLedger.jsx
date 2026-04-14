import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, TrendingUp, Edit2, Trash2, Check, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DateRangePicker from '../components/DateRangePicker';
import ConfirmModal from '../components/ConfirmModal';


function SaleModal({ sale, onClose, onSave, dm, showFinancials }) {
  const isNew = !sale;
  const initBreakdown = sale?.paymentBreakdown || [{ method: sale?.payment_method || 'cash', amount: sale?.amountPaid || '' }];
  
  const [form, setForm] = useState(sale || {
    date: new Date().toLocaleDateString('en-CA'), inv: '', description: '', cost: '', selling: '', discount: '', payment_method: 'cash', amountPaid: '', changeAmount: '', paymentBreakdown: [{ method: 'cash', amount: '' }], changeReturnMethod: 'cash'
  });

  const [breakdown, setBreakdown] = useState(initBreakdown.map(b => ({ ...b })));

  // Dynamically compute totals from breakdown
  const totalReceived = breakdown.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  const calcChange = (received, total) => {
    const r = parseFloat(received) || 0;
    const t = parseFloat(total) || 0;
    if (r > t) return (r - t).toFixed(2);
    return '0.00';
  };

  const changeAmount = calcChange(totalReceived, form.selling);

  const updateBreakdown = (idx, field, val) => {
    setBreakdown(prev => prev.map((b, i) => i === idx ? { ...b, [field]: val } : b));
  };

  const addBreakdown = () => setBreakdown(prev => [...prev, { method: 'upi', amount: '' }]);
  const removeBreakdown = (idx) => setBreakdown(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!form.description) return alert('Please enter a description for the entry.');
    if (!form.selling) return alert('Please enter a selling amount.');
    onSave({
      ...form,
      id: sale?.id || Date.now(),
      cost: parseFloat(form.cost || 0),
      selling: parseFloat(form.selling) || 0,
      discount: parseFloat(form.discount) || 0,
      amountPaid: parseFloat(totalReceived) || parseFloat(form.selling) || 0,
      changeAmount: parseFloat(changeAmount) || 0,
      paymentBreakdown: breakdown,
      payment_method: breakdown.length === 1 ? breakdown[0].method : 'split',
      items: form.description.split(',').length,
    });
    onClose();
  };

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`;
  const profit = parseFloat(form.selling || 0) - parseFloat(form.cost || 0);
  const pct = form.cost && form.selling ? ((profit / parseFloat(form.cost)) * 100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-10" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div onMouseDown={e => e.stopPropagation()} className={`w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden my-auto ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add Sale Entry' : 'Edit Sale Entry'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className={labelCls}>Invoice #</label><input className={inputCls} value={form.inv || ''} onChange={e => setForm(p => ({...p, inv: e.target.value}))} placeholder="INV-1043" /></div>
          </div>
          <div><label className={labelCls}>Description</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.description || ''} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="jersey 5 collar, shorts pp, boot focus 2.0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {showFinancials && <div><label className={labelCls}>Cost Price (₹)</label><input type="number" className={inputCls} value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} /></div>}
            <div className={showFinancials ? "" : "col-span-2"}>
              <label className={labelCls}>Subtotal (₹)</label>
              <input type="number" className={inputCls} value={parseFloat(form.selling || 0) + parseFloat(form.discount || 0) || ''} onChange={e => {
                const s = parseFloat(e.target.value) || 0;
                const disc = parseFloat(form.discount) || 0;
                setForm(p => ({...p, selling: s - disc}));
              }} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Discount (₹)</label>
            <input type="number" className={inputCls} value={form.discount || ''} onChange={e => {
              const newDisc = parseFloat(e.target.value) || 0;
              const currentSubtotal = parseFloat(form.selling || 0) + parseFloat(form.discount || 0);
              const newTotal = currentSubtotal - newDisc;
              setForm(p => ({...p, discount: e.target.value, selling: newTotal}));
            }} placeholder="0.00" />
          </div>

          <div className={`flex justify-between items-center p-3 rounded-xl border ${dm ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50/50 border-blue-100'}`}>
             <span className={`font-bold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Final Total:</span>
             <span className="font-bold text-blue-600 text-lg">₹{parseFloat(form.selling || 0).toFixed(2)}</span>
          </div>

          {/* Payment Breakdown Edit Segment */}
          <div className={`p-3 rounded-xl border ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-center mb-2">
              <label className={labelCls + ' !mb-0'}>Payment Breakdown</label>
              <button onClick={addBreakdown} className="text-xs font-bold text-blue-500 hover:text-blue-700">+ Add Method</button>
            </div>
            <div className="space-y-2 mb-3">
              {breakdown.map((b, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select className={inputCls + ' !w-2/5 !py-2'} value={b.method} onChange={e => updateBreakdown(idx, 'method', e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="credit">Pay Later</option>
                  </select>
                  <input type="number" placeholder="Amount" className={inputCls + ' !py-2'} value={b.amount} onChange={e => updateBreakdown(idx, 'amount', e.target.value)} />
                  {breakdown.length > 1 && (
                    <button onClick={() => removeBreakdown(idx)} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center text-sm border-t pt-2 border-dashed border-slate-300 dark:border-slate-600">
              <span className="font-semibold text-slate-500">Total Received:</span>
              <span className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{(totalReceived || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Return Change Via Segment */}
          {parseFloat(changeAmount || 0) > 0 && (
            <div className={`grid grid-cols-2 gap-3 p-3 items-center rounded-xl border-2 border-dashed ${dm ? 'bg-amber-900/10 border-amber-800/50' : 'bg-amber-50/50 border-amber-200'}`}>
              <div>
                <label className={labelCls}>Change Due</label>
                <div className={`text-xl font-bold ${dm ? 'text-amber-400' : 'text-amber-600'}`}>₹{changeAmount}</div>
              </div>
              <div>
                <label className={labelCls}>Return Via</label>
                <div className="flex gap-2">
                  {['cash', 'store-upi'].map(m => (
                    <button key={m} onClick={() => setForm({...form, changeReturnMethod: m})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${form.changeReturnMethod === m ? 'bg-amber-100 border-amber-400 text-amber-700' : (dm ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')}`}>
                      {m === 'cash' ? 'Cash' : 'Store UPI'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showFinancials && form.cost && form.selling && (
            <div className={`rounded-xl p-3 text-center ${profit >= 0 ? (dm ? 'bg-green-900/30' : 'bg-green-50') : (dm ? 'bg-red-900/30' : 'bg-red-50')}`}>
              <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Profit: ₹{profit.toFixed(2)} &nbsp;|&nbsp; Margin: {pct}%
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${dm ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            {isNew ? 'Save Entry' : 'Update Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalesLedger() {
  const { darkMode, addToast, sales: liveSales, setSales: setLiveSales, isOwner, isAdminUnlocked, refreshProducts } = useApp();
  const showFinancials = isAdminUnlocked || isOwner;
  const dm = darkMode;

  // Robust path to "YYYY-MM-DD" matching the date picker
  const toYMD = (d) => {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Map live POS sales to ledger format + allow manual entries
  const [manualSales, setManualSales] = useState([]);
  const allSales = useMemo(() => {
    const liveEntries = (liveSales || []).map(s => {
      const d = new Date(s.date || s.created_at || new Date());
      const isValid = !isNaN(d.getTime());
      return {
        id: `live-${s.id}`,
        rawDate: isValid ? d : new Date(),
        date: isValid ? d.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Invalid Date',
        inv: `INV-${s.id}`,
        description: (s.items || []).map(i => `${i.name} x${i.qty}`).join(', '),
        cost: (s.items || []).reduce((t, i) => t + ((i.cost || 0) * i.qty), 0),
        selling: s.total || 0,
        discount: s.discount || 0,
        payment_method: s.paymentMethod || s.payment_method || 'cash',
        amountPaid: s.amountPaid || s.amount_paid || s.total || 0,
        changeAmount: s.changeAmount || s.change_amount || 0,
        paymentBreakdown: s.paymentBreakdown || s.payment_breakdown || [{ method: s.paymentMethod || s.payment_method || 'cash', amount: s.amountPaid || s.amount_paid || s.total || 0}],
        changeReturnMethod: s.changeReturnMethod || s.change_return_method || 'cash',
        items: (s.items || []).length,
        isLive: true,
      };
    });
    const manualEntries = manualSales.map(m => {
      const d = new Date(m.date || new Date());
      return { ...m, rawDate: !isNaN(d.getTime()) ? d : new Date() };
    });
    return [...liveEntries, ...manualEntries].sort((a,b) => b.rawDate - a.rawDate);
  }, [liveSales, manualSales]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const searchRef = useRef(null);

  // Auto-focus search on mount ONLY
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  const filtered = useMemo(() => allSales.filter(s => {
    const matchesSearch = (s.description || '').toLowerCase().includes(search.toLowerCase()) || (s.inv && s.inv.includes(search));
    const saleYMD = toYMD(s.rawDate);
    
    let matchesRange = true;
    if (startDate || endDate) {
      if (startDate && saleYMD < startDate) matchesRange = false;
      if (endDate && saleYMD > endDate) matchesRange = false;
    }

    return matchesSearch && matchesRange;
  }), [allSales, search, startDate, endDate]);

  const totals = useMemo(() => filtered.reduce((acc, s) => ({
    cost: acc.cost + s.cost,
    selling: acc.selling + s.selling,
    profit: acc.profit + (s.selling - s.cost),
    paid: acc.paid + (s.amountPaid != null ? s.amountPaid : s.selling),
  }), { cost: 0, selling: 0, profit: 0, paid: 0 }), [filtered]);

  const handleSave = async (entry) => {
    if (entry.isLive) {
      const realId = parseInt(String(entry.id).replace('live-', ''), 10);
      const orig = liveSales.find(s => s.id === realId);
      if (orig) {
        const currentDescription = (orig.items || []).map(i => `${i.name} x${i.qty}`).join(', ');
        let updatedItems = orig.items;

        // If description was edited, we treat it as a manual correction so receipts match
        if (entry.description !== currentDescription) {
           updatedItems = [{
             id: 'manual',
             name: entry.description,
             qty: 1,
             price: entry.selling,
             cost: entry.cost
           }];
        } else if (parseFloat(entry.selling) !== parseFloat(orig.total) || parseFloat(entry.discount) !== parseFloat(orig.discount || 0)) {
           // If price OR discount was edited but NOT description, we update item prices proportionally
           // This ensures (sum of items) == total + discount, so no "Adjustment" shows on receipt
           const targetSubtotal = parseFloat(entry.selling) + parseFloat(entry.discount || 0);
           const currentSubtotal = (orig.items || []).reduce((s, i) => s + (i.price * i.qty), 0);
           
           if (currentSubtotal > 0) {
             const ratio = targetSubtotal / currentSubtotal;
             updatedItems = orig.items.map(item => ({
               ...item,
               price: parseFloat((item.price * ratio).toFixed(2))
             }));
             
             // Fix rounding mismatch so it matches exactly
             const newTotal = updatedItems.reduce((s, i) => s + (i.price * i.qty), 0);
             const diff = targetSubtotal - newTotal;
             if (Math.abs(diff) > 0.01 && updatedItems.length > 0) {
                updatedItems[0].price = parseFloat((updatedItems[0].price + (diff / updatedItems[0].qty)).toFixed(2));
             }
           }
        }

        const updated = {
           ...orig,
           total: entry.selling,
           discount: entry.discount,
           paymentMethod: entry.payment_method,
           amountPaid: entry.amountPaid,
           changeAmount: entry.changeAmount,
           paymentBreakdown: entry.paymentBreakdown,
           changeReturnMethod: entry.changeReturnMethod,
           date: entry.date,
           items: updatedItems
        };
        if (window.api) {
          try {
            await window.api.saveSale(updated);
            if (refreshProducts) await refreshProducts();
            const fresh = await window.api.getSales();
            setLiveSales(fresh);
            addToast(`Live Sale ${entry.inv || 'Entry'} perfectly updated!`, 'success');
          } catch (err) {
            console.error('Update failed:', err);
            addToast(`Update Failed: ${err.message}`, 'error');
          }
        } else {
           setLiveSales(prev => prev.map(s => s.id === realId ? updated : s));
        }
      }
      return;
    }

    const exists = manualSales.find(s => s.id === entry.id);
    if (exists) {
      setManualSales(prev => prev.map(s => s.id === entry.id ? entry : s));
      addToast(`Manual Sale ${entry.inv || '#'} updated`, 'success');
    } else {
      setManualSales(prev => [{ ...entry, isManual: true }, ...prev]);
      addToast(`Sale ${entry.inv || '#'} added — Profit ₹${(entry.selling - entry.cost).toFixed(0)}`, 'success');
    }
  };

  const handleDelete = (id, inv) => {
    // Instead of native window.confirm, we use our React modal
    setConfirmDelete({ id, inv });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { id, inv } = confirmDelete;
    
    // Close modal immediately to restore event loop
    setConfirmDelete(null);

    if (String(id).startsWith('live-')) {
      const realId = parseInt(String(id).replace('live-', ''), 10);
      try {
        if (window.api) {
          await window.api.deleteSale(realId);
          if (refreshProducts) await refreshProducts();
          setLiveSales(prev => prev.filter(s => s.id !== realId));
          addToast(`POS Sale ${inv} permanently deleted & stock restored!`, 'success');
        } else {
          setLiveSales(prev => prev.filter(s => s.id !== realId));
          addToast(`Browser Mode: Sale ${inv} deleted from UI.`, 'success');
        }
      } catch (err) {
        console.error('Delete failed:', err);
        addToast(`Delete Failed: ${err.message}`, 'error');
      }
    } else {
      setManualSales(prev => prev.filter(s => s.id !== id));
      addToast(`${inv || 'Entry'} deleted`, 'warning');
    }
    
    // CRITICAL: Refocus search bar using a reliable delay.
    // Since we are now using a React modal, the focus state is preserved
    // much better than with native dialogs.
    setTimeout(() => {
      if (searchRef.current) {
        searchRef.current.focus();
        searchRef.current.select();
      }
    }, 150);
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Sales Ledger</h2>
          <p className={`text-sm mt-0.5 flex items-center gap-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
             All sale entries — click <Edit2 className="w-3.5 h-3.5 mx-0.5" /> to edit any row
          </p>
        </div>
        {!isOwner && (
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: filtered.length, fmt: 'num', color: 'text-blue-600' },
          showFinancials && { label: 'Total Cost (₹)', value: totals.cost, fmt: 'curr', color: dm ? 'text-white' : 'text-slate-800' },
          { label: 'Total Sales (₹)', value: totals.selling, fmt: 'curr', color: 'text-blue-600' },
          showFinancials && { label: 'Total Profit (₹)', value: totals.profit, fmt: 'curr', color: totals.profit >= 0 ? 'text-green-600' : 'text-red-500' },
        ].filter(Boolean).map(s => (
          <div key={s.label} className={`${card} p-4`}>
            <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>
              {s.fmt === 'curr' ? `₹${s.value.toLocaleString()}` : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className={`px-4 py-3.5 border-b flex flex-wrap gap-3 items-center ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input 
              ref={searchRef}
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search description or invoice..."
              className={`flex-1 text-sm outline-none bg-transparent ${dm ? 'text-white placeholder-slate-500' : 'text-slate-800'}`} />
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1.5 sm:pb-0 items-center mt-2 sm:mt-0">
            <DateRangePicker 
              startDate={startDate} 
              endDate={endDate} 
              setStartDate={setStartDate} 
              setEndDate={setEndDate} 
              dm={dm} 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <th className={th}>Date</th>
              <th className={th}>Invoice</th>
              <th className={th}>Description</th>
              <th className={th}>Payment</th>
              {showFinancials && <th className={th + ' text-right'}>Cost (₹)</th>}
              <th className={th + ' text-right'}>Selling (₹)</th>
              {showFinancials && <th className={th + ' text-right'}>Profit (₹)</th>}
              {showFinancials && <th className={th + ' text-right'}>Margin</th>}
              <th className={th + ' text-right'}>Amount Paid</th>
              {!isOwner && <th className={th + ' text-center'}>Actions</th>}
            </tr></thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {filtered.map(s => {
                const profit = s.selling - s.cost;
                const pct = ((profit / s.cost) * 100).toFixed(1);
                return (
                  <tr key={s.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div className={`font-bold text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>{s.rawDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[11px] mt-0.5">{s.rawDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-blue-600 text-xs">{s.inv || '—'}</td>
                    <td className={`px-4 py-3.5 max-w-xs ${dm ? 'text-slate-200' : 'text-slate-700'}`}>
                      <span className="line-clamp-1 text-sm">{s.description}</span>
                    </td>
                    <td className={`px-4 py-3.5 text-xs font-semibold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>{s.payment_method}</td>
                    {showFinancials && <td className={`px-4 py-3.5 text-right ${dm ? 'text-slate-300' : 'text-slate-600'}`}>₹{s.cost.toLocaleString()}</td>}
                    <td className="px-4 py-3.5 text-right font-semibold text-blue-600">₹{s.selling.toLocaleString()}</td>
                    {showFinancials && <td className={`px-4 py-3.5 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>₹{profit.toLocaleString()}</td>}
                    {showFinancials && (
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{pct}%</span>
                      </td>
                    )}
                    <td className={`px-4 py-3.5 text-right font-bold ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{s.amountPaid?.toLocaleString() || s.selling.toLocaleString()}</td>
                    {!isOwner && (
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(s.id, s.inv)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className={`border-t-2 font-bold ${dm ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                  <td colSpan={4} className={`px-4 py-3 text-sm ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Total ({filtered.length} entries)</td>
                  {showFinancials && <td className={`px-4 py-3 text-right text-sm ${dm ? 'text-slate-300' : 'text-slate-700'}`}>₹{totals.cost.toLocaleString()}</td>}
                  <td className="px-4 py-3 text-right text-sm text-blue-600">₹{totals.selling.toLocaleString()}</td>
                  {showFinancials && <td className={`px-4 py-3 text-right text-sm ${totals.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>₹{totals.profit.toLocaleString()}</td>}
                  {showFinancials && (
                    <td className={`px-4 py-3 text-right text-xs font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {totals.selling > 0 ? ((totals.profit / totals.selling) * 100).toFixed(1) : 0}%
                    </td>
                  )}
                  <td className={`px-4 py-3 text-right text-sm font-bold ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{totals.paid.toLocaleString()}</td>
                  {!isOwner && <td />}
                </tr>
              </tfoot>
            )}
          </table>
          {filtered.length === 0 && (
            <div className={`py-16 text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No sales entries found</p>
            </div>
          )}
        </div>
      </div>

      {(modal === 'new' || (modal && modal.id)) && (
        <SaleModal 
          sale={modal === 'new' ? null : modal} 
          onClose={() => {
            setModal(null);
            setTimeout(() => searchRef.current?.focus(), 50);
          }} 
          onSave={handleSave} 
          dm={dm} 
          showFinancials={showFinancials} 
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          isOpen={!!confirmDelete}
          title="Delete Sale Entry"
          message={`Are you sure you want to delete ${confirmDelete.inv || 'this sale'}? This action will restore stock and cannot be undone.`}
          onConfirm={executeDelete}
          onCancel={() => {
            setConfirmDelete(null);
            setTimeout(() => searchRef.current?.focus(), 100);
          }}
          confirmText="Yes, Delete"
          cancelText="No, Keep It"
          dm={darkMode}
        />
      )}
    </div>
  );
}

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Building2, CreditCard, AlertCircle, FileText, ChevronRight, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PaymentBreakdown from '../components/PaymentBreakdown';
import DateRangePicker from '../components/DateRangePicker';

// Ensure we extract unique suppliers from both the supplier list and existing purchases
function getUniqueSuppliers(suppliers, purchases) {
  const set = new Set();
  (suppliers || []).forEach(s => set.add(s.name));
  (purchases || []).forEach(p => set.add(p.supplier));
  return Array.from(set).sort();
}

const OPENING_BALANCE = 0;

function EntryModal({ entry, onClose, onSave, dm, suppliersList, setSuppliers, addToast }) {
  const isNew = !entry;
  const [form, setForm] = useState(entry || {
    date: new Date().toISOString().split('T')[0], 
    inv: '', 
    supplier: suppliersList[0] || '', 
    debit: '', 
    credit: '', 
    note: '',
    paymentMethod: 'Cash',
    paymentBreakdown: [{ method: 'Cash', amount: '' }]
  });

  // Effect to sync existing payments if any
  useState(() => {
    if (entry && !entry.paymentBreakdown) {
      setForm(prev => ({
        ...prev,
        paymentBreakdown: [{ method: entry.paymentMethod || 'Cash', amount: entry.credit || 0 }]
      }));
    }
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSupplierChange = async (e) => {
    const val = e.target.value;
    if (val === '###NEW###') {
      setIsAddingNew(true);
      setNewName('');
    } else {
      setForm(p => ({ ...p, supplier: val }));
    }
  };

  const confirmNewSupplier = async () => {
    if (!newName.trim()) {
      setIsAddingNew(false);
      return;
    }
    const newSup = { name: newName.trim(), phone: '' };
    if (window.api) {
      const saved = await window.api.saveSupplier(newSup);
      setSuppliers(prev => [...prev, saved]);
    } else {
      setSuppliers(prev => [...prev, { ...newSup, id: Date.now() }]);
    }
    setForm(p => ({ ...p, supplier: newSup.name }));
    setIsAddingNew(false);
    addToast(`Supplier ${newSup.name} added`, 'success');
  };

  const handleSave = () => {
    const totalPaid = (form.paymentBreakdown || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const finalMethod = (form.paymentBreakdown || []).length > 1 ? 'Split' : (form.paymentBreakdown?.[0]?.method || 'Cash');

    onSave({
      ...form,
      id: entry?.id || `PO-${Date.now()}`,
      debit: form.debit ? parseFloat(form.debit) : 0,
      credit: totalPaid,
      paymentMethod: finalMethod,
      paymentBreakdown: form.paymentBreakdown
    });
    onClose();
  };

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div onMouseDown={e => e.stopPropagation()} className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add Ledger Entry' : 'Edit Ledger Entry'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className={labelCls}>Invoice / Ref #</label><input className={inputCls} value={form.inv} onChange={e => setForm(p => ({...p, inv: e.target.value}))} placeholder="Optional" /></div>
          </div>
          <div><label className={labelCls}>Supplier</label>
            {isAddingNew ? (
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className={inputCls} 
                  placeholder="Enter supplier name..." 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmNewSupplier()}
                />
                <button onClick={confirmNewSupplier} className="px-3 bg-green-600 text-white rounded-lg text-xs font-bold">Add</button>
                <button onClick={() => setIsAddingNew(false)} className="px-3 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold">X</button>
              </div>
            ) : (
              <select className={inputCls} value={form.supplier} onChange={handleSupplierChange}>
                <option value="" disabled>-- Select Supplier --</option>
                <option value="###NEW###">— Add New Supplier —</option>
                {suppliersList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Total Purchase (Debit)</label><input type="number" className={inputCls} value={form.debit || ''} onChange={e => setForm(p => ({...p, debit: e.target.value}))} placeholder="0" /></div>
            <div>
              <label className={labelCls}>Note</label>
              <input className={inputCls} value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} placeholder="Payment, Return, etc." />
            </div>
          </div>
          
          <div className="pt-2">
            <PaymentBreakdown 
              payments={form.paymentBreakdown}
              onChange={(newPayments) => setForm(p => ({ ...p, paymentBreakdown: newPayments }))}
              dm={dm}
              totalAmount={form.debit}
            />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${dm ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            {isNew ? 'Add Entry' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseLedger() {
  const { darkMode, addToast, purchases, setPurchases, suppliers, setSuppliers, isOwner } = useApp();
  const dm = darkMode;
  
  const [openingBalance, setOpeningBalance] = useState(OPENING_BALANCE);
  const [openingEdit, setOpeningEdit] = useState(false);
  const [modal, setModal] = useState(null); // null | 'new' | entry object
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const supplierList = useMemo(() => getUniqueSuppliers(suppliers, purchases), [suppliers, purchases]);

  // Map dynamic purchases from the DB into ledger entries
  const entries = useMemo(() => {
    return (purchases || []).map(p => {
      const d = new Date(p.date || new Date());
      const isValid = !isNaN(d.getTime());
      return {
        id: p.id,
        rawDate: isValid ? d : new Date(),
        date: isValid ? d.toISOString().split('T')[0] : '',
        inv: p.invoice,
        supplier: p.supplier,
        debit: p.total > 0 ? parseFloat(p.total) : null,
        credit: p.paid > 0 ? parseFloat(p.paid) : null,
        note: p.status === 'paid' ? 'Paid' : (p.status === 'partial' ? 'Partial' : 'Pending'),
        _original: p
      };
    });
  }, [purchases]);

  const filtered = useMemo(() => entries.filter(e => {
    const matchesSupplier = supplierFilter === 'All' || e.supplier === supplierFilter;
    
    let matchesRange = true;
    if (startDate || endDate) {
      const entryDateYMD = e.date; // e.date is already YYYY-MM-DD
      if (startDate && entryDateYMD < startDate) matchesRange = false;
      if (endDate && entryDateYMD > endDate) matchesRange = false;
    }

    return matchesSupplier && matchesRange;
  }), [entries, supplierFilter, startDate, endDate]);

  const withBalance = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.rawDate - b.rawDate);
    const result = [];
    let acc = openingBalance;
    for (const e of sorted) {
      acc += (e.debit || 0) - (e.credit || 0);
      result.push({ ...e, running: acc });
    }
    return result;
  }, [filtered, openingBalance]);

  const totalDebit = filtered.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + (e.credit || 0), 0);
  const finalBalance = openingBalance + totalDebit - totalCredit;

  const handleSave = async (entry) => {
    // entry has: date, inv, supplier, debit, credit, note
    const purchaseData = {
      id: entry.id,
      date: entry.date,
      supplier: entry.supplier,
      invoice: entry.inv || '',
      items: entry._original?.items || 0,
      total: entry.debit || 0,
      paid: entry.credit || 0,
      paymentMethod: entry.paymentMethod || 'Cash',
      paymentBreakdown: entry.paymentBreakdown || [],
      status: entry.note || ((entry.debit || 0) === (entry.credit || 0) ? 'paid' : 'pending'),
    };

    if (window.api) {
      await window.api.savePurchase(purchaseData);
    }

    const exists = purchases.find(p => p.id === purchaseData.id);
    if (exists) {
      setPurchases(prev => prev.map(p => p.id === purchaseData.id ? purchaseData : p));
      addToast(`${entry.supplier} ledger entry updated`, 'success');
    } else {
      setPurchases(prev => [...prev, purchaseData]);
      addToast(`${entry.supplier} ledger entry added`, 'success');
    }
  };

  const handleDelete = async (id, supplier) => {
    if (window.confirm(`Delete entry for ${supplier}?`)) {
      if (window.api) {
        await window.api.deletePurchase(id);
      }
      setPurchases(prev => prev.filter(e => e.id !== id));
      addToast(`${supplier} entry removed`, 'warning');
    }
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-2">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Purchase Ledger</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Supplier transactions — synced with your purchases database</p>
        </div>
        {!isOwner && (
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <div className={`${card} p-5 ${!isOwner ? 'cursor-pointer hover:border-blue-500/50' : ''}`} onClick={() => !isOwner && setOpeningEdit(true)}>
          <p className={`text-xs font-semibold mb-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Opening Balance</p>
          {openingEdit && !isOwner ? (
            <div className="flex items-center gap-1">
              <span className="text-xl text-slate-400">₹</span>
              <input type="number" autoFocus value={openingBalance}
                onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)}
                onBlur={() => { setOpeningEdit(false); addToast('Opening balance updated', 'success'); }}
                className={`text-2xl font-bold w-full bg-transparent outline-none border-b border-blue-500 ${dm ? 'text-white' : 'text-slate-800'}`}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>₹{openingBalance.toLocaleString()}</p>
              {!isOwner && <Edit2 className="w-3 h-3 text-blue-500" />}
            </div>
          )}
          {!isOwner && <p className="text-[10px] mt-1 text-slate-400">Click to edit</p>}
        </div>

        {/* Total Purchase (Debit) */}
        <div className={`${card} p-5`}>
          <p className={`text-xs font-semibold mb-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Purchase (Debit)</p>
          <p className="text-2xl font-bold text-red-500">₹{totalDebit.toLocaleString()}</p>
        </div>

        {/* Total Paid (Credit) */}
        <div className={`${card} p-5`}>
          <p className={`text-xs font-semibold mb-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Paid (Credit)</p>
          <p className="text-2xl font-bold text-green-500">₹{totalCredit.toLocaleString()}</p>
        </div>

        {/* Running Balance */}
        <div className={`p-5 rounded-2xl border-2 ${dm ? 'bg-slate-800 border-blue-500/30' : 'bg-white border-blue-100 shadow-sm'}`}>
          <p className={`text-xs font-semibold mb-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Running Balance</p>
          <p className="text-2xl font-bold text-blue-600">₹{finalBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Supplier Filter & Ledger */}
      <div className={`${card} overflow-hidden`}>
        <div className={`p-0 border-b ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
          {/* Row 1: Title and Date Range */}
          <div className="flex items-center justify-between p-4 border-b border-inherit">
            <div className="flex items-center gap-2 shrink-0">
              <div className={`p-1.5 rounded-lg ${dm ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <h3 className={`font-bold text-xs uppercase tracking-widest ${dm ? 'text-slate-300' : 'text-slate-500'}`}>Transaction Ledger</h3>
            </div>
            
            <div className="shrink-0 scale-90 origin-right">
              <DateRangePicker 
                startDate={startDate} 
                endDate={endDate} 
                setStartDate={setStartDate} 
                setEndDate={setEndDate} 
                dm={dm} 
              />
            </div>
          </div>

          {/* Row 2: Supplier Filters */}
          <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {['All', ...supplierList].map(s => (
                <button key={s} onClick={() => setSupplierFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${supplierFilter === s ? 'bg-blue-600 text-white shadow-md' : (dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-100')}`}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`border-b-2 ${dm ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
              <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Date</th>
              <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Invoice</th>
              <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Supplier</th>
              <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Note</th>
              <th className={`px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Debit (₹)</th>
              <th className={`px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Credit (₹)</th>
              <th className={`px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Balance (₹)</th>
              {!isOwner && <th className={`px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>}
            </tr></thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-800' : 'divide-slate-100/60'}`}>
              {withBalance.map(e => {
                return (
                  <tr key={e.id} className={`transition-colors text-xs ${dm ? 'hover:bg-slate-800/50 bg-slate-900 border-b border-slate-800' : 'hover:bg-slate-50 bg-white border-b border-slate-100'}`}>
                    <td className={`px-4 py-2.5 text-[10px] font-mono font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{e.date}</td>
                    <td className="px-4 py-2.5 text-[10px] font-semibold text-blue-500">
                      {e.inv || '—'}
                    </td>
                    <td className={`px-4 py-2.5 font-bold text-xs ${dm ? 'text-slate-200' : 'text-slate-800'}`}>
                      {e.supplier}
                    </td>
                    <td className={`px-4 py-2.5 text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      {e.note || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-red-500">{e.debit ? `₹${e.debit}` : '—'}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-green-500">{e.credit ? `₹${e.credit}` : '—'}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-blue-600">₹{e.running}</td>
                    {!isOwner && (
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal(e)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(e.id, e.supplier)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {withBalance.length > 0 && (
              <tfoot>
                <tr className={`border-t-2 font-bold ${dm ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                  <td colSpan={4} className={`px-5 py-4 text-left text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Total</td>
                  <td className="px-5 py-4 text-center text-red-500">₹{totalDebit}</td>
                  <td className="px-5 py-4 text-center text-green-500">₹{totalCredit}</td>
                  <td className="px-5 py-4 text-center text-blue-600">₹{finalBalance}</td>
                  {!isOwner && <td />}
                </tr>
              </tfoot>
            )}
          </table>
          {withBalance.length === 0 && (
             <div className="flex flex-col items-center justify-center h-48 text-slate-400 w-full py-8 text-center col-span-8">
               <div className={`p-4 rounded-full mb-3 ${dm ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                 <FileText className="w-8 h-8" />
               </div>
               <p className="font-bold text-slate-500 dark:text-slate-400">No transactions recorded</p>
               <p className="text-xs mt-1">Outstanding bills and payments will appear here.</p>
             </div>
          )}
        </div>
      </div>

      {(modal === 'new' || (modal && modal.id)) && (
        <EntryModal 
          suppliersList={supplierList} 
          setSuppliers={setSuppliers} 
          addToast={addToast} 
          entry={modal === 'new' ? null : modal} 
          onClose={() => setModal(null)} 
          onSave={handleSave} 
          dm={dm} 
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PaymentBreakdown from '../components/PaymentBreakdown';

// --- Purchases are now managed via SQLite ---


function PurchaseModal({ purchase, onClose, onSave, dm, suppliers, setSuppliers, addToast }) {
  const isNew = !purchase;
  const [form, setForm] = useState(purchase || {
    date: new Date().toISOString().split('T')[0], supplier: suppliers[0]?.name || '',
    invoice: '', items: '', total: '', paid: '', status: 'pending',
    paymentMethod: 'Cash',
    paymentBreakdown: [{ method: 'Cash', amount: '' }]
  });

  // If editing an existing purchase that doesn't have a breakdown yet
  useEffect(() => {
    if (purchase && !purchase.paymentBreakdown) {
      setForm(prev => ({
        ...prev,
        paymentBreakdown: [{ method: purchase.paymentMethod || 'Cash', amount: purchase.paid || 0 }]
      }));
    }
  }, [purchase]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  // Ensure 'Add New' is always first in the render list later

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

  const totalPaid = (form.paymentBreakdown || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const balance = Math.max(0, parseFloat(form.total || 0) - totalPaid);

  const handleSave = () => {
    if (!form.supplier) return addToast('Please select a supplier', 'error');
    if (!form.total) return addToast('Please enter a total amount', 'error');
    const finalPaid = (form.paymentBreakdown || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const finalMethod = (form.paymentBreakdown || []).length > 1 ? 'Split' : (form.paymentBreakdown?.[0]?.method || 'Cash');
    
    onSave({
      ...form,
      id: purchase?.id || `PO-${Date.now()}`,
      total: parseFloat(form.total),
      paid: finalPaid,
      balance,
      items: parseInt(form.items || 0),
      status: balance === 0 ? 'paid' : balance < parseFloat(form.total) ? 'partial' : 'pending',
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
          <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add Purchase Order' : 'Edit Purchase Order'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className={labelCls}>Invoice #</label><input className={inputCls} value={form.invoice} onChange={e => setForm(p => ({...p, invoice: e.target.value}))} placeholder="b2c-3300 / 1240" /></div>
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
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Total Amount (₹)</label><input type="number" className={inputCls} value={form.total} onChange={e => setForm(p => ({...p, total: e.target.value}))} /></div>
            <div><label className={labelCls}>No. of Items</label><input type="number" className={inputCls} value={form.items} onChange={e => setForm(p => ({...p, items: e.target.value}))} /></div>
          </div>

          <div className="col-span-2 py-2">
            <PaymentBreakdown 
              payments={form.paymentBreakdown} 
              onChange={(newPayments) => setForm(p => ({ ...p, paymentBreakdown: newPayments }))}
              dm={dm}
              totalAmount={form.total}
            />
          </div>
          {form.total && (
            <div className={`rounded-xl p-3 text-center ${balance === 0 ? (dm ? 'bg-green-900/30' : 'bg-green-50') : (dm ? 'bg-amber-900/30' : 'bg-amber-50')}`}>
              <p className={`text-sm font-semibold ${balance === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                Balance: ₹{balance.toFixed(0)} — {balance === 0 ? '✓ Fully Paid' : balance < parseFloat(form.total || 0) ? '⚡ Partial' : '⏳ Pending'}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${dm ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            {isNew ? 'Add Order' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Purchases() {
  const { darkMode, addToast, suppliers, setSuppliers, purchases, setPurchases, isOwner } = useApp();
  const dm = darkMode;
  const [modal, setModal] = useState(null);

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  const totalPurchased = purchases.reduce((s, p) => s + (p.total || 0), 0);
  const totalPaid = purchases.reduce((s, p) => s + (p.paid || 0), 0);
  const totalDue = purchases.reduce((s, p) => s + Math.max(0, (p.total || 0) - (p.paid || 0)), 0);

  const handleSave = async (purchase) => {
    if (window.api) {
      await window.api.savePurchase(purchase);
    }
    const exists = purchases.find(p => p.id === purchase.id);
    if (exists) {
      setPurchases(prev => prev.map(p => p.id === purchase.id ? purchase : p));
      addToast(`${purchase.supplier} order updated`, 'success');
    } else {
      setPurchases(prev => [purchase, ...prev]);
      addToast(`${purchase.supplier} order added`, 'success');
    }
  };

  const handleDelete = async (id, supplier) => {
    if (window.api) {
      await window.api.deletePurchase(id);
    }
    setPurchases(prev => prev.filter(p => p.id !== id));
    addToast(`${supplier} order removed`, 'warning');
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Purchases</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Supplier invoices — click ✏️ to correct or update payment</p>
        </div>
        {!isOwner && (
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Purchase
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Purchased', value: totalPurchased, color: dm ? 'text-white' : 'text-slate-800' },
          { label: 'Total Paid', value: totalPaid, color: 'text-green-600' },
          { label: 'Amount Due', value: totalDue, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className={`${card} p-4`}>
            <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>₹{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <th className={th}>PO #</th><th className={th}>Date</th><th className={th}>Supplier</th>
              <th className={th}>Invoice</th><th className={th + ' text-right'}>Total</th>
              <th className={th + ' text-right'}>Paid</th><th className={th + ' text-right'}>Balance</th>
              <th className={th + ' text-center'}>Status</th>
              {!isOwner && <th className={th + ' text-center'}>Actions</th>}
            </tr></thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {purchases.map(p => (
                <tr key={p.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <td className="px-5 py-3.5 text-blue-600 font-semibold text-xs">{p.id}</td>
                  <td className={`px-5 py-3.5 text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{p.date}</td>
                  <td className={`px-5 py-3.5 font-medium text-sm ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{p.supplier}</td>
                  <td className={`px-5 py-3.5 font-mono text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{p.invoice || '—'}</td>
                  <td className={`px-5 py-3.5 text-right font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{p.total.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-green-600">₹{p.paid.toLocaleString()}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${(p.total - p.paid) > 0 ? 'text-red-500' : (dm ? 'text-slate-400' : 'text-slate-400')}`}>
                    {(p.total - p.paid) > 0 ? `₹${(p.total - p.paid).toLocaleString()}` : '✓ Cleared'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      p.status === 'paid' ? 'bg-green-100 text-green-700' :
                      p.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status === 'paid' ? '✓ Paid' : p.status === 'partial' ? '⚡ Partial' : '⏳ Pending'}</span>
                  </td>
                  {!isOwner && (
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setModal(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.supplier)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'new' || (modal && modal.id)) && (
        <PurchaseModal 
          purchase={modal === 'new' ? null : modal} 
          onClose={() => setModal(null)} 
          onSave={handleSave} 
          dm={dm} 
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          addToast={addToast}
        />
      )}
    </div>
  );
}

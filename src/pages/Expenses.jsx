import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, TrendingDown, Edit2, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

// --- Expenses are now managed via SQLite ---

const getCategoryColor = (catName) => {
  const colors = {
    'Shop Rent': 'bg-red-100 text-red-700',
    'Salary': 'bg-purple-100 text-purple-700',
    'Tea / Refreshments': 'bg-amber-100 text-amber-700',
    'Water': 'bg-blue-100 text-blue-700',
    'Fuel': 'bg-orange-100 text-orange-700',
    'Electricity': 'bg-yellow-100 text-yellow-700',
    'Camera / CCTV': 'bg-slate-100 text-slate-700',
  };
  return colors[catName] || 'bg-gray-100 text-gray-700';
};


function ExpenseModal({ expense, onClose, onSave, dm, categories, setExpenseCategories, addToast }) {
  const isNew = !expense;
  const [form, setForm] = useState(expense || {
    date: new Date().toISOString().split('T')[0], category: categories[0]?.name || 'Other', description: '', amount: '',
    paymentMethod: 'Cash'
  });

  const handleCategoryChange = async (e) => {
    const val = e.target.value;
    if (val === '###NEW###') {
      const newName = window.prompt('Enter new expense category name:');
      if (newName?.trim()) {
        const newCat = { name: newName.trim() };
        if (window.api) {
          const saved = await window.api.saveExpenseCategory(newCat);
          setExpenseCategories(prev => [...prev, saved]);
        } else {
          setExpenseCategories(prev => [...prev, { ...newCat, id: Date.now() }]);
        }
        setForm(p => ({ ...p, category: newCat.name }));
        addToast(`Category ${newCat.name} added`, 'success');
      } else {
        setForm(p => ({ ...p, category: categories[0]?.name || 'Other' }));
      }
    } else {
      setForm(p => ({ ...p, category: val }));
    }
  };



  const handleSave = () => {
    if (!form.amount) return addToast('Please enter an amount', 'error');
    onSave({ ...form, id: expense?.id || Date.now(), amount: parseFloat(form.amount) });
    onClose();
  };

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add Expense' : 'Edit Expense'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className={labelCls}>Amount (₹)</label><input type="number" className={inputCls} value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} /></div>
          </div>
          <div><label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category} onChange={handleCategoryChange}>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="###NEW###">— Add New Category —</option>
            </select>
          </div>
          <div><label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="e.g. March shop rent" />
          </div>
          <div><label className={labelCls}>Payment Via</label>
            <select className={inputCls} value={form.paymentMethod} onChange={e => setForm(p => ({...p, paymentMethod: e.target.value}))}>
              <option>Cash</option>
              <option>UPI</option>
              <option>Shop GPay</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${dm ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600">
            {isNew ? 'Add Expense' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const { darkMode, addToast, expenses, setExpenses, expenseCategories: categories, setExpenseCategories, isOwner } = useApp();
  const dm = darkMode;
  const [modal, setModal] = useState(null);
  const [catFilter, setCatFilter] = useState('All');

  const filtered = expenses.filter(e => catFilter === 'All' || e.category === catFilter);
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const withBalance = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = 0;
    return sorted.map(e => { running += e.amount; return { ...e, running }; }).reverse();
  }, [filtered]);

  const handleSave = async (entry) => {
    if (window.api) {
      const result = await window.api.saveExpense(entry);
      setExpenses(prev => [{ ...entry, id: result?.id || Date.now() }, ...prev]);
    } else {
      setExpenses(prev => [{ ...entry, id: Date.now() }, ...prev]);
    }
    addToast(`Expense added: ₹${entry.amount.toLocaleString()}`, 'warning');
  };

  const handleDelete = async (id, category) => {
    if (window.api) {
      await window.api.deleteExpense(id);
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
    addToast(`${category} expense removed`, 'info');
  };

  const breakdown = categories.map(cat => ({
    cat: cat.name, total: expenses.filter(e => e.category === cat.name).reduce((s, e) => s + e.amount, 0)
  })).filter(b => b.total > 0).sort((a, b) => b.total - a.total);

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Daily Expenses</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Track expenses — click ✏️ to fix any mistake</p>
        </div>
        {!isOwner && (
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Breakdown */}
        <div className={`${card} p-5 space-y-3 lg:col-span-1`}>
          <h3 className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>📊 Category Breakdown</h3>
          <div className="space-y-1.5">
            {breakdown.map(b => (
              <div key={b.cat} className="flex justify-between items-center">
                <span className={`text-xs ${dm ? 'text-slate-300' : 'text-slate-600'}`}>{b.cat}</span>
                <span className="text-xs font-bold text-red-500">₹{b.total.toLocaleString()}</span>
              </div>
            ))}
            <div className={`flex justify-between items-center pt-2 border-t font-bold ${dm ? 'border-slate-700 text-white' : 'border-slate-100 text-slate-800'}`}>
              <span className="text-sm">Total</span>
              <span className="text-sm text-red-500">₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
            </div>
          </div>
          {/* Filter */}
          <div className={`pt-3 border-t ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            <p className={`text-xs font-semibold uppercase mb-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Filter</p>
            <div className="flex flex-wrap gap-1">
              {['All', ...categories.map(c => c.name)].map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${catFilter === cat ? 'bg-red-500 text-white' : (dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')}`}
                >{cat}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Table */}
        <div className={`${card} overflow-hidden lg:col-span-2`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
                <th className={th}>Date</th>
                <th className={th}>Category</th>
                <th className={th}>Description</th>
                <th className={th + ' text-right'}>Amount</th>
                <th className={th + ' text-right'}>Running</th>
                {!isOwner && <th className={th + ' text-center'}>Actions</th>}
              </tr></thead>
              <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {withBalance.map(e => (
                  <tr key={e.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3 text-xs font-mono ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{e.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getCategoryColor(e.category)}`}>{e.category}</span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${dm ? 'text-slate-200' : 'text-slate-700'}`}>{e.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">₹{e.amount.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right text-xs font-semibold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>₹{e.running.toLocaleString()}</td>
                    {!isOwner && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal(e)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(e.id, e.category)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {withBalance.length > 0 && (
                <tfoot>
                  <tr className={`border-t-2 font-bold ${dm ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                    <td colSpan={3} className={`px-4 py-3 text-sm ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Total ({filtered.length})</td>
                    <td className="px-4 py-3 text-right text-red-500">₹{total.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {withBalance.length === 0 && (
              <div className={`py-16 text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                <TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No expenses yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(modal === 'new' || (modal && modal.id)) && (
        <ExpenseModal 
          expense={modal === 'new' ? null : modal} 
          onClose={() => setModal(null)} 
          onSave={handleSave} 
          dm={dm} 
          categories={categories} 
          setExpenseCategories={setExpenseCategories} 
          addToast={addToast} 
        />
      )}
    </div>
  );
}

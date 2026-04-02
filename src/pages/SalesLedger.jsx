import { useState, useMemo } from 'react';
import { Plus, Search, X, TrendingUp, Edit2, Trash2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';


function SaleModal({ sale, onClose, onSave, dm }) {
  const isNew = !sale;
  const [form, setForm] = useState(sale || {
    date: new Date().toISOString().split('T')[0], inv: '', description: '', cost: '', selling: ''
  });

  const handleSave = () => {
    if (!form.description || !form.cost || !form.selling) return;
    onSave({
      ...form,
      id: sale?.id || Date.now(),
      cost: parseFloat(form.cost),
      selling: parseFloat(form.selling),
      items: form.description.split(',').length,
    });
    onClose();
  };

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`;
  const profit = parseFloat(form.selling || 0) - parseFloat(form.cost || 0);
  const pct = form.cost && form.selling ? ((profit / parseFloat(form.cost)) * 100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add Sale Entry' : 'Edit Sale Entry'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className={labelCls}>Invoice #</label><input className={inputCls} value={form.inv} onChange={e => setForm(p => ({...p, inv: e.target.value}))} placeholder="INV-1043" /></div>
          </div>
          <div><label className={labelCls}>Description</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="jersey 5 collar, shorts pp, boot focus 2.0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Cost Price (₹)</label><input type="number" className={inputCls} value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} /></div>
            <div><label className={labelCls}>Selling Price (₹)</label><input type="number" className={inputCls} value={form.selling} onChange={e => setForm(p => ({...p, selling: e.target.value}))} /></div>
          </div>
          {form.cost && form.selling && (
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
  const { darkMode, addToast, sales: liveSales, setSales: setLiveSales } = useApp();
  const dm = darkMode;
  // Map live POS sales to ledger format + allow manual entries
  const [manualSales, setManualSales] = useState([]);
  const allSales = useMemo(() => {
    const liveEntries = (liveSales || []).map(s => ({
      id: `live-${s.id}`,
      date: (s.date || s.created_at || '').split('T')[0].split(' ')[0],
      inv: `INV-${s.id}`,
      description: (s.items || []).map(i => `${i.name} x${i.qty}`).join(', '),
      cost: (s.items || []).reduce((t, i) => t + ((i.cost || 0) * i.qty), 0),
      selling: s.total || 0,
      items: (s.items || []).length,
      isLive: true,
    }));
    return [...liveEntries, ...manualSales].sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [liveSales, manualSales]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [dateFilter, setDateFilter] = useState('');

  const filtered = useMemo(() => allSales.filter(s =>
    ((s.description || '').toLowerCase().includes(search.toLowerCase()) || (s.inv && s.inv.includes(search))) &&
    (!dateFilter || s.date === dateFilter)
  ), [allSales, search, dateFilter]);

  const totals = useMemo(() => filtered.reduce((acc, s) => ({
    cost: acc.cost + s.cost,
    selling: acc.selling + s.selling,
    profit: acc.profit + (s.selling - s.cost),
  }), { cost: 0, selling: 0, profit: 0 }), [filtered]);

  const handleSave = (entry) => {
    const exists = manualSales.find(s => s.id === entry.id);
    if (exists) {
      setManualSales(prev => prev.map(s => s.id === entry.id ? entry : s));
      addToast(`Sale ${entry.inv || '#'} updated`, 'success');
    } else {
      setManualSales(prev => [{ ...entry, isManual: true }, ...prev]);
      addToast(`Sale ${entry.inv || '#'} added — Profit ₹${(entry.selling - entry.cost).toFixed(0)}`, 'success');
    }
  };

  const handleDelete = async (id, inv) => {
    if (String(id).startsWith('live-')) {
      const realId = parseInt(String(id).replace('live-', ''), 10);
      if (window.confirm(`Are you sure you want to completely delete POS sale ${inv}?\n\nThis will restore all items back to inventory stock.`)) {
        if (window.api) {
          await window.api.deleteSale(realId);
          setLiveSales(prev => prev.filter(s => s.id !== realId));
          addToast(`POS Sale ${inv} permanently deleted & stock restored!`, 'success');
        } else {
          setLiveSales(prev => prev.filter(s => s.id !== realId));
          addToast(`Browser Mode: Sale ${inv} deleted from UI.`, 'success');
        }
      }
      return;
    }
    setManualSales(prev => prev.filter(s => s.id !== id));
    addToast(`${inv || 'Entry'} deleted`, 'warning');
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Sales Ledger</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>All sale entries — click ✏️ to edit any row</p>
        </div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: filtered.length, fmt: 'num', color: 'text-blue-600' },
          { label: 'Total Cost (₹)', value: totals.cost, fmt: 'curr', color: dm ? 'text-white' : 'text-slate-800' },
          { label: 'Total Sales (₹)', value: totals.selling, fmt: 'curr', color: 'text-blue-600' },
          { label: 'Total Profit (₹)', value: totals.profit, fmt: 'curr', color: totals.profit >= 0 ? 'text-green-600' : 'text-red-500' },
        ].map(s => (
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description or invoice..."
              className={`flex-1 text-sm outline-none bg-transparent ${dm ? 'text-white placeholder-slate-500' : 'text-slate-800'}`} />
          </div>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className={`px-3 py-1.5 text-xs rounded-lg border outline-none ${dm ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-200 text-slate-700'}`} />
          {(search || dateFilter) && (
            <button onClick={() => { setSearch(''); setDateFilter(''); }} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <th className={th}>Date</th>
              <th className={th}>Invoice</th>
              <th className={th}>Description</th>
              <th className={th + ' text-right'}>Cost (₹)</th>
              <th className={th + ' text-right'}>Selling (₹)</th>
              <th className={th + ' text-right'}>Profit (₹)</th>
              <th className={th + ' text-right'}>Margin</th>
              <th className={th + ' text-center'}>Actions</th>
            </tr></thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {filtered.map(s => {
                const profit = s.selling - s.cost;
                const pct = ((profit / s.cost) * 100).toFixed(1);
                return (
                  <tr key={s.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3.5 text-xs font-mono ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{s.date}</td>
                    <td className="px-4 py-3.5 font-semibold text-blue-600 text-xs">{s.inv || '—'}</td>
                    <td className={`px-4 py-3.5 max-w-xs ${dm ? 'text-slate-200' : 'text-slate-700'}`}>
                      <span className="line-clamp-1 text-sm">{s.description}</span>
                    </td>
                    <td className={`px-4 py-3.5 text-right ${dm ? 'text-slate-300' : 'text-slate-600'}`}>₹{s.cost.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-blue-600">₹{s.selling.toLocaleString()}</td>
                    <td className={`px-4 py-3.5 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>₹{profit.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{pct}%</span>
                    </td>
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
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className={`border-t-2 font-bold ${dm ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                  <td colSpan={3} className={`px-4 py-3 text-sm ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Total ({filtered.length} entries)</td>
                  <td className={`px-4 py-3 text-right text-sm ${dm ? 'text-slate-300' : 'text-slate-700'}`}>₹{totals.cost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-blue-600">₹{totals.selling.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right text-sm ${totals.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>₹{totals.profit.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right text-xs font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {totals.selling > 0 ? ((totals.profit / totals.selling) * 100).toFixed(1) : 0}%
                  </td>
                  <td />
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
        <SaleModal sale={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} dm={dm} />
      )}
    </div>
  );
}

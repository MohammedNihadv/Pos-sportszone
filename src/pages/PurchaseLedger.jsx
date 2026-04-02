import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SUPPLIERS = ['Scampilo', 'Catos Jersey', 'Wafa Calicut', 'Noway', 'Captain', 'Calicut Sports Jersey', 'Impact Tirur', 'Soccer Sportstrade', 'Norvas', 'M.P Traders'];

const INITIAL_LEDGER = [
  { id: 1,  date: '2026-03-01', inv: '',         supplier: 'Opening Balance', debit: null,  credit: null, note: 'Carried from Feb' },
  { id: 2,  date: '2026-03-01', inv: 'b2c-3220', supplier: 'Scampilo',        debit: 5420,  credit: null, note: '' },
  { id: 3,  date: '2026-03-02', inv: '',         supplier: 'Catos Jersey',    debit: 20000, credit: null, note: 'Jersey batch' },
  { id: 4,  date: '2026-03-02', inv: '',         supplier: 'Catos Jersey',    debit: 3135,  credit: null, note: '' },
  { id: 5,  date: '2026-03-02', inv: '',         supplier: 'Wafa Calicut',    debit: 3340,  credit: null, note: '' },
  { id: 6,  date: '2026-03-02', inv: '1016',     supplier: 'Noway',           debit: 1200,  credit: null, note: '' },
  { id: 7,  date: '2026-03-05', inv: 'b2c-3240', supplier: 'Scampilo',        debit: 3924,  credit: null, note: '' },
  { id: 8,  date: '2026-03-06', inv: '2720',     supplier: 'Captain',         debit: 15288, credit: null, note: '' },
  { id: 9,  date: '2026-03-11', inv: 'b2c-3260', supplier: 'Scampilo',        debit: 8469,  credit: null, note: '' },
  { id: 10, date: '2026-03-14', inv: '19344',    supplier: 'Calicut Sports Jersey', debit: 12620, credit: null, note: 'Football jerseys' },
  { id: 11, date: '2026-03-17', inv: 'b2c-3290', supplier: 'Scampilo',        debit: 2356,  credit: null, note: '' },
  { id: 12, date: '2026-03-19', inv: '',         supplier: 'Impact Tirur',    debit: 1000,  credit: null, note: '' },
  { id: 13, date: '2026-03-22', inv: '1240',     supplier: 'Norvas',          debit: 5280,  credit: null, note: '' },
];

const OPENING_BALANCE = 7844;

function EntryModal({ entry, onClose, onSave, dm }) {
  const isNew = !entry;
  const [form, setForm] = useState(entry || {
    date: new Date().toISOString().split('T')[0], inv: '', supplier: SUPPLIERS[0], debit: '', credit: '', note: ''
  });

  const handleSave = () => {
    onSave({
      ...form,
      id: entry?.id || Date.now(),
      debit: form.debit ? parseFloat(form.debit) : null,
      credit: form.credit ? parseFloat(form.credit) : null,
    });
    onClose();
  };

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add Purchase Entry' : 'Edit Purchase Entry'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div><label className={labelCls}>Invoice #</label><input className={inputCls} value={form.inv} onChange={e => setForm(p => ({...p, inv: e.target.value}))} placeholder="b2c-3300" /></div>
          </div>
          <div><label className={labelCls}>Supplier</label>
            <select className={inputCls} value={form.supplier} onChange={e => setForm(p => ({...p, supplier: e.target.value}))}>
              {SUPPLIERS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Debit (₹ Purchased)</label><input type="number" className={inputCls} value={form.debit || ''} onChange={e => setForm(p => ({...p, debit: e.target.value}))} placeholder="0" /></div>
            <div><label className={labelCls}>Credit (₹ Returned)</label><input type="number" className={inputCls} value={form.credit || ''} onChange={e => setForm(p => ({...p, credit: e.target.value}))} placeholder="0" /></div>
          </div>
          <div><label className={labelCls}>Note</label><input className={inputCls} value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} placeholder="Optional note..." /></div>
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
  const { darkMode, addToast } = useApp();
  const dm = darkMode;
  const [entries, setEntries] = useState(INITIAL_LEDGER);
  const [openingBalance, setOpeningBalance] = useState(OPENING_BALANCE);
  const [openingEdit, setOpeningEdit] = useState(false);
  const [modal, setModal] = useState(null); // null | 'new' | entry object
  const [supplierFilter, setSupplierFilter] = useState('All');

  const filtered = entries.filter(e => supplierFilter === 'All' || e.supplier === supplierFilter);

  const withBalance = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = openingBalance;
    return sorted.map(e => {
      if (e.supplier === 'Opening Balance') return { ...e, running: openingBalance };
      running += (e.debit || 0) - (e.credit || 0);
      return { ...e, running };
    });
  }, [filtered, openingBalance]);

  const totalDebit = filtered.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + (e.credit || 0), 0);
  const finalBalance = openingBalance + totalDebit - totalCredit;

  const handleSave = (entry) => {
    const exists = entries.find(e => e.id === entry.id);
    if (exists) {
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
      addToast(`${entry.supplier} entry updated`, 'success');
    } else {
      setEntries(prev => [...prev, entry]);
      addToast(`${entry.supplier} added`, 'success');
    }
  };

  const handleDelete = (id, supplier) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    addToast(`${supplier} entry removed`, 'warning');
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Purchase Ledger</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Supplier transactions — click ✏️ to correct any entry</p>
        </div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance — editable */}
        <div className={`${card} p-4 cursor-pointer`} onClick={() => setOpeningEdit(true)}>
          <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Opening Balance</p>
          {openingEdit ? (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-400">₹</span>
              <input type="number" autoFocus value={openingBalance}
                onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)}
                onBlur={() => { setOpeningEdit(false); addToast('Opening balance updated', 'success'); }}
                className={`text-xl font-bold w-full bg-transparent outline-none border-b-2 border-blue-500 ${dm ? 'text-white' : 'text-slate-800'}`}
              />
            </div>
          ) : (
            <p className={`text-2xl font-bold mt-1 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}>
              ₹{openingBalance.toLocaleString()}
              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
            </p>
          )}
          <p className={`text-xs mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Click to edit</p>
        </div>
        <div className={`${card} p-4`}>
          <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Purchase (Debit)</p>
          <p className="text-2xl font-bold mt-1 text-red-500">₹{totalDebit.toLocaleString()}</p>
        </div>
        <div className={`${card} p-4`}>
          <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Credit / Return</p>
          <p className="text-2xl font-bold mt-1 text-green-600">₹{totalCredit.toLocaleString()}</p>
        </div>
        <div className={`${card} p-4 border-l-4 border-l-blue-500`}>
          <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Running Balance</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">₹{finalBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Supplier Filter */}
      <div className={`${card} overflow-hidden`}>
        <div className={`flex gap-1 p-3 border-b flex-wrap ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          {['All', ...SUPPLIERS].map(s => (
            <button key={s} onClick={() => setSupplierFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${supplierFilter === s ? 'bg-blue-600 text-white' : (dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')}`}
            >{s}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <th className={th}>Date</th>
              <th className={th}>Invoice</th>
              <th className={th}>Supplier</th>
              <th className={th}>Note</th>
              <th className={th + ' text-right'}>Debit (₹)</th>
              <th className={th + ' text-right'}>Credit (₹)</th>
              <th className={th + ' text-right'}>Balance (₹)</th>
              <th className={th + ' text-center'}>Actions</th>
            </tr></thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {withBalance.map(e => (
                <tr key={e.id} className={`transition-colors ${e.supplier === 'Opening Balance' ? (dm ? 'bg-blue-900/20' : 'bg-blue-50') : (dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50')}`}>
                  <td className={`px-4 py-3 text-xs font-mono ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{e.date}</td>
                  <td className="px-4 py-3 text-xs font-mono text-blue-500">{e.inv || '—'}</td>
                  <td className={`px-4 py-3 font-semibold text-sm ${e.supplier === 'Opening Balance' ? 'text-blue-600' : (dm ? 'text-white' : 'text-slate-800')}`}>{e.supplier}</td>
                  <td className={`px-4 py-3 text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{e.note || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-500">{e.debit ? `₹${e.debit.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{e.credit ? `₹${e.credit.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">₹{e.running.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {e.supplier !== 'Opening Balance' && (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setModal(e)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(e.id, e.supplier)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 font-bold ${dm ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                <td colSpan={4} className={`px-4 py-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Total</td>
                <td className="px-4 py-3 text-right text-red-500">₹{totalDebit.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-green-600">₹{totalCredit.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-blue-600">₹{finalBalance.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {(modal === 'new' || (modal && modal.id)) && (
        <EntryModal entry={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} dm={dm} />
      )}
    </div>
  );
}

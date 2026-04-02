import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Trash2, AlertCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Credits() {
  const { darkMode, addToast } = useApp();
  const dm = darkMode;

  const [credits, setCredits] = useState([]);
  const [settleModal, setSettleModal] = useState(null); // { credit, amount }
  const [settleAmount, setSettleAmount] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sz_credits') || '[]');
      setCredits(stored);
    } catch { setCredits([]); }
  }, []);

  const save = (updated) => {
    setCredits(updated);
    localStorage.setItem('sz_credits', JSON.stringify(updated));
  };

  const handleSettle = () => {
    const amount = parseFloat(settleAmount) || 0;
    if (!amount || amount <= 0) return addToast('Enter a valid amount', 'error');

    const updated = credits.map(c => {
      if (c.id !== settleModal.id) return c;
      const newPaid = (c.paid || 0) + amount;
      const newPending = Math.max(0, c.total - newPaid);
      return { ...c, paid: newPaid, pending: newPending };
    }).filter(c => c.pending > 0); // Remove fully settled

    save(updated);
    addToast(`₹${amount} settled for ${settleModal.customer}`, 'success');
    setSettleModal(null);
    setSettleAmount('');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Remove this credit entry?')) return;
    save(credits.filter(c => c.id !== id));
    addToast('Credit entry removed', 'info');
  };

  const totalPending = credits.reduce((s, c) => s + (c.pending || 0), 0);

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Credit / Pay Later</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Customers with pending balances</p>
        </div>
        {totalPending > 0 && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${dm ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className={`text-sm font-bold ${dm ? 'text-red-300' : 'text-red-600'}`}>Total Pending: ₹{totalPending.toLocaleString()}</span>
          </div>
        )}
      </div>

      {credits.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-50" />
          <p className={`font-semibold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>No pending credits!</p>
          <p className={`text-sm mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>All customers are settled up.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {credits.map(c => (
            <div key={c.id} className={`${card} p-5 space-y-3`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-800'}`}>{c.customer}</p>
                  <p className={`text-xs mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{c.date}</p>
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className={`text-xs truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{c.items}</p>

              <div className={`space-y-1.5 text-sm rounded-xl p-3 ${dm ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex justify-between">
                  <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Bill Total</span>
                  <span className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{c.total?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={dm ? 'text-slate-400' : 'text-slate-500'}>Paid</span>
                  <span className="font-semibold text-emerald-600">₹{(c.paid || 0).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between border-t pt-1.5 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                  <span className="font-bold text-red-500">Pending</span>
                  <span className="font-bold text-red-500">₹{(c.pending || 0).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => { setSettleModal(c); setSettleAmount(String(c.pending)); }}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Record Payment
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Settle Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Record Payment — {settleModal.customer}</h3>
              <button onClick={() => setSettleModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {settleModal.items && (
                <div className={`p-3 rounded-xl text-xs font-medium space-y-1 ${dm ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                   <p className="opacity-70 uppercase tracking-widest text-[10px] mb-1.5 font-bold">Items Purchased</p>
                   <p className="leading-relaxed">{settleModal.items}</p>
                </div>
              )}
              <div className={`flex justify-between text-sm font-semibold p-3 rounded-xl ${dm ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
                <span>Outstanding</span>
                <span>₹{settleModal.pending?.toLocaleString()}</span>
              </div>
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Amount Received (₹)</label>
                <input
                  autoFocus
                  type="number"
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-2xl font-bold text-center outline-none transition-all
                    ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSettleModal(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${dm ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>Cancel</button>
                <button onClick={handleSettle} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

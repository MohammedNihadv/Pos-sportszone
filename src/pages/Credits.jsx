import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Trash2, AlertCircle, X } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';

export default function Credits() {
  const { darkMode, addToast, isOwner, credits, refreshCredits } = useApp();
  const dm = darkMode;

  const [settleModal, setSettleModal] = useState(null); // { id, customer_name, total, paid, pending, items }
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('cash');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleSettle = async () => {
    const amount = parseFloat(settleAmount) || 0;
    if (!amount || amount <= 0) return addToast('Enter a valid amount', 'error');
    if (!window.api) return addToast('Database connection missing', 'error');

    const newPaid = (settleModal.paid || 0) + amount;
    const newPending = Math.max(0, settleModal.total - newPaid);
    const newNote = (settleModal.items || '') + ` (Paid ₹${amount} via ${settleMethod.toUpperCase()} on ${new Date().toLocaleDateString()})`;

    try {
      if (newPending === 0) {
        // Fully settled, delete the credit record
        await window.api.deleteCredit(settleModal.id);
        addToast(`Bill fully settled for ${settleModal.customer_name}!`, 'success');
      } else {
        // Partial settlement, update record
        await window.api.saveCredit({
          ...settleModal,
          paid: newPaid,
          pending: newPending,
          items: newNote
        });
        addToast(`₹${amount} received from ${settleModal.customer_name}. Remaining: ₹${newPending.toLocaleString()}`, 'success');
      }
      
      await refreshCredits();
      setSettleModal(null);
      setSettleAmount('');
    } catch (err) {
      addToast('Failed to update credit: ' + err.message, 'error');
    }
  };

  const handleDelete = (id) => {
    setConfirmDelete(id);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await window.api.deleteCredit(id);
      await refreshCredits();
      addToast('Credit entry removed', 'info');
    } catch (err) {
      addToast('Delete failed: ' + err.message, 'error');
    }
  };

  const totalPending = (credits || []).reduce((s, c) => s + (c.pending || 0), 0);
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

      {(!credits || credits.length === 0) ? (
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
                  <p className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-800'}`}>{c.customer_name}</p>
                  <p className={`text-xs mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{c.date}</p>
                </div>
                {!isOwner && (
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
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

              {!isOwner && (
                <button
                  onClick={() => { setSettleModal(c); setSettleAmount(c.pending ? c.pending.toFixed(2) : ''); setSettleMethod('cash'); }}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Record Payment
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Settle Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) setSettleModal(null); }}>
          <div onMouseDown={e => e.stopPropagation()} className={`w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Record Payment — {settleModal.customer_name}</h3>
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
                <label className={`text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Payment Method</label>
                <div className="flex gap-2 mb-3">
                  {['cash', 'upi'].map(m => (
                    <button key={m} onClick={() => setSettleMethod(m)} 
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 
                        ${settleMethod === m 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : dm ? 'border-slate-700 bg-slate-800 text-slate-400 hover:border-emerald-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-500'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

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

      {confirmDelete && (
        <ConfirmModal
          isOpen={!!confirmDelete}
          title="Remove Credit Entry"
          message="Are you sure you want to remove this credit entry? This should only be done if it was entered by error."
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
          dm={dm}
        />
      )}
    </div>
  );
}

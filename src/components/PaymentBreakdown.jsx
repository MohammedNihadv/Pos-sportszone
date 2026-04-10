import { Plus, X, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { playSound } from '../utils/sounds';

const METHODS = [
  { id: 'Cash', icon: Banknote, color: 'emerald' },
  { id: 'UPI', icon: Smartphone, color: 'blue' },
  { id: 'Shop GPay', icon: Smartphone, color: 'indigo' },
];

export default function PaymentBreakdown({ payments = [], onChange, dm, totalAmount }) {
  const totalReceived = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const addMethod = () => {
    playSound('pop');
    const remaining = Math.max(0, parseFloat(totalAmount || 0) - totalReceived);
    onChange([...payments, { method: 'Cash', amount: remaining > 0 ? remaining : '' }]);
  };

  const removeMethod = (index) => {
    playSound('click');
    const newPayments = payments.filter((_, i) => i !== index);
    onChange(newPayments);
  };

  const updateMethod = (index, field, value) => {
    const newPayments = payments.map((p, i) => {
      if (i === index) return { ...p, [field]: value };
      return p;
    });
    onChange(newPayments);
  };

  const inputCls = `flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-all ${
    dm ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'
  }`;

  return (
    <div className={`p-4 rounded-2xl border ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className={`text-xs font-bold uppercase tracking-widest ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
          Payment Breakdown
        </h4>
        <button
          onClick={addMethod}
          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Method
        </button>
      </div>

      <div className="space-y-3">
        {payments.length === 0 && (
          <p className={`text-center py-4 text-xs italic ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
            No payment methods added. Please add one.
          </p>
        )}
        
        {payments.map((p, index) => (
          <div key={index} className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-200">
            <select
              value={p.method}
              onChange={(e) => updateMethod(index, 'method', e.target.value)}
              className={`w-36 px-3 py-2 rounded-lg text-sm border outline-none transition-all ${
                dm ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'
              }`}
            >
              {METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>
            
            <div className="relative flex-1">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>₹</span>
              <input
                type="number"
                placeholder="0.00"
                value={p.amount}
                onChange={(e) => updateMethod(index, 'amount', e.target.value)}
                className={`w-full pl-7 pr-3 py-2 rounded-lg text-sm border outline-none transition-all font-bold ${
                  dm ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 focus:border-blue-500 shadow-sm'
                }`}
              />
            </div>

            <button
              onClick={() => removeMethod(index)}
              className={`p-2 rounded-lg transition-colors ${dm ? 'hover:bg-slate-800 text-slate-500 hover:text-red-400' : 'hover:bg-slate-200 text-slate-400 hover:text-red-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className={`mt-4 pt-3 border-t border-dashed ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center px-1">
          <span className={`text-sm font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Received:</span>
          <span className={`text-lg font-black ${totalReceived >= parseFloat(totalAmount || 0) ? 'text-green-600' : 'text-blue-600'}`}>
            ₹{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

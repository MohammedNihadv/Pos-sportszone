import React from 'react';
import { Calendar, X, ChevronDown } from 'lucide-react';

export default function DateRangePicker({ startDate, endDate, setStartDate, setEndDate, dm }) {
  const handlePreset = (preset) => {
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (preset === 'This Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (preset === 'Last Month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (preset === 'This Year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else if (preset === 'All Time') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
  };

  const clear = () => {
    setStartDate('');
    setEndDate('');
  };

  const inputCls = `text-xs outline-none bg-transparent py-1 px-2 font-semibold transition-all w-28 ${dm ? 'text-white' : 'text-slate-700'}`;
  const containerCls = `flex items-center rounded-xl border transition-all ${dm ? 'bg-slate-800 border-slate-700 focus-within:border-blue-500' : 'bg-white border-slate-200 focus-within:border-blue-500'}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Presets */}
      <div className={containerCls + " px-1"}>
        <div className={`p-1 mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
           <Calendar className="w-3.5 h-3.5" />
        </div>
        <select 
          onChange={(e) => handlePreset(e.target.value)}
          className={`text-xs outline-none bg-transparent py-1.5 px-1 font-bold pr-4 cursor-pointer ${dm ? 'text-blue-400' : 'text-blue-600'}`}
          defaultValue="Presets"
        >
          <option value="Presets">Quick Ranges</option>
          <option value="All Time">All Time</option>
          <option value="This Month">This Month</option>
          <option value="Last Month">Last Month</option>
          <option value="This Year">This Year</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <div className={containerCls + " px-2"}>
          <span className={`text-[10px] uppercase tracking-tighter font-bold mr-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>From</span>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls} 
          />
        </div>

        <div className={containerCls + " px-2"}>
          <span className={`text-[10px] uppercase tracking-tighter font-bold mr-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>To</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls} 
          />
        </div>
      </div>

      {(startDate || endDate) && (
        <button 
          onClick={clear}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 group ${dm ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
          title="Clear Filters"
        >
          <X className={`w-3.5 h-3.5 ${dm ? 'text-slate-500 group-hover:text-red-400' : 'text-slate-400 group-hover:text-red-500'}`} />
          <span className={`text-[10px] font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>RESET</span>
        </button>
      )}
    </div>
  );
}

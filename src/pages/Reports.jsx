import { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend 
} from 'recharts';
import { RefreshCw, Box, Activity, TrendingUp, Percent } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DateRangePicker from '../components/DateRangePicker';

export default function Reports() {
  const { darkMode, sales: s, purchases: p } = useApp();
  const dm = darkMode;
  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  // Robust path to "YYYY-MM-DD" matching the date picker
  const toYMD = (d) => {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Advanced Date Range Filtering
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Use memoization for heavy stats calculation
  const stats = useMemo(() => {
    if (!s || !p) return null;

    // Filter raw data based on selected range
    const filteredSales = s.filter(sale => {
      if (!startDate && !endDate) return true; 
      const saleYMD = toYMD(sale.date || sale.created_at);
      if (startDate && saleYMD < startDate) return false;
      if (endDate && saleYMD > endDate) return false;
      return true;
    });

    const filteredPurchases = p.filter(pur => {
      if (!startDate && !endDate) return true;
      const purYMD = toYMD(pur.date);
      if (startDate && purYMD < startDate) return false;
      if (endDate && purYMD > endDate) return false;
      return true;
    });

    // Determine months to show in chart
    const months = {};
    if (!startDate && !endDate) {
      // Default: Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        months[key] = { month: d.toLocaleString('en-US', { month: 'short' }), key, purchase: 0, sales: 0, profit: 0 };
      }
    } else {
      // Dynamic range: Get all months between start and end
      const start = startDate ? new Date(startDate) : new Date(Math.min(...filteredSales.map(s => new Date(s.date || s.created_at))));
      const end = endDate ? new Date(endDate) : new Date();
      
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const limit = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (curr <= limit) {
        const key = curr.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        months[key] = { month: curr.toLocaleString('en-US', { month: 'short' }), key, purchase: 0, sales: 0, profit: 0 };
        curr.setMonth(curr.getMonth() + 1);
        if (Object.keys(months).length > 24) break; // Safety cap
      }
    }

    let totalCash = 0; 
    let totalUpi = 0;
    const itemStats = {};

    // Single pass through filtered sales
    filteredSales.forEach(sale => {
      const d = new Date(sale.date || sale.created_at || new Date());
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      
      if (months[key]) {
        months[key].sales += sale.total;
        const cost = (sale.items || []).reduce((sum, item) => sum + (item.cost || 0) * item.qty, 0);
        months[key].profit += (sale.total - cost);
      }
      
      const pm = (sale.paymentMethod || sale.payment_method || '').toLowerCase();
      if (pm === 'cash') totalCash += sale.total;
      else if (pm.includes('upi') || pm.includes('bank') || pm.includes('card')) totalUpi += sale.total;

      (sale.items || []).forEach(item => {
        if (!itemStats[item.name]) itemStats[item.name] = { name: item.name, qty: 0, revenue: 0, cost: 0 };
        itemStats[item.name].qty += item.qty;
        itemStats[item.name].revenue += (item.price * item.qty);
        itemStats[item.name].cost += ((item.cost || 0) * item.qty);
      });
    });

    filteredPurchases.forEach(purchase => {
      const d = new Date(purchase.date || new Date());
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (months[key]) {
        months[key].purchase += purchase.total;
      }
    });

    const topItems = Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(i => {
         const m = i.revenue > 0 ? ((i.revenue - i.cost) / i.revenue) * 100 : 0;
         return { ...i, margin: Math.round(m) + '%' };
      });

    const monthlyArray = Object.values(months);
    const totalSalesAll = filteredSales.reduce((acc, curr) => acc + curr.total, 0);
    const totalPurchaseAll = filteredPurchases.reduce((acc, curr) => acc + curr.total, 0);
    const totalProfitAll = monthlyArray.reduce((acc, curr) => acc + curr.profit, 0);
    const avgMargin = totalSalesAll > 0 ? ((totalProfitAll / totalSalesAll) * 100).toFixed(1) + '%' : '0%';

    return {
      monthlyData: monthlyArray,
      banking: { cash: totalCash, upi: totalUpi },
      topItems,
      totalPurchaseAll,
      totalSalesAll,
      totalProfitAll,
      avgMargin
    };
  }, [s, p, startDate, endDate]);

  const loading = !stats;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
         <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-50" />
         <p className="font-bold text-lg animate-pulse">Aggregating Business Intelligence...</p>
         <p className="text-xs mt-1">This may take a moment for large datasets</p>
      </div>
    );
  }

  const { monthlyData, banking, topItems, totalPurchaseAll, totalSalesAll, totalProfitAll, avgMargin } = stats;

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Reports & Analytics</h2>
          <p className={`text-sm mt-1.5 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Real-time business performance & financial insights</p>
        </div>
        <div className="flex items-center gap-2">
           <DateRangePicker 
             startDate={startDate} 
             endDate={endDate} 
             setStartDate={setStartDate} 
             setEndDate={setEndDate} 
             dm={dm} 
           />
        </div>
      </div>

      {/* Elite Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Purchases', value: totalPurchaseAll, color: 'red', icon: Box, desc: 'Stock inward value' },
          { label: 'Total Sales', value: totalSalesAll, color: 'blue', icon: Activity, desc: 'Gross revenue' },
          { label: 'Gross Profit', value: totalProfitAll, color: 'emerald', icon: TrendingUp, desc: 'Net earnings' },
          { label: 'Profit Margin', value: avgMargin, color: 'purple', icon: Percent, desc: 'Efficiency ratio', isText: true },
        ].map((c) => (
          <div key={c.label} className={`${card} p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${c.color}-500/5 rounded-full blur-2xl group-hover:bg-${c.color}-500/10 transition-colors`}></div>
            
            <div className="flex items-start justify-between relative z-10">
               <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{c.label}</p>
                  <h3 className={`text-2xl font-bold mt-2 tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>
                    {c.isText ? c.value : `₹${(c.value || 0).toLocaleString()}`}
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-1">{c.desc}</p>
               </div>
               <div className={`p-3 bg-${c.color}-50 text-${c.color}-600 rounded-xl shadow-sm`}>
                  <c.icon className="w-5 h-5" />
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <div className={`${card} p-6`}>
          <div className="mb-6">
            <h3 className={`font-bold text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>Sales & Profit Trend</h3>
            <p className={`text-xs mt-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Monthly comparison over the last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dm ? '#334155' : '#f1f5f9'} />
              <XAxis dataKey="month" tick={{ fill: dm ? '#64748b' : '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: dm ? '#64748b' : '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: dm ? '#0f172a' : '#fff', border: `1px solid ${dm ? '#1e293b' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                itemStyle={{ fontSize: 12, fontWeight: 700 }}
                formatter={v => [`₹${v.toLocaleString()}`, '']} 
              />
              <Legend iconType="circle" />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" fill="url(#colorSales)" strokeWidth={3} animationDuration={1000} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={3} animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Table */}
        <div className={`${card} overflow-hidden shadow-xl border-none`}>
          <div className={`px-6 py-5 border-b flex items-center justify-between ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
            <div>
              <h3 className={`font-bold text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>Top Performers</h3>
              <p className={`text-xs mt-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Best selling items by revenue</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={dm ? 'bg-slate-800/30' : 'bg-slate-50'}>
                <th className={th}>Product</th><th className={th + ' text-right'}>Qty</th>
                <th className={th + ' text-right'}>Revenue</th><th className={th + ' text-right'}>Profit</th>
              </tr></thead>
              <tbody className={`divide-y ${dm ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {topItems.map((item) => (
                  <tr key={item.name} className={`transition-colors ${dm ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/20'}`}>
                    <td className={`px-6 py-4.5 font-bold ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</td>
                    <td className={`px-6 py-4.5 text-right font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{item.qty}</td>
                    <td className="px-6 py-4.5 text-right font-bold text-blue-600">₹{item.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4.5 text-right">
                      <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold uppercase">{item.margin}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

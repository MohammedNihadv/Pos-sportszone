import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend
} from 'recharts';
import { useApp } from '../context/AppContext';

import { useState, useEffect } from 'react';

export default function Reports() {
  const { darkMode, sales: s, purchases: p } = useApp();
  const dm = darkMode;
  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;

  const [monthlyData, setMonthlyData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [banking, setBanking] = useState({ cash: 0, upi: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!s || !p) return;
    function calculateStats() {
      // Calculate last 6 months data
      const months = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        months[key] = { month: d.toLocaleString('en-US', { month: 'short' }), key, purchase: 0, sales: 0, profit: 0, rawSales: [] };
      }

      let totalCash = 0; let totalUpi = 0;
      s.forEach(sale => {
        const d = new Date(sale.date || sale.created_at || new Date());
        const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (months[key]) {
          months[key].sales += sale.total;
          const cost = (sale.items || []).reduce((sum, item) => sum + (item.cost || 0) * item.qty, 0);
          months[key].profit += (sale.total - cost);
          months[key].rawSales.push(sale);
        }
        
        const pm = (sale.paymentMethod || sale.payment_method || '').toLowerCase();
        if (pm === 'cash') totalCash += sale.total;
        else if (pm.includes('upi') || pm.includes('bank') || pm.includes('card')) totalUpi += sale.total;
      });
      
      setBanking({ cash: totalCash, upi: totalUpi });

      p.forEach(purchase => {
        const d = new Date(purchase.date || new Date());
        const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (months[key]) {
          months[key].purchase += purchase.total;
        }
      });

      setMonthlyData(Object.values(months));

      // Top items
      const itemStats = {};
      s.forEach(sale => {
        (sale.items || []).forEach(item => {
          if (!itemStats[item.name]) itemStats[item.name] = { name: item.name, qty: 0, revenue: 0, cost: 0 };
          itemStats[item.name].qty += item.qty;
          itemStats[item.name].revenue += (item.price * item.qty);
          itemStats[item.name].cost += ((item.cost || 0) * item.qty);
        });
      });

      const sortedItems = Object.values(itemStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(i => {
           const m = i.revenue > 0 ? ((i.revenue - i.cost) / i.revenue) * 100 : 0;
           return { ...i, margin: Math.round(m) + '%' };
        });
      setTopItems(sortedItems);
    }
    calculateStats();
  }, [s, p]);

  const current = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : { purchase: 0, sales: 0, profit: 0 };
  const totalSalesAll = monthlyData.reduce((acc, curr) => acc + curr.sales, 0);
  const totalPurchaseAll = monthlyData.reduce((acc, curr) => acc + curr.purchase, 0);
  const totalProfitAll = monthlyData.reduce((acc, curr) => acc + curr.profit, 0);
  const avgMargin = totalSalesAll > 0 ? ((totalProfitAll / totalSalesAll) * 100).toFixed(1) + '%' : '0%';

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Reports & Analytics</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Business performance overview</p>
        </div>
        <select className={`px-3 py-2 rounded-lg text-sm border outline-none ${dm ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
          <option>Last 6 Months</option><option>This Year</option><option>Custom Range</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Purchase', value: totalPurchaseAll, color: 'red' },
          { label: 'Total Sales', value: totalSalesAll, color: 'blue' },
          { label: 'Gross Profit', value: totalProfitAll, color: 'green' },
          { label: 'Profit Margin', value: avgMargin, color: 'purple', isText: true },
        ].map(card2 => (
          <div key={card2.label} className={`${card} p-4`}>
            <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{card2.label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${
              card2.color === 'red' ? 'text-red-500' :
              card2.color === 'green' ? 'text-green-600' :
              card2.color === 'purple' ? 'text-purple-600' : 'text-blue-600'
            }`}>
              {card2.isText ? card2.value : `₹${(card2.value || 0).toLocaleString()}`}
            </p>
          </div>
        ))}
      </div>

      {/* Treasury & Banking Cards */}
      <div className={`mt-6 mb-2 flex items-center justify-between`}>
        <h3 className={`font-bold text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>Treasury & Bank Flow</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${card} p-5 border-l-4 border-l-emerald-500`}>
           <p className={`text-xs font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Cash Collected (Gross)</p>
           <p className="text-2xl font-bold text-emerald-600 mt-1">₹{banking.cash.toLocaleString()}</p>
        </div>
        <div className={`${card} p-5 border-l-4 border-l-blue-500`}>
           <p className={`text-xs font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>UPI / Bank Balance</p>
           <p className="text-2xl font-bold text-blue-600 mt-1">₹{banking.upi.toLocaleString()}</p>
        </div>
        <div className={`${card} p-5 border-l-4 border-l-purple-500`}>
           <p className={`text-xs font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Tracked Revenue</p>
           <p className="text-2xl font-bold text-purple-600 mt-1">₹{(banking.cash + banking.upi).toLocaleString()}</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className={`${card} p-5`}>
        <h3 className={`font-semibold mb-0.5 ${dm ? 'text-white' : 'text-slate-800'}`}>Sales & Profit Trend</h3>
        <p className={`text-xs mb-5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Monthly comparison over the last 6 months</p>
        <ResponsiveContainer width="100%" height={280}>
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
            <CartesianGrid strokeDasharray="3 3" stroke={dm ? '#334155' : '#f1f5f9'} />
            <XAxis dataKey="month" tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: dm ? '#1e293b' : '#fff', border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 10, color: dm ? '#f1f5f9' : '#1e293b' }} formatter={v => [`₹${v.toLocaleString()}`, '']} />
            <Legend />
            <Area type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" fill="url(#colorSales)" strokeWidth={2} animationDuration={800} />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={2} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Compare Bar */}
      <div className={`${card} p-5`}>
        <h3 className={`font-semibold mb-0.5 ${dm ? 'text-white' : 'text-slate-800'}`}>Monthly Comparison</h3>
        <p className={`text-xs mb-5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Purchase vs Sales each month</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dm ? '#334155' : '#f1f5f9'} />
            <XAxis dataKey="month" tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: dm ? '#1e293b' : '#fff', border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 10, color: dm ? '#f1f5f9' : '#1e293b' }} formatter={v => [`₹${v.toLocaleString()}`, '']} />
            <Legend />
            <Bar dataKey="purchase" name="Purchase" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={800} />
            <Bar dataKey="sales" name="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products Table */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>Top Selling Products</h3>
          <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Best performers this period</p>
        </div>
        <table className="w-full text-sm">
          <thead><tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            <th className={th}>#</th><th className={th}>Product</th><th className={th + ' text-right'}>Qty Sold</th>
            <th className={th + ' text-right'}>Revenue</th><th className={th + ' text-right'}>Margin</th>
          </tr></thead>
          <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
            {topItems.map((item, i) => (
              <tr key={item.name} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                <td className={`px-5 py-3.5 font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>{item.name}</td>
                <td className={`px-5 py-3.5 text-right ${dm ? 'text-slate-300' : 'text-slate-600'}`}>{item.qty}</td>
                <td className="px-5 py-3.5 text-right font-bold text-blue-600">₹{item.revenue.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">{item.margin}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

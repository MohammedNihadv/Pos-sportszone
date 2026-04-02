import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

// --- Static dummy data removed for live database integration ---


export default function Dashboard() {
  const { darkMode, products, sales, expenses, purchases } = useApp();
  const dm = darkMode;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = useMemo(() => 
    (sales || []).filter(s => (s.date || s.created_at || '').startsWith(todayStr)).reduce((sum, s) => sum + (s.total || 0), 0),
  [sales, todayStr]);

  const monthlyRev = useMemo(() => 
    (sales || []).reduce((sum, s) => sum + (s.total || 0), 0),
  [sales]);

  const totalExpense = useMemo(() => 
    (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0),
  [expenses]);

  const pendingPayments = useMemo(() => 
    (purchases || []).reduce((sum, p) => sum + ((p.total || 0) - (p.paid || 0)), 0),
  [purchases]);

  const chartData = useMemo(() => {
    // Generate last 7 days for chart
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return [0,1,2,3,4,5,6].map(offset => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - offset));
      const dayStr = d.toISOString().split('T')[0];
      const daySales = sales.filter(s => (s.date || s.created_at || '').startsWith(dayStr)).reduce((sum, s) => sum + (s.total || 0), 0);
      return { day: days[d.getDay()], sales: daySales, profit: daySales * 0.25 }; // Mock profit ratio
    });
  }, [sales]);

  const topProducts = useMemo(() => {
    const itemCounts = {};
    sales.forEach(s => {
      s.items?.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
      });
    });
    return Object.entries(itemCounts)
      .map(([name, qty]) => ({ name, sales: qty }))
      .sort((a,b) => b.sales - a.sales)
      .slice(0, 5);
  }, [sales]);

  const card = `rounded-2xl border shadow-sm transition-all hover:shadow-md ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;

  return (
    <div className="p-6 space-y-6">
      {/* Page Heading */}
      <div>
        <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Dashboard</h2>
        <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Welcome back! Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard dm={dm} card={card}
          title="Today's Sales" amount={`₹${todaySales.toLocaleString()}`}
          trend="+0% vs yesterday" trendUp
          icon={<IndianRupee className="w-5 h-5" />} color="green"
        />
        <KPICard dm={dm} card={card}
          title="Monthly Revenue" amount={`₹${monthlyRev.toLocaleString()}`}
          trend="+0% vs last month" trendUp
          icon={<TrendingUp className="w-5 h-5" />} color="blue"
        />
        <KPICard dm={dm} card={card}
          title="Total Expenses" amount={`₹${totalExpense.toLocaleString()}`}
          trend="All categories" trendUp={false}
          icon={<Receipt className="w-5 h-5" />} color="purple"
        />
        <KPICard dm={dm} card={card}
          title="Pending Payments" amount={`₹${pendingPayments.toLocaleString()}`}
          trend="Supplier dues" trendUp={false}
          icon={<AlertCircle className="w-5 h-5" />} color="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Overview Line Chart */}
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>Sales Overview</h3>
              <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Daily sales and profit this week</p>
            </div>
            <div className="flex gap-2">
              {['Daily', 'Weekly', 'Monthly'].map((t, i) => (
                <button key={t} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${i === 0 ? 'bg-blue-600 text-white' : (dm ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100')}`}>{t}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? '#334155' : '#f1f5f9'} />
              <XAxis dataKey="day" tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: dm ? '#1e293b' : '#fff', border: '1px solid ' + (dm ? '#334155' : '#e2e8f0'), borderRadius: 10, color: dm ? '#f1f5f9' : '#1e293b' }}
                formatter={(value) => [`₹${value.toLocaleString()}`, '']}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} animationDuration={800} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Bar Chart */}
        <div className={`${card} p-5`}>
          <h3 className={`font-semibold mb-0.5 ${dm ? 'text-white' : 'text-slate-800'}`}>Top Selling Products</h3>
          <p className={`text-xs mb-4 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Best performers this month</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={dm ? '#334155' : '#f1f5f9'} />
              <XAxis type="number" tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ background: dm ? '#1e293b' : '#fff', border: '1px solid ' + (dm ? '#334155' : '#e2e8f0'), borderRadius: 10, color: dm ? '#f1f5f9' : '#1e293b' }}
                formatter={(v) => [`₹${v.toLocaleString()}`, 'Sales']}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[0, 6, 6, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <div>
            <h3 className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>Recent Sales</h3>
            <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Today's transactions</p>
          </div>
          <button className="text-xs font-semibold text-blue-600 hover:underline">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-xs uppercase font-medium border-b ${dm ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                <th className="px-5 py-3 text-left">Invoice</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-right">Items</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {sales.slice(0, 5).map(s => (
                <tr key={s.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <td className="px-5 py-3.5 font-semibold text-blue-600">INV-{s.id}</td>
                  <td className={`px-5 py-3.5 ${dm ? 'text-slate-200' : 'text-slate-800'}`}>Walk-in Customer</td>
                  <td className={`px-5 py-3.5 text-right ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{s.items.length}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-green-600">₹{s.total.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold bg-green-100 text-green-700`}>
                      ✓ Paid
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-right text-xs ${dm ? 'text-slate-400' : 'text-slate-400'}`}>{s.date?.includes(' ') ? s.date.split(' ')[1] : 'Today'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, amount, trend, trendUp, icon, color, card, dm }) {
  const colors = {
    green: { bg: 'bg-green-100', text: 'text-green-600', dark: 'bg-green-900/30' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', dark: 'bg-blue-900/30' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', dark: 'bg-purple-900/30' },
    red: { bg: 'bg-red-100', text: 'text-red-600', dark: 'bg-red-900/30' },
  }[color];

  return (
    <div className={`${card} p-5`}>
      <div className="flex justify-between items-start">
        <p className={`text-sm font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dm ? colors.dark : colors.bg} ${colors.text}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold mt-3 mb-1.5 ${dm ? 'text-white' : 'text-slate-800'}`}>{amount}</p>
      <div className={`text-xs font-medium flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
        {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {trend}
      </div>
    </div>
  );
}

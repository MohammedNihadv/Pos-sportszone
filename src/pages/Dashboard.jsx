import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, Sector
} from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle, Receipt, ArrowUpRight, ArrowDownRight, PackageX, Users, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

// --- Static dummy data removed for live database integration ---


export default function Dashboard() {
  const { darkMode, products, sales, expenses, purchases, currentUser, isAdminUnlocked, isOwner, appSettings } = useApp();
  const dm = darkMode;
  const showFinancials = isOwner || isAdminUnlocked;
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('Daily'); // Toggle state for the chart view

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (sales || []).filter(s => {
      const d = new Date(s.date || s.created_at || new Date());
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === today;
    }).reduce((sum, s) => sum + (s.total || 0), 0);
  }, [sales]);

  const monthlyRev = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return (sales || []).reduce((sum, s) => {
      const d = new Date(s.date || s.created_at);
      if (!isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (s.total || 0);
      }
      return sum;
    }, 0);
  }, [sales]);

  const totalExpense = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return (expenses || []).reduce((sum, e) => {
      const d = new Date(e.date || e.created_at);
      if (!isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (e.amount || 0);
      }
      return sum;
    }, 0);
  }, [expenses]);

  const pendingPayments = useMemo(() =>
    (purchases || []).reduce((sum, p) => sum + ((p.total || 0) - (p.paid || 0)), 0),
    [purchases]);

  const chartData = useMemo(() => {
    // Generate last 7 days for chart
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cgstPct = parseFloat(appSettings?.cgstRate) || 0;
    const sgstPct = parseFloat(appSettings?.sgstRate) || 0;
    const taxRate = (cgstPct + sgstPct) / 100;

    return [0, 1, 2, 3, 4, 5, 6].map(offset => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - offset));
      const dayStr = d.toISOString().split('T')[0];
      const daySalesArr = (sales || []).filter(s => (s.date || s.created_at || '').startsWith(dayStr));
      const daySales = daySalesArr.reduce((sum, s) => sum + (s.total || 0), 0);

      // Calculate net revenue (excluding tax) for real profit calculation
      const netRevenue = taxRate > 0 ? daySales / (1 + taxRate) : daySales;

      const dayCost = daySalesArr.reduce((sum, s) => {
        return sum + (s.items || []).reduce((itemSum, item) => itemSum + ((item.cost || 0) * item.qty), 0);
      }, 0);
      return { day: days[d.getDay()], sales: daySales, profit: netRevenue - dayCost };
    });
  }, [sales, appSettings]);

  // Inventory Health - FIXED Logic
  const { lowStock, outOfStock } = useMemo(() => {
    let low = 0, out = 0;
    (products || []).forEach(p => {
      const stock = parseInt(p.stock) || 0;
      if (stock <= 0) out++;
      else if (stock <= 5) low++; // Alert on 5 or fewer items
    });
    return { lowStock: low, outOfStock: out };
  }, [products]);

  // Payment Liquidity (Cash vs UPI)
  const paymentSplit = useMemo(() => {
    let cash = 0, online = 0;
    (sales || []).forEach(s => {
      if (s.paymentMethod === 'Cash') cash += s.total || 0;
      else online += s.total || 0;
    });
    return [
      { name: 'Cash', value: cash, color: '#3b82f6' },
      { name: 'Online / UPI', value: online, color: '#8b5cf6' }
    ].filter(d => d.value > 0);
  }, [sales]);

  // Top VIP Customers
  const topCustomers = useMemo(() => {
    return (sales || []).slice().sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 5);
  }, [sales]);

  const topProducts = useMemo(() => {
    const itemCounts = {};
    (sales || []).forEach(s => {
      s.items?.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
      });
    });
    return Object.entries(itemCounts)
      .map(([name, qty]) => ({ name, sales: qty }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [sales]);

  const maxTopProducts = useMemo(() => {
    let m = 0;
    topProducts.forEach(d => {
      if (d.sales > m) m = d.sales;
    });
    return Math.max(m, 10);
  }, [topProducts]);

  const maxSalesLine = useMemo(() => {
    let m = 0;
    chartData.forEach(d => {
      if (d.sales > m) m = d.sales;
      if (d.profit > m) m = d.profit;
    });
    return Math.max(m, 100);
  }, [chartData]);

  const card = `rounded-2xl border shadow-sm transition-all hover:shadow-md ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      {/* Page Heading */}
      {/* Premium Executive Welcome */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>
            {greeting}, {currentUser?.name || currentUser?.role || 'Admin'}
          </h2>
          <p className={`text-sm mt-1.5 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            Here is your business overview for {dateStr}.
          </p>
        </div>
      </div>

      {/* Inventory Health Alert */}
      {(lowStock > 0 || outOfStock > 0) && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-fade-in ${dm ? 'bg-red-900/20 border-red-800/50' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${dm ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`font-bold text-sm ${dm ? 'text-red-400' : 'text-red-800'}`}>Inventory Alert</h4>
              <p className={`text-xs mt-0.5 ${dm ? 'text-red-300/70' : 'text-red-600'}`}>
                You have {outOfStock} items out of stock and {lowStock} items running low.
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/inventory')} className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${dm ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}>Review Inventory</button>
        </div>
      )}

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
          title="Total Expenses" amount={showFinancials ? `₹${totalExpense.toLocaleString()}` : '₹ ***'}
          trend={showFinancials ? "All categories" : "Restricted"} trendUp={false}
          icon={<Receipt className="w-5 h-5" />} color="purple"
          isRestricted={!showFinancials}
        />
        <KPICard dm={dm} card={card}
          title="Pending Payments" amount={showFinancials ? `₹${pendingPayments.toLocaleString()}` : '₹ ***'}
          trend={showFinancials ? "Supplier dues" : "Restricted"} trendUp={false}
          icon={<AlertCircle className="w-5 h-5" />} color="red"
          isRestricted={!showFinancials}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Overview Line Chart */}
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>Sales Overview</h3>
              <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Daily sales {showFinancials ? 'and profit' : ''} this week</p>
            </div>
            <div className="flex gap-2">
              {['Daily', 'Weekly', 'Monthly'].map(t => (
                <button
                  key={t}
                  onClick={() => setChartRange(t)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors 
                    ${chartRange === t ? 'bg-blue-600 text-white' : (dm ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100')}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? '#334155' : '#f1f5f9'} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, maxSalesLine]} tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: dm ? '#1e293b' : '#fff', border: '1px solid ' + (dm ? '#334155' : '#e2e8f0'), borderRadius: 12, color: dm ? '#f1f5f9' : '#1e293b', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [`₹${value.toLocaleString()}`, '']}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="sales" name="Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={800} />
              {showFinancials && <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={800} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Bar Chart */}
        <div className={`${card} p-5`}>
          <h3 className={`font-semibold mb-0.5 ${dm ? 'text-white' : 'text-slate-800'}`}>Top Selling Products</h3>
          <p className={`text-xs mb-4 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Best performers this month</p>
          <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={dm ? '#334155' : '#f1f5f9'} />
              <XAxis type="number" domain={[0, maxTopProducts]} tick={{ fill: dm ? '#94a3b8' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
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

      {/* BI Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Split Donut */}
        <div className={`${card} p-5 flex flex-col`}>
          <div className="mb-2">
            <h3 className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>Liquidity Origin</h3>
            <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Cash vs. Online revenue split</p>
          </div>
          {paymentSplit.length > 0 ? (
            <div className="h-[200px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={paymentSplit} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" animationDuration={800} stroke="none">
                    {paymentSplit.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: dm ? '#1e293b' : '#fff', border: 'none', borderRadius: 8, color: dm ? '#f1f5f9' : '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(v) => `₹${v.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-sm font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
                <span className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>
                  ₹{paymentSplit.reduce((s, o) => s + o.value, 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No payment data yet</div>
          )}
          <div className="flex justify-center gap-6 mt-2">
            {paymentSplit.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
                <span className={`text-xs font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top VIP Sales */}
        <div className={`${card} p-5 flex flex-col`}>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className={`font-semibold flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}>
                <Users className="w-4 h-4 text-emerald-500" /> High-Value Transactions
              </h3>
              <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Largest invoices recorded</p>
            </div>
          </div>
          <div className={`flex-1 overflow-y-auto space-y-2 pr-2 ${dm ? 'scrollbar-dark' : 'scrollbar-light'}`}>
            {topCustomers.map(sale => (
              <div key={sale.id} className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${dm ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${dm ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    {sale.paymentMethod === 'Cash' ? '💵' : '💳'}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${dm ? 'text-slate-200' : 'text-slate-800'}`}>INV-{sale.id}</p>
                    <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{sale.items.length} items • {sale.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">₹{sale.total.toLocaleString()}</p>
                  <p className={`text-[10px] uppercase font-bold mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{sale.date?.split(' ')[0]}</p>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No high-value sales yet</p>}
          </div>
        </div>
      </div>

      {/* Recent Sales Ledger */}
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
            <tbody className={`divide-y ${dm ? 'divide-slate-800' : 'divide-slate-50'}`}>
              {(sales || []).slice(0, 5).map(s => (
                <tr key={s.id} className={`transition-colors text-sm ${dm ? 'hover:bg-slate-800/50 bg-slate-900' : 'hover:bg-blue-50/50 bg-white'}`}>
                  <td className="px-5 py-4 font-bold text-blue-600">INV-{s.id}</td>
                  <td className={`px-5 py-4 font-medium ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{s.customer_name || 'Walk-in Customer'}</td>
                  <td className={`px-5 py-4 text-right font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{s.items?.length || 0}</td>
                  <td className={`px-5 py-4 text-right font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{(s.total || 0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md uppercase font-bold tracking-wider ${s.paymentMethod === 'Cash' ? (dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dm ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700')}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span> Paid {s.paymentMethod}
                    </span>
                  </td>
                  <td className={`px-5 py-4 text-right font-medium text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{s.date?.includes(' ') ? s.date.split(' ')[1] : 'Today'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, amount, trend, trendUp, icon, color, card, dm, isRestricted }) {
  const colors = {
    green: { bg: 'bg-green-100', text: 'text-green-600', dark: 'bg-green-900/30' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', dark: 'bg-blue-900/30' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', dark: 'bg-purple-900/30' },
    red: { bg: 'bg-red-100', text: 'text-red-600', dark: 'bg-red-900/30' },
  }[color];

  return (
    <div className={`${card} p-5 relative overflow-hidden group`}>
      {isRestricted && <div className="glass-overlay rounded-2xl" />}
      <div className="flex justify-between items-start">
        <p className={`text-sm font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dm ? colors.dark : colors.bg} ${colors.text}`}>
          {isRestricted ? <Lock className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" /> : icon}
        </div>
      </div>
      <p className={`text-3xl font-bold mt-3 mb-1.5 ${dm ? 'text-white' : 'text-slate-800'} ${isRestricted ? 'blur-[2px] opacity-40' : ''}`}>
        {amount}
      </p>
      <div className={`text-xs font-medium flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-500'} ${isRestricted ? 'opacity-40' : ''}`}>
        {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {trend}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Filter, Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Edit2, Trash2, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DateRangePicker from '../components/DateRangePicker';

// --- Accounting is now managed via SQLite ---

const ACCOUNTS = ['Cash', 'Shop GPay / UPI', 'Sales Revenue', 'Purchase Account', 'Expense Account'];

export default function Accounting() {
  const { darkMode, sales, expenses, purchases, isOwner, appSettings } = useApp();
  const dm = darkMode;
  const [activeTab, setActiveTab] = useState('ledger');
  const [filter, setFilter] = useState('All');

  // Advanced Date Range Filtering
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Robust path to "YYYY-MM-DD" matching the date picker
  const toYMD = (d) => {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Time Filtering Helper
  const isInRange = (d) => {
    if (!startDate && !endDate) return true;
    const itemYMD = toYMD(d);
    if (startDate && itemYMD < startDate) return false;
    if (endDate && itemYMD > endDate) return false;
    return true;
  };

  const filteredSales = (sales || []).filter(s => isInRange(s.date || s.created_at));
  const filteredPurchases = (purchases || []).filter(p => isInRange(p.date));
  const filteredExpenses = (expenses || []).filter(e => isInRange(e.date));

  // Compute Transactions
  const transactions = [
    ...filteredSales.map(s => {
      const pm = (s.paymentMethod || s.payment_method || '').toLowerCase();
      const isCash = pm === 'cash';
      return {
        id: `S-${s.id}`,
        date: (s.created_at || s.date || '').split(' ')[0],
        description: `Sale - INV-${s.id}`,
        account: isCash ? 'Cash' : 'Shop GPay / UPI',
        debit: null,
        credit: s.total || 0,
        type: 'income'
      };
    }),
    ...filteredExpenses.map(e => {
      const pm = (e.paymentMethod || 'Cash').toLowerCase();
      return {
        id: `E-${e.id}`,
        date: e.date || '',
        description: e.description || e.category || 'Expense',
        account: pm === 'cash' ? 'Cash' : 'Shop GPay / UPI',
        debit: e.amount || 0,
        credit: null,
        type: 'expense'
      };
    }),
    ...filteredPurchases.map(p => {
      const pm = (p.paymentMethod || 'Cash').toLowerCase();
      return {
        id: `P-${p.id}`,
        date: p.date || '',
        description: `Purchase - ${p.supplier || 'Unknown'} (${p.invoice || 'No Inv'})`,
        account: pm === 'cash' ? 'Cash' : 'Shop GPay / UPI',
        debit: p.paid || 0,
        credit: null,
        type: 'expense'
      };
    })
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const handleExport = () => {
    // Excel export removed per user request
    alert('Export feature removed');
  };

  // Ledger Summary
  const ledgerAccounts = [
    { name: 'Cash', type: 'Asset', balance: appSettings?.cashBalance || 0 },
    { name: 'Shop GPay / UPI', type: 'Asset', balance: appSettings?.upiBalance || 0 },
    { name: 'Sales Revenue', type: 'Income', balance: filteredSales.reduce((a, b) => a + (b.total || 0), 0) },
    { name: 'Purchase Account', type: 'Expense', balance: filteredPurchases.reduce((a, b) => a + (b.paid || 0), 0) },
    { name: 'General Expenses', type: 'Expense', balance: filteredExpenses.reduce((a, b) => a + (b.amount || 0), 0) },
  ];

  const totalSalesAmt = filteredSales.reduce((a, b) => a + (b.total || 0), 0);
  const totalPurchasePaid = filteredPurchases.reduce((a, b) => a + (b.paid || 0), 0);
  const totalExpensesAmt = filteredExpenses.reduce((a, b) => a + (b.amount || 0), 0);

  const totalRevenue = totalSalesAmt;
  const totalExpAmt = totalPurchasePaid + totalExpensesAmt;
  const netProfit = totalRevenue - totalExpAmt;

  const handleTxnDelete = () => alert('Cannot delete generic transaction. Go to the Sales or Expenses tab to revert.');

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500 bg-slate-900/50' : 'text-slate-400 bg-slate-50'}`;
  const tabs = ['ledger', 'transactions', 'p&l'];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Accounting</h2>
          <p className={`text-sm mt-1.5 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Ledger, transactions, and financial reports</p>
        </div>
        <div className="flex gap-2">
          <DateRangePicker 
            startDate={startDate} 
            endDate={endDate} 
            setStartDate={setStartDate} 
            setEndDate={setEndDate} 
            dm={dm} 
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`flex gap-1 p-1 rounded-xl w-fit ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {tabs.map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow' : (dm ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}
          >
            {tab === 'p&l' ? 'P&L Report' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ledgerAccounts.map(acc => (
            <div key={acc.name} className={`${card} p-4 hover:shadow-md transition-all cursor-pointer`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>{acc.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block
                    ${acc.type === 'Income' ? 'bg-green-100 text-green-700' : acc.type === 'Asset' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {acc.type}
                  </span>
                </div>
              </div>
              <p className={`text-2xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{acc.balance.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className={`${card} overflow-hidden`}>
          <div className={`px-5 py-3.5 border-b flex flex-wrap gap-3 items-center ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            <Filter className="w-4 h-4 text-slate-400" />
            {['All', 'Income', 'Expense'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filter === f ? 'bg-blue-600 text-white' : (dm ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
              >{f}</button>
            ))}
            <input type="date" className={`ml-auto px-3 py-1.5 text-xs rounded-lg border outline-none ${dm ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`border-b sticky top-0`}>
                <th className={th}>ID</th><th className={th}>Date</th><th className={th}>Description</th>
                <th className={th}>Account</th><th className={th + ' text-right'}>Debit</th><th className={th + ' text-right'}>Credit</th>
                {!isOwner && <th className={th + ' text-center'}>Actions</th>}
              </tr></thead>
              <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {transactions
                  .filter(t => filter === 'All' || t.type === filter.toLowerCase())
                  .map(t => (
                    <tr key={t.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-3.5 font-mono text-xs text-blue-600">{t.id}</td>
                      <td className={`px-5 py-3.5 text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{t.date}</td>
                      <td className={`px-5 py-3.5 ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{t.description}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md ${dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t.account}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-red-500">{t.debit ? `₹${t.debit.toLocaleString()}` : '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-green-600">{t.credit ? `₹${t.credit.toLocaleString()}` : '—'}</td>
                      {!isOwner && (
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleTxnDelete(t.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* P&L Tab */}
      {activeTab === 'p&l' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${card} p-5 space-y-3`}>
            <h3 className={`font-bold text-base flex items-center gap-2 text-green-600`}><TrendingUp className="w-5 h-5" /> Revenue</h3>
            <PLRow label="Sales Revenue" value={totalSalesAmt} dm={dm} color="green" />
            <div className={`pt-3 border-t flex justify-between font-bold ${dm ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-800'}`}>
              <span>Total Revenue</span><span className="text-green-600">₹{totalRevenue.toLocaleString()}</span>
            </div>
          </div>
          <div className={`${card} p-5 space-y-3`}>
            <h3 className={`font-bold text-base flex items-center gap-2 text-red-500`}><TrendingDown className="w-5 h-5" /> Expenses</h3>
            <PLRow label="Purchases" value={totalPurchasePaid} dm={dm} color="red" />
            <PLRow label="General Expenses" value={totalExpensesAmt} dm={dm} color="red" />
            <div className={`pt-3 border-t flex justify-between font-bold ${dm ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-800'}`}>
              <span>Total Expenses</span><span className="text-red-500">₹{totalExpAmt.toLocaleString()}</span>
            </div>
          </div>
          <div className={`lg:col-span-2 rounded-2xl border p-6 text-center shadow-lg ${netProfit >= 0 ? (dm ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200') : (dm ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200')}`}>
            <p className={`text-sm font-medium mb-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
            <p className={`text-5xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(netProfit).toLocaleString()}</p>
            <p className={`text-sm mt-2 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              Margin: {totalRevenue > 0 ? ((Math.abs(netProfit) / totalRevenue) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PLRow({ label, value, dm, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm font-semibold ${color === 'green' ? 'text-green-600' : 'text-red-500'}`}>₹{value.toLocaleString()}</span>
    </div>
  );
}

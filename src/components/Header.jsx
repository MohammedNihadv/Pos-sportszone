import { Search, Bell, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const routeNames = {
  '/home':           { title: 'Dashboard', subtitle: "Welcome back! Here's what's happening today." },
  '/pos':            { title: 'POS Billing', subtitle: 'Scan products or search to add to cart' },
  '/inventory':      { title: 'Inventory', subtitle: 'Manage your products and stock levels' },
  '/purchases':      { title: 'Purchases', subtitle: 'Track supplier invoices and purchase orders' },
  '/purchase-ledger':{ title: 'Purchase Ledger', subtitle: 'Detailed supplier payment records' },
  '/sales-ledger':   { title: 'Sales Ledger', subtitle: 'All completed sales — edit or add manual entries' },
  '/customers':      { title: 'Customers', subtitle: 'Manage your customer database' },
  '/credits':        { title: 'Credit / Pay Later', subtitle: 'Customers with pending balances' },
  '/reports':        { title: 'Reports & Analytics', subtitle: 'Sales performance and business insights' },
  '/accounting':     { title: 'Accounting', subtitle: 'Ledger, transactions and financial reports' },
  '/expenses':       { title: 'Daily Expenses', subtitle: 'Track shop expenses and category breakdown' },
  '/settings':       { title: 'Settings', subtitle: 'System configuration and preferences' },
  '/activity-logs':  { title: 'Activity Logs', subtitle: 'Secure audit trail of actions taken in the shop' },
  '/roadmap':        { title: 'Roadmap', subtitle: 'Feature progress and development milestones' },
};

export default function Header() {
  const location = useLocation();
  const { darkMode, currentUser, isAdminUnlocked } = useApp();
  const dm = darkMode;
  const page = routeNames[location.pathname] || { title: 'Sports Zone', subtitle: '' };

  return (
    <header className={`h-16 flex items-center justify-between px-6 shrink-0 border-b z-10
      ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div>
        <h2 className={`text-base font-semibold leading-tight ${dm ? 'text-white' : 'text-slate-800'}`}>{page.title}</h2>
        <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="text-right hidden md:block mt-1">
            <p className={`text-sm font-bold leading-none tracking-wide ${dm ? 'text-white' : 'text-slate-800'}`}>
              {currentUser?.name || 'Guest'}
            </p>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
              currentUser?.role === 'Owner' 
                ? (dm ? 'text-indigo-400' : 'text-indigo-600')
                : isAdminUnlocked 
                  ? (dm ? 'text-amber-400' : 'text-amber-600')
                  : (dm ? 'text-blue-400' : 'text-blue-600')
            }`}>
              {currentUser?.role === 'Owner' ? 'Shop Owner' : currentUser?.role === 'Admin' ? 'Administrator' : isAdminUnlocked ? 'Admin Unlocked' : (currentUser?.role || 'Staff')}
            </p>
          </div>
          <div className="relative">
            <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center font-bold shadow-sm border-2
              ${(currentUser?.role === 'Owner' || isAdminUnlocked) 
                ? (dm ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400/30' : 'bg-gradient-to-br from-blue-600 to-indigo-600 border-indigo-200 text-white') 
                : (dm ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/30' : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-200 text-white')}`}>
              {currentUser?.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center
              ${dm ? 'bg-green-500 border-slate-900' : 'bg-green-500 border-white'}`}>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

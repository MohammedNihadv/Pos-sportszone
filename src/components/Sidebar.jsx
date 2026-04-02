import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Box, ShoppingBag, Users,
  BarChart3, Calculator, Settings, Moon, Sun, ChevronLeft, ChevronRight,
  Wifi, WifiOff, RefreshCw, BookOpen, TrendingDown, Layers, Map, Lock as LockIcon, Clock, Activity, Shield
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/sounds';
import { useState, useEffect } from 'react';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard',       path: '/home',           icon: LayoutDashboard },
      { name: 'POS Billing',     path: '/pos',            icon: ShoppingCart },
    ],
  },
  {
    label: 'Stock & Sales',
    items: [
      { name: 'Inventory',       path: '/inventory',      icon: Box },
      { name: 'Sales Ledger',    path: '/sales-ledger',   icon: BookOpen },
      { name: 'Purchases',       path: '/purchases',      icon: ShoppingBag },
      { name: 'Purchase Ledger', path: '/purchase-ledger',icon: Layers },
    ],
  },
  {
    label: 'Money',
    items: [
      { name: 'Expenses',        path: '/expenses',       icon: TrendingDown },
      { name: 'Accounting',      path: '/accounting',     icon: Calculator },
      { name: 'Reports',         path: '/reports',        icon: BarChart3 },
    ],
  },
  {
    label: 'People',
    items: [
      { name: 'Customers',       path: '/customers',      icon: Users },
      { name: 'Credits',         path: '/credits',        icon: Clock },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Roadmap',         path: '/roadmap',        icon: Map },
      { name: 'System Health',   path: '/system-health',  icon: Activity },
      { name: 'Activity Logs',   path: '/activity-logs',  icon: BookOpen },
      { name: 'Settings',        path: '/settings',       icon: Settings },
    ],
  },
];

const SyncBadge = ({ status, collapsed, dm }) => {
  const config = {
    synced:  { icon: <Wifi className="w-3.5 h-3.5" />,                            label: 'SYNCED',      cls: dm ? 'text-emerald-400 bg-emerald-900/30' : 'text-[#007f5f] bg-[#e6fceb]' },
    syncing: { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,          label: 'SYNCING...',  cls: dm ? 'text-amber-400 bg-amber-900/30' : 'text-amber-700 bg-amber-100' },
    offline: { icon: <WifiOff className="w-3.5 h-3.5" />,                         label: 'OFFLINE',     cls: dm ? 'text-rose-400 bg-rose-900/30' : 'text-rose-700 bg-rose-100' },
  }[status] || config.synced;

  return (
    <div className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors border-none ${config.cls}`}>
      {config.icon}
      {!collapsed && config.label}
    </div>
  );
};

export default function Sidebar() {
  const { darkMode, setDarkMode, sidebarCollapsed, setSidebarCollapsed, syncStatus, logo, isAdminUnlocked, lockAdmin, currentUser } = useApp();
  const dm = darkMode;
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    if (window.api?.getAppVersion) {
      window.api.getAppVersion().then(v => setAppVersion(v || '1.0.0'));
    }
  }, []);

  const visibleSections = NAV_SECTIONS.filter(section => {
    if (isAdminUnlocked) return true;
    if (section.label === 'Main' || section.label === 'People' || section.label === 'Stock & Sales') {
      // In Salesman mode, only show specific items within these sections
      return true;
    }
    return false;
  }).map(section => {
    if (isAdminUnlocked) return section;
    // Salesman mode: filter individual items
    const salesmanItems = section.items.filter(item => 
      ['POS Billing', 'Sales Ledger', 'Customers', 'Credits'].includes(item.name)
    );
    return salesmanItems.length > 0 ? { ...section, items: salesmanItems } : null;
  }).filter(Boolean);

  return (
    <aside className={`flex flex-col justify-between transition-all duration-300 shrink-0 border-r select-none
      ${sidebarCollapsed ? 'w-16' : 'w-60'}
      ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
    >
      <div className="flex flex-col h-full overflow-hidden relative">

        {/* Logo & Header — Click logo to toggle sidebar */}
        <div 
          onClick={() => { playSound('switch'); setSidebarCollapsed(v => !v); }}
          className={`h-16 flex items-center px-3 border-b flex-shrink-0 gap-2 overflow-hidden cursor-pointer transition-colors
          ${dm ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <img src={logo} alt="SZ" className="w-10 h-10 p-1 object-contain flex-shrink-0 rounded-lg transition-transform hover:scale-105" />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden pr-2">
              <h1 className={`text-sm font-extrabold tracking-tight leading-loose truncate whitespace-nowrap ${dm ? 'text-white' : 'text-slate-900'}`}>
                Sports Zone
              </h1>
              <p className={`text-xs truncate whitespace-nowrap ${dm ? 'text-slate-500' : 'text-slate-400'}`}>POS System</p>
            </div>
          )}
        </div>

        {/* Navigation — Grouped Sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {visibleSections.map(section => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <p className={`text-xs font-bold uppercase tracking-widest px-3 mb-1 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => playSound('switch')}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${sidebarCollapsed ? 'justify-center' : ''}
                        ${isActive
                          ? (dm ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-700')
                          : (dm ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="truncate whitespace-nowrap">{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className={`p-3 border-t flex flex-col gap-2 ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <SyncBadge status={syncStatus} collapsed={sidebarCollapsed} dm={dm} />
          {!sidebarCollapsed && (
            <p className={`text-center text-[10px] font-bold tracking-wider ${dm ? 'text-slate-600' : 'text-slate-300'}`}>
              v{appVersion}
            </p>
          )}
          <button
            onClick={() => setDarkMode(v => !v)}
            className={`flex items-center gap-2 w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors
              ${sidebarCollapsed ? 'justify-center' : ''}
              ${dm ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {dm ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
            {!sidebarCollapsed && (dm ? 'Light Mode' : 'Dark Mode')}
          </button>

          {/* Owner & Admin are always unlocked — no lock button needed */}
          {currentUser?.role === 'Owner' ? (
            <div className={`flex items-center gap-2 w-full py-2 px-3 rounded-lg text-sm font-bold
              ${sidebarCollapsed ? 'justify-center' : ''}
              ${dm ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && 'Owner Mode'}
            </div>
          ) : currentUser?.role === 'Admin' ? (
            <div className={`flex items-center gap-2 w-full py-2 px-3 rounded-lg text-sm font-bold
              ${sidebarCollapsed ? 'justify-center' : ''}
              ${dm ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && 'Admin Mode'}
            </div>
          ) : isAdminUnlocked ? (
            <button
              onClick={lockAdmin}
              className={`flex items-center gap-2 w-full py-2 px-3 rounded-lg text-sm font-bold transition-all
                ${sidebarCollapsed ? 'justify-center' : ''}
                bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 dark:shadow-none`}
            >
              <LockIcon className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && 'Lock Admin'}
            </button>
          ) : (
            <NavLink
              to="/home"
              title={sidebarCollapsed ? 'Admin Unlock' : undefined}
              className={`flex items-center gap-2 w-full py-2 px-3 rounded-lg text-sm font-bold transition-all
                ${sidebarCollapsed ? 'justify-center' : ''}
                ${dm ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
            >
              <LockIcon className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && 'Admin Unlock'}
            </NavLink>
          )}
        </div>
      </div>
    </aside>
  );
}

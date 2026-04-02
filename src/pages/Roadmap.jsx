import { useApp } from '../context/AppContext';
import { CheckCircle, Clock, Circle, Zap, Globe, Smartphone, Box, Lock as LockIcon, RefreshCw } from 'lucide-react';

const PHASES = [
  {
    id: 1,
    status: 'done',
    title: 'Phase 1 — Core UI Foundation',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ React + Vite + Tailwind CSS setup',
      '✅ Collapsible sidebar with all nav links',
      '✅ Dark Mode + Light Mode toggle',
      '✅ Toast notification system',
      '✅ Sync status badge (Online/Offline)',
      '✅ Keyboard shortcut hints in header',
    ],
  },
  {
    id: 2,
    status: 'done',
    title: 'Phase 2 — All Core Screens',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Dashboard with live charts (Recharts)',
      '✅ POS Billing — product grid, cart, GST (CGST/SGST)',
      '✅ Cash/UPI/Card payment modals',
      '✅ Keyboard shortcuts (F1–F3, F9, ESC)',
      '✅ Inventory with add/edit/delete + low stock alerts',
      '✅ Accounting — Ledger, Transactions, P&L tabs',
      '✅ Reports — area trend + monthly bar charts',
      '✅ Purchases, Customers, Settings pages',
    ],
  },
  {
    id: 3,
    status: 'done',
    title: 'Phase 3 — Functionality & Security',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Inline Edit/Delete for Sales, Purchases, Expenses, Accounting',
      '✅ Admin PIN Protection for sensitive routes (Dashboard, Reports)',
      '✅ Store Logo Customization with persistence',
      '✅ Salesman-friendly POS Billing (editable prices inline)',
      '✅ Product and Supplier data updated to real Sports Zone items',
      '✅ Monthly P&L and automated PO status calculations',
    ],
  },
  {
    id: 4,
    status: 'done',
    title: 'Phase 4 — Local Database & IPC',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Wrap React app with Electron',
      '✅ SQLite local database (offline-first data storage)',
      '✅ IPC bridge: React ↔ SQLite',
      '✅ Real-time Ledger and Transactions reporting',
      '✅ Dynamic Categories & Suppliers management',
    ],
  },
  {
    id: 5,
    status: 'done',
    title: 'Phase 5 — Advanced Checkout Module',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Multi-method payment (Cash, UPI, Card)',
      '✅ Split payment support (e.g., Cash + UPI)',
      '✅ Live cash change and balance calculation',
      '✅ Change return tracking (Store UPI vs Shop Cash)',
      '✅ Keyboard optimized cashiers workflow (F9, C, U, Enter)',
    ],
  },
  {
    id: 6,
    status: 'done',
    title: 'Phase 6 — Interactive UX & Auto-Lock',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Inline quick-add for Suppliers and Categories',
      '✅ `useAutoLock` 2-minute inactivity security',
      '✅ Protective PIN-driven lock screen overlay',
      '✅ Web Audio API offline sound effects (Pop, Chime)',
      '✅ Framer Motion animations & floating +1 indicators',
      '✅ Cleaned up legacy barcode inputs and test data',
    ],
  },
  {
    id: 7,
    status: 'done',
    title: 'Phase 7 — Desktop EXE & Installer',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Build and package as .exe installer (Windows NSIS)',
      '✅ Auto-update system (electron-updater)',
      '✅ System Health dashboard with app diagnostics',
      '✅ Error logging engine (local file-based)',
      '✅ Version tracking & uptime monitoring',
    ],
  },
  {
    id: 8,
    status: 'done',
    title: 'Phase 8 — Multi-User Auth & Audit',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ 3-User Role System: Owner (full access), Admin (PIN unlock), Cashier (limited)',
      '✅ Owner auto-unlock — no secondary PIN needed',
      '✅ Secure SQLite-backed PIN verification (not localStorage)',
      '✅ Audit Logging — tracks deleted products, sales, PIN changes',
      '✅ Activity Logs page for Owner (secure audit trail)',
      '✅ Credits section accessible to Cashier role',
    ],
  },
  {
    id: 9,
    status: 'done',
    title: 'Phase 9 — Telemetry, Backup & Developer Dashboard',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Supabase cloud telemetry — device tracking & version reporting',
      '✅ Developer Dashboard (separate Vite app) — live device roster & error stream',
      '✅ Global error capture (uncaughtException, unhandledRejection, renderer)',
      '✅ Dual persistent backup: Documents/SportsZone + AppData (10-file rotation)',
      '✅ Auto-backup every 24 hours on app startup',
      '✅ Native "Open Backup Folder" (shell.openPath) & "Restore From File" (dialog.showOpenDialog)',
    ],
  },
  {
    id: 10,
    status: 'done',
    title: 'Phase 10 — Cloud Sync & Receipt Download',
    subtitle: 'Completed ✅',
    color: 'green',
    items: [
      '✅ Supabase cloud sync — one-way push (Sales, Expenses, Products)',
      '✅ Sync engine: local SQLite → Supabase (upsert by local_id)',
      '✅ Manual "Sync Now" button with spinner + progress summary',
      '✅ Online/Offline guard — disables sync when offline',
      '✅ Download Receipt as PDF (Electron printToPDF → Documents/SportsZone/Receipts)',
      '✅ Auto receipt generation on sale completion',
    ],
  },
  {
    id: 11,
    status: 'active',
    title: 'Phase 11 — Business Expansion',
    subtitle: 'In Progress 🔧',
    color: 'blue',
    items: [
      '⬜ Flutter mobile app (Live sales + Reports)',
      '⬜ Stock alerts (push notifications)',
      '⬜ Customer loyalty points system',
      '⬜ WhatsApp bill sharing & SMS integration',
      '⬜ GST filing export (GSTR-1)',
      '⬜ Barcode scanner hardware integration',
    ],
  },
];

const STATUS_CONFIG = {
  done:     { icon: <CheckCircle className="w-5 h-5" />, bg: 'bg-green-500',  ring: 'ring-green-200', label: 'Completed' },
  active:   { icon: <Zap className="w-5 h-5" />,         bg: 'bg-blue-500',   ring: 'ring-blue-200',  label: 'In Progress' },
  upcoming: { icon: <Clock className="w-5 h-5" />,       bg: 'bg-slate-400',  ring: 'ring-slate-200', label: 'Upcoming' },
  future:   { icon: <Circle className="w-5 h-5" />,      bg: 'bg-purple-400', ring: 'ring-purple-200',label: 'Future' },
};

const CARD_COLORS = {
  green:  { border: 'border-l-green-500',  badge: 'bg-green-100 text-green-700' },
  blue:   { border: 'border-l-blue-500',   badge: 'bg-blue-100 text-blue-700' },
  slate:  { border: 'border-l-slate-400',  badge: 'bg-slate-100 text-slate-600' },
  purple: { border: 'border-l-purple-400', badge: 'bg-purple-100 text-purple-700' },
};

const TECH_STACK = [
  { icon: <Box className="w-4 h-4" />,        label: 'Frontend',     items: ['React 19', 'Vite 8', 'Tailwind CSS', 'Recharts', 'Framer Motion'] },
  { icon: <RefreshCw className="w-4 h-4" />,  label: 'Desktop',      items: ['Electron 41', 'SQLite', 'better-sqlite3', 'NSIS Installer'] },
  { icon: <Globe className="w-4 h-4" />,      label: 'Cloud',        items: ['Supabase', 'node-machine-id', 'Real-time Telemetry'] },
  { icon: <LockIcon className="w-4 h-4" />,   label: 'Security',     items: ['PIN Auth (SQLite)', 'Audit Logs', 'Auto-Lock', 'Context Isolation'] },
  { icon: <Smartphone className="w-4 h-4" />, label: 'Future',       items: ['Flutter Mobile', 'Cloud Sync', 'WhatsApp API'] },
];

export default function Roadmap() {
  const { darkMode } = useApp();
  const dm = darkMode;
  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;

  const doneCount = PHASES.filter(p => p.status === 'done').length;
  const totalCount = PHASES.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Project Roadmap</h2>
        <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Sports Zone POS — All planned phases, features and future builds</p>
      </div>

      {/* Progress Bar */}
      <div className={`${card} p-5`}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Overall Progress</p>
            <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{doneCount} of {totalCount} phases completed</p>
          </div>
          <span className="text-2xl font-bold text-blue-600">{Math.round((doneCount / totalCount) * 100)}%</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-4 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${v.bg}`} />
              <span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{v.label} ({PHASES.filter(p => p.status === k).length})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-4">
        {PHASES.map((phase) => {
          const sc = STATUS_CONFIG[phase.status];
          const cc = CARD_COLORS[phase.color];
          return (
            <div key={phase.id} className={`${card} border-l-4 ${cc.border} overflow-hidden`}>
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${sc.bg} ring-4 ${sc.ring}`}>
                    {sc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-800'}`}>{phase.title}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${cc.badge}`}>{phase.subtitle}</span>
                    </div>
                    <ul className={`mt-2 space-y-1 text-sm ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                      {phase.items.map((item, i) => (
                        <li key={i} className={`${item.startsWith('✅') ? (dm ? 'text-green-400' : 'text-green-700') : item.startsWith('🔧') ? (dm ? 'text-blue-400' : 'text-blue-600') : ''}`}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tech Stack */}
      <div className={`${card} p-5`}>
        <h3 className={`font-bold mb-4 ${dm ? 'text-white' : 'text-slate-800'}`}>🛠️ Full Tech Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TECH_STACK.map(t => (
            <div key={t.label} className={`rounded-xl p-3 border ${dm ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`flex items-center gap-2 mb-2 font-semibold text-sm ${dm ? 'text-slate-200' : 'text-slate-700'}`}>
                <span className="text-blue-500">{t.icon}</span>
                {t.label}
              </div>
              {t.items.map(item => (
                <p key={item} className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>• {item}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className={`rounded-2xl border p-4 ${dm ? 'bg-blue-900/20 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
        <p className="text-sm font-semibold">📢 Updates Note</p>
        <p className="text-xs mt-1">This roadmap is updated as each phase is built. Green = done, Blue = currently building, Grey = planned, Purple = future ideas. Check back here for the latest progress!</p>
      </div>
    </div>
  );
}

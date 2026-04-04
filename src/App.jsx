import { useState, Component, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { useAutoLock } from './hooks/useAutoLock';
import { Lock as LockIcon, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Layout from './components/Layout';
import AuthScreen from './pages/AuthScreen';
import UpdateNotifier from './components/UpdateNotifier';
import { setCrashFlag, clearCrashFlag } from './utils/sessionRecovery';

// All pages — eager imports (desktop app, all files are local)
import POSBilling from './pages/POSBilling';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Accounting from './pages/Accounting';
import Settings from './pages/Settings';
import SalesLedger from './pages/SalesLedger';
import Expenses from './pages/Expenses';
import PurchaseLedger from './pages/PurchaseLedger';
import Credits from './pages/Credits';
import Roadmap from './pages/Roadmap';
import SystemHealth from './pages/SystemHealth';
import ActivityLogs from './pages/ActivityLogs';

// ─── Error Boundary ───
class LocalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // Log to backend
    if (window.api?.logRendererError) {
      window.api.logRendererError({
        context: 'ErrorBoundary',
        message: error?.stack || error?.message || 'Unknown component crash',
      });
    }
  }
  render() {
    if (this.state.hasError) {
      // Mild styling fallback since we can't reliably read useApp() inside a generic class boundary effortlessly without an HOC wrapper
      const dm = document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      return (
        <div className={`p-10 m-6 rounded-3xl border flex flex-col items-center justify-center text-center shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${dm ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
            <AlertTriangle className={`w-8 h-8 ${dm ? 'text-amber-500' : 'text-amber-500'}`} />
          </div>
          <h3 className={`text-xl font-bold tracking-tight mb-2 ${dm ? 'text-white' : 'text-slate-900'}`}>Something went wrong</h3>
          <p className={`text-sm max-w-md mb-8 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            We encountered an unexpected issue rendering this section. Your data is perfectly safe, but the screen needs to be reloaded.
          </p>
          <div className="flex gap-3">
             <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20">
               Reload Application
             </button>
             <button onClick={() => this.setState({ showDetails: !this.state.showDetails })} className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-white'}`}>
               {this.state.showDetails ? 'Hide Details' : 'Developer Info'}
             </button>
          </div>
          {this.state.showDetails && (
            <div className={`mt-8 p-5 rounded-xl text-left w-full max-w-3xl overflow-auto text-xs font-mono border ${dm ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
              <p className="font-bold mb-3 text-red-500">{this.state.error?.message || 'Unknown Error'}</p>
              <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function AutoLockWrapper({ children }) {
  const { isWarning, timeLeft } = useAutoLock();

  return (
    <>
      {children}
      {isWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-red-500 text-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-red-600 animate-[pulse_1s_ease-in-out_infinite]" style={{ opacity: 0.2 }}></div>
             <AlertTriangle className="w-16 h-16 mx-auto mb-4 relative z-10" />
             <h2 className="text-2xl font-bold mb-2 relative z-10">Session Expiring</h2>
             <p className="text-red-100 mb-6 relative z-10">Admin session is locking automatically due to inactivity.</p>
             <div className="text-6xl font-black tabular-nums tracking-tighter relative z-10">{timeLeft}s</div>
             <p className="mt-6 text-sm opacity-80 relative z-10">Move mouse or press any key to cancel.</p>
          </div>
        </div>
      )}
    </>
  );
}

function ProtectedRoute({ children }) {
  const { isAdminUnlocked, setIsAdminUnlocked, adminPin, darkMode, isOwner } = useApp();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);

  // Clear PIN whenever the lock state changes (e.g., admin locks back)
  useEffect(() => {
    if (!isAdminUnlocked) {
      setPin('');
      setShowPin(false);
      setError(false);
    }
  }, [isAdminUnlocked]);

  // Owners have free access to protected areas (with view-only limitations applied at page-level)
  if (isAdminUnlocked || isOwner) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Secure local SQLite verification
      const isValid = window.api ? await window.api.verifyPin({ pin }) : (pin === adminPin);
      if (isValid) {
        setIsAdminUnlocked(true);
      } else {
        setError(true);
        setTimeout(() => setError(false), 800);
        setPin('');
      }
    } catch(err) {
      setError(true);
    }
  };

  return (
    <LocalErrorBoundary>
      <div className="flex-1 flex flex-col items-center justify-center h-full p-6 animate-fade-in">
      <div className={`max-w-sm w-full p-8 rounded-3xl shadow-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-md ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          <LockIcon className="w-8 h-8" />
        </div>
        <h2 className={`text-2xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Admin Access</h2>
        <p className={`text-sm text-center mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Enter your PIN to access restricted areas. <br/><span className="text-xs opacity-70">(Hint: 1234)</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className={`w-full text-center text-3xl tracking-[1em] font-bold px-4 py-4 pr-12 rounded-xl border-2 outline-none transition-all ${
                error
                   ? 'border-red-500 text-red-500 animate-[shake_0.2s_ease-in-out_0s_2]'
                   : (darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500')
              }`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
            >
              {showPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
          <button type="submit" disabled={pin.length !== 4} className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20">
            Unlock <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
    </LocalErrorBoundary>
  );
}

function AppContent() {
  const { currentUser, setCurrentUser, isLocked, setIsLocked, users } = useApp();

  // Set crash flag on mount, clear on clean unmount
  useEffect(() => {
    setCrashFlag();
    const handleBeforeUnload = () => clearCrashFlag();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearCrashFlag();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Global error handlers → log to backend
  useEffect(() => {
    const handleError = (event) => {
      window.api?.logRendererError?.({
        context: 'window.onerror',
        message: `${event.message} at ${event.filename}:${event.lineno}`,
      });
    };
    const handleRejection = (event) => {
      window.api?.logRendererError?.({
        context: 'unhandledRejection',
        message: event.reason?.stack || event.reason?.message || String(event.reason),
      });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!currentUser) {
    return <AuthScreen onLogin={setCurrentUser} savedUsers={users} />;
  }

  if (isLocked) {
    return <AuthScreen
      onLogin={(user) => {
         if (user.role === currentUser.role) {
           setIsLocked(false);
         } else {
           setCurrentUser(user);
           setIsLocked(false);
         }
      }}
      savedUsers={users}
      onLockMode={true}
      lockedUser={currentUser}
    />;
  }

  return (
    <Router>
      <AutoLockWrapper>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Salesman Routes (Unprotected) */}
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="pos"             element={<POSBilling />} />
            <Route path="sales-ledger"    element={<SalesLedger />} />
            <Route path="customers"       element={<Customers />} />
            <Route path="credits"         element={<Credits />} />

            {/* Admin Routes (Protected) */}
            <Route path="home"            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="inventory"       element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="purchases"       element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="reports"         element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="accounting"      element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
            <Route path="settings"        element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="expenses"        element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="purchase-ledger" element={<ProtectedRoute><PurchaseLedger /></ProtectedRoute>} />
            <Route path="roadmap"         element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
            <Route path="system-health"   element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
            <Route path="activity-logs"   element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
          </Route>
        </Routes>
        <UpdateNotifier />
      </AutoLockWrapper>
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <LocalErrorBoundary>
        <AppContent />
      </LocalErrorBoundary>
    </AppProvider>
  );
}

export default App;

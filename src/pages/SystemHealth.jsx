import { useState, useEffect } from 'react';
import { Activity, Database, HardDrive, Clock, Wifi, WifiOff, Shield, Terminal, RefreshCw, Download, FolderOpen, Upload, Cloud, CloudOff, CheckCircle, ArrowUpCircle } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';

export default function SystemHealth() {
  const { darkMode, addToast, isOwner } = useApp();
  const dm = darkMode;
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [dbHealth, setDbHealth] = useState({ success: true });
  const [recovering, setRecovering] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, payload, title, message }

  async function loadData() {
    if (!window.api) return setLoading(false);
    
    try {
      // Individual awaits to prevent one failure from blocking all data
      try {
        const h = await window.api.getSystemHealth();
        if (h) setHealth(h);
      } catch (e) { console.error("Health fetch failed", e); }

      try {
        const l = await window.api.getRecentLogs();
        setLogs(l || []);
      } catch (e) { /* ignore */ }

      try {
        const b = await window.api.getBackups();
        setBackups(b || []);
      } catch (e) { /* ignore */ }

      try {
        const ls = await window.api.getLastSyncTime();
        setLastSync(ls);
      } catch (e) { /* ignore */ }

      try {
        const hCheck = await window.api.getDbHealth();
        setDbHealth(hCheck || { success: true });
      } catch (e) { /* ignore */ }

    } catch (err) {
      console.error("System health load error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function handleBackup() {
    setBackingUp(true);
    try {
      if (window.api) {
        const result = await window.api.createBackup();
        if (result.success) {
          addToast('Backup created successfully!', 'success');
          const b = await window.api.getBackups();
          setBackups(b || []);
        } else {
          addToast('Backup failed: ' + result.error, 'error');
        }
      }
    } catch (e) {
      addToast('Backup error', 'error');
    }
    setBackingUp(false);
  }

  async function handleRestore(backupPath, name) {
    setConfirmAction({
      type: 'restore',
      payload: { backupPath, name },
      title: 'Restore Database',
      message: `⚠️ WARNING: Restore from "${name}"?\n\nThis will OVERWRITE your current database. All unsynced local data will be LOST. The app will restart after restoring.`
    });
  }

  async function handleRepair() {
    setConfirmAction({
      type: 'repair',
      title: 'Repair Database',
      message: 'Attempt to repair database? This will run an integrity check and optimization (VACUUM/REINDEX). This may take a moment.'
    });
  }

  async function handleCloudRecover() {
    if (!isOnline) { addToast('Offline. Connect to internet to recover.', 'error'); return; }
    setConfirmAction({
      type: 'cloudRecover',
      title: 'Disaster Recovery',
      message: '⚠️ DISASTER RECOVERY: Download data from Cloud?\n\nThis will download missing products, sales, and suppliers from the Cloud and merge them into your local records. Use this if you just switched computers or restored an old backup.'
    });
  }

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, payload } = confirmAction;
    setConfirmAction(null);

    if (type === 'restore') {
      try {
        const result = await window.api.restoreBackup(payload.backupPath);
        if (!result.success) addToast('Restore failed: ' + result.error, 'error');
      } catch {}
    } else if (type === 'repair') {
      try {
        const res = await window.api.repairDb();
        if (res.success) {
          addToast("Database repair complete!", "success");
          setDbHealth({ success: true });
        } else {
          addToast("Repair failed: " + res.error, "error");
        }
      } catch (e) {
        addToast("Repair error", "error");
      }
    } else if (type === 'cloudRecover') {
      setRecovering(true);
      try {
        const res = await window.api.pullFromCloud();
        if (res.success) {
          addToast(`Recovery complete! Pulled: ${Object.entries(res.pulled).map(([k, v]) => `${v} ${k}`).join(', ')}`, 'success');
          loadData();
        } else {
          addToast("Recovery partial: " + (res.errors || []).join(', '), 'warning');
        }
      } catch (e) {
        addToast("Cloud recovery failed", "error");
      }
      setRecovering(false);
    }
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>System Health</h2>
        <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>App diagnostics, backups, and error logs</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <p className={`text-xs font-semibold uppercase ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Version</p>
          </div>
          <p className={`text-2xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-800'}`}>v{health?.version || '4.0.2'}</p>
          <p className={`text-[10px] mt-1 font-bold text-slate-400 uppercase`}>Electron {health?.electronVersion || 'Core'}</p>
        </div>

        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <p className={`text-xs font-semibold uppercase ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Database</p>
          </div>
          <p className={`text-2xl font-bold text-emerald-600 tracking-tight`}>{health?.dbSizeKB || '0.0'} <span className="text-xs font-bold text-slate-400">KB</span></p>
          <p className={`text-xs mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
            {Object.entries(health?.recordCounts || {}).map(([k, v]) => `${v} ${k}`).join(' · ')}
          </p>
        </div>

        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-2">
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-rose-500" />}
            <p className={`text-xs font-semibold uppercase ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Network</p>
          </div>
          <p className={`text-2xl font-bold ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>{isOnline ? 'Online' : 'Offline'}</p>
          <p className={`text-xs mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{health?.platform}</p>
        </div>

        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className={`w-4 h-4 ${dbHealth.success ? 'text-emerald-500' : 'text-rose-500'}`} />
            <p className={`text-xs font-semibold uppercase ${dm ? 'text-slate-400' : 'text-slate-500'}`}>DB Health</p>
          </div>
          <p className={`text-2xl font-bold ${dbHealth.success ? 'text-emerald-600' : 'text-rose-600'}`}>
            {dbHealth.success ? 'Healthy' : 'Issues Found'}
          </p>
          {!dbHealth.success ? (
            !isOwner ? <button onClick={handleRepair} className="text-xs text-blue-500 font-bold hover:underline">Repair Now</button> : <span className="text-xs text-rose-500 font-bold">Contact Admin</span>
          ) : (
            <p className={`text-xs mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Integrity Verified</p>
          )}
        </div>
      </div>

      {/* Backup Section */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>System Backups</h3>
              <p className={`text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'} uppercase font-bold tracking-wider`}>Synced to Documents & AppData</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => window.api.openBackupFolder()}
              className={`flex items-center gap-2 px-4 py-2 border-2 text-sm font-semibold rounded-xl transition-all ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <FolderOpen className="w-4 h-4" /> Open Folder
            </button>
            <button
              onClick={async () => {
                const res = await window.api.restoreCustomFile();
                if (res?.success === false && !res?.canceled) addToast('Restore Failed: ' + (res.error || ''), 'error');
              }}
              className={`flex items-center gap-2 px-4 py-2 border-2 text-sm font-semibold rounded-xl transition-all ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Upload className="w-4 h-4" /> Restore File
            </button>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 border-2 border-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 hover:border-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50`}
            >
              {backingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {backingUp ? 'Creating Backup...' : 'Backup Now'}
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <p className={`text-sm ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No backups yet. Click "Backup Now" to create one.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {backups.map((b, i) => (
              <div key={b.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                <div>
                  <p className={`text-sm font-medium ${dm ? 'text-white' : 'text-slate-800'}`}>{b.name}</p>
                  <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                    {new Date(b.date).toLocaleString()} · {b.size}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(b.path, b.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${dm ? 'bg-slate-700 text-slate-300 hover:bg-amber-900 hover:text-amber-300' : 'bg-slate-200 text-slate-600 hover:bg-amber-100 hover:text-amber-700'}`}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloud Sync Section */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Cloud Sync</h3>
              <p className={`text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'} uppercase font-bold tracking-wider`}>
                {lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : 'Never synced'}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (!isOnline) { addToast('You are offline. Connect to the internet to sync.', 'error'); return; }
              setSyncing(true);
              setSyncResult(null);
              try {
                if (window.api) {
                  const result = await window.api.syncToCloud();
                  setSyncResult(result);
                  setLastSync(result.lastSync);
                  if (result.success) {
                    addToast(`Cloud sync complete! ${result.synced.sales || 0} sales, ${result.synced.expenses || 0} expenses, ${result.synced.products || 0} products synced.`, 'success');
                  } else {
                    addToast('Sync completed with errors: ' + (result.errors || []).join(', '), 'error');
                  }
                }
              } catch (e) {
                addToast('Cloud sync failed: ' + (e.message || 'Unknown error'), 'error');
              }
              setSyncing(false);
            }}
            disabled={syncing || !isOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed
              ${isOnline
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                : 'bg-slate-400 text-white cursor-not-allowed'}`}
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            {syncing ? 'Syncing...' : isOnline ? 'Sync Now' : 'Offline'}
          </button>
        </div>

        {!isOnline && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${dm ? 'bg-amber-900/20 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <p>You are offline. Cloud sync requires an internet connection.</p>
          </div>
        )}

        {syncResult && (
          <div className={`mt-3 rounded-xl border p-4 ${syncResult.success
            ? (dm ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200')
            : (dm ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200')}`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={`w-4 h-4 ${syncResult.success ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-semibold ${syncResult.success ? (dm ? 'text-green-400' : 'text-green-700') : (dm ? 'text-red-400' : 'text-red-700')}`}>
                {syncResult.success ? 'Sync Successful' : 'Sync Completed with Errors'}
              </span>
            </div>
            <div className={`grid grid-cols-3 gap-3 text-center ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
              {['sales', 'expenses', 'products', 'suppliers', 'categories'].map(key => syncResult.synced?.[key] !== undefined && (
                <div key={key} className={`rounded-lg py-2 ${dm ? 'bg-slate-800' : 'bg-white'}`}>
                  <p className="text-lg font-bold">{syncResult.synced[key]}</p>
                  <p className={`text-xs capitalize ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{key}</p>
                </div>
              ))}
            </div>
            {syncResult.errors?.length > 0 && (
              <div className={`mt-2 text-xs ${dm ? 'text-red-400' : 'text-red-600'}`}>
                {syncResult.errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Recovery Options moved inside Cloud Sync Section or separate */}
        <div className={`mt-4 pt-4 border-t ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
           <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-sm font-bold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Disaster Recovery</h4>
                <p className="text-[10px] text-slate-500">Restore your shop data from Cloud after a system failure</p>
              </div>
              <button
                onClick={handleCloudRecover}
                disabled={recovering || !isOnline}
                className={`flex items-center gap-2 px-4 py-2 border-2 text-sm font-semibold rounded-xl transition-all ${dm ? 'border-indigo-900/50 text-indigo-400 hover:bg-indigo-900/20' : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'} disabled:opacity-50`}
              >
                {recovering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Recover from Cloud
              </button>
           </div>
        </div>
      </div>

      {/* Software Update Section */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Software Update</h3>
              <p className={`text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'} uppercase font-bold tracking-wider`}>
                Sports Zone Updater
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (!window.api?.checkForUpdates) {
                addToast('Updater unavailable in web mode.', 'error');
                return;
              }
              setCheckingUpdate(true);
              try {
                const res = await window.api.checkForUpdates();
                if (!res?.success) {
                  let errStr = res?.error || 'Unknown error';
                  if (errStr.length > 100) errStr = errStr.substring(0, 100) + '... (Check Error Logs)';
                  addToast(`Update check failed: ${errStr}`, 'error');
                } else {
                  // If update found, our update-available IPC event triggers the popup automatically!
                  addToast('Update check completed. It will notify you if an update is found!', 'success');
                }
              } catch (err) {
                let msg = err.message || 'Unknown error';
                if (msg.includes('404')) {
                   addToast('Ensure your GitHub repository is public, or check your internet connection.', 'error');
                } else {
                   if (msg.length > 100) msg = msg.substring(0, 100) + '... (Check Error Logs)';
                   addToast('Update check failed: ' + msg, 'error');
                }
              }
              setCheckingUpdate(false);
            }}
            disabled={checkingUpdate}
            className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50`}
          >
            {checkingUpdate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {checkingUpdate ? 'Checking...' : 'Check For Updates'}
          </button>
        </div>
      </div>

      {/* Error Logs */}
      {!isOwner && (
      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-rose-500" />
          <h3 className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Recent Error Logs</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            {logs.length} entries
          </span>
        </div>
        {logs.length === 0 ? (
          <p className={`text-sm ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No errors logged. Everything is running smoothly! 🎉</p>
        ) : (
          <div className={`max-h-64 overflow-y-auto rounded-xl border text-xs font-mono p-3 space-y-1
            ${dm ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            {logs.map((line, i) => (
              <p key={i} className={line.includes('[ERROR]') || line.includes('Error') ? 'text-rose-500' : ''}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
      )}

      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmAction(null)}
          dm={dm}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Activity, Clock, ShieldAlert, Trash2 } from 'lucide-react';

export default function ActivityLogs() {
  const { darkMode } = useApp();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    if (window.api && window.api.getAuditLogs) {
      try {
        const data = await window.api.getAuditLogs();
        setLogs(data || []);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      }
    }
    setIsLoading(false);
  };

  const getIconForAction = (action) => {
    if (action.includes('Delete')) return <Trash2 className="w-4 h-4 text-red-500" />;
    if (action.includes('Settings')) return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    return <Activity className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto pb-20 h-full flex flex-col ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      <div className="mb-6">
        <h2 className={`text-3xl font-bold tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <Activity className="w-6 h-6 text-blue-500" />
          Owner Audit Logs
        </h2>
        <p className={`text-sm mt-1.5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          A secure, immutable record of important system actions and deletions.
        </p>
      </div>

      <div className={`flex-1 overflow-hidden rounded-2xl border flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No activity logs recorded yet.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className={`flex items-start gap-4 p-4 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'} transition-all hover:shadow-sm`}>
                <div className={`p-2 rounded-lg mt-1 ${darkMode ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                  {getIconForAction(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">{log.action}</h3>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.timestamp).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{log.details}</p>
                  <p className={`text-xs mt-2 font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    User Role: {log.user_role}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

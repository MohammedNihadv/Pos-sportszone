import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Activity, AlertTriangle, MonitorPlay, CheckCircle2, Box, LogIn, Database, ShieldAlert, Cpu, Power, Trash2, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function App() {
  const [authPin, setAuthPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('developer_auth') === 'verified';
  });

  const [devices, setDevices] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ sales: 0 });

  // Modals
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedError, setSelectedError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTelemetry();
      const devicesSub = supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'device_telemetry' }, payload => {
          fetchTelemetry();
        }).subscribe();
        
      return () => { supabase.removeChannel(devicesSub); }
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (authPin === 'SZADMIN2026') { 
      setIsAuthenticated(true);
      localStorage.setItem('developer_auth', 'verified');
      setTimeout(() => {
        localStorage.removeItem('developer_auth');
        setIsAuthenticated(false);
      }, 2 * 60 * 60 * 1000); // 2 hours
    } else {
      alert('Security violation: Invalid authentication PIN.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('developer_auth');
    setIsAuthenticated(false);
  }

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const [devicesRes, errorsRes, salesRes] = await Promise.all([
        supabase.from('device_telemetry').select('*').order('last_seen', { ascending: false }),
        supabase.from('developer_logs').select('*').order('occurred_at', { ascending: false }).limit(50),
        supabase.from('cloud_sales').select('total')
      ]);
      
      if (devicesRes.data) setDevices(devicesRes.data);
      if (errorsRes.data) setErrors(errorsRes.data);
      if (salesRes.data) {
        const sum = salesRes.data.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
        setRevenue(sum);
        setSyncStatus({ sales: salesRes.data.length });
      }
    } catch (e) {
      console.warn("Fetch issue:", e);
    }
    setLoading(false);
  };

  const triggerForceAction = async (deviceId, action) => {
    if (!window.confirm(`CRITICAL: Are you sure you want to trigger '${action.toUpperCase()}' on device ${deviceId}?`)) return;
    const { error } = await supabase.from('device_telemetry').update({ force_action: action }).eq('machine_id', deviceId);
    if (!error) {
      alert(`Action '${action}' primed for next device heartbeat.`);
      fetchTelemetry();
    } else {
      alert(`Failed to trigger remotely: ${error.message}`);
    }
    setSelectedDevice(null);
  };

  const clearAction = async (deviceId) => {
    await supabase.from('device_telemetry').update({ force_action: null }).eq('machine_id', deviceId);
    fetchTelemetry();
    setSelectedDevice(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-700">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-500/10 rounded-full"><ShieldAlert className="w-12 h-12 text-blue-500" /></div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Restricted Access</h2>
          <p className="text-slate-400 text-center text-sm mb-6">Telemetrik monitoring is for authorized personnel only.</p>
          <input 
            type="password" placeholder="Enter System PIN" required
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white mb-4 shadow-inner focus:outline-none focus:border-blue-500"
            value={authPin} onChange={e => setAuthPin(e.target.value)}
          />
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
            <LogIn className="w-5 h-5" /> Authenticate
          </button>
        </form>
      </div>
    );
  }

  // Metrics Logic
  const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const activeDevices = devices.filter(d => new Date(d.last_seen) > oneDayAgo);
  const recentInstalls = devices.filter(d => new Date(d.created_at || d.last_seen) > sevenDaysAgo);
  
  const versionMap = devices.reduce((acc, current) => {
    const v = current.app_version || 'Unknown';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  
  const versionData = Object.keys(versionMap).map(key => ({ name: key, value: versionMap[key] }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <MonitorPlay className="w-8 h-8 text-blue-600" />
              Telemetrik Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Authorized deployment monitoring active.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchTelemetry} disabled={loading} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium hover:bg-slate-50">
              Refresh Data
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 shadow-sm rounded-lg text-sm font-bold hover:bg-red-100">
              Logout
            </button>
          </div>
        </header>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Box className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Total Installs</p>
              <h3 className="text-2xl font-bold leading-none mt-1">{devices.length}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Active (24h)</p>
              <h3 className="text-2xl font-bold leading-none mt-1">{activeDevices.length}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
             <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">₹</div>
             <div>
               <p className="text-xs font-semibold uppercase text-slate-400">Cross-Device Rev</p>
               <h3 className="text-2xl font-bold leading-none mt-1">₹{revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
             </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
             <div className="p-3 bg-sky-50 text-sky-600 rounded-xl"><Database className="w-5 h-5" /></div>
             <div>
               <p className="text-xs font-semibold uppercase text-slate-400">Cloud Syncs</p>
               <h3 className="text-2xl font-bold leading-none mt-1">{syncStatus.sales} Recs</h3>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="col-span-1 border border-slate-100 rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-center">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Version Analytics</h3>
            {versionData.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={versionData} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {versionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="text-center text-slate-400 py-10 text-sm">No version data</div>}
            
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
               <span className="text-slate-500 font-medium">New Installs (7d):</span>
               <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">+{recentInstalls.length}</span>
            </div>
          </div>

          {/* Middle & Right columns: Logs and Devices */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            
            {/* Device Roster */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Active Deployments Roster</h2>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50 sticky top-0">
                      <th className="p-4 font-medium">Device ID</th>
                      <th className="p-4 font-medium">Hostname</th>
                      <th className="p-4 font-medium">Version</th>
                      <th className="p-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map(device => {
                      const isOnline = new Date(device.last_seen) > oneDayAgo;
                      return (
                        <tr key={device.machine_id || device.id} onClick={() => setSelectedDevice(device)} className="cursor-pointer border-b border-slate-50 hover:bg-blue-50 transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-500">{(device.machine_id || '').substring(0,8)}...</td>
                          <td className="p-4 font-bold text-blue-600">{device.hostname || 'Unknown'}</td>
                          <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-medium">{device.app_version}</span></td>
                          <td className="p-4 text-right">
                            {device.force_action ? (
                               <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wide">
                                  {device.force_action} PENDING
                               </span>
                            ) : isOnline ? (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                               </span>
                            ) : (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Offline
                               </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Error Logs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-[300px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-amber-800 text-sm tracking-wide uppercase">Crash Watch Tower</h2>
                </div>
                <span className="text-xs font-bold text-amber-600">{errors.length} Recorded</span>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {errors.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                    <p className="text-slate-500 font-medium">Zero crashes reported! Good job.</p>
                  </div>
                ) : (
                  errors.map(err => (
                    <div key={err.id} onClick={() => setSelectedError(err)} className="cursor-pointer p-3 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-xl transition-colors">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-red-800 truncate">{err.error_message}</p>
                        <span className="text-xs text-slate-500 ml-4 font-medium whitespace-nowrap">{new Date(err.occurred_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DEVICE DRILLDOWN MODAL */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-bold text-lg flex items-center gap-2"><Cpu className="text-blue-500 w-5 h-5"/> Device Target: {selectedDevice.hostname}</h3>
               <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <p className="text-slate-400 text-xs font-semibold mb-1">Architecture / OS</p>
                     <p className="font-mono text-slate-800">{selectedDevice.os || 'Unknown'}</p>
                   </div>
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <p className="text-slate-400 text-xs font-semibold mb-1">POS Firmware</p>
                     <p className="font-mono font-bold text-blue-600">v{selectedDevice.app_version}</p>
                   </div>
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <p className="text-slate-400 text-xs font-semibold mb-1">Last Heartbeat</p>
                     <p className="font-mono text-slate-800">{new Date(selectedDevice.last_seen).toLocaleString()}</p>
                   </div>
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <p className="text-slate-400 text-xs font-semibold mb-1">Machine HWID</p>
                     <p className="font-mono text-xs text-slate-500 break-all">{selectedDevice.machine_id}</p>
                   </div>
                </div>

                <div className="p-4 bg-red-50/50 border-2 border-red-100 border-dashed rounded-xl">
                  <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3"><Power className="w-4 h-4"/> Remote Force Actions</h4>
                  {selectedDevice.force_action ? (
                     <div className="p-3 bg-red-100 text-red-800 rounded flex items-center justify-between">
                       <span className="font-bold text-sm">PENDING: {selectedDevice.force_action}</span>
                       <button onClick={() => clearAction(selectedDevice.machine_id)} className="text-xs bg-white px-2 py-1 rounded border border-red-200">Cancel Queue</button>
                     </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => triggerForceAction(selectedDevice.machine_id, 'disable')} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-sm transition">
                        Kill Device Executable
                      </button>
                      <button onClick={() => triggerForceAction(selectedDevice.machine_id, 'update')} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm shadow-sm transition">
                        Force FW Update
                      </button>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ERROR DRILLDOWN MODAL */}
      {selectedError && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50">
               <h3 className="font-bold text-lg text-red-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Error Trace</h3>
               <button onClick={() => setSelectedError(null)} className="text-red-400 hover:text-red-600"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-6">
                <p className="font-mono text-sm bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[300px]">
                  {selectedError.error_message}
                </p>
                <div className="mt-4 flex justify-between items-end border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Occurred On</p>
                    <p className="font-mono text-sm text-slate-800">{new Date(selectedError.occurred_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Version</p>
                    <p className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded inline-block">v{selectedError.app_version}</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

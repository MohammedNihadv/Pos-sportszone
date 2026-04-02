import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Activity, AlertTriangle, MonitorPlay, CheckCircle2, Box } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function App() {
  const [devices, setDevices] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTelemetry();
    
    // Subscribe to realtime updates if needed
    const devicesSub = supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, payload => {
        fetchTelemetry();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(devicesSub);
    }
  }, []);

  const fetchTelemetry = async () => {
    setLoading(true);
    
    const [devicesRes, errorsRes] = await Promise.all([
      supabase.from('devices').select('*').order('last_seen', { ascending: false }),
      supabase.from('developer_logs').select('*').order('occurred_at', { ascending: false }).limit(50)
    ]);
    
    if (devicesRes.data) setDevices(devicesRes.data);
    if (errorsRes.data) setErrors(errorsRes.data);
    
    setLoading(false);
  };

  // Metrics Logic
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const activeDevices = devices.filter(d => new Date(d.last_seen) > oneDayAgo);
  
  const versionMap = devices.reduce((acc, current) => {
    const v = current.app_version || 'Unknown';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  
  const versionData = Object.keys(versionMap).map(key => ({ name: key, value: versionMap[key] }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <MonitorPlay className="w-8 h-8 text-blue-600" />
              Telemetrik Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Live tracking for Sports Zone POS deployments</p>
          </div>
          <button 
            onClick={fetchTelemetry}
            className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Refresh Data
          </button>
        </header>

        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse">Connecting to Supabase Nodes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Metric Cards */}
            <div className="col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Box className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Installs</p>
                  <h3 className="text-3xl font-bold">{devices.length}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Devices (24h)</p>
                  <h3 className="text-3xl font-bold">{activeDevices.length}</h3>
                </div>
              </div>

              {/* Version Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Version Distribution</h3>
                {versionData.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={versionData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {versionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-10 text-sm">No version data</div>
                )}
              </div>
            </div>

            {/* Middle & Right columns: Logs and Devices */}
            <div className="col-span-1 md:col-span-2 space-y-6">
              
              {/* Developer Logs */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-800">Critical Error Stream</h2>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-3">
                  {errors.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                      <p className="text-slate-500 font-medium">Zero crashes reported! Good job.</p>
                    </div>
                  ) : (
                    errors.map(err => (
                      <div key={err.id} className="p-4 bg-red-50/50 border border-red-100 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <code className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                            {err.app_version || 'vUnknown'}
                          </code>
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {new Date(err.occurred_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-red-800 font-mono break-all leading-snug">
                          {err.error_message}
                        </p>
                        <div className="mt-3 text-xs text-slate-500">
                          Device ID: <span className="font-mono">{err.device_id.split('-')[0]}...</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Connected Devices Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Device Roster</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                        <th className="p-4 font-medium">Hostname</th>
                        <th className="p-4 font-medium">OS</th>
                        <th className="p-4 font-medium">Version</th>
                        <th className="p-4 font-medium">Last Seen</th>
                        <th className="p-4 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map(device => {
                        const isOnline = new Date(device.last_seen) > oneDayAgo;
                        return (
                          <tr key={device.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="p-4 font-medium text-slate-800">{device.device_name || 'Unknown'}</td>
                            <td className="p-4 text-slate-500">{device.os}</td>
                            <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-medium">{device.app_version}</span></td>
                            <td className="p-4 text-slate-500 whitespace-nowrap">
                              {new Date(device.last_seen).toLocaleDateString()} {new Date(device.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </td>
                            <td className="p-4 text-right">
                              {isOnline ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  Offline
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {devices.length === 0 && (
                     <div className="p-8 text-center text-slate-500">Wait for POS terminals to check in...</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

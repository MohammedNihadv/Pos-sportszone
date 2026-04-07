import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Activity, AlertTriangle, MonitorPlay, CheckCircle2, Box, LogIn, Database, ShieldAlert, Cpu, Power, Trash2, X, Users, History, Lock, Eye, EyeOff, Terminal } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

function App() {
  const [authPin, setAuthPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('developer_auth') === 'verified';
  });

  const [devices, setDevices] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showPins, setShowPins] = useState(false);
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'logs' | 'users'
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    } else {
      alert('Security violation: Invalid authentication PIN.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('developer_auth');
    setIsAuthenticated(false);
    setAuthPin('');
    setShowLogoutConfirm(false);
  };

  const fetchTelemetry = async (target = 'all') => {
    // Only show loading on initial full load to prevent "jitters" during background sync
    if (target === 'all') setLoading(true);
    
    try {
      if (target === 'all' || target === 'device_telemetry') {
        const { data } = await supabase.from('device_telemetry').select('*').order('last_seen', { ascending: false });
        if (data) setDevices(data);
      }
      if (target === 'all' || target === 'developer_logs') {
        const { data } = await supabase.from('developer_logs').select('*').order('occurred_at', { ascending: false }).limit(50);
        if (data) setErrors(data);
      }
      if (target === 'all' || target === 'cloud_sales') {
        const { data } = await supabase.from('cloud_sales').select('total');
        if (data) {
          const sum = data.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
          setRevenue(sum);
        }
      }
      if (target === 'all' || target === 'cloud_users') {
        const { data } = await supabase.from('cloud_users').select('*').order('role', { ascending: false });
        if (data) setUsers(data);
      }
      if (target === 'all' || target === 'cloud_audit_logs') {
        const { data } = await supabase.from('cloud_audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (data) setAuditLogs(data);
      }
    } catch (e) {
      console.warn("Fetch issue:", e);
    }
    if (target === 'all') setLoading(false);
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px]"></div>
        
        <form onSubmit={handleLogin} className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-700/50 relative z-10">
          <div className="flex justify-center mb-8">
            <div className="p-5 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-3xl shadow-lg shadow-blue-900/20">
              <ShieldAlert className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-2 tracking-tight">Developer Access Protocol</h2>
          <p className="text-slate-400 text-center text-sm mb-8 font-medium">Internal Telemetrik Monitoring Environment</p>
          
          <div className="space-y-4">
            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="password" placeholder="System Security Passcode" required
                className="w-full pl-12 pr-4 py-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all text-lg tracking-normal hover:bg-slate-800/60"
                value={authPin} onChange={e => setAuthPin(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-900/40 relative overflow-hidden group border border-blue-500/20">
              <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
              <LogIn className="w-5 h-5 relative z-10" /> <span className="relative z-10 text-sm tracking-wide">Sign In to Telemetrik</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-8 uppercase font-bold tracking-[0.1em]">Target: sportszone-pos-main-v3</p>
        </form>
      </div>
    );
  }

  const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const versionMap = devices.reduce((acc, current) => {
    const v = current.app_version || 'v1.0.0';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  const versionData = Object.keys(versionMap).map(key => ({ name: key, value: versionMap[key] }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 pb-20">
      
      {/* Premium Navigation Header */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                <MonitorPlay className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Telemetrik<span className="text-blue-600">.</span></h1>
            </div>
            
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'telemetry', label: 'Monitor', icon: Activity },
                { id: 'logs', label: 'Audit', icon: History },
                { id: 'users', label: 'Staffing', icon: Users },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all
                    ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Security Status</p>
               <p className="text-emerald-500 text-xs font-bold flex items-center gap-1.5 justify-end mt-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Encrypted Link
               </p>
             </div>
             <button 
               id="logout-btn"
               onClick={() => setShowLogoutConfirm(true)}
               className="h-10 w-10 min-w-[40px] rounded-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 border-2 border-white shadow-sm transition-all flex items-center justify-center font-bold text-xs relative z-[100]"
               title="Sign Out"
             >
               <Power className="w-4 h-4" />
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 animate-fade-in">
        
        {/* Core Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { label: 'Cloud Installs', val: devices.length, icon: Box, color: 'blue' },
             { label: 'Active Targets', val: devices.filter(d => new Date(d.last_seen) > oneDayAgo).length, icon: Activity, color: 'emerald' },
             { label: 'Global Revenue', val: `₹${revenue.toLocaleString('en-IN')}`, icon: Database, color: 'indigo' },
             { label: 'Critical Errors', val: errors.length, icon: AlertTriangle, color: 'amber' },
           ].map(stat => (
             <div key={stat.label} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
                <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                   <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stat.val}</h3>
                </div>
             </div>
           ))}
        </div>

        {/* --- MONITOR TAB --- */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
             
             {/* Left Column (40%) */}
             <div className="lg:col-span-4 space-y-10">
                <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                   <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Version Analytics</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium italic opacity-70">Global firmware distribution</p>
                   </div>
                   <div className="p-6">
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie data={versionData} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" animationDuration={1500}>
                               {versionData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                             </Pie>
                             <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                         {versionData.map((v, i) => (
                           <div key={v.name} className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                             <span className="text-xs font-bold text-slate-600">{v.name}: {v.value}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </section>
                
                {/* Visual Watch Tower Block */}
                <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                   <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-amber-500/10 rounded-full blur-[60px] group-hover:bg-amber-500/20 transition-all duration-700"></div>
                   <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-500 text-slate-900 rounded-lg"><Terminal className="w-4 h-4" /></div>
                        <h3 className="text-xs font-bold tracking-[0.2em] text-amber-500">Live Watch Tower</h3>
                      </div>
                      <p className="text-3xl font-bold mb-2">{errors.length}</p>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">System crashes or renderer failure reports across the whole network.</p>
                      <button 
                        onClick={() => setActiveTab('logs')}
                        className="mt-8 text-[11px] font-bold py-3 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors shadow-lg active:scale-95"
                      >
                        Inspect Error Stack
                      </button>
                   </div>
                </section>
             </div>

             {/* Right Column (60%) */}
             <div className="lg:col-span-8 space-y-10">
                <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                       <div>
                         <h3 className="text-lg font-bold text-slate-900 tracking-tight">Global Node Roster</h3>
                         <p className="text-xs text-slate-500 mt-1 font-medium italic opacity-70">Live tracking of active machines</p>
                       </div>
                       <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">Live Refresh</span>
                    </div>
                   <div className="overflow-x-auto min-h-[400px]">
                      <table className="w-full text-sm text-left border-collapse">
                         <thead className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <tr>
                               <th className="px-8 py-5 font-bold">Node Identity</th>
                               <th className="px-8 py-5 font-bold">Firmware</th>
                               <th className="px-8 py-5 text-right font-bold">Status</th>
                               <th className="px-8 py-5 text-center font-bold w-20">Manage</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {devices.map(d => {
                              const online = new Date(d.last_seen) > oneDayAgo;
                              return (
                                <tr key={d.machine_id} onClick={() => setSelectedDevice(d)} className="hover:bg-blue-50/30 cursor-pointer transition-colors group">
                                   <td className="px-8 py-5">
                                      <div className="flex items-center gap-3">
                                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {d.hostname?.charAt(0) || '?'}
                                         </div>
                                          <div>
                                             <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-[13px]">{d.hostname || 'Anonymous Node'}</p>
                                             <p className="text-[10px] font-mono text-slate-400 mt-0.5 opacity-80 uppercase tracking-tight">HWID: {d.machine_id?.substring(0,8)}</p>
                                          </div>
                                      </div>
                                   </td>
                                   <td className="px-8 py-5">
                                      <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold shadow-sm tracking-widest">
                                         V.{d.app_version || '1.0'}
                                      </span>
                                   </td>
                                   <td className="px-8 py-5 text-right">
                                      {d.force_action ? (
                                        <div className="inline-flex flex-col items-end">
                                           <span className="text-[9px] font-bold text-red-500 uppercase mb-1 tracking-wider">Command Sent</span>
                                           <span className="px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest">{d.force_action}</span>
                                        </div>
                                      ) : online ? (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full border border-emerald-100 tracking-widest">
                                           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                           Connected
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full tracking-widest">
                                           Offline
                                        </span>
                                      )}
                                   </td>
                                   <td className="px-8 py-5 text-center">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (window.confirm("Permanently decommission this node?")) {
                                            supabase.from('device_telemetry').delete().eq('machine_id', d.machine_id).then(() => fetchTelemetry());
                                          }
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Node"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                   </td>
                                </tr>
                              )
                            })}
                         </tbody>
                      </table>
                      {devices.length === 0 && <div className="p-20 text-center text-slate-400 font-bold">Initializing deployment data link...</div>}
                   </div>
                </section>
             </div>
          </div>
        )}

        {/* --- STAFFING TAB --- */}
        {activeTab === 'users' && (
          <div className="space-y-8 animate-slide-up">
            <div className="flex justify-between items-end">
               <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Personnel Roster</h2>
                  <p className="text-slate-500 mt-1 font-medium">Synced credential management for all terminal operators.</p>
               </div>
                <button 
                   onClick={() => setShowPins(!showPins)}
                   className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all border-2
                     ${showPins ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' : 'bg-slate-900 text-white border-slate-900 shadow-md'}`}
                >
                   {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   {showPins ? "Secure Tokens" : "Reveal Tokens"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {users.map(u => (
                  <div key={u.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm relative group hover:shadow-md transition-all">
                     <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest
                       ${u.role === 'Owner' ? 'bg-amber-100 text-amber-700' : u.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                       {u.role}
                     </div>

                     <div className="flex items-center gap-5 mt-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner
                          ${u.role === 'Owner' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                           {u.name.charAt(0)}
                        </div>
                         <div>
                            <p className="text-xl font-bold text-slate-900 tracking-tight">{u.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">Terminal Operator</p>
                         </div>
                     </div>

                     <div className="mt-10 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Access Token</span>
                        <span className={`text-xl font-bold font-mono transition-all duration-300 ${showPins ? 'text-blue-600' : 'blur-md opacity-20'}`}>
                           {u.pin || '****'}
                        </span>
                     </div>
                  </div>
               ))}
               {users.length === 0 && <div className="col-span-full py-20 text-center font-bold text-slate-400">Fetching personnel data from cloud link...</div>}
            </div>
          </div>
        )}

        {/* --- AUDIT TAB --- */}
        {activeTab === 'logs' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                   <div>
                     <h3 className="text-lg font-bold text-slate-900 tracking-tight">Global Event Stream</h3>
                     <p className="text-xs text-slate-500 mt-1 font-medium italic opacity-70">Forensic audit trail of all deployments</p>
                   </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        if (window.confirm("CRITICAL: Wipe entire cloud audit trail? This cannot be undone.")) {
                          await supabase.from('cloud_audit_logs').delete().neq('id', 0);
                          fetchTelemetry();
                        }
                      }}
                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Clear Audit Trail
                    </button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50/30 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     <tr>
                       <th className="px-8 py-4">Timeline</th>
                       <th className="px-8 py-4">Action Target</th>
                       <th className="px-8 py-4">Actor Role</th>
                       <th className="px-8 py-4">Details Fragment</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {auditLogs.map(l => (
                       <tr key={l.id} className="hover:bg-slate-50/50 group">
                         <td className="px-8 py-5 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                            {new Date(l.timestamp).toLocaleString()}
                         </td>
                         <td className="px-8 py-5">
                            <span className="text-xs font-bold text-slate-900 uppercase group-hover:text-blue-600 transition-colors">
                               {l.action}
                            </span>
                         </td>
                         <td className="px-8 py-5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                              ${l.user_role === 'Owner' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'}`}>
                               {l.user_role}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-xs text-slate-500 italic max-w-sm truncate">
                            {l.details}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* DEVICE MODAL REDESIGN */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-scale-up">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                     <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"><Cpu className="w-6 h-6" /></div>
                     <div>
                        <h3 className="text-lg font-bold tracking-tight">{selectedDevice.hostname || 'Node Link'}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">Hardware ID Trace</p>
                     </div>
                 </div>
                 <button onClick={() => setSelectedDevice(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    {[
                      { l: 'Architecture', v: selectedDevice.os || 'X86-64' },
                      { l: 'FW Version', v: `Stable v${selectedDevice.app_version}` },
                      { l: 'Last Active', v: new Date(selectedDevice.last_seen).toLocaleTimeString() },
                      { l: 'Node Hash', v: selectedDevice.machine_id?.substring(0,10) },
                    ].map(i => (
                      <div key={i.l} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{i.l}</p>
                         <p className="text-xs font-bold text-slate-800 font-mono italic">{i.v}</p>
                      </div>
                    ))}
                 </div>

                 <div className="p-6 bg-red-50 border-2 border-red-100 rounded-3xl">
                    <h4 className="text-[10px] font-bold text-red-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Power className="w-4 h-4" /> Remote Command Injection
                    </h4>
                    {selectedDevice.force_action ? (
                       <div className="p-4 bg-white/80 rounded-2xl flex items-center justify-between shadow-sm">
                          <span className="font-bold text-red-600 uppercase text-xs">Awaiting Heartbeat: {selectedDevice.force_action}</span>
                          <button onClick={() => clearAction(selectedDevice.machine_id)} className="text-[10px] font-bold uppercase py-2 px-4 border-2 border-red-100 rounded-xl hover:bg-red-50 text-red-600 transition-all">Abort</button>
                       </div>
                    ) : (
                     <div className="flex gap-4">
                        <button onClick={() => triggerForceAction(selectedDevice.machine_id, 'disable')} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-red-200">Kill Node</button>
                        <button onClick={() => triggerForceAction(selectedDevice.machine_id, 'update')} className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-amber-200">Force Reboot</button>
                     </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Professional Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowLogoutConfirm(false)}></div>
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-scale-up relative z-10">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Power className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Disconnect Terminal?</h3>
                 <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                    You are about to terminate the secure monitoring session. Authentication will be required to re-establish the link.
                 </p>
                 
                 <div className="mt-8 space-y-3">
                    <button 
                       onClick={handleLogout}
                       className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-100"
                    >
                       Confirm Disconnect
                    </button>
                    <button 
                       onClick={() => setShowLogoutConfirm(false)}
                       className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all"
                    >
                       Cancel
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { Store, Printer, Shield, RefreshCw, Moon, Sun, Upload, Plus, Trash2, Tag, Users, LogOut, Volume2, Save, Box, Receipt, Truck, X, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const ctx = useApp();
  const { 
    darkMode, setDarkMode, addToast, logo, setLogo, 
    updateAdminPin, 
    users, setUsers, 
    currentUser, setCurrentUser, 
    appSettings, saveAppSettings,
    categories, setCategories,
    expenseCategories, setExpenseCategories,
    suppliers, setSuppliers,
    isOwner
  } = ctx;

  const [localSettings, setLocalSettings] = useState(appSettings);
  
  // Data Management States
  const [newCat, setNewCat] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [newSup, setNewSup] = useState('');

  const dm = darkMode;

  // Keep local settings in sync with global appSettings
  useEffect(() => {
    setLocalSettings(appSettings);
  }, [appSettings]);

  const save = async () => {
    await saveAppSettings(localSettings);
    addToast('All settings finalized and saved!', 'success');
  };

  const handleToggle = async (key) => {
    const newVal = !localSettings[key];
    const updated = { ...localSettings, [key]: newVal };
    setLocalSettings(updated);
    // Immediately sync dark mode to the global context so UI re-renders
    if (key === 'darkMode') setDarkMode(newVal);
    await saveAppSettings(updated);
  };

  // Category Management
  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    if (window.api) {
      const saved = await window.api.saveCategory({ name: newCat });
      if (saved) setCategories(prev => [...prev, saved]);
    } else {
      setCategories(prev => [...prev, { id: Date.now(), name: newCat }]);
    }
    setNewCat('');
    addToast('Category added', 'success');
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      if (window.api) await window.api.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      addToast('Category removed', 'warning');
    }
  };

  // Expense Category Management
  const handleAddExpCategory = async () => {
    if (!newExpCat.trim()) return;
    if (window.api) {
      const saved = await window.api.saveExpenseCategory({ name: newExpCat });
      if (saved) setExpenseCategories(prev => [...prev, saved]);
    } else {
      setExpenseCategories(prev => [...prev, { id: Date.now(), name: newExpCat }]);
    }
    setNewExpCat('');
    addToast('Expense category added', 'success');
  };

  const handleDeleteExpCategory = async (id) => {
    if (window.confirm("Delete this expense category?")) {
      if (window.api) await window.api.deleteExpenseCategory(id);
      setExpenseCategories(prev => prev.filter(c => c.id !== id));
      addToast('Expense category removed', 'warning');
    }
  };

  // Supplier Management
  const handleAddSupplier = async () => {
    if (!newSup.trim()) return;
    const supData = { name: newSup, phone: '' };
    if (window.api) {
      const saved = await window.api.saveSupplier(supData);
      if (saved) setSuppliers(prev => [...prev, saved]);
    } else {
      setSuppliers(prev => [...prev, { ...supData, id: Date.now() }]);
    }
    setNewSup('');
    addToast('Supplier added', 'success');
  };

  const handleDeleteSupplier = async (id) => {
    if (window.confirm("Delete this supplier?")) {
      if (window.api) await window.api.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      addToast('Supplier removed', 'warning');
    }
  };

  const [pinChange, setPinChange] = useState({ userId: null, newPin: '', confirmPin: '' });

  const handleUpdatePin = async () => {
    if (!pinChange.newPin || pinChange.newPin.length !== 4) {
      addToast('PIN must be 4 digits', 'error');
      return;
    }
    if (pinChange.newPin !== pinChange.confirmPin) {
      addToast('PINs do not match', 'error');
      return;
    }

    if (window.api) {
      const success = await window.api.updatePin({ userId: pinChange.userId, newPin: pinChange.newPin });
      if (success) {
        addToast('Security PIN updated successfully!', 'success');
        setPinChange({ userId: null, newPin: '', confirmPin: '' });
        // Refresh users in context
        const freshUsers = await window.api.getUsers();
        setUsers(freshUsers);
      } else {
        addToast('Failed to update PIN', 'error');
      }
    }
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;
  const labelCls = `text-sm font-medium mb-1.5 block ${dm ? 'text-slate-300' : 'text-slate-700'}`;

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
        addToast('Logo updated successfully!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCls = (enabled) => `relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300'} flex-shrink-0`;
  const thumbCls = (enabled) => `absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : ''}`;

  return (
    <div className="p-6 pb-32">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
        
        {/* 
          ==============================
          LEFT COLUMN: System Preferences 
          ==============================
        */}
        <div className="space-y-6">

          {/* Business Identity */}
          <div className={`${card} p-6`}>
            <h3 className={`font-bold mb-6 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                <Store className="w-4 h-4 text-blue-600" />
              </div>
              Business Identity
            </h3>

            <div className="space-y-6">
              <div className={`flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border ${dm ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-24 h-24 shrink-0 rounded-2xl overflow-hidden border-2 flex items-center justify-center p-2 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <img src={logo} alt="Store Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 w-full sm:w-auto space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Store Name</p>
                  <input
                    className={`w-full px-3 py-2 rounded-lg text-base font-bold border-2 outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'} ${isOwner ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500'}`}
                    value={localSettings.businessName}
                    onChange={e => !isOwner && setLocalSettings({...localSettings, businessName: e.target.value})}
                    placeholder="e.g. Sports Zone"
                    readOnly={isOwner}
                  />
                  {!isOwner && (
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all">
                      <Upload className="w-3.5 h-3.5" /> Change Logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>GST Identification</label><input className={`${inputCls} ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} value={localSettings.businessGstin} onChange={e => !isOwner && setLocalSettings({...localSettings, businessGstin: e.target.value})} readOnly={isOwner} /></div>
                  <div><label className={labelCls}>Official Phone</label><input className={`${inputCls} ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} value={localSettings.businessPhone} onChange={e => !isOwner && setLocalSettings({...localSettings, businessPhone: e.target.value})} readOnly={isOwner} /></div>
                </div>
                <div><label className={labelCls}>Email Address</label><input className={`${inputCls} ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} value={localSettings.businessEmail} onChange={e => !isOwner && setLocalSettings({...localSettings, businessEmail: e.target.value})} readOnly={isOwner} /></div>
                <div><label className={labelCls}>Physical Address</label><textarea className={`${inputCls} resize-none ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} rows={2} value={localSettings.businessAddress} onChange={e => !isOwner && setLocalSettings({...localSettings, businessAddress: e.target.value})} readOnly={isOwner} /></div>
              </div>
            </div>
          </div>

          {/* Tax Configuration */}
          <div className={`${card} p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
               <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 text-sm font-black">₹</div>
               Tax Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>CGST %</label>
                 <input type="number" className={`${inputCls} ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} value={localSettings.cgstRate} onChange={(e) => !isOwner && setLocalSettings({...localSettings, cgstRate: e.target.value})} readOnly={isOwner} />
              </div>
              <div><label className={labelCls}>SGST %</label>
                 <input type="number" className={`${inputCls} ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} value={localSettings.sgstRate} onChange={(e) => !isOwner && setLocalSettings({...localSettings, sgstRate: e.target.value})} readOnly={isOwner} />
              </div>
            </div>
          </div>


          {/* Security & Access */}
          <div className={`${card} p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
               <Shield className="w-4 h-4 text-orange-500" /> Security & Access
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Auto Lock Screen</p>
                  <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Lock cashier session when idle</p>
                </div>
                <button 
                  onClick={() => !isOwner && handleToggle('autoLockEnabled')} 
                  disabled={isOwner} 
                  className={toggleCls(localSettings.autoLockEnabled) + (isOwner ? ' opacity-50 cursor-not-allowed' : '')}
                >
                  <span className={thumbCls(localSettings.autoLockEnabled)} />
                </button>
              </div>

              {localSettings.autoLockEnabled && (
                <div className={`pt-4 border-t flex items-center justify-between ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div>
                    <label className={`font-medium text-sm block mb-1 ${dm ? 'text-white' : 'text-slate-800'}`}>Lock Timeout (mins)</label>
                  </div>
                  <input 
                    type="number" 
                    min="1" 
                    max="60"
                    className={`${inputCls} max-w-[100px] text-center ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`}
                    value={localSettings.autoLockTimeout} 
                    onChange={e => !isOwner && setLocalSettings({...localSettings, autoLockTimeout: parseInt(e.target.value) || 1})}
                    readOnly={isOwner}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Receipt & Printing */}
          <div className={`${card} p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
               <Printer className="w-4 h-4 text-blue-600" /> Receipt & Printing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Printer Engine</label>
                <select className={`${inputCls} ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} value={localSettings.printerType} onChange={e => !isOwner && setLocalSettings({...localSettings, printerType: e.target.value})} disabled={isOwner}>
                  <option>Thermal (80mm)</option>
                  <option>Thermal (58mm)</option>
                  <option>A4 Paper</option>
                  <option>A5 Paper</option>
                </select>
              </div>
              <div><label className={labelCls}>Print Copies</label>
                <input type="number" className={`${inputCls} ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`} min="1" max="5" value={localSettings.printerCopies} onChange={e => !isOwner && setLocalSettings({...localSettings, printerCopies: e.target.value})} readOnly={isOwner} />
              </div>
            </div>
          </div>

          {/* Interface Preferences */}
          <div className={`${card} p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
               <Moon className="w-4 h-4 text-indigo-500" /> Interface Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Dark Theme</p>
                  <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Toggle appearance</p>
                </div>
                <button onClick={() => handleToggle('darkMode')} className={toggleCls(localSettings.darkMode)}><span className={thumbCls(localSettings.darkMode)} /></button>
              </div>

              <div className={`pt-4 border-t flex items-center justify-between ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
                <div>
                  <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Audio Feedback</p>
                  <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Play POS sounds</p>
                </div>
                <button onClick={() => handleToggle('soundEnabled')} className={toggleCls(localSettings.soundEnabled)}><span className={thumbCls(localSettings.soundEnabled)} /></button>
              </div>
            </div>
          </div>


          {/* Cloud Sync */}
          <div className={`${card} p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
               <RefreshCw className="w-4 h-4 text-sky-500" /> Cloud Sync
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Auto Cloud Sync</p>
                <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Automatically push data to cloud every 5 mins</p>
              </div>
              <button disabled={isOwner} onClick={() => !isOwner && handleToggle('autoSync')} className={toggleCls(localSettings.autoSync) + (isOwner ? ' opacity-50 cursor-not-allowed' : '')}>
                <span className={thumbCls(localSettings.autoSync)} />
              </button>
            </div>
          </div>

          {/* Account Security - New Section */}
          <div className={`${card} p-6`}>
            <h3 className={`font-bold mb-6 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
               <Shield className="w-4 h-4 text-blue-500" /> Account Security
            </h3>
            
            <div className="space-y-6">
              {users.filter(u => isOwner ? u.role === 'Owner' : true).map(user => (
                <div key={user.id} className={`p-4 rounded-xl border ${dm ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${user.role === 'Admin' ? 'bg-indigo-600' : user.role === 'Owner' ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>{user.name}</p>
                        <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">{user.role}</p>
                      </div>
                    </div>
                    {pinChange.userId !== user.id ? (
                      <button 
                        onClick={() => setPinChange({ userId: user.id, newPin: '', confirmPin: '' })}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                      >
                        Change PIN
                      </button>
                    ) : (
                      <button 
                        onClick={() => setPinChange({ userId: null, newPin: '', confirmPin: '' })}
                        className={`p-1.5 rounded-lg ${dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-200'} transition-all`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {pinChange.userId === user.id && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">New 4-Digit PIN</label>
                          <input 
                            type="password" 
                            maxLength={4}
                            className={inputCls}
                            value={pinChange.newPin}
                            onChange={e => setPinChange({...pinChange, newPin: e.target.value.replace(/\D/g, '')})}
                            placeholder="****"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Confirm PIN</label>
                          <input 
                            type="password" 
                            maxLength={4}
                            className={inputCls}
                            value={pinChange.confirmPin}
                            onChange={e => setPinChange({...pinChange, confirmPin: e.target.value.replace(/\D/g, '')})}
                            placeholder="****"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdatePin}
                        className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                      >
                        Apply New Security PIN
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* 
          ==============================
          RIGHT COLUMN: Data Management 
          ==============================
        */}
        <div className="space-y-6">

          <div className="space-y-6">
             {/* Inventory Categories */}
             <div className={`${card} p-5 flex flex-col`}>
                <h4 className={`font-bold mb-4 flex items-center gap-2 text-sm ${dm ? 'text-white' : 'text-slate-800'}`}><Box className="w-4 h-4 text-orange-500" /> Inventory Categories</h4>
                {!isOwner && (
                  <div className="flex gap-2 mb-4">
                    <input className={`${inputCls} flex-1 min-w-0`} placeholder="New Category" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                    <button onClick={handleAddCategory} className="px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors font-bold"><Plus className="w-4 h-4" /></button>
                  </div>
                )}
                <div className={`flex flex-col gap-2 max-h-[250px] overflow-y-auto p-3 rounded-lg border ${dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                   {categories.map(c => (
                     <div key={c.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${dm ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 font-medium'}`}>
                       <span>{c.name}</span>
                       {!isOwner && <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X className="w-3.5 h-3.5" /></button>}
                     </div>
                   ))}
                   {categories.length === 0 && <p className="text-xs text-slate-400 italic py-1 text-center">No categories configured</p>}
                </div>
             </div>

             {/* Expense Categories */}
             <div className={`${card} p-5 flex flex-col`}>
                <h4 className={`font-bold mb-4 flex items-center gap-2 text-sm ${dm ? 'text-white' : 'text-slate-800'}`}><Receipt className="w-4 h-4 text-purple-500" /> Expense Categories</h4>
                {!isOwner && (
                  <div className="flex gap-2 mb-4">
                    <input className={`${inputCls} flex-1 min-w-0`} placeholder="New Expense Type" value={newExpCat} onChange={e => setNewExpCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddExpCategory()} />
                    <button onClick={handleAddExpCategory} className="px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors font-bold"><Plus className="w-4 h-4" /></button>
                  </div>
                )}
                <div className={`flex flex-col gap-2 max-h-[250px] overflow-y-auto p-3 rounded-lg border ${dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                   {expenseCategories.map(c => (
                     <div key={c.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${dm ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 font-medium'}`}>
                       <span>{c.name}</span>
                       {!isOwner && <button onClick={() => handleDeleteExpCategory(c.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X className="w-3.5 h-3.5" /></button>}
                     </div>
                   ))}
                   {expenseCategories.length === 0 && <p className="text-xs text-slate-400 italic py-1 text-center">No expense categories</p>}
                </div>
             </div>

             {/* Suppliers */}
             <div className={`${card} p-5 flex flex-col`}>
                <h4 className={`font-bold mb-4 flex items-center gap-2 text-sm ${dm ? 'text-white' : 'text-slate-800'}`}><Truck className="w-4 h-4 text-green-500" /> Authorized Suppliers</h4>
                {!isOwner && (
                  <div className="flex gap-2 mb-4">
                    <input className={`${inputCls} flex-1 min-w-0`} placeholder="New Supplier Name" value={newSup} onChange={e => setNewSup(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSupplier()} />
                    <button onClick={handleAddSupplier} className="px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors font-bold"><Plus className="w-4 h-4" /></button>
                  </div>
                )}
                <div className={`flex flex-col gap-2 max-h-[300px] overflow-y-auto p-3 rounded-lg border ${dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                   {suppliers.map(s => (
                     <div key={s.id} className={`flex items-center justify-between text-xs px-3 py-2.5 rounded-lg border ${dm ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700 font-medium shadow-sm'}`}>
                       <span>{s.name}</span>
                       {!isOwner && <button onClick={() => handleDeleteSupplier(s.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>}
                     </div>
                   ))}
                   {suppliers.length === 0 && <p className="text-xs text-slate-400 italic py-1 text-center">No suppliers configured</p>}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className={`fixed bottom-0 left-0 right-0 lg:ml-64 border-t z-20 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.07)] ${dm ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-end gap-3">
          <button
            onClick={() => setCurrentUser(null)}
            style={{ minWidth: '160px', height: '44px' }}
            className={`shrink-0 px-5 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap border-2 ${dm ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'} shadow-sm`}
          >
            <LogOut className="w-4 h-4 shrink-0" /> Sign Out
          </button>
          {!isOwner && (
            <button
              onClick={save}
              style={{ minWidth: '160px', height: '44px' }}
              className="shrink-0 px-5 inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 active:scale-95 whitespace-nowrap"
            >
              <Save className="w-4 h-4 shrink-0" /> Save Preferences
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

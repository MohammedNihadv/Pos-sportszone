import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Store, Printer, Shield, RefreshCw, Moon, Sun, Upload, Eye, EyeOff, Plus, Trash2, Tag, Users, LogOut, Volume2 } from 'lucide-react';

export default function Settings() {
  const ctx = useApp();
  const { 
    darkMode, setDarkMode, addToast, logo, setLogo, 
    updateAdminPin, 
    users, setUsers, 
    setCurrentUser, 
    appSettings, saveAppSettings,
    categories: ctxCategories, setCategories: setCtxCategories,
    expenseCategories: ctxExpCategories, setExpenseCategories: setCtxExpCategories,
    suppliers: ctxSuppliers, setSuppliers: setCtxSuppliers
  } = ctx;

  const [localSettings, setLocalSettings] = useState(appSettings);
  const [newCat, setNewCat] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [newSup, setNewSup] = useState({ name: '', phone: '' });
  const [selectedRoleForPin, setSelectedRoleForPin] = useState('Admin');
  const [pinForm, setPinForm] = useState({ current: '', new: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const dm = darkMode;

  // Keep local settings in sync with global appSettings
  useEffect(() => {
    setLocalSettings(appSettings);
  }, [appSettings]);

  const handleAddCategory = async () => {
    if (!newCat.trim() || !window.api) return;
    const saved = await window.api.saveCategory({ name: newCat });
    setCtxCategories(prev => [...prev, saved]);
    setNewCat('');
    addToast('Category added!', 'success');
  };

  const handleDeleteCategory = async (id) => {
    if (!window.api) return;
    await window.api.deleteCategory(id);
    setCtxCategories(prev => prev.filter(c => c.id !== id));
    addToast('Category removed', 'warning');
  };

  const handleAddExpCategory = async () => {
    if (!newExpCat.trim() || !window.api) return;
    const saved = await window.api.saveExpenseCategory({ name: newExpCat });
    setCtxExpCategories(prev => [...prev, saved]);
    setNewExpCat('');
    addToast('Expense category added!', 'success');
  };

  const handleDeleteExpCategory = async (id) => {
    if (!window.api) return;
    await window.api.deleteExpenseCategory(id);
    setCtxExpCategories(prev => prev.filter(c => c.id !== id));
    addToast('Expense category removed', 'warning');
  };

  const handleAddSupplier = async () => {
    if (!newSup.name.trim() || !window.api) return;
    const saved = await window.api.saveSupplier(newSup);
    setCtxSuppliers(prev => [...prev, saved]);
    setNewSup({ name: '', phone: '' });
    addToast('Supplier added!', 'success');
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.api) return;
    await window.api.deleteSupplier(id);
    setCtxSuppliers(prev => prev.filter(s => s.id !== id));
    addToast('Supplier removed', 'warning');
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;

  const save = async () => {
    await saveAppSettings(localSettings);
    addToast('All settings finalized and saved!', 'success');
  };

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`;

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

  const toggleCls = (enabled) => `relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`;
  const thumbCls = (enabled) => `absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : ''}`;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Settings</h2>
          <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>System configuration and preferences</p>
        </div>
        <button onClick={save} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
          Finalize Settings
        </button>
      </div>

      {/* Business Identity */}
      <div className={`${card} p-6`}>
        <h3 className={`font-bold mb-6 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          Business Identity
        </h3>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/20 dark:border-slate-800/50">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border flex items-center justify-center p-2">
              <img src={logo} alt="Store Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center sm:text-left">
              <p className={`text-sm font-bold mb-3 ${dm ? 'text-white' : 'text-slate-900'}`}>Store Branding</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all">
                <Upload className="w-3.5 h-3.5" /> Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Legal Business Name</label><input className={inputCls} value={localSettings.businessName} onChange={e => setLocalSettings({...localSettings, businessName: e.target.value})} /></div>
            <div><label className={labelCls}>GST Identification (GSTIN)</label><input className={inputCls} placeholder="e.g. 29ABCDE1234F1Z5" value={localSettings.businessGstin} onChange={e => setLocalSettings({...localSettings, businessGstin: e.target.value})} /></div>
            <div><label className={labelCls}>Official Phone</label><input className={inputCls} value={localSettings.businessPhone} onChange={e => setLocalSettings({...localSettings, businessPhone: e.target.value})} /></div>
            <div><label className={labelCls}>Email Address</label><input className={inputCls} value={localSettings.businessEmail} onChange={e => setLocalSettings({...localSettings, businessEmail: e.target.value})} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Physical Address</label><textarea className={inputCls + ' resize-none'} rows={2} value={localSettings.businessAddress} onChange={e => setLocalSettings({...localSettings, businessAddress: e.target.value})} /></div>
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
             <input type="number" className={inputCls} value={localSettings.cgstRate} onChange={(e) => setLocalSettings({...localSettings, cgstRate: e.target.value})} />
          </div>
          <div><label className={labelCls}>SGST %</label>
             <input type="number" className={inputCls} value={localSettings.sgstRate} onChange={(e) => setLocalSettings({...localSettings, sgstRate: e.target.value})} />
          </div>
        </div>
        <p className={`mt-3 text-xs italic ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Note: Setting rates to 0 will disable tax calculation at POS.</p>
      </div>

      {/* Printing */}
      <div className={`${card} p-6`}>
        <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}><Printer className="w-4 h-4 text-blue-600" /> Receipt & Printing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Printer Engine</label>
            <select className={inputCls} value={localSettings.printerType} onChange={e => setLocalSettings({...localSettings, printerType: e.target.value})}>
              <option>Thermal (80mm)</option>
              <option>Thermal (58mm)</option>
              <option>A4 Paper</option>
              <option>A5 Paper</option>
            </select>
          </div>
          <div><label className={labelCls}>Print Copies</label>
            <input type="number" className={inputCls} min="1" max="5" value={localSettings.printerCopies} onChange={e => setLocalSettings({...localSettings, printerCopies: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Interface Preferences */}
      <div className={`${card} p-6`}>
        <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}><Moon className="w-4 h-4 text-blue-600" /> Interface Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Dark Theme</p>
              <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Toggle light/dark appearance</p>
            </div>
            <button onClick={() => setLocalSettings({...localSettings, darkMode: !localSettings.darkMode})} className={toggleCls(localSettings.darkMode)}>
              <span className={thumbCls(localSettings.darkMode)} />
            </button>
          </div>

          <div className={`pt-4 border-t ${dm ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between`}>
            <div>
              <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Audio Feedback</p>
              <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Play sounds on POS actions</p>
            </div>
            <button onClick={() => setLocalSettings({...localSettings, soundEnabled: !localSettings.soundEnabled})} className={toggleCls(localSettings.soundEnabled)}>
              <span className={thumbCls(localSettings.soundEnabled)} />
            </button>
          </div>
        </div>
      </div>

      {/* Sync & Security */}
      <div className={`${card} p-6`}>
        <h3 className={`font-bold mb-4 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}><Shield className="w-4 h-4 text-amber-500" /> Sync & Security</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Auto Cloud Sync</p>
              <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Automatically push data to cloud every 5 mins</p>
            </div>
            <button onClick={() => setLocalSettings({...localSettings, autoSync: !localSettings.autoSync})} className={toggleCls(localSettings.autoSync)}>
              <span className={thumbCls(localSettings.autoSync)} />
            </button>
          </div>

          <div className={`pt-4 border-t ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Auto Lock (Inactivity)</p>
                <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Lock admin session when idle</p>
              </div>
              <button onClick={() => setLocalSettings({...localSettings, autoLockEnabled: !localSettings.autoLockEnabled})} className={toggleCls(localSettings.autoLockEnabled)}>
                <span className={thumbCls(localSettings.autoLockEnabled)} />
              </button>
            </div>
            
            <div className={`flex items-center justify-between transition-opacity ${!localSettings.autoLockEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
               <div>
                  <p className={`text-xs font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Timeout Duration (mins)</p>
               </div>
               <input type="number" min="1" max="60" className={`${inputCls} w-20 text-center py-1.5`} value={localSettings.autoLockTimeout} onChange={e => setLocalSettings({...localSettings, autoLockTimeout: parseInt(e.target.value) || 1})} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4">
        <button onClick={() => setCurrentUser(null)} className={`py-4 flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors ${dm ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
        <button onClick={save} className="py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
          Finalize Settings
        </button>
      </div>
    </div>
  );
}

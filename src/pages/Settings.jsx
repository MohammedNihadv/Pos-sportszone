import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Store, Printer, Shield, RefreshCw, Moon, Sun, Upload, Eye, EyeOff, Plus, Trash2, Tag, Users, LogOut } from 'lucide-react';

export default function Settings() {
  const ctx = useApp();
  const { darkMode, setDarkMode, addToast, logo, setLogo, adminPin, updateAdminPin, autoLockEnabled, setAutoLockEnabled, autoLockTimeout, setAutoLockTimeout, soundEnabled, setSoundEnabled, users, setUsers, setCurrentUser } = ctx;
  const [categories, setCategories] = useState(ctx.categories || []);
  const [expenseCategories, setExpenseCategories] = useState(ctx.expenseCategories || []);
  const [suppliers, setSuppliers] = useState(ctx.suppliers || []);
  const [newCat, setNewCat] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [newSup, setNewSup] = useState({ name: '', phone: '' });
  const [selectedRoleForPin, setSelectedRoleForPin] = useState('Admin');
  const [pinForm, setPinForm] = useState({ current: '', new: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tax, setTax] = useState({ cgst: localStorage.getItem('sz_cgst') || '9', sgst: localStorage.getItem('sz_sgst') || '9' });
  const [autoSync, setAutoSync] = useState(localStorage.getItem('sz_autoSync') !== 'false');
  const dm = darkMode;
  
  useEffect(() => {
    async function loadData() {
      if (window.api) {
        try {
          const cats = await window.api.getCategories();
          const exCats = await window.api.getExpenseCategories();
          const sups = await window.api.getSuppliers();
          if (cats?.length) setCategories(cats);
          if (exCats?.length) setExpenseCategories(exCats);
          if (sups?.length) setSuppliers(sups);
        } catch(e) { /* fallback from context already loaded */ }
      }
    }
    loadData();
  }, []);

  const handleAddCategory = async () => {
    if (!newCat.trim() || !window.api) return;
    const saved = await window.api.saveCategory({ name: newCat });
    setCategories(prev => [...prev, saved]);
    setNewCat('');
    addToast('Category added!', 'success');
  };

  const handleDeleteCategory = async (id) => {
    if (!window.api) return;
    await window.api.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
    addToast('Category removed', 'warning');
  };

  const handleAddExpCategory = async () => {
    if (!newExpCat.trim() || !window.api) return;
    const saved = await window.api.saveExpenseCategory({ name: newExpCat });
    setExpenseCategories(prev => [...prev, saved]);
    setNewExpCat('');
    addToast('Expense category added!', 'success');
  };

  const handleDeleteExpCategory = async (id) => {
    if (!window.api) return;
    await window.api.deleteExpenseCategory(id);
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
    addToast('Expense category removed', 'warning');
  };

  const handleAddSupplier = async () => {
    if (!newSup.name.trim() || !window.api) return;
    const saved = await window.api.saveSupplier(newSup);
    setSuppliers(prev => [...prev, saved]);
    setNewSup({ name: '', phone: '' });
    addToast('Supplier added!', 'success');
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.api) return;
    await window.api.deleteSupplier(id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
    addToast('Supplier removed', 'warning');
  };

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;

  const save = () => {
    localStorage.setItem('sz_cgst', tax.cgst);
    localStorage.setItem('sz_sgst', tax.sgst);
    localStorage.setItem('sz_autoSync', autoSync);
    addToast('Settings saved successfully!', 'success');
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

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>Settings</h2>
        <p className={`text-sm mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>System configuration and preferences</p>
      </div>

      {/* Business Info */}
      <div className={`${card} p-6 overflow-hidden relative`}>
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Store className="w-24 h-24" />
        </div>
        
        <h3 className={`font-bold mb-6 flex items-center gap-3 text-lg ${dm ? 'text-white' : 'text-slate-800'}`}>
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          Business Identity
        </h3>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-8 p-6 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/20 dark:border-slate-800/50 relative group">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-yellow-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center p-4 shadow-xl border-4 border-white dark:border-slate-800">
                <img src={logo} alt="Store Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            
            <div className="text-center sm:text-left">
              <p className={`text-base font-bold mb-1 ${dm ? 'text-white' : 'text-slate-900'}`}>Store Branding</p>
              <p className={`text-xs mb-4 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Recommended: 512x512px, Transparent PNG</p>
              
              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                <Upload className="w-4 h-4" /> Change Logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className={labelCls}>Legal Business Name</label><input className={inputCls} defaultValue="Sports Zone" /></div>
            <div><label className={labelCls}>Tax Identification (GSTIN)</label><input className={inputCls} placeholder="22AAAAA0000A1Z5" /></div>
            <div><label className={labelCls}>Official Contact</label><input className={inputCls} placeholder="+91 98765 43210" /></div>
            <div><label className={labelCls}>Email Address</label><input className={inputCls} placeholder="shop@email.com" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Physical Address</label><textarea className={inputCls + ' resize-none'} rows={2} placeholder="Enter full shop address..." /></div>
          </div>
        </div>
      </div>

      {/* Tax Config */}
      <div className={`${card} p-5`}>
        <h3 className={`font-semibold mb-4 ${dm ? 'text-white' : 'text-slate-800'}`}>🧾 Tax Configuration</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>CGST %</label>
             <input type="number" className={inputCls} value={tax.cgst} onChange={(e) => setTax({...tax, cgst: e.target.value})} />
          </div>
          <div><label className={labelCls}>SGST %</label>
             <input type="number" className={inputCls} value={tax.sgst} onChange={(e) => setTax({...tax, sgst: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Printing */}
      <div className={`${card} p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}><Printer className="w-4 h-4 text-blue-600" /> Receipt Settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Printer Type</label>
            <select className={inputCls}><option>Thermal (80mm)</option><option>A4</option><option>A5</option></select>
          </div>
          <div><label className={labelCls}>Copies</label><input type="number" className={inputCls} defaultValue="1" min="1" max="5" /></div>
        </div>
      </div>

      {/* Security */}
      <div className={`${card} p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}><Shield className="w-4 h-4 text-blue-600" /> Security Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Select User</label>
              <select className={inputCls} value={selectedRoleForPin} onChange={e => setSelectedRoleForPin(e.target.value)}>
                {users.map(u => <option key={u.role} value={u.role}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Current PIN</label>
              <input type={showCurrent ? 'text' : 'password'} maxLength={4} className={inputCls + ' pr-10'} value={pinForm.current} onChange={e => setPinForm(p => ({...p, current: e.target.value}))} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 bottom-2.5 text-slate-400 hover:text-blue-500">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <label className={labelCls}>New 4-Digit PIN</label>
              <input type={showNew ? 'text' : 'password'} maxLength={4} className={inputCls + ' pr-10'} value={pinForm.new} onChange={e => setPinForm(p => ({...p, new: e.target.value}))} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 bottom-2.5 text-slate-400 hover:text-blue-500">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <label className={labelCls}>Confirm New PIN</label>
              <input type={showConfirm ? 'text' : 'password'} maxLength={4} className={inputCls + ' pr-10'} value={pinForm.confirm} onChange={e => setPinForm(p => ({...p, confirm: e.target.value}))} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 bottom-2.5 text-slate-400 hover:text-blue-500">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button 
            disabled={pinForm.new.length !== 4 || pinForm.new !== pinForm.confirm || !pinForm.current}
            onClick={() => {
              const targetUser = users.find(u => u.role === selectedRoleForPin);
              if (pinForm.current !== targetUser.pin) { addToast('Incorrect current PIN', 'error'); return; }
              const updatedUsers = users.map(u => u.role === selectedRoleForPin ? { ...u, pin: pinForm.new } : u);
              setUsers(updatedUsers);
              localStorage.setItem('sz_users', JSON.stringify(updatedUsers));
              if (selectedRoleForPin === 'Admin') updateAdminPin(pinForm.new);
              
              setPinForm({ current: '', new: '', confirm: '' });
              addToast(`${selectedRoleForPin} PIN updated successfully!`, 'success');
            }}
            className="w-full py-2 bg-slate-800 text-white dark:bg-slate-700 rounded-lg text-xs font-bold hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Update PIN
          </button>

          <div className={`mt-6 pt-6 border-t ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
            <h4 className={`font-semibold mb-3 ${dm ? 'text-white' : 'text-slate-800'}`}>Auto Lock (Inactivity)</h4>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-medium ${dm ? 'text-white' : 'text-slate-800'}`}>Enable Auto Lock</p>
                <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Automatically lock screen when inactive</p>
              </div>
              <button onClick={() => setAutoLockEnabled(!autoLockEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${autoLockEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoLockEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            
            <div className={`flex items-center justify-between transition-opacity ${!autoLockEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
               <div>
                  <p className={`text-sm font-medium ${dm ? 'text-white' : 'text-slate-800'}`}>Timeout Duration</p>
                  <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Minutes before locking</p>
               </div>
               <div className="flex items-center gap-2">
                 <input type="number" min="1" max="60" className={`${inputCls} w-20 text-center py-1.5`} value={autoLockTimeout || ''} onChange={e => {
                   let val = parseInt(e.target.value);
                   if (isNaN(val)) val = 1;
                   if (val > 120) val = 120;
                   setAutoLockTimeout(val);
                 }} />
                 <span className={`text-xs font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>mins</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className={`${card} p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}><Moon className="w-4 h-4 text-blue-600" /> Appearance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Dark Mode</p>
              <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Toggle between light and dark themes</p>
            </div>
            <button onClick={() => setDarkMode(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${dm ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dm ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className={`pt-4 border-t ${dm ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between`}>
            <div>
              <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>UI Sounds</p>
              <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Play subtle sounds on clicks and actions</p>
            </div>
            <button onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${soundEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>
      </div>



      {/* Master Data Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Product Categories */}
        <div className={`${card} p-5`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}><Tag className="w-4 h-4 text-blue-600" /> Product Categories</h3>
          <div className="flex gap-2 mb-4">
            <input 
              className={inputCls} placeholder="New Category..." 
              value={newCat} onChange={e => setNewCat(e.target.value)} 
            />
            <button onClick={handleAddCategory} className="px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {categories.map(c => (
              <div key={c.id} className={`flex justify-between items-center px-3 py-2 rounded-xl text-sm ${dm ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                {c.name}
                <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className={`${card} p-5`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}><Tag className="w-4 h-4 text-orange-500" /> Expense Categories</h3>
          <div className="flex gap-2 mb-4">
            <input 
              className={inputCls} placeholder="New Expense Cat..." 
              value={newExpCat} onChange={e => setNewExpCat(e.target.value)} 
            />
            <button onClick={handleAddExpCategory} className="px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {expenseCategories.map(c => (
              <div key={c.id} className={`flex justify-between items-center px-3 py-2 rounded-xl text-sm ${dm ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                {c.name}
                <button onClick={() => handleDeleteExpCategory(c.id)} className="text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Suppliers */}
        <div className={`${card} p-5 col-span-1 md:col-span-2`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}><Users className="w-4 h-4 text-blue-600" /> Suppliers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input 
              className={inputCls} placeholder="Supplier Name..." 
              value={newSup.name} onChange={e => setNewSup(p => ({...p, name: e.target.value}))} 
            />
            <input 
              className={inputCls} placeholder="Phone..." 
              value={newSup.phone} onChange={e => setNewSup(p => ({...p, phone: e.target.value}))} 
            />
            <button onClick={handleAddSupplier} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> ADD SUPPLIER
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
            {suppliers.map(s => (
              <div key={s.id} className={`flex justify-between items-start p-3 rounded-xl border text-sm ${dm ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs opacity-70">{s.phone || 'No Phone'}</p>
                </div>
                <button onClick={() => handleDeleteSupplier(s.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Sync */}
      <div className={`${card} p-5 col-span-1 md:col-span-2`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-800'}`}><RefreshCw className="w-4 h-4 text-blue-600" /> Sync & Backup</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-medium text-sm ${dm ? 'text-white' : 'text-slate-800'}`}>Auto Sync</p>
            <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Sync data to cloud when online</p>
          </div>
          <button 
            onClick={() => setAutoSync(!autoSync)} 
            className={`relative w-12 h-6 rounded-full transition-colors ${autoSync ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoSync ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setCurrentUser(null)} className={`py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-colors ${dm ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
        <button onClick={save} className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
          Save Settings
        </button>
      </div>
    </div>
  );
}

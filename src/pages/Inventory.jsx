import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, RefreshCw, Lock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/sounds';

function ProductModal({ product, onClose, onSave, dm, categories, setCategories, addToast, showFinancials, PRODUCT_ICONS_CATEGORIZED }) {
  const [form, setForm] = useState(product || { name: '', sku: '', barcode: '', category: categories[0]?.name || 'Jerseys', stock: '', cost: '', price: '', emoji: '📦' });
  const isNew = !product;
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCategoryChange = async (e) => {
    const val = e.target.value;
    if (val === '###NEW###') {
      setIsAddingNew(true);
      setNewName('');
    } else {
      setForm(p => ({ ...p, category: val }));
    }
  };

  const confirmNewCategory = async () => {
    if (!newName.trim()) {
      setIsAddingNew(false);
      return;
    }
    const newCat = { name: newName.trim() };
    if (window.api) {
      const saved = await window.api.saveCategory(newCat);
      if (saved && saved.error) {
        addToast(saved.error, 'error');
        return;
      }
      setCategories(prev => [...prev, saved]);
    } else {
      setCategories(prev => [...prev, { ...newCat, id: Date.now() }]);
    }
    setForm(p => ({ ...p, category: newCat.name }));
    setIsAddingNew(false);
    addToast(`Category ${newCat.name} added`, 'success');
  };

  const handleSave = () => {
    if (!form.name) return addToast('Please enter product name', 'error');
    if (!form.sku) return addToast('Please enter product SKU', 'error');
    if (!form.price) return addToast('Please enter selling price', 'error');

    onSave({
      ...form,
      emoji: form.emoji || '📦',
      stock: parseInt(form.stock || 0),
      cost: parseFloat(form.cost || 0),
      price: parseFloat(form.price || 0)
    });
    onClose();
  };

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800'}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-1 block ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div onMouseDown={e => e.stopPropagation()} className={`w-full max-w-[480px] mx-4 rounded-2xl shadow-2xl overflow-hidden animate-scale-up ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add New Product' : 'Edit Product'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Product Name *</label>
            <input className={inputCls} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Jersey 5 Collar" />
          </div>
          <div>
            <label className={labelCls}>SKU *</label>
            <input className={inputCls} value={form.sku || ''} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="JR001" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            {isAddingNew ? (
              <div className="flex gap-1.5">
                <input 
                  autoFocus
                  className={inputCls} 
                  placeholder="New..." 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmNewCategory()}
                />
                <button onClick={confirmNewCategory} className="px-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">Add</button>
                <button onClick={() => setIsAddingNew(false)} className="px-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <select className={inputCls} value={form.category} onChange={handleCategoryChange}>
                <option value="" disabled>-- Select Category --</option>
                <option value="###NEW###">— Add New Category —</option>
                {(categories || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div><label className={labelCls}>Stock Qty</label><input type="number" className={inputCls} value={form.stock || ''} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} placeholder="0" /></div>
          {showFinancials && <div><label className={labelCls}>Cost (₹)</label><input type="number" className={inputCls} value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0" /></div>}
          <div className={showFinancials ? "" : "col-span-2"}><label className={labelCls}>Price (₹) *</label><input type="number" className={inputCls} value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" /></div>
          
          <div className="col-span-2">
            <label className={labelCls}>Product Icon</label>
            <div className={`rounded-xl border max-h-[140px] overflow-y-auto ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <div className="p-3 space-y-4">
                {(PRODUCT_ICONS_CATEGORIZED || []).map(group => (
                  <div key={group.category} className="relative">
                    <div className={`sticky top-[-13px] z-10 py-1 mb-2 ${dm ? 'bg-[#182333]' : 'bg-[#f8fafc]'}`}>
                      <p className={`text-[9px] font-bold uppercase tracking-wider px-1 ${dm ? 'text-blue-400' : 'text-blue-600'}`}>
                        {group.category}
                      </p>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 px-0.5">
                      {group.icons.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            playSound('tap');
                            setForm(p => ({ ...p, emoji: icon }));
                          }}
                          className={`aspect-square flex items-center justify-center text-lg rounded-lg transition-all duration-200 ${form.emoji === icon ? 'bg-blue-600 shadow-md scale-105 text-white z-20' : (dm ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white shadow-sm border border-transparent hover:border-slate-200 text-slate-600')}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={`flex gap-2 px-5 pb-5 pt-1.5`}>
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md active:scale-95">
            {isNew ? 'Add Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { darkMode, addToast, products, setProducts, categories, setCategories, isOwner, isAdminUnlocked, refreshProducts, PRODUCT_ICONS_CATEGORIZED } = useApp();
  const dm = darkMode;
  const showFinancials = isAdminUnlocked || isOwner;
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const searchRef = useRef(null);

  // Auto-focus search on mount or after modal close/deletion
  // Autofocus search on MOUNT only - do not refocus on data changes
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);


  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().trim().includes(search.toLowerCase().trim()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (product) => {
    if (window.api) {
      try {
        if (product.id) {
          await window.api.saveProduct(product);
          setProducts(prev => prev.map(p => p.id === product.id ? product : p));
          addToast(`${product.name} updated`, 'success');
        } else {
          const saved = await window.api.saveProduct(product);
          setProducts(prev => [...prev, saved]);
          addToast(`${product.name} added to inventory`, 'success');
        }
      } catch (err) {
        console.error('Save failed:', err);
        const msg = err.message || 'Unknown Error';
        addToast(`Save Failed: ${msg}`, 'error');
        
      }
    } else {
      if (product.id) {
        setProducts(prev => prev.map(p => p.id === product.id ? product : p));
        addToast(`${product.name} updated`, 'success');
      } else {
        const saved = { ...product, id: Date.now() };
        setProducts(prev => [...prev, saved]);
        addToast(`${product.name} added to inventory`, 'success');
      }
    }
    // Refocus after save
    if (searchRef.current) searchRef.current.focus();
  };

  const handleDelete = (id, name) => {
    setConfirmDelete({ id, name });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);

    if (window.api) {
      await window.api.deleteProduct(id);
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    addToast(`${name} deleted`, 'warning');
    
    // Refocus after delete
    setTimeout(() => {
      if (searchRef.current) searchRef.current.focus();
    }, 150);
  };

  const totalValue = products.reduce((s, p) => s + (p.stock * p.cost), 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left font-medium text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Inventory</h2>
          <p className={`text-sm mt-1.5 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Sports Zone — {products.length} products across {categories.length} categories</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOwner && (
            <button
              onClick={async () => {
                playSound('click');
                await refreshProducts();
                addToast('Inventory Refreshed', 'success');
              }}
              className={`p-2.5 rounded-xl border transition-colors ${dm ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              title="Force Sync"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {isAdminUnlocked && (
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={`${card} p-4`}>
          <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Products</p>
          <p className={`text-3xl font-bold mt-1 ${dm ? 'text-white' : 'text-slate-800'}`}>{products.length}</p>
        </div>
        <div className={`${card} p-4`}>
          <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Stock Value</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{showFinancials ? `₹${totalValue.toLocaleString()}` : '₹ ***'}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${lowStockCount > 0 ? (dm ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200') : (dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100')}`}>
          <p className={`text-xs font-medium flex items-center gap-1.5 ${lowStockCount > 0 ? 'text-red-600' : (dm ? 'text-slate-400' : 'text-slate-500')}`}>
            {lowStockCount > 0 && <AlertTriangle className="w-3.5 h-3.5" />} Low Stock (&lt;5)
          </p>
          <p className={`text-3xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-600' : (dm ? 'text-white' : 'text-slate-800')}`}>{lowStockCount}</p>
        </div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input
            ref={searchRef}
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or category..."
            className={`flex-1 text-sm outline-none bg-transparent ${dm ? 'text-white placeholder-slate-500' : 'text-slate-800'}`}
          />
          {search && <button onClick={() => setSearch('')} className="text-slate-400"><X className="w-4 h-4" /></button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`border-b sticky top-0 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>SKU</th>
                <th className={th}>Category</th>
                <th className={th + ' text-center'}>Stock</th>
                <th className={th + ' text-right'}>Cost</th>
                <th className={th + ' text-right'}>Price</th>
                <th className={th + ' text-right'}>Margin</th>
                <th className={th + ' text-right'}>Value</th>
                {isAdminUnlocked && <th className={th + ' text-center'}>Actions</th>}
              </tr>
            </thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {(filtered || []).map(p => {
                const margin = p.cost > 0 ? (((p.price - p.cost) / p.cost) * 100).toFixed(0) : 0;
                return (
                  <tr key={p.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3.5 font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>{p.emoji} {p.name}</td>
                    <td className="px-4 py-3.5"><p className={`font-mono text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{p.sku}</p></td>
                    <td className="px-4 py-3.5"><span className={`text-xs px-2 py-0.5 rounded-md font-medium ${dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{p.category}</span></td>
                    <td className="px-4 py-3.5 text-center"><span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-bold ${p.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{p.stock < 5 && <AlertTriangle className="w-3 h-3" />}{p.stock}</span></td>
                    <td className={`px-4 py-3.5 text-right text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{showFinancials ? `₹${p.cost}` : '🔒'}</td>
                    <td className={`px-4 py-3.5 text-right font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{p.price}</td>
                    <td className="px-4 py-3.5 text-right"><span className="text-xs font-bold text-green-600">{showFinancials ? `${margin}%` : '***'}</span></td>
                    <td className="px-4 py-3.5 text-right font-semibold text-blue-600">{showFinancials ? `₹${(p.stock * p.cost).toLocaleString()}` : '***'}</td>
                    {isAdminUnlocked && (
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal(p)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className={`py-16 text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>

      {(modal === 'new' || (modal && modal.id)) && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => {
            setModal(null);
            setTimeout(() => searchRef.current?.focus(), 50);
          }}
          onSave={handleSave}
          dm={dm}
          categories={categories}
          setCategories={setCategories}
          addToast={addToast}
          showFinancials={showFinancials}
          PRODUCT_ICONS_CATEGORIZED={PRODUCT_ICONS_CATEGORIZED}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          isOpen={!!confirmDelete}
          title="Delete Product"
          message={`Are you sure you want to delete ${confirmDelete.name}? This will remove it from inventory permanently.`}
          onConfirm={executeDelete}
          onCancel={() => {
            setConfirmDelete(null);
            setTimeout(() => searchRef.current?.focus(), 100);
          }}
          dm={dm}
        />
      )}
    </div>
  );
}

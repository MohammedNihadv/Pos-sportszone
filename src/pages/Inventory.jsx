import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/sounds';

// --- Products are now managed via SQLite ---


function ProductModal({ product, onClose, onSave, dm, categories, setCategories, addToast, showFinancials }) {
  const [form, setForm] = useState(product || { name: '', sku: '', category: categories[0]?.name || 'Jerseys', stock: '', cost: '', price: '', emoji: '👕' });
  const isNew = !product;

  const handleCategoryChange = async (e) => {
    const val = e.target.value;
    if (val === '###NEW###') {
      const newName = window.prompt('Enter new category name:');
      if (newName?.trim()) {
        const newCat = { name: newName.trim() };
        if (window.api) {
          const saved = await window.api.saveCategory(newCat);
          setCategories(prev => [...prev, saved]);
        } else {
          setCategories(prev => [...prev, { ...newCat, id: Date.now() }]);
        }
        setForm(p => ({ ...p, category: newCat.name }));
        addToast(`Category ${newCat.name} added`, 'success');
      } else {
        setForm(p => ({ ...p, category: categories[0]?.name || 'Jerseys' }));
      }
    } else {
      setForm(p => ({ ...p, category: val }));
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-800'}`}>{isNew ? 'Add New Product' : 'Edit Product'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={labelCls}>Product Name *</label><input className={inputCls} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g., Jersey 5 Collar" /></div>
          <div><label className={labelCls}>SKU *</label><input className={inputCls} value={form.sku} onChange={e => setForm(p => ({...p, sku: e.target.value}))} placeholder="JR001" /></div>
          <div><label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category} onChange={handleCategoryChange}>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              <option value="###NEW###">— Add New Category —</option>
            </select>
          </div>
          <div><label className={labelCls}>Stock Qty</label><input type="number" className={inputCls} value={form.stock} onChange={e => setForm(p => ({...p, stock: e.target.value}))} placeholder="0" /></div>
          {showFinancials && <div><label className={labelCls}>Cost Price (₹)</label><input type="number" className={inputCls} value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} placeholder="0" /></div>}
          <div><label className={labelCls}>Selling Price (₹) *</label><input type="number" className={inputCls} value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} placeholder="0" /></div>
          
          <div className="col-span-2 mt-2">
            <label className={labelCls}>Product Icon</label>
            <div className="flex flex-wrap gap-2">
              {['👕','👟','🩳','🧢','🏐','⚽','🏀','🏏','🎾','🏅','🎒','⌚','🛡️','🏋️'].map(em => (
                <button
                  key={em}
                  onClick={() => setForm(p => ({ ...p, emoji: em }))}
                  className={`w-10 h-10 text-xl flex items-center justify-center rounded-xl border transition-all hover:scale-105
                    ${form.emoji === em ? 'bg-blue-50 border-blue-500 shadow-sm scale-110' : (dm ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200 hover:bg-slate-100')}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={`flex gap-3 px-5 pb-5`}>
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            {isNew ? 'Add Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { darkMode, addToast, products, setProducts, categories, setCategories, isOwner, isAdminUnlocked, refreshProducts } = useApp();
  const dm = darkMode;
  const showFinancials = isOwner || isAdminUnlocked;
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (product) => {
    if (window.api) {
      if (product.id) {
        await window.api.saveProduct(product);
        setProducts(prev => prev.map(p => p.id === product.id ? product : p));
        addToast(`${product.name} updated`, 'success');
      } else {
        const saved = await window.api.saveProduct(product);
        setProducts(prev => [...prev, saved]);
        addToast(`${product.name} added to inventory`, 'success');
      }
    } else {
      // Browser-only fallback
      if (product.id) {
        setProducts(prev => prev.map(p => p.id === product.id ? product : p));
        addToast(`${product.name} updated`, 'success');
      } else {
        const saved = { ...product, id: Date.now() };
        setProducts(prev => [...prev, saved]);
        addToast(`${product.name} added to inventory`, 'success');
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.api) {
      await window.api.deleteProduct(id);
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    addToast(`${name} deleted`, 'warning');
  };

  const totalValue = products.reduce((s, p) => s + (p.stock * p.cost), 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-4 py-3 text-left font-medium text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {/* Title row */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Inventory</h2>
          <p className={`text-sm mt-1.5 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Sports Zone — {products.length} products across 7 categories</p>
        </div>
        <div className="flex items-center gap-2">
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
          {!isOwner && showFinancials && (
            <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
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

      {/* Table */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input
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
                {!isOwner && showFinancials && <th className={th + ' text-center'}>Actions</th>}
              </tr>
            </thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {filtered.map(p => {
                const margin = p.cost > 0 ? (((p.price - p.cost) / p.cost) * 100).toFixed(0) : 0;
                return (
                  <tr key={p.id} className={`transition-colors ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3.5 font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>{p.name}</td>
                    <td className="px-4 py-3.5">
                      <p className={`font-mono text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{p.sku}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{p.category}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-bold
                        ${p.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {p.stock < 5 && <AlertTriangle className="w-3 h-3" />}
                        {p.stock}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-right text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{showFinancials ? `₹${p.cost}` : '🔒'}</td>
                    <td className={`px-4 py-3.5 text-right font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>₹{p.price}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs font-bold text-green-600">{showFinancials ? `${margin}%` : '***'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-blue-600">{showFinancials ? `₹${(p.stock * p.cost).toLocaleString()}` : '***'}</td>
                    {!isOwner && showFinancials && (
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
          onClose={() => setModal(null)}
          onSave={handleSave}
          dm={dm}
          categories={categories}
          setCategories={setCategories}
          addToast={addToast}
          showFinancials={showFinancials}
        />
      )}
    </div>
  );
}

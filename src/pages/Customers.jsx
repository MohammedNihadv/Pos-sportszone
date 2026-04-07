import { useState } from 'react';
import { Plus, Search, Phone, Mail, Edit, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/sounds';

export default function Customers() {
  const { customers, setCustomers, darkMode, addToast, isOwner } = useApp();
  const dm = darkMode;
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const card = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-50'}`;
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all ${dm ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`;

  // Safe checks since context could be empty
  const safeCustomers = customers || [];
  const filtered = safeCustomers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const openModal = (customer = null) => {
    playSound('tap');
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ name: customer.name, phone: customer.phone, email: customer.email });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    playSound('tap');
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      addToast('Name and phone are required', 'warning');
      return;
    }
    
    if (editingCustomer) {
      setCustomers(safeCustomers.map(c => c.id === editingCustomer.id ? { ...c, ...formData } : c));
      addToast('Customer updated successfully!', 'success');
    } else {
      const newCustomer = {
        id: Date.now(),
        ...formData,
        orders: 0,
        total: 0,
        lastOrder: '-'
      };
      setCustomers([...safeCustomers, newCustomer]);
      addToast('Customer added successfully!', 'success');
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      playSound('error');
      setCustomers(safeCustomers.filter(c => c.id !== id));
      addToast('Customer deleted', 'info');
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Customers</h2>
          <p className={`text-sm mt-1.5 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Customer database and purchase history</p>
        </div>
        {!isOwner && (
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: safeCustomers.length, fmt: 'num' },
          { label: 'Total Revenue', value: safeCustomers.reduce((s,c)=>s+(c.total||0),0), fmt: 'curr' },
          { label: 'Avg. Order Value', value: safeCustomers.length ? Math.round(safeCustomers.reduce((s,c)=>s+(c.total||0),0) / Math.max(1, safeCustomers.reduce((s,c)=>s+(c.orders||0),0))) : 0, fmt: 'curr' },
        ].map(s => (
          <div key={s.label} className={`${card} p-4`}>
            <p className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${dm ? 'text-white' : 'text-slate-800'}`}>{s.fmt === 'curr' ? `₹${s.value.toLocaleString()}` : s.value}</p>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone..."
            className={`flex-1 text-sm outline-none bg-transparent ${dm ? 'text-white placeholder-slate-500' : 'text-slate-800'}`} />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead><tr className={`border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <th className={th}>Name</th>
              <th className={th}>Contact</th>
              <th className={th + ' text-right'}>Orders</th>
              <th className={th + ' text-right'}>Total Spent</th>
              <th className={th}>Last Order</th>
              {!isOwner && <th className={th + ' text-right'}>Actions</th>}
            </tr></thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-5 py-8 text-center text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                    No customers found matching "{search}"
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className={`transition-colors ${dm ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={`text-xs space-y-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-blue-500" />{c.phone}</div>
                      {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-emerald-500" />{c.email}</div>}
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{c.orders || 0}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-green-600">₹{(c.total || 0).toLocaleString()}</td>
                  <td className={`px-5 py-3.5 text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{c.lastOrder || '-'}</td>
                  {!isOwner && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal(c)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl ${dm ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={closeModal} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Full Name *</label>
                <input 
                  required
                  autoFocus
                  placeholder="e.g. John Doe"
                  className={inputCls} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Phone Number *</label>
                <input 
                  required
                  placeholder="e.g. +91 9876543210"
                  className={inputCls} 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Email Address (Optional)</label>
                <input 
                  type="email"
                  placeholder="e.g. john@email.com"
                  className={inputCls} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${dm ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

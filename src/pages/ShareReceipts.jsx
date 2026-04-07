import { useState, useMemo } from 'react';
import { Search, Download, MessageCircle, FileText, Calendar, X, Eye, Copy, Check, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playSound } from '../utils/sounds';

export default function ShareReceipts() {
  const { darkMode, sales, addToast, appSettings } = useApp();
  const dm = darkMode;
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [previewSale, setPreviewSale] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [copying, setCopying] = useState(false);

  const filteredSales = useMemo(() => {
    return (sales || []).filter(s => {
      const searchLower = search.toLowerCase();
      const invMatch = `INV-${s.id}`.toLowerCase().includes(searchLower);
      const customerMatch = (s.creditCustomer || '').toLowerCase().includes(searchLower);
      const dateStr = new Date(s.date || s.created_at).toISOString().split('T')[0];
      const dateMatch = !dateFilter || dateStr === dateFilter;
      return (invMatch || customerMatch) && dateMatch;
    }).sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  }, [sales, search, dateFilter]);

  const handleDownload = async (sale) => {
    playSound('click');
    if (window.api?.downloadReceipt) {
      await window.api.downloadReceipt(sale);
      addToast(`Receipt for INV-${sale.id} downloaded`, 'success');
    } else {
      addToast('Download not available in browser mode', 'warning');
    }
  };

  const handleView = async (sale) => {
    playSound('pop');
    setPreviewSale(sale);
    if (window.api?.getReceiptPreview) {
      const url = await window.api.getReceiptPreview(sale);
      setPreviewUrl(url);
    } else {
      addToast('Receipt preview is only available in the Desktop App', 'warning');
      setTimeout(() => setPreviewSale(null), 1500);
    }
  };

  const copyImage = async () => {
    if (previewUrl && window.api?.copyToClipboard) {
      setCopying(true);
      await window.api.copyToClipboard(previewUrl);
      addToast('Receipt image copied to clipboard!', 'success');
      setTimeout(() => setCopying(false), 2000);
    }
  };

  const handleWhatsApp = async (sale) => {
    playSound('pop');
    const phone = prompt("Enter Customer WhatsApp Number (e.g. 9876543210):");
    if (!phone || phone.length < 10) return;

    if (window.api?.getReceiptPreview && window.api?.copyToClipboard) {
      const url = await window.api.getReceiptPreview(sale);
      await window.api.copyToClipboard(url);
      addToast('Receipt copied! You can PASTE (Ctrl+V) it in WhatsApp.', 'info');
    }

    const now = new Date(sale.date || sale.created_at || new Date());
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // We import useApp so we can read appSettings, but ShareReceipts already pulled appSettings inside useApp? No, let's pull appSettings.
    // Wait, ShareReceipts didn't destruct appSettings from useApp previously!
    // I need to add appSettings to the destructuring.
    // I'll assume they will be included below.
    const cgstPct = parseFloat(appSettings?.cgstRate) || 0;
    const sgstPct = parseFloat(appSettings?.sgstRate) || 0;
    const taxPct = cgstPct + sgstPct;
    const grandTotal = sale.total || 0;
    const taxableAmount = taxPct > 0 ? grandTotal / (1 + (taxPct / 100)) : grandTotal;
    const gstAmt = grandTotal - taxableAmount;
    
    let msg = `🧾 *${(appSettings?.businessName || 'SPORTS ZONE').toUpperCase()}*\n\n`;
    msg += `Invoice No: #${sale.id || 'NEW'}\n`;
    msg += `Date: ${dateStr}\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;
    msg += `Items:\n`;
    
    (sale.items || []).forEach(item => {
      msg += `• ${item.name} (x${item.qty})        ₹${(item.price * item.qty).toLocaleString()}\n`;
    });
    
    msg += `\n━━━━━━━━━━━━━━━━\n\n`;
    msg += `Subtotal:              ₹${taxableAmount.toFixed(0)}\n`;
    
    if (taxPct > 0) {
      msg += `GST (${taxPct}%):             ₹${gstAmt.toFixed(0)}\n`;
    }
    if (sale.discount > 0) {
      msg += `Discount:            -₹${sale.discount.toFixed(0)}\n`;
    }
    
    msg += `*Total Amount:*        ₹${grandTotal.toLocaleString()}\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;
    
    // sale.paymentMethod could be missing in older records
    const pMode = sale.paymentMethod || sale.payment_method || 'Cash';
    msg += `Payment Mode: ${pMode.toUpperCase()}\n`;
    msg += `Status: ${sale.amountPaid >= grandTotal ? 'Paid ✅' : 'Paid ✅'}\n\n`;
    msg += `Thank you for your purchase! 🙏\n`;
    msg += `We look forward to serving you again.\n\n`;
    msg += `📍 ${appSettings?.businessName || 'Sports Zone'}\n`;
    if (appSettings?.businessPhone) {
      msg += `📞 +91${appSettings.businessPhone.replace('+91', '')}`;
    }
    
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const cardCls = `rounded-2xl border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`;
  const th = `px-6 py-4 text-xs font-semibold uppercase tracking-wide ${dm ? 'text-slate-500' : 'text-slate-400'}`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight flex items-center gap-3 ${dm ? 'text-white' : 'text-slate-900'}`}>
             <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <FileText className="w-6 h-6" />
             </div>
             Share Receipts
          </h2>
          <p className={`text-sm mt-2 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage, download and share digital invoices instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center px-4 py-3 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-blue-500/20 ${dm ? 'bg-slate-900 border-slate-700 focus-within:border-blue-500' : 'bg-white border-slate-200 focus-within:border-blue-400 focus-within:shadow-md'}`}>
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Invoice or Customer..."
              className="bg-transparent outline-none text-sm w-48 sm:w-64"
            />
          </div>
          <div className={`flex items-center px-4 py-3 rounded-2xl border ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Calendar className="w-4 h-4 text-slate-400 mr-3" />
            <input 
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-transparent outline-none text-sm font-medium"
            />
            {dateFilter && <X className="w-4 h-4 ml-2 cursor-pointer text-red-400 hover:text-red-500" onClick={() => setDateFilter('')} />}
          </div>
        </div>
      </div>

      <div className={`${cardCls} overflow-hidden border-none shadow-xl`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`border-b ${dm ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <th className={th}>Date & Time</th>
                <th className={th}>Invoice ID</th>
                <th className={th}>Customer / Type</th>
                <th className={th}>Total Amount</th>
                <th className={th + ' text-center'}>Quick Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dm ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {filteredSales.map(sale => (
                <tr key={sale.id} className={`transition-all ${dm ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/30'}`}>
                  <td className="px-6 py-5">
                    <div className={`font-bold ${dm ? 'text-white' : 'text-slate-800'}`}>
                      {new Date(sale.date || sale.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] font-medium opacity-50 mt-0.5">
                      {new Date(sale.date || sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`font-mono font-bold text-xs px-2 py-1 rounded-lg ${dm ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                      INV-{sale.id}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {sale.creditCustomer ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-amber-600 tabular-nums uppercase text-xs">{sale.creditCustomer}</span>
                        <span className="text-[10px] opacity-60">Credit Sale</span>
                      </div>
                    ) : (
                      <span className="text-xs opacity-60 font-medium italic">Regular Customer</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-base text-blue-600">₹{parseFloat(sale.total).toLocaleString()}</span>
                      <span className="text-[10px] opacity-40">{(sale.items || []).length} items</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button 
                        onClick={() => handleView(sale)}
                        className={`group p-2.5 rounded-xl border transition-all ${dm ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        title="View Receipt"
                      >
                        <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleWhatsApp(sale)}
                        className={`group p-2.5 rounded-xl border transition-all ${dm ? 'border-emerald-800/30 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                        title="Share Invoice"
                      >
                        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleDownload(sale)}
                        className={`group p-2.5 rounded-xl border transition-all ${dm ? 'border-blue-800/30 bg-blue-900/20 text-blue-400 hover:bg-blue-600 hover:text-white' : 'border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                        title="Download PDF"
                      >
                        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr className="animate-pulse">
                  <td colSpan={5} className="px-6 py-32 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className={`font-bold text-xl ${dm ? 'text-slate-400' : 'text-slate-700'}`}>No Invoices Found</p>
                    <p className={`text-sm mt-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Try adjusting your search or date filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {previewSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPreviewSale(null)}></div>
          <div className={`relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 ${dm ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
               <div>
                 <h3 className="font-bold text-xl tracking-tight flex items-center gap-2">
                   Receipt #INV-{previewSale.id}
                   <span className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-full uppercase tracking-widest ml-2">Preview</span>
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">Generated specifically for your printer settings</p>
               </div>
               <button onClick={() => setPreviewSale(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                 <X className="w-5 h-5 text-slate-400" />
               </button>
            </div>
            
            <div className={`flex-1 overflow-y-auto p-8 flex justify-center ${dm ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
               {!previewUrl ? (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Printer className="w-12 h-12 animate-pulse mb-4" />
                    <p className="font-bold text-sm">Rendering Receipt...</p>
                 </div>
               ) : (
                 <img src={previewUrl} className="shadow-2xl rounded-sm border border-slate-200 max-w-full h-auto" />
               )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
               <button 
                 onClick={copyImage}
                 className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${dm ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
               >
                 {copying ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                 {copying ? 'Copied Image' : 'Copy Image'}
               </button>
               <button 
                 onClick={() => handleDownload(previewSale)}
                 className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30"
               >
                 <Download className="w-4 h-4" /> Download PDF
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

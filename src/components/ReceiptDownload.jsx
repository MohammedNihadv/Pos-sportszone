import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

/**
 * ReceiptDownload
 * Renders a hidden 80mm-style receipt and downloads it as a PNG image
 * Props: sale = { total, payments, items, discount, changeAmount, changeReturnMethod }
 */
export function ReceiptDownload({ sale, dm }) {
  const receiptRef = useRef(null);

  const handleDownload = async () => {
    const el = receiptRef.current;
    if (!el) return;

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const now = new Date();
      link.download = `receipt-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now()}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('Receipt download failed:', err);
    }
  };

  const methodLabel = (m) => {
    if (m === 'cash') return 'Cash';
    if (m === 'upi') return 'UPI';
    if (m === 'card') return 'Card';
    return m;
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

  return (
    <div>
      {/* Hidden Receipt Template for html2canvas */}
      <div
        ref={receiptRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '320px',
          backgroundColor: '#ffffff',
          color: '#111111',
          fontFamily: "'Courier New', monospace",
          fontSize: '12px',
          padding: '16px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>SPORTS ZONE</div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Premium Sports Gear</div>
          <div style={{ borderBottom: '1px dashed #999', margin: '8px 0' }} />
          <div style={{ fontSize: '10px', color: '#555' }}>{dateStr} · {timeStr}</div>
          <div style={{ fontSize: '10px', color: '#555' }}>{invoiceNo}</div>
        </div>

        {/* Items */}
        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px', fontSize: '10px', color: '#555' }}>
            <span style={{ flex: 3 }}>ITEM</span>
            <span style={{ flex: 1, textAlign: 'center' }}>QTY</span>
            <span style={{ flex: 2, textAlign: 'right' }}>PRICE</span>
          </div>
          {(sale.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ flex: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              <span style={{ flex: 1, textAlign: 'center' }}>{item.qty}</span>
              <span style={{ flex: 2, textAlign: 'right' }}>₹{(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginBottom: '8px' }}>
          {sale.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Discount</span>
              <span>-₹{sale.discount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', borderTop: '1px dashed #999', paddingTop: '8px', marginTop: '4px' }}>
            <span>TOTAL</span>
            <span>₹{sale.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payments */}
        <div style={{ borderBottom: '1px dashed #999', paddingBottom: '8px', marginBottom: '8px' }}>
          {(sale.payments || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
              <span>{methodLabel(p.method)}</span>
              <span>₹{p.amount.toLocaleString()}</span>
            </div>
          ))}
          {sale.changeAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
              <span>Change ({sale.changeReturnMethod === 'store-upi' ? 'UPI' : 'Cash'})</span>
              <span>₹{sale.changeAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#888' }}>
          <div>Thank you for shopping!</div>
          <div style={{ marginTop: '2px' }}>· No returns after 7 days ·</div>
        </div>
      </div>

      {/* Visible download button */}
      <button
        onClick={handleDownload}
        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
          ${dm
            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
      >
        <Download className="w-4 h-4" />
        Download Receipt
      </button>
    </div>
  );
}

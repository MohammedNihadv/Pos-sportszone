import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { logError, logInfo } from './logger.js';

/**
 * Receipt PDF Generator
 * Generates a styled HTML receipt → renders it to PDF via Electron's printToPDF
 */

function getReceiptDir() {
  const dir = path.join(app.getPath('documents'), 'SportsZone', 'Receipts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function generateReceiptHTML(sale) {
  const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
  const date = sale.date ? new Date(sale.date).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  const saleId = sale.id || Date.now();

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;">${item.emoji || '📦'} ${item.name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-size:12px;">${item.qty}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:12px;">₹${Number(item.price).toFixed(2)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:12px;font-weight:600;">₹${(item.qty * item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
  const discount = sale.discount || 0;
  const afterDiscount = subtotal - discount;
  const cgst = afterDiscount * 0.09;
  const sgst = afterDiscount * 0.09;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1e293b; background: #fff; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; }
    .header h1 { font-size: 22px; font-weight: 800; color: #1e40af; letter-spacing: 1px; }
    .header p { font-size: 11px; color: #64748b; margin-top: 4px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
         color: #64748b; border-bottom: 2px solid #e2e8f0; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
    th:nth-child(2) { text-align: center; }
    .totals { border-top: 2px solid #e2e8f0; padding-top: 12px; }
    .totals .row { display: flex; justify-content: space-between; padding: 3px 8px; font-size: 12px; color: #475569; }
    .totals .grand { font-size: 16px; font-weight: 800; color: #1e40af; padding: 8px; background: #eff6ff; border-radius: 8px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1; }
    .footer p { font-size: 11px; color: #94a3b8; }
    .footer .thanks { font-size: 14px; font-weight: 700; color: #3b82f6; margin-bottom: 4px; }
    .payment-badge { display: inline-block; padding: 2px 10px; background: #dbeafe; color: #1d4ed8; border-radius: 12px; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚽ SPORTS ZONE</h1>
    <p>Sports Goods & Accessories</p>
  </div>

  <div class="meta">
    <span><strong>Receipt #</strong> ${saleId}</span>
    <span><strong>Date:</strong> ${date}</span>
  </div>
  <div style="margin-bottom:12px;">
    <span class="payment-badge">${(sale.payment_method || sale.paymentMethod || 'Cash').toUpperCase()}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
    ${discount > 0 ? `<div class="row" style="color:#ef4444;"><span>Discount</span><span>-₹${discount.toFixed(2)}</span></div>` : ''}
    <div class="row"><span>CGST (9%)</span><span>₹${cgst.toFixed(2)}</span></div>
    <div class="row"><span>SGST (9%)</span><span>₹${sgst.toFixed(2)}</span></div>
    <div class="row grand"><span>Grand Total</span><span>₹${sale.total?.toFixed(2) || afterDiscount + cgst + sgst}</span></div>
  </div>

  <div class="footer">
    <p class="thanks">Thank you for shopping at Sports Zone!</p>
    <p>Visit us again • Exchange within 7 days with receipt</p>
  </div>
</body>
</html>`;
}

export async function downloadReceiptPDF(mainWindow, sale) {
  try {
    const html = generateReceiptHTML(sale);
    const saleId = sale.id || Date.now();
    const fileName = `receipt_${saleId}_${Date.now()}.pdf`;
    const filePath = path.join(getReceiptDir(), fileName);

    // Load HTML into a hidden BrowserWindow to render it
    const { BrowserWindow } = await import('electron');
    const receiptWin = new BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    await receiptWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Wait a short moment for rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await receiptWin.webContents.printToPDF({
      pageSize: { width: 80000, height: 200000 }, // ~80mm thermal receipt width, tall
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    fs.writeFileSync(filePath, pdfBuffer);
    receiptWin.close();

    logInfo('Receipt', `Saved receipt PDF: ${filePath}`);
    return { success: true, path: filePath };
  } catch (err) {
    logError('Receipt', err);
    return { success: false, error: err.message };
  }
}

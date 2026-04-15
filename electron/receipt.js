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

export function generateReceiptHTML(sale, settings = {}) {
  const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
  const date = sale.date ? new Date(sale.date).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  const saleId = sale.id || Date.now();
  const printerType = settings.printerType || 'Thermal (80mm)';

  const businessName = settings.businessName || 'SPORTS ZONE';
  const businessAddress = settings.businessAddress || 'Sports Goods & Accessories';
  const businessGstin = settings.businessGstin || '';
  const businessPhone = settings.businessPhone || '';
  
  const cgstRateRaw = parseFloat(settings.cgstRate) || 0;
  const sgstRateRaw = parseFloat(settings.sgstRate) || 0;
  
  const cgstRate = cgstRateRaw / 100;
  const sgstRate = sgstRateRaw / 100;

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:600;font-size:12px;">${item.name}</div>
        <div style="font-size:10px;color:#64748b;">${item.sku || ''}</div>
      </td>
      <td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;">${item.qty}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:12px;">₹${Number(item.price).toLocaleString()}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:12px;font-weight:800;">₹${(item.qty * item.price).toLocaleString()}</td>
    </tr>
  `).join('');

  const subtotal = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
  const discount = sale.discount || 0;
  const afterDiscount = subtotal - discount;
  
  const totalTaxRate = cgstRate + sgstRate;
  const taxableAmount = totalTaxRate > 0 ? afterDiscount / (1 + totalTaxRate) : afterDiscount;
  const cgst = totalTaxRate > 0 ? (afterDiscount - taxableAmount) * (cgstRate / totalTaxRate) : 0;
  const sgst = totalTaxRate > 0 ? (afterDiscount - taxableAmount) * (sgstRate / totalTaxRate) : 0;
  const grandTotal = Number(sale.total || afterDiscount);
  const adjustment = grandTotal - afterDiscount;

  // Determine layout style classes
  const isThermal = printerType.includes('Thermal');
  const width = isThermal ? (printerType.includes('58mm') ? '58mm' : '80mm') : (printerType === 'A5 Paper' ? '148mm' : '210mm');
  const padding = isThermal ? '10px' : '40px';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
    ::-webkit-scrollbar { display: none; }
    html, body { overflow: hidden !important; height: auto !important; margin: 0; padding: 0; background: white; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a; 
      width: ${isThermal ? (printerType.includes('58mm') ? '210px' : '290px') : '800px'};
      padding: ${padding};
      word-wrap: break-word;
    }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
    .header h1 { font-size: ${isThermal ? '18px' : '28px'}; font-weight: 900; color: #1e40af; text-transform: uppercase; margin-bottom: 2px; }
    .header p { font-size: 11px; color: #64748b; line-height: 1.4; }
    .gstin { font-weight: 700; color: #3b82f6; margin-top: 4px; }
    
    .meta { display: flex; justify-content: space-between; margin: 15px 0; font-size: 11px; font-weight: 600; color: #475569; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { padding: 8px 4px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
    th:nth-child(2) { text-align: center; }
    .adjustment { color: #d97706; font-style: italic; }

    .totals-box { background: #f8fafc; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569; font-weight: 600; }
    .grand-total { border-top: 2px dashed #cbd5e1; margin-top: 8px; padding-top: 8px; font-size: 18px; font-weight: 900; color: #1e40af; }
    
    .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1; }
    .footer .thanks { font-size: 14px; font-weight: 800; color: #3b82f6; margin-bottom: 5px; }
    .footer p { font-size: 10px; color: #94a3b8; font-weight: 500; }
    
    .badge { display: inline-block; padding: 3px 12px; background: #dbeafe; color: #1d4ed8; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${businessName}</h1>
    <p>${businessAddress}</p>
    ${businessGstin ? `<p class="gstin">GSTIN: ${businessGstin}</p>` : ''}
    ${businessPhone ? `<p>PH: ${businessPhone}</p>` : ''}
  </div>
 
  <div class="meta">
    <span>#INV-${saleId}</span>
    <span>${date}</span>
  </div>

  <div class="badge">${(sale.payment_method || sale.paymentMethod || 'Cash')}</div>

  <table>
    <thead>
      <tr>
        <th>Item Name</th>
        <th>Qty</th>
        <th>Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals-box">
    <div class="total-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString()}</span></div>
    ${discount > 0 ? `<div class="total-row" style="color:#ef4444;"><span>Discount</span><span>-₹${discount.toLocaleString()}</span></div>` : ''}
    ${cgstRateRaw > 0 ? `<div class="total-row"><span>CGST (${cgstRateRaw}%)</span><span>₹${cgst.toFixed(2)}</span></div>` : ''}
    ${sgstRateRaw > 0 ? `<div class="total-row"><span>SGST (${sgstRateRaw}%)</span><span>₹${sgst.toFixed(2)}</span></div>` : ''}
    <div class="total-row grand-total"><span>Total</span><span>₹${grandTotal.toLocaleString()}</span></div>
  </div>

  <div class="footer">
    <p class="thanks">Thank You for Visiting!</p>
    <p>Please keep this receipt for exchanges within 7 days.</p>
    <p>Powered by SportsZone Cloud POS</p>
  </div>
</body>
</html>`;
}

export async function generateReceiptImage(sale, settings = {}) {
  try {
    const { BrowserWindow } = await import('electron');
    const isThermal = (settings.printerType || '').includes('Thermal');
    // Set window width slightly larger than content to prevent any clipping from scrollbars/padding
    const width = isThermal ? ((settings.printerType || '').includes('58mm') ? 220 : 300) : 820;

    const win = new BrowserWindow({
      width,
      height: 1200,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    const html = generateReceiptHTML(sale, settings);
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    // Wait for layout rendering
    await new Promise(r => setTimeout(r, 600));

    // Auto-crop to content height
    const height = await win.webContents.executeJavaScript('document.body.scrollHeight');
    win.setSize(width, Math.min(height + 20, 2500)); // Add a small height buffer, cap at reasonable length

    const image = await win.webContents.capturePage();
    win.close();
    return image.toDataURL();
  } catch (err) {
    logError('ImageGen', err);
    return null;
  }
}

export async function downloadReceiptPDF(mainWindow, sale, settings = {}) {
  try {
    const html = generateReceiptHTML(sale, settings);
    const saleId = sale.id || Date.now();
    const fileName = `receipt_INV_${saleId}_${Date.now()}.pdf`;
    const filePath = path.join(getReceiptDir(), fileName);
    const printerType = settings.printerType || 'Thermal (80mm)';

    const { BrowserWindow } = await import('electron');
    
    // Default size logic
    let pageSize = { width: 80000, height: 200000 }; // Default Thermal strip
    if (printerType === 'A4 Paper') pageSize = 'A4';
    else if (printerType === 'A5 Paper') pageSize = 'A5';

    const receiptWin = new BrowserWindow({
      width: 600,
      height: 900,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    await receiptWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise(resolve => setTimeout(resolve, 800));

    const pdfBuffer = await receiptWin.webContents.printToPDF({
      pageSize,
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    fs.writeFileSync(filePath, pdfBuffer);
    receiptWin.close();

    logInfo('Receipt', `Saved PDF: ${filePath}`);
    return { success: true, path: filePath };
  } catch (err) {
    logError('Receipt', err);
    return { success: false, error: err.message };
  }
}

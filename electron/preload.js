const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Products
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (product) => ipcRenderer.invoke('update-product', product),
  saveProduct: (product) => ipcRenderer.invoke('save-product', product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  
  // Sales
  saveSale: (sale) => ipcRenderer.invoke('save-sale', sale),
  getSales: () => ipcRenderer.invoke('get-sales'),
  deleteSale: (id) => ipcRenderer.invoke('delete-sale', id),
  
  // Expenses
  getExpenses: () => ipcRenderer.invoke('get-expenses'),
  saveExpense: (expense) => ipcRenderer.invoke('save-expense', expense),
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),
  
  // Purchases
  getPurchases: () => ipcRenderer.invoke('get-purchases'),
  savePurchase: (purchase) => ipcRenderer.invoke('save-purchase', purchase),
  deletePurchase: (id) => ipcRenderer.invoke('delete-purchase', id),
  
  // Suppliers
  getSuppliers: () => ipcRenderer.invoke('get-suppliers'),
  saveSupplier: (s) => ipcRenderer.invoke('save-supplier', s),
  deleteSupplier: (id) => ipcRenderer.invoke('delete-supplier', id),
  addSupplier: (name) => ipcRenderer.invoke('add-supplier', name),

  // Categories (Product)
  getCategories: () => ipcRenderer.invoke('get-categories'),
  saveCategory: (cat) => ipcRenderer.invoke('save-category', cat),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

  // Expense Categories
  getExpenseCategories: () => ipcRenderer.invoke('get-expense-categories'),
  saveExpenseCategory: (cat) => ipcRenderer.invoke('save-expense-category', cat),
  deleteExpenseCategory: (id) => ipcRenderer.invoke('delete-expense-category', id),

  // ─── NEW: App Info & Health ───
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemHealth: () => ipcRenderer.invoke('get-system-health'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  incrementSettings: (updates) => ipcRenderer.invoke('increment-settings', updates),

  // ─── NEW: Logging & Audit ───
  getRecentLogs: () => ipcRenderer.invoke('get-recent-logs'),
  getAuditLogs: () => ipcRenderer.invoke('get-audit-logs'),
  logRendererError: (data) => ipcRenderer.invoke('log-renderer-error', data),

  // ─── NEW: Security & Auth ───
  getUsers: () => ipcRenderer.invoke('get-users'),
  saveUser: (user) => ipcRenderer.invoke('save-user', user),
  verifyPin: (data) => ipcRenderer.invoke('verify-pin', data),
  updatePin: (data) => ipcRenderer.invoke('update-pin', data),

  // ─── NEW: Backup & Restore ───
  createBackup: () => ipcRenderer.invoke('create-backup'),
  getBackups: () => ipcRenderer.invoke('get-backups'),
  restoreBackup: (path) => ipcRenderer.invoke('restore-backup', path),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  restoreCustomFile: () => ipcRenderer.invoke('restore-custom-file'),
  getDbHealth: () => ipcRenderer.invoke('get-db-health'),
  repairDb: () => ipcRenderer.invoke('repair-db'),

  // ─── NEW: Auto Updater ───
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, data) => cb(data)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, data) => cb(data)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, data) => cb(data)),

  // ─── NEW: Cloud Sync ───
  syncToCloud: () => ipcRenderer.invoke('sync-to-cloud'),
  getLastSyncTime: () => ipcRenderer.invoke('get-last-sync-time'),
  pullFromCloud: () => ipcRenderer.invoke('pull-from-cloud'),

  // ─── NEW: Receipt Download ───
  downloadReceipt: (sale) => ipcRenderer.invoke('download-receipt', sale),
  getReceiptPreview: (sale) => ipcRenderer.invoke('get-receipt-preview', sale),
  copyToClipboard: (dataUrl) => ipcRenderer.invoke('copy-image-to-clipboard', dataUrl),
});

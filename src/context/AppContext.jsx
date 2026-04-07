import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

const AppContext = createContext(null);

// ─── Default fallback data ───
const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Jerseys' }, { id: 2, name: 'Boots & Shoes' },
  { id: 3, name: 'Shorts & Tracks' }, { id: 4, name: 'Caps' },
  { id: 5, name: 'Cricket' },
  { id: 7, name: 'Accessories' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 1, name: 'Shop Rent' }, { id: 2, name: 'Salary' },
  { id: 3, name: 'Tea / Refreshments' }, { id: 4, name: 'Water' },
  { id: 5, name: 'Fuel' }, { id: 6, name: 'Camera / CCTV' },
  { id: 7, name: 'Electricity' }, { id: 8, name: 'Other' },
];

const DEFAULT_SUPPLIERS = [
  { id: 1, name: 'Scampilo', phone: '' }, { id: 2, name: 'Catos Jersey', phone: '' },
  { id: 3, name: 'Wafa Calicut', phone: '' }, { id: 4, name: 'Noway', phone: '' },
  { id: 5, name: 'Captain', phone: '' }, { id: 6, name: 'Calicut Sports Jersey', phone: '' },
  { id: 7, name: 'Impact Tirur', phone: '' }, { id: 8, name: 'Soccer Sportstrade', phone: '' },
  { id: 9, name: 'Norvas', phone: '' }, { id: 10, name: 'M.P Traders', phone: '' },
];

const DEFAULT_CUSTOMERS = [
  { id: 1, name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul@email.com', orders: 12, total: 28450, lastOrder: '21 Mar 2026' },
  { id: 2, name: 'Priya Nair', phone: '+91 98765 43211', email: 'priya@email.com', orders: 8, total: 18900, lastOrder: '20 Mar 2026' },
  { id: 3, name: 'Arjun Singh', phone: '+91 98765 43212', email: 'arjun@email.com', orders: 22, total: 54200, lastOrder: '18 Mar 2026' },
  { id: 4, name: 'Meera Pillai', phone: '+91 98765 43213', email: 'meera@email.com', orders: 5, total: 9800, lastOrder: '15 Mar 2026' },
  { id: 5, name: 'Vikram Patel', phone: '+91 98765 43214', email: 'vikram@email.com', orders: 31, total: 89100, lastOrder: '21 Mar 2026' },
];

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Jersey 5 Collar', sku: 'JR001', barcode: '1001', category: 'Jerseys', stock: 25, cost: 200, price: 450, emoji: '👕' },
  { id: 2, name: 'Football Boots Pro', sku: 'BT001', barcode: '1002', category: 'Boots & Shoes', stock: 12, cost: 800, price: 1500, emoji: '👟' },
  { id: 3, name: 'Track Pants Standard', sku: 'TP001', barcode: '1003', category: 'Shorts & Tracks', stock: 30, cost: 250, price: 500, emoji: '👖' },
  { id: 4, name: 'Sports Cap Classic', sku: 'CP001', barcode: '1004', category: 'Caps', stock: 50, cost: 80, price: 199, emoji: '🧢' },
  { id: 5, name: 'Cricket Bat Willow', sku: 'CB001', barcode: '1005', category: 'Cricket', stock: 8, cost: 1200, price: 2500, emoji: '🏏' },
  { id: 6, name: 'Football Premium', sku: 'FB001', barcode: '1006', category: 'Sports Equipment', stock: 15, cost: 400, price: 850, emoji: '⚽' },
  { id: 7, name: 'Wristband Pair', sku: 'WB001', barcode: '1007', category: 'Accessories', stock: 100, cost: 30, price: 99, emoji: '🏐' },
  { id: 8, name: 'Shorts Training', sku: 'SH001', barcode: '1008', category: 'Shorts & Tracks', stock: 40, cost: 150, price: 350, emoji: '🩳' },
];

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [isReady, setIsReady] = useState(false);
  
  // Core Data
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [appSettings, setAppSettingsState] = useState({
    businessName: 'Sports Zone',
    businessGstin: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    cgstRate: 9,
    sgstRate: 9,
    printerType: 'Thermal (80mm)',
    printerCopies: 1,
    autoSync: true,
    darkMode: false,
    soundEnabled: true,
    autoLockEnabled: true,
    autoLockTimeout: 2
  });

  const [credits, setCredits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sz_credits') || '[]'); } catch { return []; }
  });
  const [customers, setCustomersState] = useState(() => {
    try { 
      const stored = localStorage.getItem('sz_customers');
      return stored ? JSON.parse(stored) : DEFAULT_CUSTOMERS;
    } catch { return DEFAULT_CUSTOMERS; }
  });

  const setCustomers = useCallback((newCustomers) => {
    setCustomersState(newCustomers);
    localStorage.setItem('sz_customers', JSON.stringify(newCustomers));
  }, []);

  const api = typeof window !== 'undefined' ? window.api : null;

  // ─── Toggles & Preferences (Reactive States) ───
  const [autoLockEnabled, setAutoLockEnabledState] = useState(appSettings.autoLockEnabled);
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(appSettings.autoLockTimeout);
  const [soundEnabled, setSoundEnabledState] = useState(appSettings.soundEnabled);

  // Sync reactive states when appSettings loads or changes
  useEffect(() => {
    setDarkMode(appSettings.darkMode);
    setAutoLockEnabledState(appSettings.autoLockEnabled);
    setAutoLockTimeoutState(appSettings.autoLockTimeout);
    setSoundEnabledState(appSettings.soundEnabled);
  }, [appSettings]);

  // Fetch initial data
  const loadData = useCallback(async () => {
    if (api) {
      try {
        const [prod, supp, cats, expCats, sl, ex, pu, settings, dbUsers] = await Promise.all([
          api.getProducts(), api.getSuppliers(), api.getCategories(),
          api.getExpenseCategories(), api.getSales(), api.getExpenses(), api.getPurchases(),
          api.getSettings(), api.getUsers()
        ]);
        setProducts(prod || []); setSuppliers(supp || []);
        setCategories(cats || []); setExpenseCategories(expCats || []);
        setSales(sl || []); setExpenses(ex || []); setPurchases(pu || []);
        setUsers(dbUsers || []);
        
        if (settings && Object.keys(settings).length > 0) {
          setAppSettingsState(prev => ({ ...prev, ...settings }));
        }
        setIsReady(true);
      } catch (err) {
        console.warn('API load failed, using fallback data:', err);
        setProducts(DEFAULT_PRODUCTS); setSuppliers(DEFAULT_SUPPLIERS);
        setCategories(DEFAULT_CATEGORIES); setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
        setUsers([
          { id: 1, role: 'Admin', name: 'Admin', pin: '1234' },
          { id: 2, role: 'Cashier', name: 'Cashier', pin: '0000' },
          { id: 3, role: 'Owner', name: 'Owner', pin: '1111' },
        ]);
        setIsReady(true);
      }
    } else {
      setProducts(DEFAULT_PRODUCTS);
      setSuppliers(DEFAULT_SUPPLIERS);
      setCategories(DEFAULT_CATEGORIES);
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
      setUsers([
        { id: 1, role: 'Admin', name: 'Admin', pin: '1234' },
        { id: 2, role: 'Cashier', name: 'Cashier', pin: '0000' },
        { id: 3, role: 'Owner', name: 'Owner', pin: '1111' },
      ]);
      setIsReady(true);
    }
  }, [api]);

  const saveAppSettings = useCallback(async (newSettings) => {
    // Crucial: Use functional update to avoid stale closure issues
    setAppSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Save to disk asynchronously
      if (api) {
        api.saveSettings(newSettings).catch(err => console.error("Cloud settings save failed", err));
      }
      
      // Sync localStorage
      Object.entries(newSettings).forEach(([k, v]) => {
        localStorage.setItem(`sz_${k}`, typeof v === 'object' ? JSON.stringify(v) : v);
      });
      
      return updated;
    });
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshProducts = useCallback(async () => {
    if (api) {
      const prod = await api.getProducts();
      setProducts(prod || []);
    }
  }, [api]);

  const refreshSales = useCallback(async () => {
    if (api) {
      const sl = await api.getSales();
      setSales(sl || []);
    }
  }, [api]);

  // Security
  const [logo, setLogoState] = useState(() => {
    const stored = localStorage.getItem('sz_logo');
    if (stored && stored.startsWith('data:') && stored.length > 50000) {
      localStorage.removeItem('sz_logo');
      return './logo.png';
    }
    return stored || './logo.png';
  });
  const [adminPin, setAdminPinState] = useState(() => localStorage.getItem('sz_admin_pin') || '1234');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('sz_current_user'));
      return cached?.role === 'Admin'; // Admin is unlocked, Owner is now just isOwner
    } catch { return false; }
  });
  
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUserState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sz_current_user')) || null; }
    catch { return null; }
  });

  const [isLocked, setIsLocked] = useState(false);

  const setCurrentUser = useCallback((user) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('sz_current_user', JSON.stringify(user));
      setIsAdminUnlocked(user.role === 'Admin'); // Only Admin gets unlocked powers
    } else {
      localStorage.removeItem('sz_current_user');
      setIsAdminUnlocked(false);
    }
  }, []);

  const isOwner = currentUser?.role === 'Owner';

  const setLogo = useCallback((newLogo) => { setLogoState(newLogo); localStorage.setItem('sz_logo', newLogo); }, []);
  const updateAdminPin = useCallback(async (newPin) => { 
    if (api) {
      await api.updatePin({ userId: 1, newPin }); // Admin is ID 1
      const freshUsers = await api.getUsers();
      setUsers(freshUsers);
    }
  }, [api]);
  const lockAdmin = useCallback(() => setIsAdminUnlocked(false), []);

  // Toggles setters (now just save to global settings)
  const setSoundEnabled = useCallback((v) => saveAppSettings({ soundEnabled: v }), [saveAppSettings]);
  const setAutoLockEnabled = useCallback((v) => saveAppSettings({ autoLockEnabled: v }), [saveAppSettings]);
  const setAutoLockTimeout = useCallback((v) => saveAppSettings({ autoLockTimeout: v }), [saveAppSettings]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => {
      if (prev.some(t => t.message === message)) return prev;
      const updated = [...prev, { id, message, type }];
      return updated.length > 3 ? updated.slice(-3) : updated;
    });
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const contextValue = useMemo(() => ({
    darkMode, setDarkMode: (v) => saveAppSettings({ darkMode: v }), sidebarCollapsed, setSidebarCollapsed,
    toasts, addToast, dismissToast, syncStatus, setSyncStatus,
    logo, setLogo, isAdminUnlocked, setIsAdminUnlocked, lockAdmin,
    adminPin, updateAdminPin,
    users, setUsers, currentUser, setCurrentUser, isLocked, setIsLocked,
    soundEnabled, setSoundEnabled,
    autoLockEnabled, setAutoLockEnabled, autoLockTimeout, setAutoLockTimeout,
    products, setProducts, suppliers, setSuppliers,
    categories, setCategories, expenseCategories, setExpenseCategories,
    sales, setSales, expenses, setExpenses, purchases, setPurchases,
    credits, setCredits, customers, setCustomers,
    appSettings, saveAppSettings, isOwner,
    refreshProducts, refreshSales, loadData, isReady
  }), [
    darkMode, sidebarCollapsed, toasts, syncStatus, logo,
    isAdminUnlocked, adminPin, users, currentUser, isLocked,
    soundEnabled, autoLockEnabled, autoLockTimeout,
    products, suppliers, categories, expenseCategories,
    sales, expenses, purchases, credits, customers,
    appSettings, saveAppSettings, isOwner,
    addToast, dismissToast, setLogo, lockAdmin, updateAdminPin,
    setCurrentUser, setSoundEnabled, setAutoLockEnabled, setAutoLockTimeout,
    refreshProducts, refreshSales, loadData
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

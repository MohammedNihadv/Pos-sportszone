const SESSION_KEY = 'sz_session_recovery';
const CRASH_FLAG = 'sz_crash_flag';

let debounceTimer = null;

export function saveSession(cart) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    try {
      if (cart && cart.length > 0) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          cart,
          timestamp: Date.now(),
        }));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
  }, 1000); // 1s debounce
}

export function recoverSession() {
  try {
    const crashed = localStorage.getItem(CRASH_FLAG) === 'true';
    const raw = localStorage.getItem(SESSION_KEY);
    
    if (crashed && raw) {
      const data = JSON.parse(raw);
      // Only recover sessions less than 24 hours old
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data.cart;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function setCrashFlag() {
  try {
    localStorage.setItem(CRASH_FLAG, 'true');
  } catch {}
}

export function clearCrashFlag() {
  try {
    localStorage.removeItem(CRASH_FLAG);
  } catch {}
}

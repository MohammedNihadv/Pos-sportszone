import { useEffect, useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';

export function useAutoLock() {
  const { isLocked, setIsLocked, autoLockEnabled, autoLockTimeout, currentUser } = useApp();
  const warningSeconds = 10;
  
  const [isWarning, setIsWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(warningSeconds);
  
  const warningTimerRef = useRef(null);
  const lockTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    setIsWarning(false);
    setTimeLeft(warningSeconds);

    if (isLocked || !autoLockEnabled || !currentUser || currentUser.role !== 'Cashier') return; // Only track for Cashier

    const msUntilWarning = (autoLockTimeout * 60 - warningSeconds) * 1000;
    
    // Safety check just in case timeout is less than warning
    const safeMs = Math.max(0, msUntilWarning);

    warningTimerRef.current = setTimeout(() => {
      setIsWarning(true);
      
      let currentLeft = warningSeconds;
      countdownIntervalRef.current = setInterval(() => {
        currentLeft -= 1;
        setTimeLeft(currentLeft);
        if (currentLeft <= 0) {
          clearInterval(countdownIntervalRef.current);
        }
      }, 1000);

      lockTimerRef.current = setTimeout(() => {
        setIsLocked(true);
        setIsWarning(false);
        clearAllTimers();
      }, warningSeconds * 1000);

    }, safeMs);

  }, [autoLockTimeout, warningSeconds, isLocked, autoLockEnabled, setIsLocked, clearAllTimers, currentUser]);

  useEffect(() => {
    // Only track if unlocked and enabled, has user, and is Cashier
    if (isLocked || !autoLockEnabled || !currentUser || currentUser.role !== 'Cashier') {
      clearAllTimers();
      setIsWarning(false);
      return;
    }

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Throttle resetting timers to prevent excessive function calls
    let timeoutFunc;
    const handleActivity = () => {
      if (timeoutFunc) clearTimeout(timeoutFunc);
      timeoutFunc = setTimeout(() => {
        resetTimers();
      }, 500); // 500ms throttle
    };

    activityEvents.forEach(e => document.addEventListener(e, handleActivity));
    resetTimers();

    return () => {
      clearAllTimers();
      if (timeoutFunc) clearTimeout(timeoutFunc);
      activityEvents.forEach(e => document.removeEventListener(e, handleActivity));
    };
  }, [resetTimers, isLocked, autoLockEnabled, currentUser, clearAllTimers]);

  return { isWarning, timeLeft };
}

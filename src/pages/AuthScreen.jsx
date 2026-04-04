import { useState, useEffect, useRef } from 'react';
import { Store, Shield, ChevronRight, Delete, Lock } from 'lucide-react';
import { playSound } from '../utils/sounds';

export default function AuthScreen({ onLogin, savedUsers, onLockMode = false, lockedUser = null }) {
  const [selectedUser, setSelectedUser] = useState(lockedUser || (savedUsers.length > 0 ? savedUsers[0] : { role: 'Admin', name: 'Admin', pin: '1234' }));
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (lockedUser) setSelectedUser(lockedUser);
  }, [lockedUser]);

  // ─── Physical Keyboard Support ───
  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9' && pin.length < 4) {
        e.preventDefault();
        playSound('tap');
        setPin(prev => prev + e.key);
        setError(false);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        playSound('tap');
        setPin(prev => prev.slice(0, -1));
        setError(false);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        playSound('tap');
        setPin('');
        setError(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pin]);

  const handleKeyPress = (num) => {
    playSound('tap');
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    playSound('tap');
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    playSound('tap');
    setPin('');
    setError(false);
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === selectedUser.pin) {
        playSound('success');
        onLogin(selectedUser);
      } else {
        playSound('error');
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  }, [pin, selectedUser, onLogin]);

  const switchUser = () => {
    const currentIndex = savedUsers.findIndex(u => u.role === selectedUser.role);
    const nextIndex = (currentIndex + 1) % savedUsers.length;
    setSelectedUser(savedUsers[nextIndex]);
    setPin('');
    playSound('switch');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4 z-[9999]" ref={containerRef}>
      {/* Decorative bg elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 p-1 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl shadow-blue-500/20 overflow-hidden">
            <img src="./logo.png" alt="Sports Zone" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sports Zone</h1>
          <p className="text-blue-300/70 text-sm mt-1">
            {onLockMode ? 'Session Locked — Enter PIN to resume' : 'Enter your PIN to get started'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          {/* User Selector */}
          {!onLockMode && savedUsers.length > 1 && (
            <button
              onClick={switchUser}
              className="w-full flex items-center justify-between p-3 mb-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm
                  ${selectedUser.role === 'Admin' || selectedUser.role === 'Owner' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">{selectedUser.name}</p>
                  <p className="text-xs text-blue-300/60">{selectedUser.role}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-300/50 flex items-center gap-1 group-hover:text-blue-300 transition-colors">
                Switch <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          )}

          {onLockMode && (
            <div className="flex flex-col items-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <p className="text-lg font-bold text-white">{selectedUser.name}</p>
              <p className="text-xs text-blue-300/50 mt-0.5">Enter PIN to unlock</p>
            </div>
          )}

          {!onLockMode && savedUsers.length <= 1 && (
            <div className="flex flex-col items-center mb-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm mb-2
                ${selectedUser.role === 'Admin' || selectedUser.role === 'Owner' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-bold text-white">{selectedUser.name}</p>
              <p className="text-xs text-blue-300/50">{selectedUser.role}</p>
            </div>
          )}

          {/* PIN Dots */}
          <div className="flex justify-center gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pin.length > i 
                    ? 'bg-blue-400 shadow-md shadow-blue-400/40 scale-110' 
                    : error 
                      ? 'bg-red-400/60 scale-100' 
                      : 'bg-white/15 scale-100'
                } ${error ? 'animate-bounce' : ''}`}
                style={error ? { animationDelay: `${i * 0.1}s` } : {}}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-xs text-red-400 font-semibold mb-3 animate-pulse">Incorrect PIN</p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 active:bg-white/20 active:scale-95 flex items-center justify-center transition-all"
              >
                <span className="text-xl font-semibold text-white">{num}</span>
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-14 rounded-xl text-xs font-bold text-blue-300/50 hover:bg-white/10 active:bg-white/15 transition-all tracking-wider"
            >
              CLR
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 active:bg-white/20 active:scale-95 flex items-center justify-center transition-all"
            >
              <span className="text-xl font-semibold text-white">0</span>
            </button>
            <button
              onClick={handleBackspace}
              className="h-14 rounded-xl text-blue-300/50 hover:bg-white/10 active:bg-white/15 transition-all flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-[10px] text-blue-300/30 mt-4 tracking-wide">
            You can also type your PIN on the keyboard
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-blue-300/20 mt-6 tracking-wider">
          SPORTS ZONE v3.0.5
        </p>
      </div>
    </div>
  );
}

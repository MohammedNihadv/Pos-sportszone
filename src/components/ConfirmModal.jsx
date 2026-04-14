import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { playSound } from '../utils/sounds';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Delete', 
  cancelText = 'Cancel', 
  type = 'danger', // 'danger' or 'warning'
  dm = false 
}) {
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // Auto-focus the cancel button for safety, and handle Escape key
  useEffect(() => {
    if (isOpen) {
      playSound('pop');
      // Focus cancel button by default to prevent accidental deletion
      setTimeout(() => cancelBtnRef.current?.focus(), 100);
      
      const handleEsc = (e) => {
        if (e.key === 'Escape') onCancel();
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />,
      btnCls: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20",
      accent: "border-t-4 border-t-red-500"
    },
    warning: {
      icon: <AlertCircle className="w-12 h-12 text-amber-500 mb-4 animate-bounce" />,
      btnCls: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20",
      accent: "border-t-4 border-t-amber-500"
    }
  };

  const { icon, btnCls, accent } = typeConfig[type] || typeConfig.danger;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div 
        onMouseDown={e => e.stopPropagation()}
        className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden scale-in-center ${dm ? 'bg-slate-900 border border-slate-800' : 'bg-white'} ${accent}`}
      >
        {/* Header/Close */}
        <div className="flex justify-end p-2">
          <button onClick={onCancel} className={`p-2 rounded-full transition-colors ${dm ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 flex flex-col items-center text-center">
          {icon}
          <h3 className={`text-xl font-bold mb-2 ${dm ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
          <p className={`text-sm leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>
        </div>

        {/* Actions */}
        <div className={`flex gap-3 px-8 pb-8`}>
          <button 
            ref={cancelBtnRef}
            onClick={onCancel} 
            className={`flex-1 py-3 rounded-2xl font-bold transition-all active:scale-95 ${dm ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {cancelText}
          </button>
          <button 
            ref={confirmBtnRef}
            onClick={() => {
              playSound('click');
              onConfirm();
            }} 
            className={`flex-1 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${btnCls}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

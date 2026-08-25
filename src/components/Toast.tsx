import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right ${
            t.type === 'success'
              ? 'bg-emerald-900/95 text-white border-emerald-700/50'
              : t.type === 'error'
              ? 'bg-rose-900/95 text-white border-rose-700/50'
              : 'bg-slate-900/95 text-white border-slate-700/50'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />}

          <div className="flex-1">
            <h4 className="font-bold text-sm leading-tight">{t.title}</h4>
            {t.message && <p className="text-xs text-white/80 mt-1">{t.message}</p>}
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-white/60 hover:text-white transition-colors p-1 -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-2xl bg-slate-900/95 text-white border border-slate-700 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 max-w-sm">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      <p className="text-xs font-semibold flex-1 leading-snug">{message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};


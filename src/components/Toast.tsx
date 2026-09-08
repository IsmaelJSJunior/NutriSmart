import React, { useState, useEffect } from 'react';
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

const ToastCardItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const timer = setTimeout(() => {
      handleDismiss();
    }, 4000);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 250);
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
        isExiting
          ? 'opacity-0 -translate-y-2 scale-95 duration-250 ease-in pointer-events-none'
          : isVisible
          ? 'opacity-100 translate-y-0 scale-100 duration-300 ease-out'
          : 'opacity-0 -translate-y-3 scale-95'
      } ${
        toast.type === 'success'
          ? 'bg-white/95 text-slate-900 border-emerald-200/90'
          : toast.type === 'error'
          ? 'bg-white/95 text-slate-900 border-rose-200/90'
          : 'bg-white/95 text-slate-900 border-slate-200/90'
      }`}
    >
      {toast.type === 'success' && (
        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      )}
      {toast.type === 'error' && (
        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
          <AlertCircle className="w-4 h-4" />
        </div>
      )}
      {toast.type === 'info' && (
        <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
          <Info className="w-4 h-4" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight truncate">{toast.title}</h4>
        {toast.message && <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-snug">{toast.message}</p>}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
        title="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastCardItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Entrada fluida com leve deslizamento
    const enterFrame = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Saída com transição reversiva antes do desmonte
    const timer = setTimeout(() => {
      handleDismiss();
    }, 3500);

    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(timer);
    };
  }, [message]);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 shadow-2xl backdrop-blur-md max-w-sm w-auto transition-all ${
        isExiting
          ? 'opacity-0 -translate-y-2 scale-95 duration-250 ease-in pointer-events-none'
          : isVisible
          ? 'opacity-100 translate-y-0 scale-100 duration-300 ease-out'
          : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex-1 leading-snug">
        {message}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        title="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

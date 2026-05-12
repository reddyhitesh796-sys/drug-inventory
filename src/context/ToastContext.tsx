import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-emerald-500" size={20} />;
      case 'error': return <XCircle className="text-red-500" size={20} />;
      case 'warning': return <AlertCircle className="text-amber-500" size={20} />;
      case 'info': return <Info className="text-blue-500" size={20} />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-l-emerald-500';
      case 'error': return 'border-l-red-500';
      case 'warning': return 'border-l-amber-500';
      case 'info': return 'border-l-blue-500';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 ${getBorderColor(toast.type)} p-4 min-w-[320px] max-w-md animate-slide-in-right flex items-start gap-3`}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</p>
              {toast.message && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{toast.message}</p>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

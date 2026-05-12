import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const colors = {
    danger: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', btn: 'bg-amber-600 hover:bg-amber-700' },
    info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', btn: 'bg-blue-600 hover:bg-blue-700' },
  }[variant];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
              <AlertTriangle className={colors.text} size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 -mt-1 -mr-1">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white ${colors.btn} rounded-lg transition-colors`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

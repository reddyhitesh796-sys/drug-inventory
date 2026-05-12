import type { ReactNode } from 'react';
import { X, CheckSquare } from 'lucide-react';

interface BulkAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'success' | 'warning' | 'default';
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClear: () => void;
  actions: BulkAction[];
  label?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  default: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300',
};

export default function BulkActionBar({ selectedCount, totalCount, onClear, actions, label = 'items' }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-16 z-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center justify-between gap-3 animate-fade-in border border-blue-500">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex-shrink-0">
          <CheckSquare size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {selectedCount} {label} selected{totalCount ? <span className="opacity-70 font-normal"> of {totalCount}</span> : ''}
          </p>
          <p className="text-[10px] opacity-80">Choose an action to apply to all selected</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 ${VARIANT_CLASSES[action.variant || 'default']}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-white/20 backdrop-blur hover:bg-white/30 transition-all"
          title="Clear selection"
        >
          <X size={14} /> Clear
        </button>
      </div>
    </div>
  );
}

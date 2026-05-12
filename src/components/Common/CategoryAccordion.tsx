import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CategoryAccordionProps {
  category: string;
  count: number;
  summary?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  color?: string;
}

const categoryColors: Record<string, string> = {
  Tablet: 'from-blue-500 to-blue-600',
  Capsule: 'from-violet-500 to-violet-600',
  Syrup: 'from-pink-500 to-pink-600',
  Injection: 'from-red-500 to-red-600',
  Ointment: 'from-amber-500 to-amber-600',
  Drops: 'from-cyan-500 to-cyan-600',
  Inhaler: 'from-emerald-500 to-emerald-600',
  Other: 'from-slate-500 to-slate-600',
  Antibiotics: 'from-red-500 to-red-600',
  'Pain Killers': 'from-orange-500 to-orange-600',
  Antidiabetic: 'from-violet-500 to-violet-600',
  Antiulcer: 'from-blue-500 to-blue-600',
  Antiallergic: 'from-emerald-500 to-emerald-600',
  Antihypertensive: 'from-pink-500 to-pink-600',
  Bronchodilator: 'from-cyan-500 to-cyan-600',
  Corticosteroid: 'from-amber-500 to-amber-600',
};

export default function CategoryAccordion({ category, count, summary, icon, defaultOpen = true, children, color }: CategoryAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const gradient = color || categoryColors[category] || 'from-slate-500 to-slate-600';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} text-white flex items-center justify-center flex-shrink-0`}>
            {icon || <span className="text-xs font-bold">{category.charAt(0)}</span>}
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{category}</h3>
            {summary && <p className="text-xs text-slate-500 truncate">{summary}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
          {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-200 dark:border-slate-700 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

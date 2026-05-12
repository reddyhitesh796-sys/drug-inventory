import { Building2, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface WarehouseTabsProps {
  selected: string;
  onChange: (whId: string) => void;
  showAll?: boolean;
  counts?: Record<string, number>;
}

export default function WarehouseTabs({ selected, onChange, showAll = true, counts }: WarehouseTabsProps) {
  const { warehouses } = useApp();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {showAll && (
          <button
            onClick={() => onChange('All')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selected === 'All'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Globe size={15} />
            <span>All Warehouses</span>
            {counts && counts.All !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selected === 'All' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                {counts.All}
              </span>
            )}
          </button>
        )}
        {warehouses.map(wh => (
          <button
            key={wh.id}
            onClick={() => onChange(wh.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              selected === wh.id
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 size={15} />
            <span>{wh.name}</span>
            {counts && counts[wh.id] !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selected === wh.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                {counts[wh.id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

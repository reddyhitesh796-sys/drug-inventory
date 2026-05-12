import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; dir: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
}

export default function SortableHeader({ label, sortKey, currentSort, onSort, align = 'left' }: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const dir = currentSort?.dir;

  return (
    <th className={`py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 ${align === 'right' ? 'flex-row-reverse' : ''} ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
      >
        <span>{label}</span>
        {isActive ? (
          dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

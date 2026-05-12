import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';

export interface MultiSelectOption {
  id: string;
  label: string;
  description?: string;
  group?: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showSelectAll?: boolean;
  maxBadges?: number;
  emptyText?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  showSearch = true,
  showSelectAll = true,
  maxBadges = 3,
  emptyText = 'No options',
  size = 'md',
  className = '',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.description && o.description.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleOne = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };

  const toggleAll = () => {
    const enabled = filtered.filter(o => !o.disabled).map(o => o.id);
    const allSelected = enabled.every(id => selected.includes(id));
    if (allSelected) onChange(selected.filter(id => !enabled.includes(id)));
    else onChange([...new Set([...selected, ...enabled])]);
  };

  const removeOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(x => x !== id));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedOptions = options.filter(o => selected.includes(o.id));
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1.5' : 'text-sm px-3 py-2';

  // Group options
  const grouped: Record<string, MultiSelectOption[]> = {};
  filtered.forEach(o => {
    const g = o.group || '_';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(o);
  });

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full ${sizeClass} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-2 hover:border-blue-300 dark:hover:border-blue-600 focus:ring-2 focus:ring-blue-500 outline-none transition-colors`}
      >
        <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
          {selected.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            <>
              {selectedOptions.slice(0, maxBadges).map(opt => (
                <span key={opt.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                  {opt.label}
                  <span onClick={(e) => removeOne(opt.id, e)} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5"><X size={10} /></span>
                </span>
              ))}
              {selected.length > maxBadges && (
                <span className="text-xs text-slate-500 font-medium">+{selected.length - maxBadges} more</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected.length > 0 && (
            <button type="button" onClick={clearAll} className="text-slate-400 hover:text-red-500" title="Clear all">
              <X size={14} />
            </button>
          )}
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
          {showSearch && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  autoFocus
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full text-slate-700 dark:text-slate-300"
                />
                {search && <button type="button" onClick={() => setSearch('')}><X size={12} className="text-slate-400" /></button>}
              </div>
            </div>
          )}

          {showSelectAll && filtered.length > 0 && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button type="button" onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                <Check size={12} />
                {filtered.filter(o => !o.disabled).every(o => selected.includes(o.id)) ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-[10px] text-slate-500 font-medium">
                {selected.length} of {options.length} selected
              </span>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">{emptyText}</div>
            ) : (
              Object.entries(grouped).map(([group, opts]) => (
                <div key={group}>
                  {group !== '_' && (
                    <div className="px-3 py-1 bg-slate-50 dark:bg-slate-700/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                      {group}
                    </div>
                  )}
                  {opts.map(opt => {
                    const isSelected = selected.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors ${
                          opt.disabled ? 'opacity-50 cursor-not-allowed' :
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' :
                          'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={opt.disabled}
                          onChange={() => !opt.disabled && toggleOne(opt.id)}
                          className="mt-0.5 rounded text-blue-600 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{opt.label}</p>
                          {opt.description && <p className="text-[10px] text-slate-500 truncate">{opt.description}</p>}
                        </div>
                        {isSelected && <Check size={12} className="text-blue-600 flex-shrink-0 mt-1" />}
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              <span className="font-bold text-blue-600">{selected.length}</span> selected
            </span>
            <button type="button" onClick={() => setOpen(false)} className="text-[10px] text-slate-600 dark:text-slate-400 hover:text-blue-600 font-medium">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

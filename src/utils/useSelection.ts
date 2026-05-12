import { useState, useCallback } from 'react';

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const filteredIds = items.map(i => i.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
  }, [allSelected, filteredIds]);

  const clear = useCallback(() => setSelectedIds([]), []);

  const isSelected = useCallback((id: string) => selectedIds.includes(id), [selectedIds]);

  return { selectedIds, toggleOne, toggleAll, allSelected, clear, isSelected, setSelectedIds };
}

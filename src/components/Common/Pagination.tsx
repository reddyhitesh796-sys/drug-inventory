import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm">
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        <span>Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{startItem}-{endItem}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{totalItems}</span></span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {getPageNumbers().map((page, i) => (
          page === '...' ? (
            <span key={i} className="px-2 text-slate-400">···</span>
          ) : (
            <button
              key={i}
              onClick={() => onPageChange(page as number)}
              className={`min-w-[32px] px-2 py-1 rounded-lg text-sm font-medium ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {page}
            </button>
          )
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

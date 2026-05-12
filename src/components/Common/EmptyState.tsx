import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-3 text-slate-400">
        {icon || <Inbox size={28} />}
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      {message && <p className="text-sm text-slate-500 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

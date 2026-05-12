import { Lock, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AccessDeniedProps {
  module: string;
}

export default function AccessDenied({ module }: AccessDeniedProps) {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-lg w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg">
          <Lock size={36} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          You don't have permission to access the <span className="font-semibold text-slate-900 dark:text-white capitalize">{module.replace(/-/g, ' ')}</span> module.
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700 dark:text-amber-400">
              <p className="font-semibold mb-1">Logged in as: {currentUser.name}</p>
              <p>Role: <span className="font-semibold">{currentUser.role}</span></p>
              <p className="mt-2">If you need access to this module, contact your system administrator.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <ArrowLeft size={14} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
}

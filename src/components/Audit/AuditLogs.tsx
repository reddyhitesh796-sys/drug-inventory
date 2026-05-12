import { useState } from 'react';
import { Search, Download, Eye, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useExport } from '../../utils/useExport';
import type { AuditLog } from '../../types';

export default function AuditLogs() {
  const { auditLogs } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [viewLog, setViewLog] = useState<AuditLog | null>(null);

  const modules = ['All', ...new Set(auditLogs.map(l => l.module))];
  const actions = ['All', ...new Set(auditLogs.map(l => l.action))];

  const filtered = auditLogs.filter(log => {
    const matchSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase()) || log.description.toLowerCase().includes(searchQuery.toLowerCase()) || log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchModule = moduleFilter === 'All' || log.module === moduleFilter;
    const matchAction = actionFilter === 'All' || log.action === actionFilter;
    return matchSearch && matchModule && matchAction;
  });

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      Create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      View: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      Export: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      Login: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      Logout: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      'Stock Edit': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'Price Change': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[action] || 'bg-slate-100 text-slate-700';
  };

  const handleExportPDF = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Description'];
    const data = filtered.map(l => [l.timestamp, l.userName, l.userRole, l.module, l.action, l.description]);
    downloadPDF('Audit Trail Report', headers, data, 'audit-logs');
  };

  const handleExportExcel = () => {
    const headers = ['Timestamp', 'User ID', 'User Name', 'Role', 'Module', 'Action', 'Entity ID', 'Entity Type', 'Description', 'Before State', 'After State', 'IP Address'];
    const data = filtered.map(l => [l.timestamp, l.userId, l.userName, l.userRole, l.module, l.action, l.entityId, l.entityType, l.description, l.beforeState || '', l.afterState || '', l.ipAddress]);
    downloadExcel('Audit Trail Report', headers, data, 'audit-logs');
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
        <Shield size={18} className="text-amber-600" />
        <p className="text-sm text-amber-700 dark:text-amber-300">Audit logs are <strong>immutable</strong> and cannot be edited or deleted. All actions are permanently recorded for compliance.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
          </div>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            {modules.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>)}
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            {actions.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actions' : a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Timestamp</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">User</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Module</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Action</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Description</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-xs text-slate-500 font-mono">{log.timestamp}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{log.userName}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{log.userRole}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{log.module}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">{log.description}</td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => setViewLog(log)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
          Showing {filtered.length} audit entries (immutable log)
        </div>
      </div>

      {viewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Audit Log Detail</h3>
              <button onClick={() => setViewLog(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries({
                'Log ID': viewLog.id, 'Timestamp': viewLog.timestamp, 'User': viewLog.userName,
                'Role': viewLog.userRole, 'Module': viewLog.module, 'Action': viewLog.action,
                'Entity': `${viewLog.entityType} (${viewLog.entityId})`, 'Description': viewLog.description,
                'IP Address': viewLog.ipAddress,
                ...(viewLog.beforeState ? { 'Before State': viewLog.beforeState } : {}),
                ...(viewLog.afterState ? { 'After State': viewLog.afterState } : {}),
              }).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-sm text-slate-500">{key}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white text-right max-w-[60%] break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

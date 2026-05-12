import { useState, useMemo, useEffect } from 'react';
import { Download, AlertTriangle, Clock, SkullIcon, Package, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import BulkActionBar from '../Common/BulkActionBar';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useSelection } from '../../utils/useSelection';

export default function ExpiryCompliance() {
  const { batches, drugs, bulkDeleteBatches } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [activeTab, setActiveTab] = useState<'near' | 'expired' | 'dead' | 'schedule'>('near');

  const getDaysToExpiry = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const nearExpiry = useMemo(() => batches.filter(b => {
    const days = getDaysToExpiry(b.expiryDate);
    return days > 0 && days <= 90 && b.currentStock > 0;
  }).map(b => ({ ...b, daysLeft: getDaysToExpiry(b.expiryDate) })), [batches]);

  const expired = useMemo(() => batches.filter(b => getDaysToExpiry(b.expiryDate) <= 0 && b.currentStock > 0), [batches]);
  const nearExpiryValue = nearExpiry.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
  const expiredValue = expired.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);

  const deadStock = useMemo(() => batches.filter(b => {
    const daysNoMovement = Math.ceil((Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysNoMovement > 90 && b.quantityOut < b.quantityIn * 0.1 && b.status === 'Active';
  }), [batches]);
  const deadStockValue = deadStock.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);

  const scheduleDrugs = drugs.filter(d => d.scheduleType === 'H' || d.scheduleType === 'H1' || d.scheduleType === 'X');
  const scheduleBatches = useMemo(() => batches.filter(b => {
    const drug = drugs.find(d => d.id === b.drugId);
    return drug && (drug.scheduleType === 'H' || drug.scheduleType === 'H1' || drug.scheduleType === 'X');
  }), [batches, drugs]);

  // Get current tab's data for selection
  const currentTabData = useMemo(() => {
    switch (activeTab) {
      case 'near': return nearExpiry;
      case 'expired': return expired;
      case 'dead': return deadStock;
      case 'schedule': return scheduleBatches;
    }
  }, [activeTab, nearExpiry, expired, deadStock, scheduleBatches]);

  const selection = useSelection(currentTabData);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Reset selection when tab changes
  useEffect(() => {
    selection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleBulkDelete = () => {
    bulkDeleteBatches(selection.selectedIds);
    selection.clear();
    setBulkDeleteOpen(false);
  };

  const handleBulkExport = (format: 'pdf' | 'excel') => {
    const selectedItems = currentTabData.filter(item => selection.isSelected(item.id));
    let title = '', headers: string[] = [], data: (string | number)[][] = [], filename = '';
    if (activeTab === 'near') {
      title = 'Selected Near-Expiry Batches';
      headers = ['Drug', 'Batch No', 'Expiry', 'Days Left', 'Stock', 'Value', 'Warehouse'];
      data = selectedItems.map(b => {
        const days = getDaysToExpiry(b.expiryDate);
        return [b.drugName, b.batchNo, b.expiryDate, days, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2), b.warehouseName];
      });
      filename = 'near-expiry-selected';
    } else if (activeTab === 'expired') {
      title = 'Selected Expired Batches';
      headers = ['Drug', 'Batch No', 'Expiry', 'Stock', 'Value', 'Warehouse'];
      data = selectedItems.map(b => [b.drugName, b.batchNo, b.expiryDate, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2), b.warehouseName]);
      filename = 'expired-selected';
    } else if (activeTab === 'dead') {
      title = 'Selected Dead Stock Batches';
      headers = ['Drug', 'Batch No', 'Qty In', 'Qty Out', 'Stock', 'Value'];
      data = selectedItems.map(b => [b.drugName, b.batchNo, b.quantityIn, b.quantityOut, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2)]);
      filename = 'dead-stock-selected';
    } else {
      title = 'Selected Schedule Drugs';
      headers = ['Drug', 'Batch', 'Schedule', 'Stock', 'Manufacturer'];
      data = selectedItems.map(b => {
        const drug = drugs.find(d => d.id === b.drugId);
        return [b.drugName, b.batchNo, drug?.scheduleType || '', b.currentStock, drug?.manufacturer || ''];
      });
      filename = 'schedule-drugs-selected';
    }
    if (format === 'pdf') downloadPDF(title, headers, data, filename);
    else downloadExcel(title, headers, data, filename);
  };

  const tabs = [
    { id: 'near' as const, label: 'Near Expiry (90d)', count: nearExpiry.length, icon: <Clock size={16} />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
    { id: 'expired' as const, label: 'Expired Stock', count: expired.length, icon: <SkullIcon size={16} />, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { id: 'dead' as const, label: 'Dead Stock', count: deadStock.length, icon: <Package size={16} />, color: 'text-slate-600 bg-slate-100 dark:bg-slate-700' },
    { id: 'schedule' as const, label: 'Schedule Drugs', count: scheduleDrugs.length, icon: <AlertTriangle size={16} />, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  ];

  const handleExport = (format: 'pdf' | 'excel') => {
    let title = '', headers: string[] = [], data: (string | number)[][] = [], filename = '';
    if (activeTab === 'near') {
      title = 'Near Expiry Report (90 Days)';
      headers = ['Drug', 'Batch No', 'Expiry', 'Days Left', 'Stock', 'Value ₹', 'Warehouse'];
      data = nearExpiry.map(b => [b.drugName, b.batchNo, b.expiryDate, b.daysLeft, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2), b.warehouseName]);
      filename = 'near-expiry-report';
    } else if (activeTab === 'expired') {
      title = 'Expired Stock Report';
      headers = ['Drug', 'Batch No', 'Expiry', 'Stock', 'Value ₹', 'Warehouse'];
      data = expired.map(b => [b.drugName, b.batchNo, b.expiryDate, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2), b.warehouseName]);
      filename = 'expired-stock-report';
    } else if (activeTab === 'dead') {
      title = 'Dead Stock Report (>90 Days No Movement)';
      headers = ['Drug', 'Batch No', 'Stock', 'Value ₹', 'Warehouse'];
      data = deadStock.map(b => [b.drugName, b.batchNo, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2), b.warehouseName]);
      filename = 'dead-stock-report';
    } else {
      title = 'Schedule Drug Compliance Report';
      headers = ['Drug', 'Batch No', 'Schedule', 'Stock', 'MRP', 'Warehouse'];
      data = scheduleBatches.map(b => {
        const drug = drugs.find(d => d.id === b.drugId);
        return [b.drugName, b.batchNo, drug?.scheduleType || '', b.currentStock, b.mrp, b.warehouseName];
      });
      filename = 'schedule-drugs-report';
    }
    format === 'pdf' ? downloadPDF(title, headers, data, filename) : downloadExcel(title, headers, data, filename);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? `${tab.color} border border-current` : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {tab.icon}
              <span>{tab.label}</span>
              <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-xs font-bold">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('pdf')} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={() => handleExport('excel')} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selection.selectedIds.length}
        totalCount={currentTabData.length}
        onClear={selection.clear}
        label="batches"
        actions={[
          { label: 'Export PDF', icon: <Download size={12} />, onClick: () => handleBulkExport('pdf'), variant: 'primary' },
          { label: 'Export Excel', icon: <Download size={12} />, onClick: () => handleBulkExport('excel'), variant: 'success' },
          ...(activeTab !== 'schedule' ? [{ label: 'Delete Batches', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' as const }] : []),
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <p className="text-xs text-orange-600 uppercase">Near Expiry Value</p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(nearExpiryValue)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 uppercase">Expired Stock Value</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(expiredValue)}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 uppercase">Dead Stock Value</p>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{formatCurrency(deadStockValue)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'near' && (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Drug / Batch</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Expiry Date</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Days Left</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Stock</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Value ₹</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse</th>
              </tr></thead>
              <tbody>{nearExpiry.map(b => {
                const isSel = selection.isSelected(b.id);
                return (
                <tr key={b.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(b.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                  <td className="py-3 px-4"><p className="font-medium text-slate-900 dark:text-white">{b.drugName}</p><p className="text-xs text-slate-500 font-mono">{b.batchNo}</p></td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatDate(b.expiryDate)}</td>
                  <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.daysLeft <= 30 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>{b.daysLeft}d</span></td>
                  <td className="py-3 px-4 text-center font-medium text-slate-900 dark:text-white">{b.currentStock.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatCurrency(b.currentStock * b.purchasePrice)}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{b.warehouseName}</td>
                </tr>
                );
              })}</tbody>
            </table>
          )}
          {activeTab === 'expired' && (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Drug / Batch</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Expiry Date</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Stock</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Value ₹</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse</th>
              </tr></thead>
              <tbody>{expired.map(b => {
                const isSel = selection.isSelected(b.id);
                return (
                <tr key={b.id} className={`border-b border-slate-100 dark:border-slate-700 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-red-50/30 dark:bg-red-900/10'}`}>
                  <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(b.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                  <td className="py-3 px-4"><p className="font-medium text-slate-900 dark:text-white">{b.drugName}</p><p className="text-xs text-red-500 font-mono">{b.batchNo}</p></td>
                  <td className="py-3 px-4 text-red-600 dark:text-red-400 font-medium">{formatDate(b.expiryDate)}</td>
                  <td className="py-3 px-4 text-center font-medium text-red-700 dark:text-red-400">{b.currentStock.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(b.currentStock * b.purchasePrice)}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{b.warehouseName}</td>
                </tr>
                );
              })}</tbody>
            </table>
          )}
          {activeTab === 'dead' && (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Drug / Batch</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Qty In</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Qty Out</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Stock</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Value ₹</th>
              </tr></thead>
              <tbody>{deadStock.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No dead stock found</td></tr>
              ) : deadStock.map(b => {
                const isSel = selection.isSelected(b.id);
                return (
                <tr key={b.id} className={`border-b border-slate-100 dark:border-slate-700 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(b.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                  <td className="py-3 px-4"><p className="font-medium text-slate-900 dark:text-white">{b.drugName}</p><p className="text-xs text-slate-500 font-mono">{b.batchNo}</p></td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{b.quantityIn.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{b.quantityOut.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-900 dark:text-white">{b.currentStock.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatCurrency(b.currentStock * b.purchasePrice)}</td>
                </tr>
                );
              })}</tbody>
            </table>
          )}
          {activeTab === 'schedule' && (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Drug</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Batch</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Schedule</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Stock</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Manufacturer</th>
              </tr></thead>
              <tbody>{scheduleBatches.map(b => {
                const drug = drugs.find(d => d.id === b.drugId);
                const isSel = selection.isSelected(b.id);
                return (
                  <tr key={b.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(b.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{b.drugName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{b.batchNo}</td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{drug?.scheduleType}</span></td>
                    <td className="py-3 px-4 text-center font-medium text-slate-900 dark:text-white">{b.currentStock.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{drug?.manufacturer}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={`Delete ${selection.selectedIds.length} Batches?`}
        message={`Permanently remove ${selection.selectedIds.length} selected batch(es) from inventory? This will be logged in the audit trail.`}
        variant="danger"
        confirmLabel={`Delete ${selection.selectedIds.length}`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

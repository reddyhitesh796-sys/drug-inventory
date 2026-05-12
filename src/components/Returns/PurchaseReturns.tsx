import { useState, useMemo } from 'react';
import { Download, RotateCcw, X, Plus, Trash2, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import EmptyState from '../Common/EmptyState';
import BulkActionBar from '../Common/BulkActionBar';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useSelection } from '../../utils/useSelection';
import type { PurchaseReturnItem } from '../../types';

export default function PurchaseReturns() {
  const { purchaseReturns, vendors, batches, addPurchaseReturn, bulkDeletePurchaseReturns } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [showForm, setShowForm] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [overallReason, setOverallReason] = useState('');
  const [items, setItems] = useState<{ batchId: string; drugId: string; drugName: string; batchNo: string; quantity: number; maxQty: number; unitPrice: number; reason: string }[]>([]);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  // Multi-select
  const selection = useSelection(purchaseReturns);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const handleBulkDelete = () => {
    bulkDeletePurchaseReturns(selection.selectedIds);
    selection.clear();
    setBulkDeleteOpen(false);
  };

  // Show batches that match the GRN id pattern OR allow user to select any batch with stock
  const availableBatches = useMemo(() => {
    return batches.filter(b => b.currentStock > 0);
  }, [batches]);

  const handleAddItem = (batchId: string) => {
    if (items.find(it => it.batchId === batchId)) return;
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    setItems(prev => [...prev, {
      batchId: batch.id,
      drugId: batch.drugId,
      drugName: batch.drugName,
      batchNo: batch.batchNo,
      quantity: 0,
      maxQty: batch.currentStock,
      unitPrice: batch.purchasePrice,
      reason: '',
    }]);
  };

  const updateItemQty = (idx: number, qty: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.min(Math.max(0, qty), it.maxQty) } : it));
  };

  const updateItemReason = (idx: number, reason: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, reason } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = useMemo(() => items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0), [items]);
  const itemsToReturn = items.filter(it => it.quantity > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || itemsToReturn.length === 0) return;
    const returnItems: PurchaseReturnItem[] = itemsToReturn.map(it => ({
      drugId: it.drugId,
      drugName: it.drugName,
      batchId: it.batchId,
      batchNo: it.batchNo,
      quantity: it.quantity,
      amount: it.quantity * it.unitPrice,
      reason: it.reason || overallReason,
    }));
    // Find first batch's GRN id to link
    const firstBatch = batches.find(b => b.id === itemsToReturn[0].batchId);
    addPurchaseReturn({
      grnId: firstBatch?.grnId || 'GRN-MANUAL',
      grnNumber: firstBatch?.grnId || 'GRN-MANUAL',
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      items: returnItems,
      totalAmount,
      reason: overallReason,
      returnDate: new Date().toISOString().substring(0, 10),
      status: 'Dispatched',
      processedBy: 'Admin User',
    });
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedVendorId('');
    setOverallReason('');
    setItems([]);
  };

  const handleExportPDF = () => {
    const headers = ['Return #', 'GRN', 'Vendor', 'Date', 'Items', 'Amount', 'Reason', 'Status'];
    const data = purchaseReturns.map(pr => [pr.returnNumber, pr.grnNumber, pr.vendorName, pr.returnDate, pr.items.length, pr.totalAmount, pr.reason, pr.status]);
    downloadPDF('Purchase Returns', headers, data, 'purchase-returns');
  };

  const handleExportExcel = () => {
    const headers = ['Return Number', 'GRN Number', 'Vendor', 'Return Date', 'Total Amount', 'Reason', 'Status', 'Processed By'];
    const data = purchaseReturns.map(pr => [pr.returnNumber, pr.grnNumber, pr.vendorName, pr.returnDate, pr.totalAmount, pr.reason, pr.status, pr.processedBy]);
    downloadExcel('Purchase Returns', headers, data, 'purchase-returns');
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Returns', value: purchaseReturns.length, color: 'bg-blue-500' },
          { label: 'Accepted', value: purchaseReturns.filter(p => p.status === 'Accepted').length, color: 'bg-emerald-500' },
          { label: 'Dispatched', value: purchaseReturns.filter(p => p.status === 'Dispatched').length, color: 'bg-amber-500' },
          { label: 'Total Value', value: formatCurrency(purchaseReturns.reduce((s, r) => s + r.totalAmount, 0)), color: 'bg-orange-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${s.color}`} />
            <div className="min-w-0"><p className="text-[10px] uppercase text-slate-500">{s.label}</p><p className="text-base font-bold text-slate-900 dark:text-white truncate">{s.value}</p></div>
          </div>
        ))}
      </div>

      <BulkActionBar
        selectedCount={selection.selectedIds.length}
        totalCount={purchaseReturns.length}
        onClear={selection.clear}
        label="returns"
        actions={[
          { label: 'Delete Selected', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' },
        ]}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Returns automatically deduct stock from inventory</p>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shadow"><RotateCcw size={16} /> New Return</button>
        </div>
      </div>

      {purchaseReturns.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<RotateCcw size={28} />} title="No purchase returns yet" message="Create your first return to a vendor." action={<button onClick={() => setShowForm(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">Create First Return</button>} />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Return #</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">GRN</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Items</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Reason</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchaseReturns.map(pr => {
                  const isSel = selection.isSelected(pr.id);
                  return (
                  <tr key={pr.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(pr.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{pr.returnNumber}</td>
                    <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{pr.grnNumber}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{pr.vendorName}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatDate(pr.returnDate)}</td>
                    <td className="py-3 px-4">{pr.items.map((item, i) => <div key={i} className="text-xs text-slate-600 dark:text-slate-400">{item.drugName} × {item.quantity}</div>)}</td>
                    <td className="py-3 px-4 text-right font-medium text-orange-600 dark:text-orange-400 font-mono">{formatCurrency(pr.totalAmount)}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{pr.reason}</td>
                    <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      pr.status === 'Accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      pr.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      pr.status === 'Dispatched' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>{pr.status}</span></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Return Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={resetForm}>
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Purchase Return</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select vendor → add batches → quantities → reason</p>
              </div>
              <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Vendor Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Select Vendor *</label>
                  <select required value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                    <option value="">-- Choose vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Add Batch</label>
                  <select value="" onChange={e => { if (e.target.value) handleAddItem(e.target.value); }} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                    <option value="">-- Select batch to add --</option>
                    {availableBatches.filter(b => !items.find(it => it.batchId === b.id)).map(b => (
                      <option key={b.id} value={b.id}>{b.drugName} • {b.batchNo} • Stock: {b.currentStock} • {b.warehouseName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedVendor && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-[10px] text-blue-600 uppercase">Vendor</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedVendor.name}</p>
                  </div>
                  <div className="bg-violet-50 dark:bg-violet-900/20 p-3 rounded-lg">
                    <p className="text-[10px] text-violet-600 uppercase">Contact</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedVendor.contactPerson}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <p className="text-[10px] text-orange-600 uppercase">Return Total</p>
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-400">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              {items.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Items to return ({items.length})</h4>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Drug / Batch</th>
                          <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-xs">Available</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Unit Cost</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Return Qty</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Amount</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Reason</th>
                          <th className="text-center py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 px-3">
                              <p className="text-xs font-medium text-slate-900 dark:text-white">{it.drugName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{it.batchNo}</p>
                            </td>
                            <td className="py-2 px-2 text-center text-xs text-slate-600 dark:text-slate-400">{it.maxQty}</td>
                            <td className="py-2 px-3 text-right text-xs text-slate-600 dark:text-slate-400 font-mono">{formatCurrency(it.unitPrice)}</td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={it.maxQty}
                                value={it.quantity || ''}
                                onChange={e => updateItemQty(idx, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-center text-slate-900 dark:text-white"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2 px-3 text-right text-xs font-bold text-orange-600 dark:text-orange-400 font-mono">
                              {it.quantity > 0 ? formatCurrency(it.quantity * it.unitPrice) : '—'}
                            </td>
                            <td className="py-2 px-3">
                              <input type="text" value={it.reason} onChange={e => updateItemReason(idx, e.target.value)} placeholder="Item reason" className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-white" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {itemsToReturn.length > 0 && (
                        <tfoot className="bg-slate-50 dark:bg-slate-700/30">
                          <tr>
                            <td colSpan={4} className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white text-xs">Total Return Amount:</td>
                            <td className="py-2 px-3 text-right font-bold text-orange-600 dark:text-orange-400 font-mono">{formatCurrency(totalAmount)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Overall Return Reason *</label>
                <textarea required rows={2} value={overallReason} onChange={e => setOverallReason(e.target.value)} placeholder="e.g., Manufacturing defect found, Damaged consignment, Expired stock, Wrong product delivered, etc." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white resize-none" />
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start gap-2">
                <FileText size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-700 dark:text-orange-400">
                  <p className="font-semibold mb-0.5">Stock Deduction</p>
                  <p>Returned units will be automatically deducted from the source batch in inventory. The action will be logged in the audit trail.</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center sticky bottom-0 bg-white dark:bg-slate-800">
              <div className="text-xs text-slate-500">
                {itemsToReturn.length > 0 ? <span className="font-semibold text-orange-600">{itemsToReturn.length} item(s) selected • Total: {formatCurrency(totalAmount)}</span> : 'No items selected for return'}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                <button
                  type="submit"
                  disabled={!selectedVendor || itemsToReturn.length === 0 || !overallReason.trim()}
                  className="flex items-center gap-1.5 px-6 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium shadow"
                >
                  <Plus size={14} /> Create Return
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={`Delete ${selection.selectedIds.length} Purchase Returns?`}
        message="This will permanently remove the selected returns. Action will be logged."
        variant="danger"
        confirmLabel={`Delete ${selection.selectedIds.length}`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

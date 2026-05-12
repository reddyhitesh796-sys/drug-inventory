import { useState, useMemo } from 'react';
import { Download, RotateCcw, X, Plus, Trash2, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import EmptyState from '../Common/EmptyState';
import BulkActionBar from '../Common/BulkActionBar';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useSelection } from '../../utils/useSelection';
import type { SalesReturnItem } from '../../types';

export default function SalesReturns() {
  const { salesReturns, salesInvoices, addSalesReturn, bulkDeleteSalesReturns } = useApp();
  const selection = useSelection(salesReturns);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const handleBulkDelete = () => {
    bulkDeleteSalesReturns(selection.selectedIds);
    selection.clear();
    setBulkDeleteOpen(false);
  };
  const { downloadPDF, downloadExcel } = useExport();
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [overallReason, setOverallReason] = useState('');
  const [items, setItems] = useState<{ batchId: string; drugId: string; drugName: string; batchNo: string; quantity: number; maxQty: number; unitPrice: number; reason: string }[]>([]);

  const selectedInvoice = salesInvoices.find(inv => inv.id === selectedInvoiceId);

  // When invoice selected, populate available items
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = salesInvoices.find(i => i.id === invId);
    if (inv) {
      setItems(inv.items.map(it => ({
        batchId: it.batchId,
        drugId: it.drugId,
        drugName: it.drugName,
        batchNo: it.batchNo,
        quantity: 0,
        maxQty: it.quantity,
        unitPrice: it.sellingPrice,
        reason: '',
      })));
    } else {
      setItems([]);
    }
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
    if (!selectedInvoice || itemsToReturn.length === 0) return;
    const returnItems: SalesReturnItem[] = itemsToReturn.map(it => ({
      drugId: it.drugId,
      drugName: it.drugName,
      batchId: it.batchId,
      batchNo: it.batchNo,
      quantity: it.quantity,
      amount: it.quantity * it.unitPrice,
      reason: it.reason || overallReason,
    }));
    addSalesReturn({
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.invoiceNumber,
      customerId: selectedInvoice.customerId,
      customerName: selectedInvoice.customerName,
      items: returnItems,
      totalAmount,
      reason: overallReason || returnReason || 'Customer return',
      returnDate: new Date().toISOString().substring(0, 10),
      status: 'Accepted',
      processedBy: 'Admin User',
    });
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedInvoiceId('');
    setReturnReason('');
    setOverallReason('');
    setItems([]);
  };

  const handleExportPDF = () => {
    const headers = ['Return #', 'Invoice', 'Customer', 'Date', 'Items', 'Amount ₹', 'Reason', 'Status'];
    const data = salesReturns.map(sr => [sr.returnNumber, sr.invoiceNumber, sr.customerName, sr.returnDate, sr.items.length, sr.totalAmount, sr.reason, sr.status]);
    downloadPDF('Sales Returns', headers, data, 'sales-returns');
  };

  const handleExportExcel = () => {
    const headers = ['Return Number', 'Invoice Number', 'Customer', 'Return Date', 'Total Amount', 'Reason', 'Status', 'Processed By'];
    const data = salesReturns.map(sr => [sr.returnNumber, sr.invoiceNumber, sr.customerName, sr.returnDate, sr.totalAmount, sr.reason, sr.status, sr.processedBy]);
    downloadExcel('Sales Returns', headers, data, 'sales-returns');
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Returns', value: salesReturns.length, color: 'bg-blue-500' },
          { label: 'Accepted', value: salesReturns.filter(s => s.status === 'Accepted').length, color: 'bg-emerald-500' },
          { label: 'Pending', value: salesReturns.filter(s => s.status === 'Pending').length, color: 'bg-amber-500' },
          { label: 'Total Value', value: formatCurrency(salesReturns.reduce((s, r) => s + r.totalAmount, 0)), color: 'bg-orange-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${s.color}`} />
            <div className="min-w-0"><p className="text-[10px] uppercase text-slate-500">{s.label}</p><p className="text-base font-bold text-slate-900 dark:text-white truncate">{s.value}</p></div>
          </div>
        ))}
      </div>

      <BulkActionBar
        selectedCount={selection.selectedIds.length}
        totalCount={salesReturns.length}
        onClear={selection.clear}
        label="returns"
        actions={[
          { label: 'Delete Selected', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' },
        ]}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Returns automatically re-add stock to inventory</p>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shadow"><RotateCcw size={16} /> New Return</button>
        </div>
      </div>

      {salesReturns.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<RotateCcw size={28} />} title="No sales returns yet" message="Create your first return from a delivered invoice." action={<button onClick={() => setShowForm(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">Create First Return</button>} />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Return #</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Invoice</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Items</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Reason</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {salesReturns.map(sr => {
                  const isSel = selection.isSelected(sr.id);
                  return (
                  <tr key={sr.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(sr.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{sr.returnNumber}</td>
                    <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{sr.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{sr.customerName}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatDate(sr.returnDate)}</td>
                    <td className="py-3 px-4">{sr.items.map((item, i) => <div key={i} className="text-xs text-slate-600 dark:text-slate-400">{item.drugName} × {item.quantity}</div>)}</td>
                    <td className="py-3 px-4 text-right font-medium text-orange-600 dark:text-orange-400 font-mono">{formatCurrency(sr.totalAmount)}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{sr.reason}</td>
                    <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      sr.status === 'Accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      sr.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>{sr.status}</span></td>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Sales Return</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select invoice → choose items → quantities → reason</p>
              </div>
              <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Invoice Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Select Invoice *</label>
                <select required value={selectedInvoiceId} onChange={e => handleSelectInvoice(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="">-- Choose an invoice --</option>
                  {salesInvoices.filter(i => i.status === 'Delivered').map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} • {inv.customerName} • {formatDate(inv.invoiceDate)} • {formatCurrency(inv.totalAmount)}</option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-[10px] text-blue-600 uppercase">Customer</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedInvoice.customerName}</p>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-900/20 p-3 rounded-lg">
                      <p className="text-[10px] text-violet-600 uppercase">Warehouse</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedInvoice.warehouseName}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                      <p className="text-[10px] text-emerald-600 uppercase">Original Total</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(selectedInvoice.totalAmount)}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <p className="text-[10px] text-orange-600 uppercase">Return Total</p>
                      <p className="text-xs font-bold text-orange-700 dark:text-orange-400">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Select items to return</h4>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Drug / Batch</th>
                            <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-xs">Sold Qty</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Unit Price</th>
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
                                <input
                                  type="text"
                                  value={it.reason}
                                  onChange={e => updateItemReason(idx, e.target.value)}
                                  placeholder="Item reason (optional)"
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-white"
                                />
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

                  {/* Overall Reason */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Overall Return Reason *</label>
                    <textarea required rows={2} value={overallReason} onChange={e => setOverallReason(e.target.value)} placeholder="e.g., Customer found damaged packaging, Wrong order delivered, etc." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white resize-none" />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
                    <FileText size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                      <p className="font-semibold mb-0.5">Stock Re-entry</p>
                      <p>Returned units will be automatically added back to the original batch in inventory. The action will be logged in the audit trail.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center sticky bottom-0 bg-white dark:bg-slate-800">
              <div className="text-xs text-slate-500">
                {itemsToReturn.length > 0 ? <span className="font-semibold text-orange-600">{itemsToReturn.length} item(s) selected • Total: {formatCurrency(totalAmount)}</span> : 'No items selected for return'}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                <button
                  type="submit"
                  disabled={!selectedInvoice || itemsToReturn.length === 0 || !overallReason.trim()}
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
        title={`Delete ${selection.selectedIds.length} Sales Returns?`}
        message="This will permanently remove the selected returns. Action will be logged."
        variant="danger"
        confirmLabel={`Delete ${selection.selectedIds.length}`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

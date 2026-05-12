import { useState, useMemo } from 'react';
import { Search, Download, Plus, Eye, FileText, X, ShoppingCart, Edit2, Trash2, Printer, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import EmptyState from '../Common/EmptyState';
import WarehouseTabs from '../Common/WarehouseTabs';
import BulkActionBar from '../Common/BulkActionBar';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useSelection } from '../../utils/useSelection';
import { useToast } from '../../context/ToastContext';
import InvoiceForm from './InvoiceForm';
import InvoicePrint from './InvoicePrint';
import type { SalesInvoice } from '../../types';

export default function SalesInvoices() {
  const { salesInvoices, warehouses, deleteSalesInvoice, bulkDeleteSalesInvoices } = useApp();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = currentUser.role === 'Admin';
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; inv: SalesInvoice | null }>({ open: false, inv: null });
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);

  const handleEdit = (inv: SalesInvoice) => {
    setEditingInvoice(inv);
    setShowForm(true);
  };
  const handleDelete = () => {
    if (confirmDelete.inv) {
      deleteSalesInvoice(confirmDelete.inv.id);
      setConfirmDelete({ open: false, inv: null });
    }
  };
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [viewInvoice, setViewInvoice] = useState<SalesInvoice | null>(null);

  const filtered = useMemo(() => {
    return salesInvoices.filter(inv => {
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || inv.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
      const matchPayment = paymentFilter === 'All' || inv.paymentType === paymentFilter;
      const matchWh = warehouseFilter === 'All' || inv.warehouseId === warehouseFilter;
      return matchSearch && matchStatus && matchPayment && matchWh;
    });
  }, [salesInvoices, searchQuery, statusFilter, paymentFilter, warehouseFilter]);

  const selection = useSelection(filtered);
  const handleBulkDelete = () => {
    bulkDeleteSalesInvoices(selection.selectedIds);
    selection.clear();
    setBulkDeleteOpen(false);
  };

  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: salesInvoices.length };
    warehouses.forEach(w => { counts[w.id] = salesInvoices.filter(inv => inv.warehouseId === w.id).length; });
    return counts;
  }, [warehouses, salesInvoices]);

  const totalRevenue = filtered.reduce((s, inv) => s + inv.totalAmount, 0);
  const totalPaid = filtered.reduce((s, inv) => s + inv.paidAmount, 0);
  const totalDue = filtered.reduce((s, inv) => s + inv.dueAmount, 0);

  const handleExportPDF = () => {
    const headers = ['Invoice', 'Customer', 'Date', 'Warehouse', 'Items', 'Total', 'Paid', 'Due', 'Payment', 'Status'];
    const data = filtered.map(inv => [inv.invoiceNumber, inv.customerName, inv.invoiceDate, inv.warehouseName, inv.items.length, inv.totalAmount.toFixed(2), inv.paidAmount.toFixed(2), inv.dueAmount.toFixed(2), inv.paymentType, inv.status]);
    downloadPDF(`Sales Invoices ${warehouseFilter !== 'All' ? `(${warehouses.find(w => w.id === warehouseFilter)?.name})` : ''}`, headers, data, 'sales-invoices');
  };

  const handleExportExcel = () => {
    const headers = ['Invoice', 'Customer', 'Date', 'Due Date', 'Warehouse', 'Items', 'Subtotal', 'GST', 'Discount', 'Total', 'Paid', 'Due', 'Payment Type', 'Status', 'Created By'];
    const data = filtered.map(inv => [inv.invoiceNumber, inv.customerName, inv.invoiceDate, inv.dueDate || '', inv.warehouseName, inv.items.length, inv.subtotal, inv.gstAmount, inv.discount, inv.totalAmount, inv.paidAmount, inv.dueAmount, inv.paymentType, inv.status, inv.createdBy]);
    downloadExcel('Sales Invoices', headers, data, 'sales-invoices');
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices', value: filtered.length.toString(), color: 'bg-blue-500' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'bg-emerald-500' },
          { label: 'Collected', value: formatCurrency(totalPaid), color: 'bg-violet-500' },
          { label: 'Outstanding', value: formatCurrency(totalDue), color: totalDue > 0 ? 'bg-red-500' : 'bg-slate-400' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${s.color}`} />
            <div className="min-w-0"><p className="text-[10px] uppercase text-slate-500">{s.label}</p><p className="text-base font-bold text-slate-900 dark:text-white truncate">{s.value}</p></div>
          </div>
        ))}
      </div>

      <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} counts={whCounts} />

      <BulkActionBar
        selectedCount={selection.selectedIds.length}
        totalCount={filtered.length}
        onClear={selection.clear}
        label="invoices"
        actions={isAdmin ? [
          { label: 'Cancel & Restore Stock', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' as const },
        ] : [
          { label: 'Admin Only', icon: <Lock size={12} />, onClick: () => showToast('error', 'Permission Denied', 'Only Admin users can delete invoices'), variant: 'default' as const },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search invoices..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <option value="All">All Status</option><option value="Confirmed">Confirmed</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option>
          </select>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <option value="All">All Payments</option><option value="Cash">Cash</option><option value="Credit">Credit</option><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
          <button onClick={() => { setEditingInvoice(null); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"><Plus size={16} /> New Invoice</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<ShoppingCart size={28} />} title="No invoices" message="No invoices match the current filters." />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Invoice</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Total</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Paid</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Due</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Payment</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const isSel = selection.isSelected(inv.id);
                  return (
                  <tr key={inv.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(inv.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                    <td className="py-3 px-4"><div className="flex items-center gap-2"><FileText size={16} className="text-blue-500" /><span className="font-medium text-slate-900 dark:text-white">{inv.invoiceNumber}</span></div></td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{inv.customerName}</td>
                    <td className="py-3 px-4"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">{inv.warehouseName}</span></td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white font-mono">{formatCurrency(inv.totalAmount)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(inv.paidAmount)}</td>
                    <td className="py-3 px-4 text-right"><span className={inv.dueAmount > 0 ? 'text-red-600 font-medium font-mono' : 'text-slate-500 font-mono'}>{formatCurrency(inv.dueAmount)}</span></td>
                    <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      inv.paymentType === 'Cash' ? 'bg-green-100 text-green-700' :
                      inv.paymentType === 'Credit' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{inv.paymentType}</span></td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{inv.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewInvoice(inv)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600" title="View"><Eye size={14} /></button>
                        <button onClick={() => setPrintInvoice(inv)} className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600" title="Print"><Printer size={14} /></button>
                        <button onClick={() => handleEdit(inv)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600" title="Edit"><Edit2 size={14} /></button>
                        {isAdmin ? (
                          <button onClick={() => setConfirmDelete({ open: true, inv })} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" title="Delete (Admin)"><Trash2 size={14} /></button>
                        ) : (
                          <button onClick={() => showToast('error', 'Permission Denied', 'Only Admin users can delete invoices')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 cursor-not-allowed" title="Delete restricted to Admin"><Lock size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setViewInvoice(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewInvoice.invoiceNumber}</h3>
                <p className="text-sm text-slate-500">{viewInvoice.customerName} • {formatDate(viewInvoice.invoiceDate)} • From: {viewInvoice.warehouseName}</p>
              </div>
              <button onClick={() => setViewInvoice(null)} className="text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Drug</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Batch</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Rate</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                </tr></thead>
                <tbody>{viewInvoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{item.drugName}</td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-500">{item.batchNo}</td>
                    <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">{item.quantity}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(item.sellingPrice)}</td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1 text-sm text-right">
                <div><span className="text-slate-500">Subtotal: </span><span className="font-medium">{formatCurrency(viewInvoice.subtotal)}</span></div>
                <div><span className="text-slate-500">GST: </span><span className="font-medium">{formatCurrency(viewInvoice.gstAmount)}</span></div>
                <div className="text-lg"><span className="text-slate-500">Total: </span><span className="font-bold text-slate-900 dark:text-white">{formatCurrency(viewInvoice.totalAmount)}</span></div>
                <div><span className="text-slate-500">Paid: </span><span className="font-medium text-emerald-600">{formatCurrency(viewInvoice.paidAmount)}</span></div>
                {viewInvoice.dueAmount > 0 && <div><span className="text-slate-500">Due: </span><span className="font-bold text-red-600">{formatCurrency(viewInvoice.dueAmount)}</span></div>}
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={() => { setPrintInvoice(viewInvoice); setViewInvoice(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700"><Printer size={12} /> Print</button>
                <button onClick={() => { handleEdit(viewInvoice); setViewInvoice(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"><Edit2 size={12} /> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Invoice Form */}
      {showForm && <InvoiceForm invoice={editingInvoice} onClose={() => { setShowForm(false); setEditingInvoice(null); }} defaultWarehouseId={warehouseFilter !== 'All' ? warehouseFilter : undefined} />}

      {/* Print Invoice */}
      {printInvoice && <InvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />}

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Cancel Invoice?"
        message={confirmDelete.inv ? `Cancel invoice ${confirmDelete.inv.invoiceNumber}? Stock will be restored to inventory and the action will be logged.` : ''}
        variant="danger"
        confirmLabel="Cancel Invoice"
        cancelLabel="Keep Invoice"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, inv: null })}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={`Cancel ${selection.selectedIds.length} Invoices?`}
        message={`Cancel all ${selection.selectedIds.length} selected invoices? Stock will be restored for each, and actions will be logged.`}
        variant="danger"
        confirmLabel={`Cancel ${selection.selectedIds.length} Invoices`}
        cancelLabel="Keep All"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

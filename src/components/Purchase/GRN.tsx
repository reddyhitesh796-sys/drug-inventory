import { useState, useMemo } from 'react';
import { Download, Eye, X, FileText, Package, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import EmptyState from '../Common/EmptyState';
import WarehouseTabs from '../Common/WarehouseTabs';
import BulkActionBar from '../Common/BulkActionBar';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useSelection } from '../../utils/useSelection';

interface GrnRecord {
  id: string;
  grnNumber: string;
  poNumber: string;
  poId: string;
  vendorName: string;
  warehouseId: string;
  warehouseName: string;
  receivedDate: string;
  itemsCount: number;
  totalAmount: number;
  status: 'Accepted';
}

export default function GRN() {
  const { purchaseOrders, warehouses } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [viewGrn, setViewGrn] = useState<GrnRecord | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Build GRN records from received POs
  const allGrns: GrnRecord[] = useMemo(() => purchaseOrders
    .filter(po => po.status === 'Received')
    .map(po => ({
      id: po.id.replace('PO', 'GRN'),
      grnNumber: po.poNumber.replace('PO', 'GRN'),
      poId: po.id,
      poNumber: po.poNumber,
      vendorName: po.vendorName,
      warehouseId: po.warehouseId,
      warehouseName: po.warehouseName,
      receivedDate: po.receivedDate || po.orderDate,
      itemsCount: po.items.length,
      totalAmount: po.totalAmount,
      status: 'Accepted' as const,
    })), [purchaseOrders]);

  const filtered = useMemo(() => {
    return allGrns.filter(g => {
      const matchSearch = g.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchWh = warehouseFilter === 'All' || g.warehouseId === warehouseFilter;
      return matchSearch && matchWh;
    });
  }, [allGrns, searchQuery, warehouseFilter]);

  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allGrns.length };
    warehouses.forEach(w => { counts[w.id] = allGrns.filter(g => g.warehouseId === w.id).length; });
    return counts;
  }, [warehouses, allGrns]);

  const selection = useSelection(filtered);

  const handleExportPDF = () => {
    const headers = ['GRN', 'PO', 'Vendor', 'Warehouse', 'Received Date', 'Items', 'Amount'];
    const data = filtered.map(g => [g.grnNumber, g.poNumber, g.vendorName, g.warehouseName, g.receivedDate, g.itemsCount, g.totalAmount]);
    downloadPDF(`GRN ${warehouseFilter !== 'All' ? `(${warehouses.find(w => w.id === warehouseFilter)?.name})` : ''}`, headers, data, 'grn');
  };

  const handleExportExcel = () => {
    const headers = ['GRN Number', 'PO Number', 'Vendor', 'Warehouse', 'Received Date', 'Items', 'Total Amount', 'Status'];
    const data = filtered.map(g => [g.grnNumber, g.poNumber, g.vendorName, g.warehouseName, g.receivedDate, g.itemsCount, g.totalAmount, g.status]);
    downloadExcel('Goods Receipt Notes', headers, data, 'grn');
  };

  const handleBulkExport = () => {
    const selectedGrns = filtered.filter(g => selection.isSelected(g.id));
    const headers = ['GRN Number', 'PO Number', 'Vendor', 'Warehouse', 'Received Date', 'Items', 'Total Amount'];
    const data = selectedGrns.map(g => [g.grnNumber, g.poNumber, g.vendorName, g.warehouseName, g.receivedDate, g.itemsCount, g.totalAmount]);
    downloadPDF('Selected GRNs', headers, data, 'grn-selected');
    setBulkConfirmOpen(false);
    selection.clear();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total GRNs', value: filtered.length, color: 'bg-blue-500' },
          { label: 'Total Items Received', value: filtered.reduce((s, g) => s + g.itemsCount, 0), color: 'bg-emerald-500' },
          { label: 'Total Receipt Value', value: formatCurrency(filtered.reduce((s, g) => s + g.totalAmount, 0)), color: 'bg-violet-500' },
          { label: 'Warehouses', value: new Set(filtered.map(g => g.warehouseId)).size, color: 'bg-amber-500' },
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
        label="GRNs"
        actions={[
          { label: 'Export Selected', icon: <Download size={12} />, onClick: () => setBulkConfirmOpen(true), variant: 'primary' },
        ]}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search GRN, PO, vendor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400"><X size={14} /></button>}
          </div>
          <p className="text-xs text-slate-500">Auto-generated from received POs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<FileText size={28} />} title="No GRNs found" message="GRNs are auto-created when POs are marked as received." />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">GRN Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">PO Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Received</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Items</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const isSel = selection.isSelected(g.id);
                  return (
                    <tr key={g.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(g.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{g.grnNumber}</td>
                      <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{g.poNumber}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{g.vendorName}</td>
                      <td className="py-3 px-4"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">{g.warehouseName}</span></td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{formatDate(g.receivedDate)}</td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{g.itemsCount}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white font-mono text-xs">{formatCurrency(g.totalAmount)}</td>
                      <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{g.status}</span></td>
                      <td className="py-3 px-4 text-center"><button onClick={() => setViewGrn(g)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><Eye size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setViewGrn(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1"><Package size={18} className="text-emerald-600" /><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewGrn.grnNumber}</h3></div>
                <p className="text-xs text-slate-500">Linked to PO: {viewGrn.poNumber}</p>
              </div>
              <button onClick={() => setViewGrn(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries({
                'Vendor': viewGrn.vendorName,
                'Warehouse': viewGrn.warehouseName,
                'Received Date': formatDate(viewGrn.receivedDate),
                'Items Count': viewGrn.itemsCount,
                'Total Amount': formatCurrency(viewGrn.totalAmount),
                'Status': viewGrn.status,
              }).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-sm text-slate-500">{k}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={bulkConfirmOpen}
        title={`Export ${selection.selectedIds.length} GRNs?`}
        message={`Generate a PDF with the ${selection.selectedIds.length} selected GRNs.`}
        variant="info"
        confirmLabel="Export"
        onConfirm={handleBulkExport}
        onCancel={() => setBulkConfirmOpen(false)}
      />
    </div>
  );
}

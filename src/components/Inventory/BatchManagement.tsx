import { useState, useMemo } from 'react';
import { Search, Download, AlertTriangle, Package, Plus, Edit2, Trash2, X, ArrowRightLeft, Settings2, IndianRupee, Boxes, LayoutGrid, List, CheckCircle2, XCircle, Calculator } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import ConfirmDialog from '../Common/ConfirmDialog';
import EmptyState from '../Common/EmptyState';
import WarehouseTabs from '../Common/WarehouseTabs';
import CategoryAccordion from '../Common/CategoryAccordion';
import BulkActionBar from '../Common/BulkActionBar';
import { useSelection } from '../../utils/useSelection';
import type { Batch } from '../../types';

export default function BatchManagement() {
  const { batches, drugs, warehouses, addBatch, updateBatch, deleteBatch, bulkDeleteBatches, transferBatchStock, adjustBatchStock } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [groupBy, setGroupBy] = useState<'therapeutic' | 'category'>('therapeutic');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [transferBatch, setTransferBatch] = useState<Batch | null>(null);
  const [adjustBatch, setAdjustBatch] = useState<Batch | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[]; name: string }>({ open: false, ids: [], name: '' });

  const [transferData, setTransferData] = useState({ toWarehouseId: '', quantity: 0 });
  const [adjustData, setAdjustData] = useState({ newQty: 0, reason: '' });

  const [formData, setFormData] = useState({
    drugId: '', batchNo: '', expiryDate: '',
    mrp: 0, purchasePrice: 0, sellingPrice: 0,
    orderPlaced: 0, rejected: 0,
    warehouseId: 'WH001', grnId: 'GRN-MANUAL',
    status: 'Active' as Batch['status'],
  });

  const getDaysToExpiry = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const getExpiryColor = (days: number) => {
    if (days <= 0) return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    if (days <= 90) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    if (days <= 180) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
  };

  // Effective status (auto-correct if expired)
  const getEffectiveStatus = (b: Batch): Batch['status'] => {
    if (new Date(b.expiryDate) < new Date()) return 'Expired';
    if (b.currentStock <= 0) return 'Depleted';
    if (b.status === 'Quarantine') return 'Quarantine';
    return 'Active';
  };

  // Filter
  const filtered = useMemo(() => {
    return batches.filter(b => {
      const matchSearch = b.drugName.toLowerCase().includes(searchQuery.toLowerCase()) || b.batchNo.toLowerCase().includes(searchQuery.toLowerCase());
      const effStatus = getEffectiveStatus(b);
      const matchStatus = statusFilter === 'All' || effStatus === statusFilter;
      const matchWh = warehouseFilter === 'All' || b.warehouseId === warehouseFilter;
      return matchSearch && matchStatus && matchWh;
    });
  }, [batches, searchQuery, statusFilter, warehouseFilter]);

  // Selection
  const selection = useSelection(filtered);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const handleBulkDelete = () => {
    bulkDeleteBatches(selection.selectedIds);
    selection.clear();
    setBulkDeleteOpen(false);
  };

  // Counts per warehouse
  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: batches.length };
    warehouses.forEach(w => { counts[w.id] = batches.filter(b => b.warehouseId === w.id).length; });
    return counts;
  }, [warehouses, batches]);

  // Group by therapeutic / drug form
  const grouped = useMemo(() => {
    const groups: Record<string, Batch[]> = {};
    filtered.forEach(b => {
      const drug = drugs.find(d => d.id === b.drugId);
      const key = drug ? (groupBy === 'therapeutic' ? drug.therapeuticCategory : drug.category) : 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, drugs, groupBy]);

  // Computed received qty for the form
  const receivedQty = Math.max(0, formData.orderPlaced - formData.rejected);
  const acceptanceRate = formData.orderPlaced > 0 ? (receivedQty / formData.orderPlaced) * 100 : 0;

  const handleExportPDF = () => {
    const headers = ['Drug', 'Batch', 'Therapeutic', 'Form', 'Expiry', 'Ordered', 'Rejected', 'Received', 'Sold', 'Stock', 'Warehouse', 'Status'];
    const data = filtered.map(b => {
      const drug = drugs.find(d => d.id === b.drugId);
      return [b.drugName, b.batchNo, drug?.therapeuticCategory || '', drug?.category || '', b.expiryDate, b.orderPlaced, b.rejected, b.quantityIn, b.quantityOut, b.currentStock, b.warehouseName, getEffectiveStatus(b)];
    });
    downloadPDF(`Batch Report ${warehouseFilter !== 'All' ? `(${warehouses.find(w => w.id === warehouseFilter)?.name})` : '(All)'}`, headers, data, 'batch-management');
  };

  const handleExportExcel = () => {
    const headers = ['Drug Name', 'Therapeutic', 'Form', 'Batch No', 'Expiry', 'Days to Expiry', 'MRP', 'Purchase', 'Selling', 'Margin %', 'Order Placed', 'Rejected', 'Received', 'Sold', 'Current Stock', 'Stock Value', 'Warehouse', 'Status', 'GRN'];
    const data = filtered.map(b => {
      const drug = drugs.find(d => d.id === b.drugId);
      const margin = b.sellingPrice > 0 ? ((b.sellingPrice - b.purchasePrice) / b.sellingPrice * 100).toFixed(2) : 0;
      return [b.drugName, drug?.therapeuticCategory || '', drug?.category || '', b.batchNo, b.expiryDate, getDaysToExpiry(b.expiryDate), b.mrp, b.purchasePrice, b.sellingPrice, margin, b.orderPlaced, b.rejected, b.quantityIn, b.quantityOut, b.currentStock, b.currentStock * b.purchasePrice, b.warehouseName, getEffectiveStatus(b), b.grnId];
    });
    downloadExcel('Batch Management Report', headers, data, 'batch-management');
  };

  const handleOpenAddForm = () => {
    setEditingBatch(null);
    setFormData({
      drugId: drugs[0]?.id || '', batchNo: '', expiryDate: '',
      mrp: 0, purchasePrice: 0, sellingPrice: 0,
      orderPlaced: 0, rejected: 0,
      warehouseId: warehouseFilter !== 'All' ? warehouseFilter : (warehouses[0]?.id || 'WH001'),
      grnId: 'GRN-MANUAL', status: 'Active',
    });
    setShowForm(true);
  };

  const handleOpenEditForm = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      drugId: batch.drugId, batchNo: batch.batchNo, expiryDate: batch.expiryDate,
      mrp: batch.mrp, purchasePrice: batch.purchasePrice, sellingPrice: batch.sellingPrice,
      orderPlaced: batch.orderPlaced, rejected: batch.rejected,
      warehouseId: batch.warehouseId,
      grnId: batch.grnId, status: batch.status,
    });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const drug = drugs.find(d => d.id === formData.drugId);
    const warehouse = warehouses.find(w => w.id === formData.warehouseId);
    const computedReceived = Math.max(0, formData.orderPlaced - formData.rejected);

    if (editingBatch) {
      updateBatch({
        ...editingBatch,
        ...formData,
        quantityIn: computedReceived,
        drugName: drug?.name || editingBatch.drugName,
        warehouseName: warehouse?.name || editingBatch.warehouseName,
        currentStock: computedReceived - editingBatch.quantityOut,
      });
    } else {
      addBatch({
        ...formData,
        quantityIn: computedReceived,
        drugName: drug?.name || 'Unknown Drug',
        warehouseName: warehouse?.name || 'Unknown Warehouse',
      });
    }
    setShowForm(false);
  };

  const handleSelectDrug = (drugId: string) => {
    const drug = drugs.find(d => d.id === drugId);
    if (drug) {
      setFormData(prev => ({
        ...prev, drugId,
        mrp: prev.mrp || drug.mrp,
        purchasePrice: prev.purchasePrice || drug.defaultPurchasePrice,
        sellingPrice: prev.sellingPrice || drug.defaultSellingPrice,
      }));
    }
  };

  const handleConfirmDelete = () => {
    confirmDelete.ids.forEach(id => deleteBatch(id));
    setConfirmDelete({ open: false, ids: [], name: '' });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferBatch && transferData.toWarehouseId && transferData.quantity > 0) {
      transferBatchStock(transferBatch.id, transferData.toWarehouseId, transferData.quantity);
      setTransferBatch(null);
      setTransferData({ toWarehouseId: '', quantity: 0 });
    }
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustBatch && adjustData.reason.trim()) {
      adjustBatchStock(adjustBatch.id, adjustData.newQty, adjustData.reason);
      setAdjustBatch(null);
      setAdjustData({ newQty: 0, reason: '' });
    }
  };

  const renderBatchTable = (batchList: Batch[]) => {
    const groupAllSelected = batchList.length > 0 && batchList.every(b => selection.isSelected(b.id));
    const toggleGroupAll = () => {
      if (groupAllSelected) selection.setSelectedIds(prev => prev.filter(id => !batchList.find(b => b.id === id)));
      else selection.setSelectedIds(prev => [...new Set([...prev, ...batchList.map(b => b.id)])]);
    };
    return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
            <th className="py-2 px-3 w-10"><input type="checkbox" checked={groupAllSelected} onChange={toggleGroupAll} className="rounded text-blue-600 cursor-pointer" /></th>
            <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Drug / Batch</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Expiry</th>
            <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300" title="Order Placed">Ordered</th>
            <th className="text-center py-2 px-2 font-semibold text-red-600 dark:text-red-400" title="Rejected">Rejected</th>
            <th className="text-center py-2 px-2 font-semibold text-emerald-600 dark:text-emerald-400" title="Received = Ordered - Rejected">Received</th>
            <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300">Sold</th>
            <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300">Stock</th>
            <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Stock Value</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Warehouse</th>
            <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
            <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {batchList.map(batch => {
            const days = getDaysToExpiry(batch.expiryDate);
            const effStatus = getEffectiveStatus(batch);
            return (
              <tr key={batch.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${effStatus === 'Expired' ? 'bg-red-50/40 dark:bg-red-900/10' : ''} ${selection.isSelected(batch.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                <td className="py-3 px-3"><input type="checkbox" checked={selection.isSelected(batch.id)} onChange={() => selection.toggleOne(batch.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                <td className="py-3 px-3">
                  <p className="font-medium text-slate-900 dark:text-white">{batch.drugName}</p>
                  <p className="text-xs text-slate-500 font-mono">{batch.batchNo}</p>
                </td>
                <td className="py-3 px-3">
                  <p className="text-xs text-slate-700 dark:text-slate-300">{formatDate(batch.expiryDate)}</p>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5 ${getExpiryColor(days)}`}>
                    {days <= 0 ? 'EXPIRED' : `${days}d`}
                  </span>
                </td>
                <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400 font-mono text-xs">{batch.orderPlaced.toLocaleString()}</td>
                <td className="py-3 px-2 text-center font-mono text-xs">
                  {batch.rejected > 0 ? <span className="text-red-600 font-semibold">−{batch.rejected.toLocaleString()}</span> : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 px-2 text-center font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{batch.quantityIn.toLocaleString()}</td>
                <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400 font-mono text-xs">{batch.quantityOut.toLocaleString()}</td>
                <td className="py-3 px-2 text-center">
                  <span className={`font-bold ${batch.currentStock <= 200 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {batch.currentStock.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{formatCurrency(batch.currentStock * batch.purchasePrice)}</td>
                <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">{batch.warehouseName}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    effStatus === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    effStatus === 'Expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    effStatus === 'Depleted' ? 'bg-slate-100 text-slate-600' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>{effStatus}</span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setTransferBatch(batch); setTransferData({ toWarehouseId: warehouses.find(w => w.id !== batch.warehouseId)?.id || '', quantity: 0 }); }} className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600" title="Transfer"><ArrowRightLeft size={14} /></button>
                    <button onClick={() => { setAdjustBatch(batch); setAdjustData({ newQty: batch.currentStock, reason: '' }); }} className="p-1.5 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600" title="Adjust"><Settings2 size={14} /></button>
                    <button onClick={() => handleOpenEditForm(batch)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirmDelete({ open: true, ids: [batch.id], name: batch.batchNo })} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats - using effective status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Batches', count: filtered.filter(b => getEffectiveStatus(b) === 'Active').length.toString(), icon: <Package size={18} />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Near Expiry (90d)', count: filtered.filter(b => { const d = getDaysToExpiry(b.expiryDate); return d > 0 && d <= 90; }).length.toString(), icon: <AlertTriangle size={18} />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
          { label: 'Expired', count: filtered.filter(b => getEffectiveStatus(b) === 'Expired').length.toString(), icon: <AlertTriangle size={18} />, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
          { label: 'Stock Value', count: formatCurrency(filtered.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0)), icon: <IndianRupee size={18} />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${card.color}`}>{card.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 truncate">{card.label}</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{card.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Warehouse Tabs */}
      <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} counts={whCounts} />

      <BulkActionBar
        selectedCount={selection.selectedIds.length}
        totalCount={filtered.length}
        onClear={selection.clear}
        label="batches"
        actions={[
          { label: 'Delete Selected', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-blue-500">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search batch or drug..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <option value="All">All Status</option><option value="Active">Active</option><option value="Expired">Expired</option><option value="Depleted">Depleted</option><option value="Quarantine">Quarantine</option>
          </select>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button onClick={() => setGroupBy('therapeutic')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'therapeutic' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>Therapeutic</button>
            <button onClick={() => setGroupBy('category')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'category' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>By Form</button>
          </div>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grouped')} className={`p-1.5 rounded ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setViewMode('flat')} className={`p-1.5 rounded ${viewMode === 'flat' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}><List size={14} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
          <button onClick={handleOpenAddForm} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"><Plus size={16} /> Add Batch</button>
        </div>
      </div>

      {/* Body */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<Boxes size={28} />} title="No batches found" message="Try adjusting your filters or add a new batch." action={<button onClick={handleOpenAddForm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add First Batch</button>} />
        </div>
      ) : viewMode === 'flat' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {renderBatchTable(filtered)}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([category, batchList]) => {
            const totalStock = batchList.reduce((s, b) => s + b.currentStock, 0);
            const totalValue = batchList.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
            return (
              <CategoryAccordion
                key={category}
                category={category}
                count={batchList.length}
                summary={`${totalStock.toLocaleString()} units • ${formatCurrency(totalValue)} stock value`}
              >
                {renderBatchTable(batchList)}
              </CategoryAccordion>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingBatch ? 'Edit Batch' : 'Add New Batch'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Status auto-updates based on expiry date</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Drug & Batch Info</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Select Drug *</label>
                    <select required value={formData.drugId} onChange={e => handleSelectDrug(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      <option value="">-- Select drug --</option>
                      {drugs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.sku}) — {d.therapeuticCategory}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Batch No *</label><input required type="text" value={formData.batchNo} onChange={e => setFormData({ ...formData, batchNo: e.target.value })} placeholder="e.g., AMX-2026-A1" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expiry Date *</label><input required type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  </div>
                  {formData.expiryDate && (
                    <div className={`p-2 rounded-lg text-xs ${new Date(formData.expiryDate) < new Date() ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}>
                      {new Date(formData.expiryDate) < new Date()
                        ? '⚠️ This batch will be marked as EXPIRED automatically'
                        : `✓ Status will be Active. ${getDaysToExpiry(formData.expiryDate)} days until expiry.`}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Order Receipt Tracking</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Package size={11} /> Order Placed *
                    </label>
                    <input required type="number" min="0" placeholder="0" value={formData.orderPlaced || ''} onChange={e => setFormData({ ...formData, orderPlaced: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                    <p className="text-[10px] text-slate-500 mt-1">Total units ordered</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                      <XCircle size={11} /> Rejected
                    </label>
                    <input type="number" min="0" max={formData.orderPlaced} placeholder="0" value={formData.rejected || ''} onChange={e => setFormData({ ...formData, rejected: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                    <p className="text-[10px] text-slate-500 mt-1">Damaged / rejected at GRN</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Received (auto)
                    </label>
                    <div className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                      <span>{receivedQty.toLocaleString()}</span>
                      <Calculator size={12} className="text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-1">Order − Rejected</p>
                  </div>
                </div>
                {formData.orderPlaced > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Acceptance Rate:</span>
                      <span className={`font-bold ${acceptanceRate >= 95 ? 'text-emerald-600' : acceptanceRate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{acceptanceRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full ${acceptanceRate >= 95 ? 'bg-emerald-500' : acceptanceRate >= 90 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${acceptanceRate}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pricing</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">MRP ₹ *</label><input required type="number" step="0.01" value={formData.mrp || ''} onChange={e => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Purchase ₹ *</label><input required type="number" step="0.01" value={formData.purchasePrice || ''} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Selling ₹ *</label><input required type="number" step="0.01" value={formData.sellingPrice || ''} onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                </div>
                {formData.purchasePrice > 0 && receivedQty > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-blue-700 dark:text-blue-400">Total Inventory Value (received):</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(formData.purchasePrice * receivedQty)}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Storage & Reference</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Warehouse Name *</label>
                    <select required value={formData.warehouseId} onChange={e => setFormData({ ...formData, warehouseId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">GRN Reference</label>
                    <input type="text" value={formData.grnId} onChange={e => setFormData({ ...formData, grnId: e.target.value })} placeholder="GRN-MANUAL" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-800">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow">{editingBatch ? 'Save Changes' : 'Add Batch'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer Modal */}
      {transferBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setTransferBatch(null)}>
          <form onSubmit={handleTransfer} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><ArrowRightLeft size={18} className="text-violet-600" /></div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Transfer Stock</h3>
                  <p className="text-xs text-slate-500">{transferBatch.drugName} • {transferBatch.batchNo}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Available</span><span className="text-lg font-bold text-slate-900 dark:text-white">{transferBatch.currentStock}</span></div>
                <div className="flex items-center justify-between mt-1"><span className="text-xs text-slate-500">From</span><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{transferBatch.warehouseName}</span></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Transfer To *</label>
                <select required value={transferData.toWarehouseId} onChange={e => setTransferData({ ...transferData, toWarehouseId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="">-- Select destination --</option>
                  {warehouses.filter(w => w.id !== transferBatch.warehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Quantity *</label>
                <input required type="number" min="1" max={transferBatch.currentStock} value={transferData.quantity || ''} onChange={e => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setTransferBatch(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-lg font-medium">Transfer</button>
            </div>
          </form>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setAdjustBatch(null)}>
          <form onSubmit={handleAdjust} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center"><Settings2 size={18} className="text-cyan-600" /></div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Adjust Stock</h3>
                  <p className="text-xs text-slate-500">{adjustBatch.drugName} • {adjustBatch.batchNo}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg"><p className="text-[10px] text-slate-500 uppercase">Current</p><p className="text-lg font-bold">{adjustBatch.currentStock}</p></div>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg"><p className="text-[10px] text-cyan-600 uppercase">New</p><p className="text-lg font-bold text-cyan-700">{adjustData.newQty}</p></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">New Quantity *</label>
                <input required type="number" min="0" value={adjustData.newQty || ''} onChange={e => setAdjustData({ ...adjustData, newQty: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reason *</label>
                <textarea required rows={3} value={adjustData.reason} onChange={e => setAdjustData({ ...adjustData, reason: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustBatch(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium">Adjust</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog isOpen={confirmDelete.open} title="Delete Batch?" message={`Delete ${confirmDelete.name}?`} variant="danger" confirmLabel="Delete" onConfirm={handleConfirmDelete} onCancel={() => setConfirmDelete({ open: false, ids: [], name: '' })} />
      <ConfirmDialog isOpen={bulkDeleteOpen} title="Delete Multiple Batches?" message={`Permanently delete ${selection.selectedIds.length} selected batch(es)? This action will be logged.`} variant="danger" confirmLabel={`Delete ${selection.selectedIds.length}`} onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteOpen(false)} />
    </div>
  );
}

import { useState, useMemo } from 'react';
import { MapPin, Package, TrendingUp, Plus, Edit2, Trash2, X, Building2, Search, Download, AlertTriangle, ChevronRight, Boxes, IndianRupee, Pill, Clock, Eye, ArrowLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import { useApp } from '../../context/AppContext';
import ConfirmDialog from '../Common/ConfirmDialog';
import EmptyState from '../Common/EmptyState';
import SortableHeader from '../Common/SortableHeader';
import Pagination from '../Common/Pagination';
import type { Warehouse, Batch } from '../../types';

export default function Warehouses() {
  const { warehouses, batches, drugs, addWarehouse, updateWarehouse, deleteWarehouse } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [formData, setFormData] = useState({ name: '', location: '', capacity: 10000, currentStock: 0, isActive: true });

  // Selected warehouse to drill into
  const [selectedWh, setSelectedWh] = useState<Warehouse | null>(null);
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');
  const [stockSort, setStockSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>({ key: 'expiryDate', dir: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewBatch, setViewBatch] = useState<Batch | null>(null);

  const getDaysToExpiry = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const getExpiryColor = (days: number) => {
    if (days <= 0) return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    if (days <= 90) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    if (days <= 180) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
  };

  const whData = useMemo(() => warehouses.map(wh => {
    const whBatches = batches.filter(b => b.warehouseId === wh.id);
    const activeBatches = whBatches.filter(b => b.status === 'Active');
    const expiredBatches = whBatches.filter(b => b.status === 'Expired' || getDaysToExpiry(b.expiryDate) <= 0);
    const nearExpiryBatches = whBatches.filter(b => { const d = getDaysToExpiry(b.expiryDate); return d > 0 && d <= 90; });
    const stockValue = whBatches.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
    const sellingValue = whBatches.reduce((s, b) => s + b.currentStock * b.sellingPrice, 0);
    const uniqueDrugs = new Set(whBatches.map(b => b.drugId)).size;
    const actualStock = whBatches.reduce((s, b) => s + b.currentStock, 0);
    return {
      ...wh, stockValue, sellingValue, uniqueDrugs,
      batchCount: whBatches.length, activeBatchCount: activeBatches.length,
      expiredCount: expiredBatches.length, nearExpiryCount: nearExpiryBatches.length,
      actualStock, utilization: (actualStock / wh.capacity) * 100,
    };
  }), [warehouses, batches]);

  const handleOpenAdd = () => {
    setEditing(null);
    setFormData({ name: '', location: '', capacity: 10000, currentStock: 0, isActive: true });
    setShowForm(true);
  };

  const handleOpenEdit = (wh: Warehouse) => {
    setEditing(wh);
    setFormData({ name: wh.name, location: wh.location, capacity: wh.capacity, currentStock: wh.currentStock, isActive: wh.isActive });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateWarehouse({ ...editing, ...formData });
    else addWarehouse(formData);
    setShowForm(false);
  };

  const handleDelete = () => {
    deleteWarehouse(confirmDelete.id);
    setConfirmDelete({ open: false, id: '', name: '' });
    if (selectedWh?.id === confirmDelete.id) setSelectedWh(null);
  };

  // Stock list for selected warehouse
  const whStock = useMemo(() => {
    if (!selectedWh) return [];
    let result = batches.filter(b => b.warehouseId === selectedWh.id).filter(b => {
      const matchSearch = b.drugName.toLowerCase().includes(stockSearch.toLowerCase()) || b.batchNo.toLowerCase().includes(stockSearch.toLowerCase());
      const days = getDaysToExpiry(b.expiryDate);
      const matchStatus =
        stockStatusFilter === 'All' ||
        (stockStatusFilter === 'Active' && b.status === 'Active') ||
        (stockStatusFilter === 'Expired' && (b.status === 'Expired' || days <= 0)) ||
        (stockStatusFilter === 'NearExpiry' && days > 0 && days <= 90) ||
        (stockStatusFilter === 'LowStock' && b.currentStock > 0 && b.currentStock <= 200);
      return matchSearch && matchStatus;
    });
    if (stockSort) {
      result = [...result].sort((a, b) => {
        const av = a[stockSort.key as keyof Batch];
        const bv = b[stockSort.key as keyof Batch];
        if (typeof av === 'number' && typeof bv === 'number') return stockSort.dir === 'asc' ? av - bv : bv - av;
        return stockSort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [selectedWh, batches, stockSearch, stockStatusFilter, stockSort]);

  const paginatedStock = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return whStock.slice(start, start + pageSize);
  }, [whStock, currentPage, pageSize]);

  const handleSort = (key: string) => {
    setStockSort(prev => prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const handleExportStockPDF = () => {
    if (!selectedWh) return;
    const headers = ['Drug', 'Batch No', 'Expiry', 'Stock', 'MRP', 'Purchase ₹', 'Selling ₹', 'Stock Value ₹', 'Status'];
    const data = whStock.map(b => [b.drugName, b.batchNo, b.expiryDate, b.currentStock, b.mrp, b.purchasePrice, b.sellingPrice, (b.currentStock * b.purchasePrice).toFixed(2), b.status]);
    downloadPDF(`Stock at ${selectedWh.name}`, headers, data, `warehouse-stock-${selectedWh.name}`);
  };

  const handleExportStockExcel = () => {
    if (!selectedWh) return;
    const headers = ['Drug Name', 'Generic', 'SKU', 'Batch No', 'Expiry Date', 'Days to Expiry', 'Qty In', 'Qty Out', 'Current Stock', 'MRP', 'Purchase Price', 'Selling Price', 'Stock Value', 'Status', 'GRN ID'];
    const data = whStock.map(b => {
      const drug = drugs.find(d => d.id === b.drugId);
      return [b.drugName, drug?.genericName || '', drug?.sku || '', b.batchNo, b.expiryDate, getDaysToExpiry(b.expiryDate), b.quantityIn, b.quantityOut, b.currentStock, b.mrp, b.purchasePrice, b.sellingPrice, b.currentStock * b.purchasePrice, b.status, b.grnId];
    });
    downloadExcel(`Stock at ${selectedWh.name}`, headers, data, `warehouse-stock-${selectedWh.name}`);
  };

  // ============ Warehouse Detail View ============
  if (selectedWh) {
    const whInfo = whData.find(w => w.id === selectedWh.id)!;
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Breadcrumb / Back */}
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedWh(null)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft size={16} /> Back to Warehouses
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleExportStockPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
            <button onClick={handleExportStockExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
            <button onClick={() => handleOpenEdit(selectedWh)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100"><Edit2 size={16} /> Edit Warehouse</button>
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Building2 size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedWh.name}</h2>
                <div className="flex items-center gap-1 mt-1 text-blue-100">
                  <MapPin size={14} />
                  <span className="text-sm">{selectedWh.location}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedWh.isActive ? 'bg-emerald-400 text-emerald-900' : 'bg-red-400 text-red-900'}`}>
                    {selectedWh.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="text-xs text-blue-100">ID: {selectedWh.id}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100 uppercase tracking-wider">Total Stock Value</p>
              <p className="text-3xl font-bold">{formatCurrency(whInfo.stockValue)}</p>
              <p className="text-xs text-blue-100 mt-1">Sale Value: {formatCurrency(whInfo.sellingValue)}</p>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-1.5 text-blue-100">
              <span>Capacity Utilization</span>
              <span className="font-bold text-white">
                {whInfo.utilization.toFixed(1)}% • {whInfo.actualStock.toLocaleString()} / {selectedWh.capacity.toLocaleString()} units
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${whInfo.utilization > 80 ? 'bg-red-400' : whInfo.utilization > 60 ? 'bg-yellow-300' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(whInfo.utilization, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Batches', value: whInfo.batchCount, icon: <Boxes size={18} />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { label: 'Active Batches', value: whInfo.activeBatchCount, icon: <Package size={18} />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
            { label: 'Near Expiry (90d)', value: whInfo.nearExpiryCount, icon: <Clock size={18} />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
            { label: 'Expired Batches', value: whInfo.expiredCount, icon: <AlertTriangle size={18} />, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
            { label: 'Unique Drugs', value: whInfo.uniqueDrugs, icon: <Pill size={18} />, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
            { label: 'Total Stock Units', value: whInfo.actualStock.toLocaleString(), icon: <Package size={18} />, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' },
            { label: 'Cost Value', value: formatCurrency(whInfo.stockValue), icon: <IndianRupee size={18} />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
            { label: 'Potential Sale', value: formatCurrency(whInfo.sellingValue), icon: <TrendingUp size={18} />, color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate">{s.label}</p>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stock Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-blue-500">
              <Search size={16} className="text-slate-400 mr-2" />
              <input type="text" placeholder="Search drugs or batches..." value={stockSearch} onChange={e => { setStockSearch(e.target.value); setCurrentPage(1); }} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
              {stockSearch && <button onClick={() => setStockSearch('')} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <select value={stockStatusFilter} onChange={e => { setStockStatusFilter(e.target.value); setCurrentPage(1); }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
              <option value="All">All Stock</option>
              <option value="Active">Active Only</option>
              <option value="NearExpiry">Near Expiry (90d)</option>
              <option value="Expired">Expired</option>
              <option value="LowStock">Low Stock (≤200)</option>
            </select>
          </div>
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{whStock.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{whInfo.batchCount}</span> batches
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {whStock.length === 0 ? (
            <EmptyState
              icon={<Boxes size={28} />}
              title="No stock found"
              message={stockSearch || stockStatusFilter !== 'All' ? 'Try adjusting your filters.' : 'This warehouse has no stock yet. Add a batch from Batch Management.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <SortableHeader label="Drug / Batch" sortKey="drugName" currentSort={stockSort} onSort={handleSort} />
                      <SortableHeader label="Expiry" sortKey="expiryDate" currentSort={stockSort} onSort={handleSort} />
                      <SortableHeader label="Stock" sortKey="currentStock" currentSort={stockSort} onSort={handleSort} align="center" />
                      <SortableHeader label="MRP" sortKey="mrp" currentSort={stockSort} onSort={handleSort} align="right" />
                      <SortableHeader label="Purchase ₹" sortKey="purchasePrice" currentSort={stockSort} onSort={handleSort} align="right" />
                      <SortableHeader label="Selling ₹" sortKey="sellingPrice" currentSort={stockSort} onSort={handleSort} align="right" />
                      <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Stock Value</th>
                      <SortableHeader label="Status" sortKey="status" currentSort={stockSort} onSort={handleSort} align="center" />
                      <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStock.map(batch => {
                      const days = getDaysToExpiry(batch.expiryDate);
                      const drug = drugs.find(d => d.id === batch.drugId);
                      return (
                        <tr key={batch.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${batch.status === 'Expired' ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <Pill size={14} className="text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white truncate">{batch.drugName}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{batch.batchNo} • {drug?.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-slate-700 dark:text-slate-300">{formatDate(batch.expiryDate)}</p>
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5 ${getExpiryColor(days)}`}>
                              {days <= 0 ? 'EXPIRED' : `${days}d left`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${batch.currentStock <= 200 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                              {batch.currentStock.toLocaleString()}
                            </span>
                            <p className="text-[10px] text-slate-400">of {batch.quantityIn.toLocaleString()}</p>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(batch.mrp)}</td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(batch.purchasePrice)}</td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(batch.sellingPrice)}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(batch.currentStock * batch.purchasePrice)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              batch.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              batch.status === 'Expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              batch.status === 'Depleted' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>{batch.status}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => setViewBatch(batch)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600">
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-700/30">
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white" colSpan={2}>TOTALS</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{whStock.reduce((s, b) => s + b.currentStock, 0).toLocaleString()}</td>
                      <td colSpan={3}></td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(whStock.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalItems={whStock.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
            </>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Warehouse' : 'Add Warehouse'}</h3>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Warehouse Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Location *</label>
                  <input required type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Capacity *</label>
                    <input required type="number" min="1" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select value={formData.isActive ? 'active' : 'inactive'} onChange={e => setFormData({ ...formData, isActive: e.target.value === 'active' })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      <option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Batch Detail Modal */}
        {viewBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setViewBatch(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewBatch.drugName}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Batch: {viewBatch.batchNo}</p>
                </div>
                <button onClick={() => setViewBatch(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-[10px] text-blue-600 uppercase">Qty In</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{viewBatch.quantityIn}</p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                    <p className="text-[10px] text-orange-600 uppercase">Qty Out</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{viewBatch.quantityOut}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <p className="text-[10px] text-emerald-600 uppercase">In Stock</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{viewBatch.currentStock}</p>
                  </div>
                </div>
                {Object.entries({
                  'Expiry Date': formatDate(viewBatch.expiryDate),
                  'Status': viewBatch.status,
                  'MRP': formatCurrency(viewBatch.mrp),
                  'Purchase Price': formatCurrency(viewBatch.purchasePrice),
                  'Selling Price': formatCurrency(viewBatch.sellingPrice),
                  'Stock Value': formatCurrency(viewBatch.currentStock * viewBatch.purchasePrice),
                  'GRN Reference': viewBatch.grnId,
                  'Created': formatDate(viewBatch.createdAt),
                }).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="text-xs text-slate-500">{key}</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={confirmDelete.open}
          title="Delete Warehouse?"
          message={`Delete "${confirmDelete.name}"? Stock batches will need to be reassigned.`}
          variant="danger"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete({ open: false, id: '', name: '' })}
        />
      </div>
    );
  }

  // ============ Warehouse Listing View ============
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Warehouses', value: warehouses.length.toString(), color: 'bg-blue-500' },
          { label: 'Active', value: warehouses.filter(w => w.isActive).length.toString(), color: 'bg-emerald-500' },
          { label: 'Total Capacity', value: warehouses.reduce((s, w) => s + w.capacity, 0).toLocaleString(), color: 'bg-violet-500' },
          { label: 'Total Stock Value', value: formatCurrency(whData.reduce((s, w) => s + w.stockValue, 0)), color: 'bg-amber-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
            <div className={`w-2 h-12 rounded-full ${s.color}`} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Click on any warehouse to view its stock details</p>
        <button onClick={handleOpenAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow">
          <Plus size={16} /> Add Warehouse
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {whData.map(wh => (
          <div
            key={wh.id}
            onClick={() => { setSelectedWh(wh); setCurrentPage(1); setStockSearch(''); setStockStatusFilter('All'); }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Building2 size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">{wh.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5 text-slate-500">
                    <MapPin size={12} />
                    <span className="text-xs truncate">{wh.location}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${wh.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                  {wh.isActive ? 'Active' : 'Inactive'}
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(wh); }} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: wh.id, name: wh.name }); }} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <Package size={14} className="text-blue-500" />
                  <span className="text-[10px] text-slate-500">UNITS</span>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{wh.actualStock.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <IndianRupee size={14} className="text-emerald-500" />
                  <span className="text-[10px] text-slate-500">VALUE</span>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(wh.stockValue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-4">
              <div className="text-center p-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{wh.activeBatchCount}</p>
                <p className="text-[10px] text-slate-500">Active</p>
              </div>
              <div className="text-center p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm font-bold text-orange-700 dark:text-orange-400">{wh.nearExpiryCount}</p>
                <p className="text-[10px] text-slate-500">Near Exp.</p>
              </div>
              <div className="text-center p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm font-bold text-red-700 dark:text-red-400">{wh.expiredCount}</p>
                <p className="text-[10px] text-slate-500">Expired</p>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Capacity</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {wh.utilization.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all ${wh.utilization > 80 ? 'bg-red-500' : wh.utilization > 60 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(wh.utilization, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-slate-500">{wh.uniqueDrugs} drugs • {wh.batchCount} batches</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                View Stock <ChevronRight size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Warehouse' : 'Add New Warehouse'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Warehouse Name *</label>
                <input required type="text" placeholder="e.g., Central Warehouse" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Location *</label>
                <input required type="text" placeholder="e.g., Mumbai, India" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Capacity (units) *</label>
                  <input required type="number" min="1" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select value={formData.isActive ? 'active' : 'inactive'} onChange={e => setFormData({ ...formData, isActive: e.target.value === 'active' })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">{editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Delete Warehouse?"
        message={`Delete "${confirmDelete.name}"? Batches stored here will need to be reassigned.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: '', name: '' })}
      />
    </div>
  );
}

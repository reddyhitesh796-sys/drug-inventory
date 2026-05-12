import { useState, useMemo } from 'react';
import { Search, Download, Plus, Eye, X, ShoppingCart, MapPin, Trash2, Truck, CheckCircle2, Clock, Package, AlertCircle, ChevronRight, Edit3, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import EmptyState from '../Common/EmptyState';
import WarehouseTabs from '../Common/WarehouseTabs';
import ConfirmDialog from '../Common/ConfirmDialog';
import BulkActionBar from '../Common/BulkActionBar';
import { useSelection } from '../../utils/useSelection';
import type { PurchaseOrder, PurchaseOrderItem } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  Ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Transit': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Ordered: <ShoppingCart size={14} />,
  'In Transit': <Truck size={14} />,
  Partial: <Package size={14} />,
  Received: <CheckCircle2 size={14} />,
  Cancelled: <X size={14} />,
  Draft: <Edit3 size={14} />,
};

const STATUS_FLOW = ['Ordered', 'In Transit', 'Received'];

export default function PurchaseOrders() {
  const { purchaseOrders, vendors, drugs, warehouses, addPurchaseOrder, cancelPurchaseOrder, updatePOStatus, receivePurchaseOrder, bulkCancelPOs, bulkReceivePOs } = useApp();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = currentUser.role === 'Admin';
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const [trackPO, setTrackPO] = useState<PurchaseOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; po: PurchaseOrder | null }>({ open: false, po: null });
  const [confirmReceive, setConfirmReceive] = useState<{ open: boolean; po: PurchaseOrder | null }>({ open: false, po: null });
  const [cancelReason, setCancelReason] = useState('');

  // New PO form state
  const [newPOData, setNewPOData] = useState({
    vendorId: '',
    warehouseId: '',
    expectedDate: '',
    notes: '',
    items: [] as PurchaseOrderItem[],
  });
  const [newItemDrugId, setNewItemDrugId] = useState('');
  const [newItemQty, setNewItemQty] = useState(0);
  const [newItemPrice, setNewItemPrice] = useState(0);

  const selectedVendor = vendors.find(v => v.id === newPOData.vendorId);

  // Apply filters
  const filtered = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchSearch = po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.trackingNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || po.status === statusFilter;
      const matchWh = warehouseFilter === 'All' || po.warehouseId === warehouseFilter;
      return matchSearch && matchStatus && matchWh;
    }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [purchaseOrders, searchQuery, statusFilter, warehouseFilter]);

  // Multi-select
  const selection = useSelection(filtered);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkReceiveOpen, setBulkReceiveOpen] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState('');

  const handleBulkCancel = () => {
    if (bulkCancelReason.trim()) {
      bulkCancelPOs(selection.selectedIds, bulkCancelReason);
      selection.clear();
      setBulkCancelOpen(false);
      setBulkCancelReason('');
    }
  };
  const handleBulkReceive = () => {
    bulkReceivePOs(selection.selectedIds);
    selection.clear();
    setBulkReceiveOpen(false);
  };
  const selectedReceivable = selection.selectedIds.filter(id => {
    const po = filtered.find(p => p.id === id);
    return po && po.status !== 'Received' && po.status !== 'Cancelled';
  }).length;

  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: purchaseOrders.length };
    warehouses.forEach(w => { counts[w.id] = purchaseOrders.filter(po => po.warehouseId === w.id).length; });
    return counts;
  }, [warehouses, purchaseOrders]);

  // Computed totals for new PO
  const newPOTotals = useMemo(() => {
    const subtotal = newPOData.items.reduce((s, it) => s + it.amount, 0);
    const gst = newPOData.items.reduce((s, it) => s + (it.amount * it.gstPercent / 100), 0);
    return { subtotal, gst, grandTotal: subtotal + gst };
  }, [newPOData.items]);

  // ==== NEW PO FORM HANDLERS ====
  const resetForm = () => {
    setShowForm(false);
    setNewPOData({ vendorId: '', warehouseId: warehouseFilter !== 'All' ? warehouseFilter : '', expectedDate: '', notes: '', items: [] });
    setNewItemDrugId('');
    setNewItemQty(0);
    setNewItemPrice(0);
  };

  const handleOpenNewPO = () => {
    setNewPOData({
      vendorId: '',
      warehouseId: warehouseFilter !== 'All' ? warehouseFilter : (warehouses[0]?.id || ''),
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      notes: '',
      items: [],
    });
    setShowForm(true);
  };

  const handleSelectVendor = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setNewPOData(prev => ({
      ...prev,
      vendorId,
      // Auto-set warehouse to vendor's primary if not yet set
      warehouseId: prev.warehouseId || vendor?.primaryWarehouseId || warehouses[0]?.id || '',
    }));
  };

  const handleSelectDrug = (drugId: string) => {
    setNewItemDrugId(drugId);
    const drug = drugs.find(d => d.id === drugId);
    if (drug) {
      setNewItemPrice(drug.defaultPurchasePrice);
    }
  };

  const handleAddItem = () => {
    if (!newItemDrugId || newItemQty <= 0 || newItemPrice <= 0) return;
    const drug = drugs.find(d => d.id === newItemDrugId);
    if (!drug) return;
    // If drug exists in items, update qty
    const existingIdx = newPOData.items.findIndex(it => it.drugId === newItemDrugId);
    if (existingIdx >= 0) {
      const updated = [...newPOData.items];
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: updated[existingIdx].quantity + newItemQty,
        amount: (updated[existingIdx].quantity + newItemQty) * newItemPrice,
        purchasePrice: newItemPrice,
      };
      setNewPOData(prev => ({ ...prev, items: updated }));
    } else {
      const item: PurchaseOrderItem = {
        drugId: drug.id,
        drugName: drug.name,
        quantity: newItemQty,
        purchasePrice: newItemPrice,
        gstPercent: drug.gstPercent,
        amount: newItemQty * newItemPrice,
      };
      setNewPOData(prev => ({ ...prev, items: [...prev.items, item] }));
    }
    setNewItemDrugId('');
    setNewItemQty(0);
    setNewItemPrice(0);
  };

  const handleRemoveItem = (idx: number) => {
    setNewPOData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleUpdateItemQty = (idx: number, qty: number) => {
    const updated = [...newPOData.items];
    updated[idx] = { ...updated[idx], quantity: qty, amount: qty * updated[idx].purchasePrice };
    setNewPOData(prev => ({ ...prev, items: updated }));
  };

  const handleUpdateItemPrice = (idx: number, price: number) => {
    const updated = [...newPOData.items];
    updated[idx] = { ...updated[idx], purchasePrice: price, amount: updated[idx].quantity * price };
    setNewPOData(prev => ({ ...prev, items: updated }));
  };

  const handleSubmitPO = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find(v => v.id === newPOData.vendorId);
    const warehouse = warehouses.find(w => w.id === newPOData.warehouseId);
    if (!vendor || !warehouse || newPOData.items.length === 0) return;

    addPurchaseOrder({
      vendorId: vendor.id,
      vendorName: vendor.name,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      items: newPOData.items,
      totalAmount: newPOTotals.subtotal,
      gstAmount: newPOTotals.gst,
      grandTotal: newPOTotals.grandTotal,
      status: 'Ordered',
      orderDate: new Date().toISOString().substring(0, 10),
      expectedDate: newPOData.expectedDate,
      createdBy: 'Admin User',
      notes: newPOData.notes,
    });
    resetForm();
  };

  // === ACTIONS ===
  const handleConfirmCancel = () => {
    if (confirmCancel.po && cancelReason.trim()) {
      cancelPurchaseOrder(confirmCancel.po.id, cancelReason);
      setConfirmCancel({ open: false, po: null });
      setCancelReason('');
    }
  };

  const handleConfirmReceive = () => {
    if (confirmReceive.po) {
      receivePurchaseOrder(confirmReceive.po.id);
      setConfirmReceive({ open: false, po: null });
    }
  };

  const handleAdvanceStatus = (po: PurchaseOrder) => {
    const currentIdx = STATUS_FLOW.indexOf(po.status);
    if (currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentIdx + 1] as PurchaseOrder['status'];
      if (nextStatus === 'Received') {
        setConfirmReceive({ open: true, po });
      } else {
        updatePOStatus(po.id, nextStatus);
      }
    }
  };

  // === EXPORT ===
  const handleExportPDF = () => {
    const headers = ['PO Number', 'Vendor', 'Warehouse', 'Date', 'Expected', 'Items', 'Total', 'Status', 'Tracking'];
    const data = filtered.map(po => [po.poNumber, po.vendorName, po.warehouseName, po.orderDate, po.expectedDate, po.items.length, po.grandTotal, po.status, po.trackingNumber || '-']);
    downloadPDF(`Purchase Orders ${warehouseFilter === 'All' ? '(All)' : `(${warehouses.find(w => w.id === warehouseFilter)?.name})`}`, headers, data, 'purchase-orders');
  };

  const handleExportExcel = () => {
    const headers = ['PO Number', 'Vendor', 'Warehouse', 'Order Date', 'Expected Date', 'Received Date', 'Items', 'Subtotal', 'GST', 'Grand Total', 'Status', 'Tracking Number', 'Created By', 'Notes'];
    const data = filtered.map(po => [po.poNumber, po.vendorName, po.warehouseName, po.orderDate, po.expectedDate, po.receivedDate || '', po.items.length, po.totalAmount, po.gstAmount, po.grandTotal, po.status, po.trackingNumber || '', po.createdBy, po.notes || '']);
    downloadExcel('Purchase Orders', headers, data, 'purchase-orders');
  };

  // Calculate ETA progress percentage
  const calcProgress = (po: PurchaseOrder): number => {
    if (po.status === 'Received') return 100;
    if (po.status === 'Cancelled') return 0;
    const idx = STATUS_FLOW.indexOf(po.status);
    if (idx === -1) return 0;
    return ((idx + 1) / STATUS_FLOW.length) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total POs', value: filtered.length, color: 'bg-blue-500', icon: <ShoppingCart size={14} /> },
          { label: 'In Transit', value: filtered.filter(p => p.status === 'In Transit').length, color: 'bg-violet-500', icon: <Truck size={14} /> },
          { label: 'Pending Receipt', value: filtered.filter(p => p.status === 'Ordered' || p.status === 'In Transit').length, color: 'bg-amber-500', icon: <Clock size={14} /> },
          { label: 'Total Value', value: formatCurrency(filtered.reduce((s, po) => s + po.grandTotal, 0)), color: 'bg-emerald-500', icon: <Package size={14} /> },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${s.color}`} />
            <div className="min-w-0 flex-1"><p className="text-[10px] uppercase text-slate-500">{s.label}</p><p className="text-base font-bold text-slate-900 dark:text-white truncate">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Warehouse Tabs */}
      <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} counts={whCounts} />

      <BulkActionBar
        selectedCount={selection.selectedIds.length}
        totalCount={filtered.length}
        onClear={selection.clear}
        label="POs"
        actions={[
          ...(selectedReceivable > 0 ? [{ label: `Mark ${selectedReceivable} as Received`, icon: <CheckCircle2 size={12} />, onClick: () => setBulkReceiveOpen(true), variant: 'success' as const }] : []),
          ...(isAdmin ? [{ label: 'Cancel Selected', icon: <X size={12} />, onClick: () => setBulkCancelOpen(true), variant: 'danger' as const }] : [{ label: 'Cancel (Admin Only)', icon: <Lock size={12} />, onClick: () => showToast('error', 'Permission Denied', 'Only Admin users can cancel POs'), variant: 'default' as const }]),
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="PO number, vendor, tracking..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400"><X size={14} /></button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Ordered">Ordered</option>
            <option value="In Transit">In Transit</option>
            <option value="Partial">Partial</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
          <button onClick={handleOpenNewPO} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"><Plus size={16} /> New PO</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<ShoppingCart size={28} />} title="No purchase orders" message="Click 'New PO' to create your first order." action={<button onClick={handleOpenNewPO} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Create First PO</button>} />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 w-10"><input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} className="rounded text-blue-600 cursor-pointer" /></th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">PO Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Order → Expected</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Items</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Status / Progress</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(po => {
                  const progress = calcProgress(po);
                  const canAdvance = po.status === 'Ordered' || po.status === 'In Transit';
                  const canCancel = po.status !== 'Received' && po.status !== 'Cancelled';
                  const isSel = selection.isSelected(po.id);
                  return (
                    <tr key={po.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(po.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900 dark:text-white">{po.poNumber}</p>
                        {po.trackingNumber && <p className="text-[10px] text-slate-400 font-mono">{po.trackingNumber}</p>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{po.vendorName}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium inline-flex items-center gap-1">
                          <MapPin size={9} />{po.warehouseName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-600 dark:text-slate-400">{formatDate(po.orderDate)}</p>
                        <p className="text-[10px] text-slate-400">→ {formatDate(po.expectedDate)}</p>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{po.items.length}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white font-mono text-xs">{formatCurrency(po.grandTotal)}</td>
                      <td className="py-3 px-4 min-w-[180px]">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold mb-1 ${STATUS_COLORS[po.status]}`}>
                          {STATUS_ICONS[po.status]} {po.status}
                        </span>
                        {po.status !== 'Cancelled' && po.status !== 'Draft' && (
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1 overflow-hidden mt-1">
                            <div className={`h-full transition-all ${po.status === 'Received' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setTrackPO(po)} className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600" title="Track Order">
                            <Truck size={14} />
                          </button>
                          <button onClick={() => setViewPO(po)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600" title="View Details">
                            <Eye size={14} />
                          </button>
                          {canAdvance && (
                            <button onClick={() => handleAdvanceStatus(po)} className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600" title={po.status === 'Ordered' ? 'Mark as In Transit' : 'Mark as Received'}>
                              <ChevronRight size={14} />
                            </button>
                          )}
                          {canCancel && (
                            isAdmin ? (
                              <button onClick={() => setConfirmCancel({ open: true, po })} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" title="Cancel (Admin)">
                                <Trash2 size={14} />
                              </button>
                            ) : (
                              <button onClick={() => showToast('error', 'Permission Denied', 'Only Admin users can cancel POs')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 cursor-not-allowed" title="Cancel restricted to Admin">
                                <Lock size={14} />
                              </button>
                            )
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

      {/* ===== NEW PO FORM ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={resetForm}>
          <form onSubmit={handleSubmitPO} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create New Purchase Order</h3>
                <p className="text-xs text-slate-500 mt-0.5">Step 1: Vendor & Warehouse → Step 2: Add items → Submit</p>
              </div>
              <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: Vendor & Warehouse */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">1. Order Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vendor *</label>
                    <select required value={newPOData.vendorId} onChange={e => handleSelectVendor(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      <option value="">-- Select vendor --</option>
                      {vendors.filter(v => v.isActive).map(v => <option key={v.id} value={v.id}>{v.name} • {v.paymentTerms}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Deliver to Warehouse *</label>
                    <select required value={newPOData.warehouseId} onChange={e => setNewPOData({ ...newPOData, warehouseId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                    </select>
                    {selectedVendor?.primaryWarehouseId && newPOData.warehouseId !== selectedVendor.primaryWarehouseId && (
                      <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} /> Vendor's primary: {selectedVendor.primaryWarehouseName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expected Delivery Date *</label>
                    <input required type="date" value={newPOData.expectedDate} onChange={e => setNewPOData({ ...newPOData, expectedDate: e.target.value })} min={new Date().toISOString().substring(0, 10)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes (Optional)</label>
                    <input type="text" value={newPOData.notes} onChange={e => setNewPOData({ ...newPOData, notes: e.target.value })} placeholder="Special instructions..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* Step 2: Add Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">2. Order Items ({newPOData.items.length})</h4>

                {/* Add Item Row */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Select Drug</label>
                      <select value={newItemDrugId} onChange={e => handleSelectDrug(e.target.value)} className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white">
                        <option value="">-- Choose drug --</option>
                        {drugs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.sku}) — ₹{d.defaultPurchasePrice}</option>)}
                      </select>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Quantity</label>
                      <input type="number" min="1" value={newItemQty || ''} onChange={e => setNewItemQty(parseInt(e.target.value) || 0)} placeholder="0" className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Unit Price ₹</label>
                      <input type="number" step="0.01" min="0" value={newItemPrice || ''} onChange={e => setNewItemPrice(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Subtotal</label>
                      <div className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(newItemQty * newItemPrice)}
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-1">
                      <button type="button" onClick={handleAddItem} disabled={!newItemDrugId || newItemQty <= 0 || newItemPrice <= 0} className="w-full px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {newPOData.items.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-slate-500">
                    <Package size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No items added yet</p>
                    <p className="text-[10px] mt-1">Use the form above to add drugs to this PO</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Drug</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Quantity</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Unit Price ₹</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">GST %</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Amount ₹</th>
                          <th className="text-center py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newPOData.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 px-3">
                              <p className="text-xs font-medium text-slate-900 dark:text-white">{item.drugName}</p>
                              <p className="text-[10px] text-slate-500">{drugs.find(d => d.id === item.drugId)?.sku}</p>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input type="number" min="1" value={item.quantity} onChange={e => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)} className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-center text-slate-900 dark:text-white" />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input type="number" step="0.01" min="0" value={item.purchasePrice} onChange={e => handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-right text-slate-900 dark:text-white" />
                            </td>
                            <td className="py-2 px-3 text-center text-xs text-slate-600">{item.gstPercent}%</td>
                            <td className="py-2 px-3 text-right text-xs font-bold text-emerald-600 font-mono">{formatCurrency(item.amount)}</td>
                            <td className="py-2 px-3 text-center">
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-700/30">
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right text-xs text-slate-600">Subtotal:</td>
                          <td colSpan={2} className="py-2 px-3 text-right font-bold text-xs text-slate-900 dark:text-white font-mono">{formatCurrency(newPOTotals.subtotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right text-xs text-slate-600">GST:</td>
                          <td colSpan={2} className="py-2 px-3 text-right font-bold text-xs text-slate-900 dark:text-white font-mono">{formatCurrency(newPOTotals.gst)}</td>
                        </tr>
                        <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-blue-50 dark:bg-blue-900/20">
                          <td colSpan={4} className="py-3 px-3 text-right font-bold text-sm text-blue-700 dark:text-blue-300">Grand Total:</td>
                          <td colSpan={2} className="py-3 px-3 text-right font-bold text-base text-blue-700 dark:text-blue-300 font-mono">{formatCurrency(newPOTotals.grandTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between sticky bottom-0 bg-white dark:bg-slate-800">
              <div className="text-xs text-slate-500">
                {newPOData.items.length > 0 ? <span className="font-semibold text-blue-600">{newPOData.items.length} item(s) • {formatCurrency(newPOTotals.grandTotal)}</span> : 'Add at least one item'}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                <button type="submit" disabled={!newPOData.vendorId || !newPOData.warehouseId || newPOData.items.length === 0} className="flex items-center gap-1.5 px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium shadow">
                  <Plus size={14} /> Place Order
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===== TRACK ORDER MODAL ===== */}
      {trackPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setTrackPO(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={20} />
                    <h3 className="text-lg font-bold">Order Tracking</h3>
                  </div>
                  <p className="text-sm opacity-90">{trackPO.poNumber} • {trackPO.vendorName}</p>
                  {trackPO.trackingNumber && <p className="text-xs opacity-75 font-mono mt-1">Tracking: {trackPO.trackingNumber}</p>}
                </div>
                <button onClick={() => setTrackPO(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="bg-white/10 backdrop-blur rounded-lg p-2">
                  <p className="opacity-75">Ordered</p>
                  <p className="font-bold">{formatDate(trackPO.orderDate)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-2">
                  <p className="opacity-75">Expected</p>
                  <p className="font-bold">{formatDate(trackPO.expectedDate)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-2">
                  <p className="opacity-75">Destination</p>
                  <p className="font-bold truncate">{trackPO.warehouseName}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Status Pipeline */}
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Order Pipeline</h4>
                <div className="flex items-center justify-between">
                  {STATUS_FLOW.map((status, idx) => {
                    const currentIdx = STATUS_FLOW.indexOf(trackPO.status);
                    const isComplete = currentIdx > idx;
                    const isCurrent = currentIdx === idx;
                    const isCancelled = trackPO.status === 'Cancelled';
                    return (
                      <div key={status} className="flex-1 flex items-center">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isCancelled ? 'bg-slate-200 text-slate-400' :
                            isComplete ? 'bg-emerald-500 text-white shadow-lg' :
                            isCurrent ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30 animate-pulse-soft' :
                            'bg-slate-200 dark:bg-slate-700 text-slate-400'
                          }`}>
                            {isComplete ? <CheckCircle2 size={16} /> : STATUS_ICONS[status]}
                          </div>
                          <p className={`text-[10px] font-medium mt-2 text-center ${isComplete || isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{status}</p>
                        </div>
                        {idx < STATUS_FLOW.length - 1 && (
                          <div className={`flex-1 h-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {trackPO.status === 'Cancelled' && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                    <X size={16} className="text-red-600" />
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium">This order has been cancelled</p>
                  </div>
                )}
              </div>

              {/* Tracking History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tracking History</h4>
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />
                  {(trackPO.trackingHistory || []).slice().reverse().map((event, idx) => (
                    <div key={event.id} className="relative pb-4 last:pb-0">
                      <div className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full ring-4 ${idx === 0 ? 'bg-blue-500 ring-blue-100 dark:ring-blue-900/30' : 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/30'}`} />
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[event.status] || 'bg-slate-100'}`}>
                            {STATUS_ICONS[event.status]}{event.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{event.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">{event.description}</p>
                        {event.location && (
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><MapPin size={9} /> {event.location}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">by {event.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {(trackPO.status === 'Ordered' || trackPO.status === 'In Transit') && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Update order status:</p>
                  <div className="flex gap-2">
                    {trackPO.status === 'Ordered' && (
                      <button onClick={() => { updatePOStatus(trackPO.id, 'In Transit'); setTrackPO(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700">
                        <Truck size={12} /> Mark In Transit
                      </button>
                    )}
                    <button onClick={() => { setConfirmReceive({ open: true, po: trackPO }); setTrackPO(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                      <CheckCircle2 size={12} /> Mark as Received
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW PO DETAILS ===== */}
      {viewPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setViewPO(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewPO.poNumber}</h3>
                <p className="text-sm text-slate-500">{viewPO.vendorName} • {formatDate(viewPO.orderDate)}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[viewPO.status]}`}>
                    {STATUS_ICONS[viewPO.status]} {viewPO.status}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium inline-flex items-center gap-1">
                    <MapPin size={9} />{viewPO.warehouseName}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewPO(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Drug</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Rate</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                </tr></thead>
                <tbody>{viewPO.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{item.drugName}</td>
                    <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">{item.quantity}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 font-mono text-xs">{formatCurrency(item.purchasePrice)}</td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1 text-sm text-right">
                <div><span className="text-slate-500">Subtotal: </span><span className="font-medium">{formatCurrency(viewPO.totalAmount)}</span></div>
                <div><span className="text-slate-500">GST: </span><span className="font-medium">{formatCurrency(viewPO.gstAmount)}</span></div>
                <div className="text-lg"><span className="text-slate-500">Grand Total: </span><span className="font-bold text-slate-900 dark:text-white">{formatCurrency(viewPO.grandTotal)}</span></div>
              </div>
              {viewPO.notes && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-amber-700">Notes</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{viewPO.notes}</p>
                </div>
              )}
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={() => { setTrackPO(viewPO); setViewPO(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700">
                  <Truck size={12} /> Track Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {confirmCancel.open && confirmCancel.po && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => { setConfirmCancel({ open: false, po: null }); setCancelReason(''); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Cancel Purchase Order?</h3>
              <p className="text-xs text-slate-500 mt-1">This will mark {confirmCancel.po.poNumber} as cancelled. Action will be logged.</p>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cancellation Reason *</label>
              <textarea required rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g., Vendor unable to fulfill, ordered by mistake, price changed..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white resize-none" />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button onClick={() => { setConfirmCancel({ open: false, po: null }); setCancelReason(''); }} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Keep Order</button>
              <button onClick={handleConfirmCancel} disabled={!cancelReason.trim()} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium">Cancel Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Confirmation */}
      <ConfirmDialog
        isOpen={confirmReceive.open}
        title="Mark Order as Received?"
        message={confirmReceive.po ? `Confirm receipt of ${confirmReceive.po.poNumber} from ${confirmReceive.po.vendorName}? This will create ${confirmReceive.po.items.length} new batch(es) at ${confirmReceive.po.warehouseName} and add stock to inventory.` : ''}
        variant="info"
        confirmLabel="Confirm Receipt"
        cancelLabel="Not Yet"
        onConfirm={handleConfirmReceive}
        onCancel={() => setConfirmReceive({ open: false, po: null })}
      />

      <ConfirmDialog
        isOpen={bulkReceiveOpen}
        title={`Mark ${selectedReceivable} POs as Received?`}
        message={`Confirm receipt for ${selectedReceivable} purchase order(s). This will create batches at the corresponding warehouses and add stock to inventory.`}
        variant="info"
        confirmLabel="Confirm Receipt"
        onConfirm={handleBulkReceive}
        onCancel={() => setBulkReceiveOpen(false)}
      />

      {bulkCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => { setBulkCancelOpen(false); setBulkCancelReason(''); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Cancel {selection.selectedIds.length} POs?</h3>
              <p className="text-xs text-slate-500 mt-1">Provide a reason for bulk cancellation. Action will be logged for each PO.</p>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cancellation Reason *</label>
              <textarea required rows={3} value={bulkCancelReason} onChange={e => setBulkCancelReason(e.target.value)} placeholder="Reason for cancellation..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white resize-none" />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button onClick={() => { setBulkCancelOpen(false); setBulkCancelReason(''); }} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Keep Orders</button>
              <button onClick={handleBulkCancel} disabled={!bulkCancelReason.trim()} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 rounded-lg font-medium">Cancel {selection.selectedIds.length} POs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Search, Download, Plus, Eye, Building2, Edit2, Trash2, X, Mail, Phone, MapPin, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useExport } from '../../utils/useExport';
import ConfirmDialog from '../Common/ConfirmDialog';
import EmptyState from '../Common/EmptyState';
import WarehouseTabs from '../Common/WarehouseTabs';
import BulkActionBar from '../Common/BulkActionBar';
import { formatCurrency } from '../../utils/exportUtils';
import type { Vendor } from '../../types';

export default function Vendors() {
  const { vendors, purchaseOrders, warehouses, addVendor, updateVendor, deleteVendor, bulkDeleteVendors, bulkAssignVendorWarehouse } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAssignWh, setBulkAssignWh] = useState<{ open: boolean; warehouseId: string }>({ open: false, warehouseId: '' });
  const [formData, setFormData] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: '',
    gstNumber: '', drugLicense: '', paymentTerms: 'Net 30',
    primaryWarehouseId: '', primaryWarehouseName: '',
    isActive: true,
  });

  const getVendorStats = (vendorId: string) => {
    const pos = purchaseOrders.filter(po => po.vendorId === vendorId);
    const warehousesUsed = new Set(pos.map(p => p.warehouseId));
    return {
      totalPOs: pos.length,
      totalValue: pos.reduce((s, po) => s + po.grandTotal, 0),
      pendingPOs: pos.filter(p => p.status !== 'Received' && p.status !== 'Cancelled').length,
      warehousesServed: warehousesUsed.size,
    };
  };

  // Counts per warehouse: how many vendors deliver to each warehouse
  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: vendors.length };
    warehouses.forEach(w => {
      const vendorIdsForWh = new Set(purchaseOrders.filter(po => po.warehouseId === w.id).map(po => po.vendorId));
      // Also include vendors with primary warehouse = this warehouse
      vendors.forEach(v => { if (v.primaryWarehouseId === w.id) vendorIdsForWh.add(v.id); });
      counts[w.id] = vendorIdsForWh.size;
    });
    return counts;
  }, [vendors, warehouses, purchaseOrders]);

  // Filter vendors
  const filtered = useMemo(() => {
    return vendors.filter(v => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.gstNumber.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (warehouseFilter === 'All') return true;
      // Vendor matches warehouse if: primary warehouse matches OR has POs to that warehouse
      if (v.primaryWarehouseId === warehouseFilter) return true;
      const hasPOs = purchaseOrders.some(po => po.vendorId === v.id && po.warehouseId === warehouseFilter);
      return hasPOs;
    });
  }, [vendors, searchQuery, warehouseFilter, purchaseOrders]);

  // Group vendors by their primary warehouse for visual segregation when "All" selected
  const groupedByWarehouse = useMemo(() => {
    if (warehouseFilter !== 'All') return null;
    const groups: Record<string, { warehouse: typeof warehouses[0] | { id: string; name: string; location: string }; vendors: Vendor[] }> = {};
    warehouses.forEach(w => {
      groups[w.id] = { warehouse: w, vendors: [] };
    });
    groups['unassigned'] = { warehouse: { id: 'unassigned', name: 'Unassigned', location: 'No primary warehouse' }, vendors: [] };
    filtered.forEach(v => {
      const key = v.primaryWarehouseId || 'unassigned';
      if (groups[key]) groups[key].vendors.push(v);
      else groups['unassigned'].vendors.push(v);
    });
    return Object.values(groups).filter(g => g.vendors.length > 0);
  }, [filtered, warehouses, warehouseFilter]);

  const handleExportPDF = () => {
    const headers = ['Name', 'Contact', 'Phone', 'GST', 'License', 'Primary Warehouse', 'Payment Terms', 'Active POs'];
    const data = filtered.map(v => {
      const stats = getVendorStats(v.id);
      return [v.name, v.contactPerson, v.phone, v.gstNumber, v.drugLicense, v.primaryWarehouseName || 'N/A', v.paymentTerms, stats.totalPOs];
    });
    downloadPDF(`Vendors ${warehouseFilter !== 'All' ? `(${warehouses.find(w => w.id === warehouseFilter)?.name})` : ''}`, headers, data, 'vendors');
  };

  const handleExportExcel = () => {
    const headers = ['Name', 'Contact Person', 'Phone', 'Email', 'Address', 'GST Number', 'Drug License', 'Primary Warehouse', 'Payment Terms', 'Total POs', 'Total Business', 'Pending POs'];
    const data = filtered.map(v => {
      const stats = getVendorStats(v.id);
      return [v.name, v.contactPerson, v.phone, v.email, v.address, v.gstNumber, v.drugLicense, v.primaryWarehouseName || 'N/A', v.paymentTerms, stats.totalPOs, stats.totalValue, stats.pendingPOs];
    });
    downloadExcel('Vendor Directory', headers, data, 'vendors');
  };

  const handleOpenAdd = () => {
    setEditing(null);
    const wh = warehouseFilter !== 'All' ? warehouses.find(w => w.id === warehouseFilter) : warehouses[0];
    setFormData({
      name: '', contactPerson: '', phone: '', email: '', address: '',
      gstNumber: '', drugLicense: '', paymentTerms: 'Net 30',
      primaryWarehouseId: wh?.id || '',
      primaryWarehouseName: wh?.name || '',
      isActive: true,
    });
    setShowForm(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditing(v);
    setFormData({
      name: v.name, contactPerson: v.contactPerson, phone: v.phone, email: v.email, address: v.address,
      gstNumber: v.gstNumber, drugLicense: v.drugLicense, paymentTerms: v.paymentTerms,
      primaryWarehouseId: v.primaryWarehouseId || '',
      primaryWarehouseName: v.primaryWarehouseName || '',
      isActive: v.isActive,
    });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const wh = warehouses.find(w => w.id === formData.primaryWarehouseId);
    const payload = {
      ...formData,
      primaryWarehouseId: wh?.id || '',
      primaryWarehouseName: wh?.name || '',
    };
    if (editing) updateVendor({ ...editing, ...payload });
    else addVendor(payload);
    setShowForm(false);
  };

  const handleDelete = () => {
    deleteVendor(confirmDelete.id);
    setConfirmDelete({ open: false, id: '', name: '' });
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const filteredIds = filtered.map(v => v.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
  };

  const handleBulkDelete = () => {
    bulkDeleteVendors(selectedIds);
    setSelectedIds([]);
    setBulkDeleteOpen(false);
  };
  const handleBulkAssign = () => {
    if (bulkAssignWh.warehouseId) {
      bulkAssignVendorWarehouse(selectedIds, bulkAssignWh.warehouseId);
      setSelectedIds([]);
      setBulkAssignWh({ open: false, warehouseId: '' });
    }
  };

  // Render a single vendor card
  const renderVendorCard = (vendor: Vendor) => {
    const stats = getVendorStats(vendor.id);
    const isSelected = selectedIds.includes(vendor.id);
    return (
      <div key={vendor.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${isSelected ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-700'} p-5 hover:shadow-lg transition-all group relative`}>
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(vendor.id)}
          className="absolute top-3 left-3 rounded text-blue-600 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex items-start justify-between mb-3 ml-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">{vendor.name}</h3>
              <p className="text-xs text-slate-500 truncate">{vendor.contactPerson}</p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setViewVendor(vendor)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><Eye size={14} /></button>
            <button onClick={() => handleOpenEdit(vendor)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"><Edit2 size={14} /></button>
            <button onClick={() => setConfirmDelete({ open: true, id: vendor.id, name: vendor.name })} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={14} /></button>
          </div>
        </div>
        {vendor.primaryWarehouseName && (
          <div className="mb-2 flex items-center gap-1.5 text-[10px] px-2 py-1 bg-violet-50 dark:bg-violet-900/20 rounded-lg w-fit">
            <Building2 size={10} className="text-violet-600" />
            <span className="text-violet-700 dark:text-violet-400 font-medium">{vendor.primaryWarehouseName}</span>
          </div>
        )}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Phone size={12} /> {vendor.phone}</div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Mail size={12} /> <span className="truncate">{vendor.email}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">GST</span><span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{vendor.gstNumber}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">License</span><span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{vendor.drugLicense}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Payment</span><span className="text-slate-700 dark:text-slate-300">{vendor.paymentTerms}</span></div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-1.5">
          <div className="text-center p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{stats.totalPOs}</p>
            <p className="text-[10px] text-slate-500">POs</p>
          </div>
          <div className="text-center p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{stats.pendingPOs}</p>
            <p className="text-[10px] text-slate-500">Pending</p>
          </div>
          <div className="text-center p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">₹{(stats.totalValue / 1000).toFixed(0)}K</p>
            <p className="text-[10px] text-slate-500">Business</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Vendors', value: vendors.length, color: 'bg-blue-500' },
          { label: 'Active Vendors', value: vendors.filter(v => v.isActive).length, color: 'bg-emerald-500' },
          { label: 'Total POs', value: purchaseOrders.length, color: 'bg-violet-500' },
          { label: 'Pending POs', value: purchaseOrders.filter(p => p.status !== 'Received' && p.status !== 'Cancelled').length, color: 'bg-amber-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${s.color}`} />
            <div><p className="text-[10px] uppercase text-slate-500">{s.label}</p><p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Warehouse Tabs */}
      <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} counts={whCounts} />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filtered.length}
        onClear={() => setSelectedIds([])}
        label="vendors"
        actions={[
          { label: 'Assign Warehouse', icon: <ArrowRightLeft size={12} />, onClick: () => setBulkAssignWh({ open: true, warehouseId: warehouses[0]?.id || '' }), variant: 'primary' },
          { label: 'Delete Selected', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-blue-500">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search vendors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400"><X size={14} /></button>}
          </div>
          {filtered.length > 0 && (
            <button onClick={toggleAll} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <input type="checkbox" checked={allSelected} readOnly className="rounded text-blue-600" />
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
          <button onClick={handleOpenAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"><Plus size={16} /> Add Vendor</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<Building2 size={28} />} title="No vendors found" message="Add a vendor to start managing supplier relationships." action={<button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add First Vendor</button>} />
        </div>
      ) : groupedByWarehouse ? (
        // Grouped view (when All warehouses selected)
        <div className="space-y-5">
          {groupedByWarehouse.map(group => (
            <div key={group.warehouse.id}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                    <Building2 size={14} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{group.warehouse.name}</h3>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin size={9} /> {group.warehouse.location}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  {group.vendors.length} vendor{group.vendors.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.vendors.map(renderVendorCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Filtered view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(renderVendorCard)}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Vendor' : 'Add New Vendor'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vendor Name *</label>
                <input required type="text" placeholder="e.g., Cipla Distribution" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contact Person *</label>
                <input required type="text" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone *</label>
                <input required type="tel" placeholder="+91-9876543210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Address *</label>
                <input required type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">GST Number *</label>
                <input required type="text" placeholder="27AABCC1234F1Z5" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Drug License *</label>
                <input required type="text" placeholder="MH-DL-2024-001" value={formData.drugLicense} onChange={e => setFormData({ ...formData, drugLicense: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Primary Warehouse *</label>
                <select required value={formData.primaryWarehouseId} onChange={e => setFormData({ ...formData, primaryWarehouseId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="">-- Select primary warehouse --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Where this vendor primarily delivers stock</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Terms</label>
                <select value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option>Cash</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                <select value={formData.isActive ? 'active' : 'inactive'} onChange={e => setFormData({ ...formData, isActive: e.target.value === 'active' })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">{editing ? 'Save Changes' : 'Add Vendor'}</button>
            </div>
          </form>
        </div>
      )}

      {/* View Modal */}
      {viewVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setViewVendor(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Building2 size={20} className="text-white" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewVendor.name}</h3>
                  <p className="text-xs text-slate-500">{viewVendor.contactPerson}</p>
                </div>
              </div>
              <button onClick={() => setViewVendor(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries({
                'Phone': viewVendor.phone,
                'Email': viewVendor.email,
                'Address': viewVendor.address,
                'GST': viewVendor.gstNumber,
                'License': viewVendor.drugLicense,
                'Primary Warehouse': viewVendor.primaryWarehouseName || 'N/A',
                'Payment Terms': viewVendor.paymentTerms,
                'Total Business': formatCurrency(getVendorStats(viewVendor.id).totalValue),
              }).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-sm text-slate-500">{key}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white text-right max-w-[60%] break-words">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Delete Vendor?"
        message={`Delete vendor "${confirmDelete.name}"? Existing POs will remain in records but no new orders can be created.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: '', name: '' })}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title="Delete Multiple Vendors?"
        message={`Delete ${selectedIds.length} selected vendor(s)? This action will be logged in the audit trail.`}
        variant="danger"
        confirmLabel={`Delete ${selectedIds.length} Vendors`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      {/* Bulk Assign Warehouse Modal */}
      {bulkAssignWh.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setBulkAssignWh({ open: false, warehouseId: '' })}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><ArrowRightLeft size={18} className="text-violet-600" /></div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Assign Primary Warehouse</h3>
                  <p className="text-xs text-slate-500">Update {selectedIds.length} selected vendor(s)</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Select Warehouse *</label>
                <select value={bulkAssignWh.warehouseId} onChange={e => setBulkAssignWh({ ...bulkAssignWh, warehouseId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                </select>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
                <p className="text-xs text-violet-700 dark:text-violet-400">
                  <strong>Selected vendors:</strong> {selectedIds.map(id => vendors.find(v => v.id === id)?.name).filter(Boolean).slice(0, 3).join(', ')}
                  {selectedIds.length > 3 && ` +${selectedIds.length - 3} more`}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button onClick={() => setBulkAssignWh({ open: false, warehouseId: '' })} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleBulkAssign} disabled={!bulkAssignWh.warehouseId} className="px-4 py-2 text-sm text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 rounded-lg font-medium">Apply to {selectedIds.length} vendors</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

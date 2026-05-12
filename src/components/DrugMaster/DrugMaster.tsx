import { useState, useMemo } from 'react';
import { Plus, Search, Download, Edit2, Eye, Trash2, Pill, X, TrendingUp, LayoutGrid, List } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import ConfirmDialog from '../Common/ConfirmDialog';
import EmptyState from '../Common/EmptyState';
import WarehouseTabs from '../Common/WarehouseTabs';
import CategoryAccordion from '../Common/CategoryAccordion';
import BulkActionBar from '../Common/BulkActionBar';
import { useSelection } from '../../utils/useSelection';
import type { Drug } from '../../types';

export default function DrugMaster() {
  const { drugs, batches, addDrug, updateDrug, deleteDrug, bulkDeleteDrugs } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [groupBy, setGroupBy] = useState<'category' | 'therapeutic'>('category');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [showForm, setShowForm] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [viewDrug, setViewDrug] = useState<Drug | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[]; name: string }>({ open: false, ids: [], name: '' });

  const [formData, setFormData] = useState({
    name: '', genericName: '', brandName: '', composition: '',
    category: 'Tablet' as Drug['category'],
    therapeuticCategory: 'Other' as Drug['therapeuticCategory'],
    scheduleType: 'OTC' as Drug['scheduleType'],
    manufacturer: '', hsnCode: '', sku: '',
    defaultPurchasePrice: 0, defaultSellingPrice: 0, mrp: 0, gstPercent: 12,
    storageConditions: '', barcode: '', isActive: true,
  });

  const schedules = ['All', 'OTC', 'H', 'H1', 'X'];

  const calcMargin = (purchase: number, selling: number) =>
    purchase > 0 && selling > 0 ? ((selling - purchase) / selling) * 100 : 0;

  // Filter drugs based on warehouse — only drugs that have batches in selected warehouse
  const filteredDrugs = useMemo(() => {
    let result = drugs;
    if (warehouseFilter !== 'All') {
      const drugIdsInWh = new Set(batches.filter(b => b.warehouseId === warehouseFilter).map(b => b.drugId));
      result = result.filter(d => drugIdsInWh.has(d.id));
    }
    return result.filter(drug => {
      const matchSearch = drug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSchedule = scheduleFilter === 'All' || drug.scheduleType === scheduleFilter;
      return matchSearch && matchSchedule;
    });
  }, [drugs, batches, warehouseFilter, searchQuery, scheduleFilter]);

  const selection = useSelection(filteredDrugs);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const handleBulkDelete = () => {
    bulkDeleteDrugs(selection.selectedIds);
    selection.clear();
    setBulkDeleteOpen(false);
  };

  // Drug counts per warehouse for tabs
  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: drugs.length };
    batches.forEach(b => {
      if (!counts[b.warehouseId]) counts[b.warehouseId] = 0;
    });
    Object.keys(counts).forEach(whId => {
      if (whId === 'All') return;
      const drugIds = new Set(batches.filter(b => b.warehouseId === whId).map(b => b.drugId));
      counts[whId] = drugIds.size;
    });
    return counts;
  }, [drugs, batches]);

  // Group drugs by category or therapeutic category
  const grouped = useMemo(() => {
    const groups: Record<string, Drug[]> = {};
    filteredDrugs.forEach(d => {
      const key = groupBy === 'category' ? d.category : d.therapeuticCategory;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredDrugs, groupBy]);

  const getScheduleBadge = (s: string) => {
    const colors: Record<string, string> = {
      H: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      H1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      X: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      OTC: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return colors[s] || 'bg-slate-100 text-slate-700';
  };

  const handleExportPDF = () => {
    const headers = ['SKU', 'Name', 'Generic', 'Drug Cat.', 'Therapeutic Cat.', 'Schedule', 'Manufacturer', 'Purchase', 'Selling', 'MRP', 'Margin %'];
    const data = filteredDrugs.map(d => [d.sku, d.name, d.genericName, d.category, d.therapeuticCategory, d.scheduleType, d.manufacturer, d.defaultPurchasePrice, d.defaultSellingPrice, d.mrp, calcMargin(d.defaultPurchasePrice, d.defaultSellingPrice).toFixed(1) + '%']);
    downloadPDF(`Drug Master ${warehouseFilter === 'All' ? '(All Warehouses)' : ''}`, headers, data, 'drug-master');
  };

  const handleExportExcel = () => {
    const headers = ['SKU', 'Drug Name', 'Generic Name', 'Brand Name', 'Composition', 'Drug Category', 'Therapeutic Category', 'Schedule', 'Manufacturer', 'HSN Code', 'Purchase Price', 'Selling Price', 'MRP', 'Margin %', 'GST %', 'Storage', 'Barcode'];
    const data = filteredDrugs.map(d => [d.sku, d.name, d.genericName, d.brandName, d.composition, d.category, d.therapeuticCategory, d.scheduleType, d.manufacturer, d.hsnCode, d.defaultPurchasePrice, d.defaultSellingPrice, d.mrp, calcMargin(d.defaultPurchasePrice, d.defaultSellingPrice).toFixed(2), d.gstPercent, d.storageConditions, d.barcode]);
    downloadExcel('Drug Master Catalog', headers, data, 'drug-master');
  };

  const handleOpenAddForm = () => {
    setEditingDrug(null);
    setFormData({
      name: '', genericName: '', brandName: '', composition: '',
      category: 'Tablet', therapeuticCategory: 'Other', scheduleType: 'OTC', manufacturer: '', hsnCode: '', sku: '',
      defaultPurchasePrice: 0, defaultSellingPrice: 0, mrp: 0, gstPercent: 12,
      storageConditions: '', barcode: '', isActive: true,
    });
    setShowForm(true);
  };

  const handleOpenEditForm = (drug: Drug) => {
    setEditingDrug(drug);
    setFormData({
      name: drug.name, genericName: drug.genericName, brandName: drug.brandName,
      composition: drug.composition, category: drug.category,
      therapeuticCategory: drug.therapeuticCategory, scheduleType: drug.scheduleType,
      manufacturer: drug.manufacturer, hsnCode: drug.hsnCode, sku: drug.sku,
      defaultPurchasePrice: drug.defaultPurchasePrice, defaultSellingPrice: drug.defaultSellingPrice,
      mrp: drug.mrp, gstPercent: drug.gstPercent, storageConditions: drug.storageConditions,
      barcode: drug.barcode, isActive: drug.isActive,
    });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDrug) updateDrug({ ...editingDrug, ...formData });
    else addDrug(formData);
    setShowForm(false);
  };

  const handleConfirmDelete = () => {
    confirmDelete.ids.forEach(id => deleteDrug(id));
    setConfirmDelete({ open: false, ids: [], name: '' });
  };

  const renderDrugTable = (drugList: Drug[]) => {
    const groupAllSelected = drugList.length > 0 && drugList.every(d => selection.isSelected(d.id));
    const toggleGroupAll = () => {
      if (groupAllSelected) selection.setSelectedIds(prev => prev.filter(id => !drugList.find(d => d.id === id)));
      else selection.setSelectedIds(prev => [...new Set([...prev, ...drugList.map(d => d.id)])]);
    };
    return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
            <th className="py-2 px-4 w-10"><input type="checkbox" checked={groupAllSelected} onChange={toggleGroupAll} className="rounded text-blue-600 cursor-pointer" /></th>
            <th className="text-left py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Drug Name</th>
            <th className="text-left py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Generic / Brand</th>
            <th className="text-center py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Schedule</th>
            <th className="text-left py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Manufacturer</th>
            <th className="text-right py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Purchase ₹</th>
            <th className="text-right py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Selling ₹</th>
            <th className="text-right py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">MRP ₹</th>
            <th className="text-center py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Margin %</th>
            <th className="text-center py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drugList.map(drug => {
            const margin = calcMargin(drug.defaultPurchasePrice, drug.defaultSellingPrice);
            const isSel = selection.isSelected(drug.id);
            return (
              <tr key={drug.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                <td className="py-3 px-4"><input type="checkbox" checked={isSel} onChange={() => selection.toggleOne(drug.id)} className="rounded text-blue-600 cursor-pointer" /></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Pill size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{drug.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{drug.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <p className="text-slate-700 dark:text-slate-300">{drug.genericName}</p>
                  <p className="text-xs text-slate-500">{drug.brandName}</p>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getScheduleBadge(drug.scheduleType)}`}>{drug.scheduleType}</span>
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{drug.manufacturer}</td>
                <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(drug.defaultPurchasePrice)}</td>
                <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(drug.defaultSellingPrice)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white font-mono">{formatCurrency(drug.mrp)}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    margin >= 35 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    margin >= 25 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    margin >= 15 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <TrendingUp size={10} /> {margin.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setViewDrug(drug)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><Eye size={14} /></button>
                    <button onClick={() => handleOpenEditForm(drug)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirmDelete({ open: true, ids: [drug.id], name: drug.name })} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={14} /></button>
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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Drugs', value: drugs.length, color: 'bg-blue-500' },
          { label: 'OTC Drugs', value: drugs.filter(d => d.scheduleType === 'OTC').length, color: 'bg-green-500' },
          { label: 'Schedule H/H1/X', value: drugs.filter(d => ['H', 'H1', 'X'].includes(d.scheduleType)).length, color: 'bg-red-500' },
          { label: 'Avg. Margin', value: `${(drugs.reduce((s, d) => s + calcMargin(d.defaultPurchasePrice, d.defaultSellingPrice), 0) / drugs.length).toFixed(1)}%`, color: 'bg-emerald-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${s.color}`} />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Warehouse Tabs */}
      <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} counts={whCounts} />

      <BulkActionBar
        selectedCount={selection.selectedIds.length}
        totalCount={filteredDrugs.length}
        onClear={selection.clear}
        label="drugs"
        actions={[
          { label: 'Delete Selected', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-blue-500">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search drugs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          <select value={scheduleFilter} onChange={e => setScheduleFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            {schedules.map(s => <option key={s} value={s}>{s === 'All' ? 'All Schedules' : `Schedule ${s}`}</option>)}
          </select>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button onClick={() => setGroupBy('category')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'category' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>By Form</button>
            <button onClick={() => setGroupBy('therapeutic')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'therapeutic' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>By Therapeutic</button>
          </div>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grouped')} className={`p-1.5 rounded ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`} title="Grouped"><LayoutGrid size={14} /></button>
            <button onClick={() => setViewMode('flat')} className={`p-1.5 rounded ${viewMode === 'flat' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`} title="Flat list"><List size={14} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
          <button onClick={handleOpenAddForm} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"><Plus size={16} /> Add Drug</button>
        </div>
      </div>

      {/* Body */}
      {filteredDrugs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<Pill size={28} />} title="No drugs found" message="Try adjusting your filters or add a new drug to get started." action={<button onClick={handleOpenAddForm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add First Drug</button>} />
        </div>
      ) : viewMode === 'flat' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {renderDrugTable(filteredDrugs)}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([category, drugList]) => {
            const totalValue = drugList.reduce((s, d) => s + d.mrp, 0);
            const avgMargin = drugList.reduce((s, d) => s + calcMargin(d.defaultPurchasePrice, d.defaultSellingPrice), 0) / drugList.length;
            return (
              <CategoryAccordion
                key={category}
                category={category}
                count={drugList.length}
                summary={`Avg margin: ${avgMargin.toFixed(1)}% • Total MRP: ${formatCurrency(totalValue)}`}
              >
                {renderDrugTable(drugList)}
              </CategoryAccordion>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingDrug ? 'Edit Drug' : 'Add New Drug'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingDrug ? `Editing: ${editingDrug.name}` : 'Fill in the details below'}</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Drug Name *</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Generic Name *</label><input required type="text" value={formData.genericName} onChange={e => setFormData({ ...formData, genericName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Brand Name *</label><input required type="text" value={formData.brandName} onChange={e => setFormData({ ...formData, brandName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Manufacturer *</label><input required type="text" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Composition *</label><input required type="text" value={formData.composition} onChange={e => setFormData({ ...formData, composition: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Categorization & Codes</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Drug Form (Category) *</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as Drug['category'] })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      <option>Tablet</option><option>Capsule</option><option>Syrup</option><option>Injection</option><option>Ointment</option><option>Drops</option><option>Inhaler</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Therapeutic Category *</label>
                    <select value={formData.therapeuticCategory} onChange={e => setFormData({ ...formData, therapeuticCategory: e.target.value as Drug['therapeuticCategory'] })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      <option>Antibiotics</option><option>Pain Killers</option><option>Antidiabetic</option><option>Antiulcer</option><option>Antiallergic</option><option>Antihypertensive</option><option>Bronchodilator</option><option>Corticosteroid</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Schedule Type</label>
                    <select value={formData.scheduleType} onChange={e => setFormData({ ...formData, scheduleType: e.target.value as Drug['scheduleType'] })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                      <option>OTC</option><option>H</option><option>H1</option><option>X</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">SKU Code *</label><input required type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">HSN Code *</label><input required type="text" value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Barcode</label><input type="text" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pricing & Tax</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Purchase ₹ *</label><input required type="number" step="0.01" value={formData.defaultPurchasePrice || ''} onChange={e => setFormData({ ...formData, defaultPurchasePrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Selling ₹ *</label><input required type="number" step="0.01" value={formData.defaultSellingPrice || ''} onChange={e => setFormData({ ...formData, defaultSellingPrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">MRP ₹ *</label><input required type="number" step="0.01" value={formData.mrp || ''} onChange={e => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">GST %</label><input required type="number" value={formData.gstPercent || ''} onChange={e => setFormData({ ...formData, gstPercent: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" /></div>
                </div>
                {formData.defaultSellingPrice > 0 && formData.defaultPurchasePrice > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400">Profit Margin:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{calcMargin(formData.defaultPurchasePrice, formData.defaultSellingPrice).toFixed(1)}% ({formatCurrency(formData.defaultSellingPrice - formData.defaultPurchasePrice)} per unit)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Storage Conditions</label>
                <input type="text" value={formData.storageConditions} onChange={e => setFormData({ ...formData, storageConditions: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-800">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow">{editingDrug ? 'Save Changes' : 'Add Drug'}</button>
            </div>
          </form>
        </div>
      )}

      {/* View Modal */}
      {viewDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setViewDrug(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Pill size={20} className="text-white" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewDrug.name}</h3>
                    <p className="text-xs text-slate-500">{viewDrug.brandName} by {viewDrug.manufacturer}</p>
                  </div>
                </div>
                <button onClick={() => setViewDrug(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getScheduleBadge(viewDrug.scheduleType)}`}>Schedule {viewDrug.scheduleType}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{viewDrug.category}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{viewDrug.therapeuticCategory}</span>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries({
                'Generic Name': viewDrug.genericName,
                'Composition': viewDrug.composition,
                'SKU': viewDrug.sku,
                'HSN Code': viewDrug.hsnCode,
                'Barcode': viewDrug.barcode || '—',
                'Storage': viewDrug.storageConditions,
              }).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-sm text-slate-500">{key}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white text-right">{value}</span>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { label: 'Purchase', value: formatCurrency(viewDrug.defaultPurchasePrice), color: 'text-slate-700 dark:text-slate-300' },
                  { label: 'Selling', value: formatCurrency(viewDrug.defaultSellingPrice), color: 'text-blue-600' },
                  { label: 'MRP', value: formatCurrency(viewDrug.mrp), color: 'text-emerald-600' },
                  { label: 'Margin', value: `${calcMargin(viewDrug.defaultPurchasePrice, viewDrug.defaultSellingPrice).toFixed(1)}%`, color: 'text-violet-600' },
                ].map((p, i) => (
                  <div key={i} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                    <p className="text-[10px] text-slate-500 uppercase">{p.label}</p>
                    <p className={`text-xs font-bold mt-1 ${p.color}`}>{p.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmDelete.open} title="Delete Drug?" message={`Delete ${confirmDelete.name}? This action will be logged.`} variant="danger" confirmLabel="Delete" onConfirm={handleConfirmDelete} onCancel={() => setConfirmDelete({ open: false, ids: [], name: '' })} />
      <ConfirmDialog isOpen={bulkDeleteOpen} title="Delete Multiple Drugs?" message={`Permanently delete ${selection.selectedIds.length} selected drug(s)? This action will be logged.`} variant="danger" confirmLabel={`Delete ${selection.selectedIds.length}`} onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteOpen(false)} />
    </div>
  );
}

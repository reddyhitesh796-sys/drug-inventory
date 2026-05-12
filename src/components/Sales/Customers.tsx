import { useState } from 'react';
import { Search, Download, Plus, Building, Eye, Edit2, Trash2, X, Phone, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import ConfirmDialog from '../Common/ConfirmDialog';
import EmptyState from '../Common/EmptyState';
import BulkActionBar from '../Common/BulkActionBar';
import type { Customer } from '../../types';

export default function Customers() {
  const { customers, salesInvoices, addCustomer, updateCustomer, deleteCustomer, bulkDeleteCustomers } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: '',
    gstNumber: '', drugLicense: '', creditLimit: 100000, outstandingBalance: 0,
    type: 'Pharmacy' as Customer['type'], isActive: true,
  });

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const getCustomerStats = (customerId: string) => {
    const invoices = salesInvoices.filter(inv => inv.customerId === customerId);
    return {
      totalInvoices: invoices.length,
      totalBusiness: invoices.reduce((s, inv) => s + inv.totalAmount, 0),
      totalPaid: invoices.reduce((s, inv) => s + inv.paidAmount, 0),
    };
  };

  const handleExportPDF = () => {
    const headers = ['Name', 'Contact', 'Phone', 'Type', 'GST', 'Credit Limit ₹', 'Outstanding ₹'];
    const data = filtered.map(c => [c.name, c.contactPerson, c.phone, c.type, c.gstNumber, c.creditLimit, c.outstandingBalance]);
    downloadPDF('Customer Directory', headers, data, 'customers');
  };

  const handleExportExcel = () => {
    const headers = ['Name', 'Contact Person', 'Phone', 'Email', 'Address', 'Type', 'GST Number', 'Drug License', 'Credit Limit', 'Outstanding Balance'];
    const data = filtered.map(c => [c.name, c.contactPerson, c.phone, c.email, c.address, c.type, c.gstNumber, c.drugLicense, c.creditLimit, c.outstandingBalance]);
    downloadExcel('Customer Directory', headers, data, 'customers');
  };

  const handleOpenAdd = () => {
    setEditing(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '', drugLicense: '', creditLimit: 100000, outstandingBalance: 0, type: 'Pharmacy', isActive: true });
    setShowForm(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditing(c);
    setFormData({ name: c.name, contactPerson: c.contactPerson, phone: c.phone, email: c.email, address: c.address, gstNumber: c.gstNumber, drugLicense: c.drugLicense, creditLimit: c.creditLimit, outstandingBalance: c.outstandingBalance, type: c.type, isActive: c.isActive });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateCustomer({ ...editing, ...formData });
    else addCustomer(formData);
    setShowForm(false);
  };

  const handleDelete = () => {
    deleteCustomer(confirmDelete.id);
    setConfirmDelete({ open: false, id: '', name: '' });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Hospital: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Pharmacy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Clinic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      Distributor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[type] || 'bg-slate-100 text-slate-700';
  };

  // Selection helpers
  const filteredIds = filtered.map(c => c.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
  };
  const handleBulkDelete = () => {
    bulkDeleteCustomers(selectedIds);
    setSelectedIds([]);
    setBulkDeleteOpen(false);
  };

  return (
    <div className="space-y-4">
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filtered.length}
        onClear={() => setSelectedIds([])}
        label="customers"
        actions={[
          { label: 'Delete Selected', icon: <Trash2 size={12} />, onClick: () => setBulkDeleteOpen(true), variant: 'danger' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-blue-500">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search customers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <option value="All">All Types</option>
            <option value="Hospital">Hospital</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Clinic">Clinic</option>
            <option value="Distributor">Distributor</option>
            <option value="Other">Other</option>
          </select>
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
          <button onClick={handleOpenAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"><Plus size={16} /> Add Customer</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<Building size={28} />} title="No customers found" message="Add a customer to start creating sales invoices." action={<button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add First Customer</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const stats = getCustomerStats(customer.id);
            const isSelected = selectedIds.includes(customer.id);
            return (
              <div key={customer.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${isSelected ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-700'} p-5 hover:shadow-lg transition-all group relative`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => setSelectedIds(prev => prev.includes(customer.id) ? prev.filter(x => x !== customer.id) : [...prev, customer.id])}
                  className="absolute top-3 left-3 rounded text-blue-600 cursor-pointer z-10"
                />
                <div className="flex items-start justify-between mb-3 ml-6">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Building size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{customer.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{customer.contactPerson}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getTypeColor(customer.type)}`}>{customer.type}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs mb-3">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Phone size={12} /> {customer.phone}</div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Mail size={12} /> <span className="truncate">{customer.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Credit Limit</span><span className="text-slate-700 dark:text-slate-300">{formatCurrency(customer.creditLimit)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outstanding</span>
                    <span className={`font-medium ${customer.outstandingBalance > 100000 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {formatCurrency(customer.outstandingBalance)}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-1.5">
                  <div className="text-center p-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{stats.totalInvoices}</p>
                    <p className="text-[10px] text-slate-500">Invoices</p>
                  </div>
                  <div className="text-center p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">₹{(stats.totalBusiness / 1000).toFixed(0)}K</p>
                    <p className="text-[10px] text-slate-500">Business</p>
                  </div>
                  <div className="text-center p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">₹{(stats.totalPaid / 1000).toFixed(0)}K</p>
                    <p className="text-[10px] text-slate-500">Paid</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setViewCustomer(customer)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><Eye size={14} /></button>
                  <button onClick={() => handleOpenEdit(customer)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"><Edit2 size={14} /></button>
                  <button onClick={() => setConfirmDelete({ open: true, id: customer.id, name: customer.name })} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Customer Name *</label>
                <input required type="text" placeholder="e.g., Apollo Pharmacy Chain" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contact Person *</label>
                <input required type="text" placeholder="e.g., Dr. Mehta" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type *</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as Customer['type'] })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option>Hospital</option><option>Pharmacy</option><option>Clinic</option><option>Distributor</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone *</label>
                <input required type="tel" placeholder="+91-9876543210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                <input type="email" placeholder="customer@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Address *</label>
                <input required type="text" placeholder="Full address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">GST Number *</label>
                <input required type="text" placeholder="27AABCA1111A1Z1" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Drug License *</label>
                <input required type="text" placeholder="MH-DL-2024-101" value={formData.drugLicense} onChange={e => setFormData({ ...formData, drugLicense: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Credit Limit (₹) *</label>
                <input required type="number" min="0" value={formData.creditLimit || ''} onChange={e => setFormData({ ...formData, creditLimit: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Outstanding (₹)</label>
                <input type="number" min="0" value={formData.outstandingBalance || ''} onChange={e => setFormData({ ...formData, outstandingBalance: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">{editing ? 'Save Changes' : 'Add Customer'}</button>
            </div>
          </form>
        </div>
      )}

      {viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setViewCustomer(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewCustomer.name}</h3>
              <button onClick={() => setViewCustomer(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries({
                'Contact': viewCustomer.contactPerson, 'Phone': viewCustomer.phone, 'Email': viewCustomer.email,
                'Address': viewCustomer.address, 'Type': viewCustomer.type, 'GST': viewCustomer.gstNumber,
                'License': viewCustomer.drugLicense, 'Credit Limit': formatCurrency(viewCustomer.creditLimit),
                'Outstanding': formatCurrency(viewCustomer.outstandingBalance),
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
        title="Delete Customer?"
        message={`Delete customer "${confirmDelete.name}"? Existing invoices will remain in records.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: '', name: '' })}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title="Delete Multiple Customers?"
        message={`Delete ${selectedIds.length} selected customer(s)? Existing invoices will remain. This action will be logged.`}
        variant="danger"
        confirmLabel={`Delete ${selectedIds.length} Customers`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Drug, Batch, Warehouse, Vendor, Customer, PurchaseOrder, SalesInvoice, SalesReturn, PurchaseReturn, AuditLog, Alert, ProfitLossData, User, TrackingEvent } from '../types';
import { useToast } from './ToastContext';
import {
  drugs as initialDrugs,
  batches as initialBatches,
  warehouses as initialWarehouses,
  vendors as initialVendors,
  customers as initialCustomers,
  purchaseOrders as initialPOs,
  salesInvoices as initialInvoices,
  salesReturns as initialSalesReturns,
  purchaseReturns as initialPurchaseReturns,
  auditLogs as initialAuditLogs,
  alerts as initialAlerts,
  profitLossData as initialPLData,
  users as initialUsers,
} from '../data/mockData';

interface AppContextType {
  drugs: Drug[];
  batches: Batch[];
  warehouses: Warehouse[];
  vendors: Vendor[];
  customers: Customer[];
  purchaseOrders: PurchaseOrder[];
  salesInvoices: SalesInvoice[];
  salesReturns: SalesReturn[];
  purchaseReturns: PurchaseReturn[];
  auditLogs: AuditLog[];
  alerts: Alert[];
  profitLossData: ProfitLossData[];
  users: User[];

  addDrug: (drug: Omit<Drug, 'id' | 'createdAt'>) => void;
  updateDrug: (drug: Drug) => void;
  deleteDrug: (id: string) => void;
  bulkDeleteDrugs: (ids: string[]) => void;

  addBatch: (batch: Omit<Batch, 'id' | 'createdAt' | 'currentStock' | 'quantityOut'>) => void;
  updateBatch: (batch: Batch) => void;
  deleteBatch: (id: string) => void;
  bulkDeleteBatches: (ids: string[]) => void;
  transferBatchStock: (batchId: string, toWarehouseId: string, quantity: number) => void;
  adjustBatchStock: (batchId: string, newQty: number, reason: string) => void;

  addWarehouse: (wh: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (wh: Warehouse) => void;
  deleteWarehouse: (id: string) => void;

  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (id: string) => void;
  bulkDeleteVendors: (ids: string[]) => void;
  bulkAssignVendorWarehouse: (ids: string[], warehouseId: string) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  bulkDeleteCustomers: (ids: string[]) => void;

  addUser: (user: Omit<User, 'id' | 'lastLogin'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  toggleUserActive: (id: string) => void;
  updateUserPermissions: (id: string, permissions: string[]) => void;
  bulkDeleteUsers: (ids: string[]) => void;
  bulkSetUserActive: (ids: string[], isActive: boolean) => void;
  bulkAssignRole: (ids: string[], role: User['role']) => void;

  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => void;
  updatePurchaseOrder: (po: PurchaseOrder) => void;
  cancelPurchaseOrder: (id: string, reason: string) => void;
  updatePOStatus: (id: string, status: PurchaseOrder['status'], note?: string, location?: string) => void;
  receivePurchaseOrder: (id: string) => void;
  bulkUpdatePOStatus: (ids: string[], status: PurchaseOrder['status']) => void;
  bulkCancelPOs: (ids: string[], reason: string) => void;
  bulkReceivePOs: (ids: string[]) => void;

  addSalesInvoice: (inv: Omit<SalesInvoice, 'id' | 'invoiceNumber'>) => void;
  updateSalesInvoice: (inv: SalesInvoice) => void;
  deleteSalesInvoice: (id: string) => void;
  bulkDeleteSalesInvoices: (ids: string[]) => void;
  bulkDeleteSalesReturns: (ids: string[]) => void;
  bulkDeletePurchaseReturns: (ids: string[]) => void;
  bulkDeleteWarehouses: (ids: string[]) => void;

  addSalesReturn: (sr: Omit<SalesReturn, 'id' | 'returnNumber'>) => void;
  addPurchaseReturn: (pr: Omit<PurchaseReturn, 'id' | 'returnNumber'>) => void;

  addAuditLog: (module: string, action: AuditLog['action'], entityId: string, entityType: string, description: string, beforeState?: string, afterState?: string) => void;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  dismissAlert: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [drugs, setDrugs] = useState<Drug[]>(initialDrugs);
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPOs);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(initialInvoices);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(initialSalesReturns);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(initialPurchaseReturns);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [profitLossData] = useState<ProfitLossData[]>(initialPLData);
  const [users, setUsers] = useState<User[]>(initialUsers);

  const addAuditLog = (
    module: string,
    action: AuditLog['action'],
    entityId: string,
    entityType: string,
    description: string,
    beforeState?: string,
    afterState?: string
  ) => {
    const newLog: AuditLog = {
      id: `AL${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: 'U001',
      userName: 'Admin User',
      userRole: 'Admin',
      module,
      action,
      entityId,
      entityType,
      description,
      beforeState,
      afterState,
      ipAddress: '192.168.1.100',
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const generateAlerts = (batch: Batch) => {
    const daysToExpiry = Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry > 0 && daysToExpiry <= 90) {
      const newAlert: Alert = {
        id: `ALT${Date.now()}`,
        type: 'Near Expiry',
        severity: daysToExpiry <= 30 ? 'Critical' : daysToExpiry <= 60 ? 'High' : 'Medium',
        message: `Batch ${batch.batchNo} (${batch.drugName}) expires in ${daysToExpiry} days - ${batch.currentStock} units remaining`,
        entityId: batch.id,
        entityType: 'Batch',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        isRead: false,
      };
      setAlerts(prev => [newAlert, ...prev]);
    } else if (daysToExpiry <= 0) {
      const newAlert: Alert = {
        id: `ALT${Date.now()}`,
        type: 'Expired',
        severity: 'Critical',
        message: `Batch ${batch.batchNo} (${batch.drugName}) has EXPIRED - ${batch.currentStock} units, value ₹${(batch.currentStock * batch.purchasePrice).toLocaleString()}`,
        entityId: batch.id,
        entityType: 'Batch',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        isRead: false,
      };
      setAlerts(prev => [newAlert, ...prev]);
    }
    if (batch.currentStock <= 200 && batch.currentStock > 0) {
      const newAlert: Alert = {
        id: `ALT${Date.now() + 1}`,
        type: 'Low Stock',
        severity: batch.currentStock <= 100 ? 'High' : 'Medium',
        message: `Low stock alert: ${batch.drugName} (${batch.batchNo}) - only ${batch.currentStock} units left`,
        entityId: batch.id,
        entityType: 'Batch',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        isRead: false,
      };
      setAlerts(prev => [newAlert, ...prev]);
    }
  };

  // DRUG operations
  const addDrug = (newDrugData: Omit<Drug, 'id' | 'createdAt'>) => {
    const id = `D${Date.now()}`;
    const drug: Drug = { ...newDrugData, id, createdAt: new Date().toISOString().substring(0, 10) };
    setDrugs(prev => [drug, ...prev]);
    addAuditLog('Drug Master', 'Create', id, 'Drug', `Added new drug: ${drug.name}`, undefined, JSON.stringify(drug));
    showToast('success', 'Drug Added', `${drug.name} has been added to the catalog`);
  };

  const updateDrug = (updatedDrug: Drug) => {
    const before = drugs.find(d => d.id === updatedDrug.id);
    setDrugs(prev => prev.map(d => d.id === updatedDrug.id ? updatedDrug : d));
    addAuditLog('Drug Master', 'Update', updatedDrug.id, 'Drug', `Updated drug: ${updatedDrug.name}`, JSON.stringify(before), JSON.stringify(updatedDrug));
    showToast('success', 'Drug Updated', `${updatedDrug.name} has been updated successfully`);
  };

  const deleteDrug = (id: string) => {
    const drug = drugs.find(d => d.id === id);
    setDrugs(prev => prev.filter(d => d.id !== id));
    addAuditLog('Drug Master', 'Delete', id, 'Drug', `Deleted drug: ${drug?.name || id}`, JSON.stringify(drug));
    showToast('warning', 'Drug Deleted', `${drug?.name || id} has been removed`);
  };

  const bulkDeleteDrugs = (ids: string[]) => {
    setDrugs(prev => prev.filter(d => !ids.includes(d.id)));
    addAuditLog('Drug Master', 'Delete', ids.join(','), 'Drug', `Bulk deleted ${ids.length} drugs`);
    showToast('warning', 'Bulk Delete', `${ids.length} drugs deleted successfully`);
  };

  // Auto-correct status based on expiry date and stock
  const autoCorrectStatus = (b: Pick<Batch, 'expiryDate' | 'currentStock' | 'status'>): Batch['status'] => {
    const expired = new Date(b.expiryDate).getTime() <= Date.now();
    if (expired) return 'Expired';
    if (b.currentStock <= 0) return 'Depleted';
    // Don't override Quarantine
    if (b.status === 'Quarantine') return 'Quarantine';
    return 'Active';
  };

  // BATCH operations
  const addBatch = (newBatchData: Omit<Batch, 'id' | 'createdAt' | 'currentStock' | 'quantityOut'>) => {
    const id = `B${Date.now()}`;
    const currentStock = newBatchData.quantityIn;
    const batch: Batch = {
      ...newBatchData,
      id,
      quantityOut: 0,
      currentStock,
      status: autoCorrectStatus({ expiryDate: newBatchData.expiryDate, currentStock, status: newBatchData.status }),
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setBatches(prev => [batch, ...prev]);
    addAuditLog('Inventory', 'Create', id, 'Batch', `Added new batch ${batch.batchNo} for ${batch.drugName}`, undefined, JSON.stringify(batch));
    generateAlerts(batch);
    showToast('success', 'Batch Added', `Batch ${batch.batchNo} added with ${batch.quantityIn} units (Status: ${batch.status})`);
  };

  const updateBatch = (updatedBatch: Batch) => {
    const before = batches.find(b => b.id === updatedBatch.id);
    const corrected: Batch = {
      ...updatedBatch,
      status: autoCorrectStatus(updatedBatch),
    };
    setBatches(prev => prev.map(b => b.id === updatedBatch.id ? corrected : b));
    addAuditLog('Inventory', 'Update', updatedBatch.id, 'Batch', `Updated batch ${updatedBatch.batchNo}`, JSON.stringify(before), JSON.stringify(corrected));
    showToast('success', 'Batch Updated', `Batch ${updatedBatch.batchNo} updated (Status: ${corrected.status})`);
  };

  const deleteBatch = (id: string) => {
    const batch = batches.find(b => b.id === id);
    setBatches(prev => prev.filter(b => b.id !== id));
    addAuditLog('Inventory', 'Delete', id, 'Batch', `Deleted batch ${batch?.batchNo || id}`, JSON.stringify(batch));
    showToast('warning', 'Batch Deleted', `Batch ${batch?.batchNo || id} removed from inventory`);
  };

  const bulkDeleteBatches = (ids: string[]) => {
    setBatches(prev => prev.filter(b => !ids.includes(b.id)));
    addAuditLog('Inventory', 'Delete', ids.join(','), 'Batch', `Bulk deleted ${ids.length} batches`);
    showToast('warning', 'Bulk Delete', `${ids.length} batches deleted successfully`);
  };

  const transferBatchStock = (batchId: string, toWarehouseId: string, quantity: number) => {
    const batch = batches.find(b => b.id === batchId);
    const toWh = warehouses.find(w => w.id === toWarehouseId);
    if (!batch || !toWh) return;
    if (quantity > batch.currentStock) {
      showToast('error', 'Transfer Failed', 'Insufficient stock for transfer');
      return;
    }
    // Reduce source batch
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, currentStock: b.currentStock - quantity, quantityOut: b.quantityOut + quantity } : b));
    // Create new batch at destination
    const newBatch: Batch = {
      ...batch,
      id: `B${Date.now()}`,
      quantityIn: quantity,
      quantityOut: 0,
      currentStock: quantity,
      warehouseId: toWh.id,
      warehouseName: toWh.name,
      grnId: `TRF-${batchId}`,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setBatches(prev => [newBatch, ...prev]);
    addAuditLog('Inventory', 'Update', batchId, 'Batch', `Transferred ${quantity} units of ${batch.batchNo} from ${batch.warehouseName} to ${toWh.name}`);
    showToast('success', 'Stock Transferred', `${quantity} units moved to ${toWh.name}`);
  };

  const adjustBatchStock = (batchId: string, newQty: number, reason: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    const before = JSON.stringify({ currentStock: batch.currentStock });
    const diff = newQty - batch.currentStock;
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, currentStock: newQty } : b));
    addAuditLog('Inventory', 'Stock Edit', batchId, 'Batch', `Stock adjustment for ${batch.batchNo}: ${diff > 0 ? '+' : ''}${diff} units. Reason: ${reason}`, before, JSON.stringify({ currentStock: newQty }));
    showToast('info', 'Stock Adjusted', `${batch.batchNo} stock changed by ${diff > 0 ? '+' : ''}${diff} units`);
  };

  // WAREHOUSE operations
  const addWarehouse = (wh: Omit<Warehouse, 'id'>) => {
    const id = `WH${Date.now()}`;
    const newWh: Warehouse = { ...wh, id };
    setWarehouses(prev => [...prev, newWh]);
    addAuditLog('Settings', 'Create', id, 'Warehouse', `Added new warehouse: ${newWh.name}`);
    showToast('success', 'Warehouse Added', `${newWh.name} created successfully`);
  };

  const updateWarehouse = (wh: Warehouse) => {
    setWarehouses(prev => prev.map(w => w.id === wh.id ? wh : w));
    addAuditLog('Settings', 'Update', wh.id, 'Warehouse', `Updated warehouse: ${wh.name}`);
    showToast('success', 'Warehouse Updated', `${wh.name} updated successfully`);
  };

  const deleteWarehouse = (id: string) => {
    const wh = warehouses.find(w => w.id === id);
    setWarehouses(prev => prev.filter(w => w.id !== id));
    addAuditLog('Settings', 'Delete', id, 'Warehouse', `Deleted warehouse: ${wh?.name}`);
    showToast('warning', 'Warehouse Deleted', `${wh?.name} removed`);
  };

  // VENDOR operations
  const addVendor = (vendor: Omit<Vendor, 'id' | 'createdAt'>) => {
    const id = `V${Date.now()}`;
    const newV: Vendor = { ...vendor, id, createdAt: new Date().toISOString().substring(0, 10) };
    setVendors(prev => [newV, ...prev]);
    addAuditLog('Purchase', 'Create', id, 'Vendor', `Added vendor: ${newV.name}`);
    showToast('success', 'Vendor Added', `${newV.name} added to vendor list`);
  };

  const updateVendor = (vendor: Vendor) => {
    setVendors(prev => prev.map(v => v.id === vendor.id ? vendor : v));
    addAuditLog('Purchase', 'Update', vendor.id, 'Vendor', `Updated vendor: ${vendor.name}`);
    showToast('success', 'Vendor Updated', `${vendor.name} updated successfully`);
  };

  const deleteVendor = (id: string) => {
    const v = vendors.find(x => x.id === id);
    setVendors(prev => prev.filter(x => x.id !== id));
    addAuditLog('Purchase', 'Delete', id, 'Vendor', `Deleted vendor: ${v?.name}`);
    showToast('warning', 'Vendor Deleted', `${v?.name} removed`);
  };

  const bulkDeleteVendors = (ids: string[]) => {
    setVendors(prev => prev.filter(v => !ids.includes(v.id)));
    addAuditLog('Purchase', 'Delete', ids.join(','), 'Vendor', `Bulk deleted ${ids.length} vendors`);
    showToast('warning', 'Bulk Delete', `${ids.length} vendors removed successfully`);
  };

  const bulkAssignVendorWarehouse = (ids: string[], warehouseId: string) => {
    const wh = warehouses.find(w => w.id === warehouseId);
    if (!wh) return;
    setVendors(prev => prev.map(v => ids.includes(v.id) ? { ...v, primaryWarehouseId: wh.id, primaryWarehouseName: wh.name } : v));
    addAuditLog('Purchase', 'Update', ids.join(','), 'Vendor', `Bulk assigned ${ids.length} vendors to ${wh.name}`);
    showToast('success', 'Vendors Updated', `${ids.length} vendors assigned to ${wh.name}`);
  };

  // CUSTOMER operations
  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const id = `C${Date.now()}`;
    const newC: Customer = { ...customer, id, createdAt: new Date().toISOString().substring(0, 10) };
    setCustomers(prev => [newC, ...prev]);
    addAuditLog('Sales', 'Create', id, 'Customer', `Added customer: ${newC.name}`);
    showToast('success', 'Customer Added', `${newC.name} added to customer list`);
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    addAuditLog('Sales', 'Update', customer.id, 'Customer', `Updated customer: ${customer.name}`);
    showToast('success', 'Customer Updated', `${customer.name} updated successfully`);
  };

  const deleteCustomer = (id: string) => {
    const c = customers.find(x => x.id === id);
    setCustomers(prev => prev.filter(x => x.id !== id));
    addAuditLog('Sales', 'Delete', id, 'Customer', `Deleted customer: ${c?.name}`);
    showToast('warning', 'Customer Deleted', `${c?.name} removed`);
  };

  const bulkDeleteCustomers = (ids: string[]) => {
    setCustomers(prev => prev.filter(c => !ids.includes(c.id)));
    addAuditLog('Sales', 'Delete', ids.join(','), 'Customer', `Bulk deleted ${ids.length} customers`);
    showToast('warning', 'Bulk Delete', `${ids.length} customers removed successfully`);
  };

  // USER operations
  const addUser = (user: Omit<User, 'id' | 'lastLogin'>) => {
    const id = `U${Date.now()}`;
    const newUser: User = { ...user, id, lastLogin: 'Never' };
    setUsers(prev => [...prev, newUser]);
    addAuditLog('Settings', 'Create', id, 'User', `Created user: ${newUser.name} (${newUser.role})`);
    showToast('success', 'User Created', `${newUser.name} added with role ${newUser.role}`);
  };

  const updateUser = (user: User) => {
    const before = users.find(u => u.id === user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    addAuditLog('Settings', 'Update', user.id, 'User', `Updated user: ${user.name}`, JSON.stringify(before), JSON.stringify(user));
    showToast('success', 'User Updated', `${user.name} updated successfully`);
  };

  const deleteUser = (id: string) => {
    const u = users.find(x => x.id === id);
    if (u?.role === 'Admin' && users.filter(x => x.role === 'Admin' && x.isActive).length === 1) {
      showToast('error', 'Cannot Delete', 'At least one Admin user must remain active');
      return;
    }
    setUsers(prev => prev.filter(x => x.id !== id));
    addAuditLog('Settings', 'Delete', id, 'User', `Deleted user: ${u?.name}`);
    showToast('warning', 'User Deleted', `${u?.name} removed from system`);
  };

  const toggleUserActive = (id: string) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    if (u.isActive && u.role === 'Admin' && users.filter(x => x.role === 'Admin' && x.isActive).length === 1) {
      showToast('error', 'Cannot Disable', 'At least one Admin must remain active');
      return;
    }
    setUsers(prev => prev.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x));
    addAuditLog('Settings', 'Update', id, 'User', `${u.isActive ? 'Disabled' : 'Enabled'} user: ${u.name}`);
    showToast(u.isActive ? 'warning' : 'success', u.isActive ? 'User Disabled' : 'User Enabled', `${u.name} access ${u.isActive ? 'revoked' : 'restored'}`);
  };

  const updateUserPermissions = (id: string, permissions: string[]) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    setUsers(prev => prev.map(x => x.id === id ? { ...x, customPermissions: permissions, role: 'Custom' as User['role'] } : x));
    addAuditLog('Settings', 'Update', id, 'User Permissions', `Updated permissions for ${u.name}: ${permissions.length} permissions assigned`);
    showToast('success', 'Permissions Updated', `${u.name} now has ${permissions.length} permissions`);
  };

  const bulkDeleteUsers = (ids: string[]) => {
    const adminCount = users.filter(u => u.role === 'Admin' && u.isActive && !ids.includes(u.id)).length;
    if (adminCount === 0) {
      showToast('error', 'Cannot Delete', 'At least one Admin must remain');
      return;
    }
    setUsers(prev => prev.filter(u => !ids.includes(u.id)));
    addAuditLog('Settings', 'Delete', ids.join(','), 'User', `Bulk deleted ${ids.length} users`);
    showToast('warning', 'Bulk Delete', `${ids.length} users removed`);
  };

  const bulkSetUserActive = (ids: string[], isActive: boolean) => {
    if (!isActive) {
      const adminCount = users.filter(u => u.role === 'Admin' && u.isActive && !ids.includes(u.id)).length;
      if (adminCount === 0) {
        showToast('error', 'Cannot Disable', 'At least one Admin must remain active');
        return;
      }
    }
    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, isActive } : u));
    addAuditLog('Settings', 'Update', ids.join(','), 'User', `Bulk ${isActive ? 'enabled' : 'disabled'} ${ids.length} users`);
    showToast(isActive ? 'success' : 'warning', `${ids.length} users ${isActive ? 'enabled' : 'disabled'}`, '');
  };

  const bulkAssignRole = (ids: string[], role: User['role']) => {
    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, role, customPermissions: undefined } : u));
    addAuditLog('Settings', 'Update', ids.join(','), 'User', `Bulk assigned ${ids.length} users to role: ${role}`);
    showToast('success', 'Role Updated', `${ids.length} users assigned to ${role}`);
  };

  // PURCHASE ORDER operations
  const addPurchaseOrder = (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => {
    const id = `PO${Date.now()}`;
    const seq = String(purchaseOrders.length + 1).padStart(3, '0');
    const poNumber = `PO-${new Date().getFullYear()}-${seq}`;
    const initialTracking: TrackingEvent[] = [
      {
        id: `T${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Ordered',
        location: 'Vendor Warehouse',
        description: 'Purchase order placed and confirmed',
        user: 'Admin User',
      },
    ];
    const newPO: PurchaseOrder = {
      ...po,
      id,
      poNumber,
      trackingHistory: po.trackingHistory && po.trackingHistory.length > 0 ? po.trackingHistory : initialTracking,
      trackingNumber: po.trackingNumber || `TRK-${po.vendorName.substring(0, 3).toUpperCase()}-${seq}`,
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    addAuditLog('Purchase', 'Create', id, 'Purchase Order', `Created PO ${poNumber} for ${po.vendorName} - ${po.items.length} items, ₹${po.grandTotal.toLocaleString()}`);
    showToast('success', 'PO Created', `${poNumber} placed with ${po.vendorName}`);
  };

  const updatePurchaseOrder = (po: PurchaseOrder) => {
    const before = purchaseOrders.find(p => p.id === po.id);
    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? po : p));
    addAuditLog('Purchase', 'Update', po.id, 'Purchase Order', `Updated PO ${po.poNumber}`, JSON.stringify(before), JSON.stringify(po));
    showToast('success', 'PO Updated', `${po.poNumber} updated successfully`);
  };

  const cancelPurchaseOrder = (id: string, reason: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;
    const newEvent: TrackingEvent = {
      id: `T${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Cancelled',
      description: `Order cancelled. Reason: ${reason}`,
      user: 'Admin User',
    };
    setPurchaseOrders(prev => prev.map(p => p.id === id ? {
      ...p,
      status: 'Cancelled',
      trackingHistory: [...(p.trackingHistory || []), newEvent],
    } : p));
    addAuditLog('Purchase', 'Update', id, 'Purchase Order', `Cancelled PO ${po.poNumber}: ${reason}`);
    showToast('warning', 'PO Cancelled', `${po.poNumber} has been cancelled`);
  };

  const updatePOStatus = (id: string, status: PurchaseOrder['status'], note?: string, location?: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;
    const newEvent: TrackingEvent = {
      id: `T${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      location,
      description: note || `Status updated to ${status}`,
      user: 'Admin User',
    };
    setPurchaseOrders(prev => prev.map(p => p.id === id ? {
      ...p,
      status,
      trackingHistory: [...(p.trackingHistory || []), newEvent],
    } : p));
    addAuditLog('Purchase', 'Update', id, 'Purchase Order', `${po.poNumber} status changed to ${status}`);
    showToast('info', 'Status Updated', `${po.poNumber} → ${status}`);
  };

  const receivePurchaseOrder = (id: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;
    const today = new Date().toISOString().substring(0, 10);
    const newEvent: TrackingEvent = {
      id: `T${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Received',
      location: po.warehouseName,
      description: 'Shipment received and verified at warehouse. Stock added to inventory.',
      user: 'Admin User',
    };
    setPurchaseOrders(prev => prev.map(p => p.id === id ? {
      ...p,
      status: 'Received',
      receivedDate: today,
      trackingHistory: [...(p.trackingHistory || []), newEvent],
    } : p));

    // Auto-create batches in inventory for each PO item
    po.items.forEach((item, idx) => {
      const drug = drugs.find(d => d.id === item.drugId);
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 2); // default 2 years from now
      const batchId = `B${Date.now()}${idx}`;
      const newBatch: Batch = {
        id: batchId,
        drugId: item.drugId,
        drugName: item.drugName,
        batchNo: `${item.drugName.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${po.poNumber.split('-').pop()}-${idx + 1}`,
        expiryDate: expiryDate.toISOString().substring(0, 10),
        mrp: drug?.mrp || item.purchasePrice * 1.5,
        purchasePrice: item.purchasePrice,
        sellingPrice: drug?.defaultSellingPrice || item.purchasePrice * 1.3,
        orderPlaced: item.quantity,
        rejected: 0,
        quantityIn: item.quantity,
        quantityOut: 0,
        currentStock: item.quantity,
        warehouseId: po.warehouseId,
        warehouseName: po.warehouseName,
        grnId: po.poNumber.replace('PO', 'GRN'),
        status: 'Active',
        createdAt: today,
      };
      setBatches(prev => [newBatch, ...prev]);
    });

    addAuditLog('Purchase', 'Update', id, 'Purchase Order', `Marked ${po.poNumber} as Received. Created ${po.items.length} new batches at ${po.warehouseName}.`);
    showToast('success', 'PO Received', `${po.poNumber} received - ${po.items.length} batches added to ${po.warehouseName}`);
  };

  const bulkUpdatePOStatus = (ids: string[], status: PurchaseOrder['status']) => {
    setPurchaseOrders(prev => prev.map(p => {
      if (!ids.includes(p.id)) return p;
      const newEvent: TrackingEvent = {
        id: `T${Date.now()}-${p.id}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status,
        description: `Status updated to ${status} (bulk action)`,
        user: 'Admin User',
      };
      return { ...p, status, trackingHistory: [...(p.trackingHistory || []), newEvent] };
    }));
    addAuditLog('Purchase', 'Update', ids.join(','), 'Purchase Order', `Bulk updated ${ids.length} POs to status: ${status}`);
    showToast('success', 'Bulk Status Update', `${ids.length} POs marked as ${status}`);
  };

  const bulkCancelPOs = (ids: string[], reason: string) => {
    ids.forEach(id => cancelPurchaseOrder(id, reason));
    showToast('warning', 'Bulk Cancel', `${ids.length} POs cancelled`);
  };

  const bulkReceivePOs = (ids: string[]) => {
    ids.forEach(id => receivePurchaseOrder(id));
    showToast('success', 'Bulk Received', `${ids.length} POs marked as received`);
  };

  // SALES INVOICE
  const addSalesInvoice = (inv: Omit<SalesInvoice, 'id' | 'invoiceNumber'>) => {
    const id = `INV${Date.now()}`;
    const seq = String(salesInvoices.length + 1).padStart(3, '0');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${seq}`;
    const newInv: SalesInvoice = { ...inv, id, invoiceNumber };
    setSalesInvoices(prev => [newInv, ...prev]);
    // Deduct stock from batches
    inv.items.forEach(item => {
      setBatches(prev => prev.map(b => b.id === item.batchId
        ? { ...b, currentStock: Math.max(0, b.currentStock - item.quantity), quantityOut: b.quantityOut + item.quantity }
        : b
      ));
    });
    addAuditLog('Sales', 'Create', id, 'Sales Invoice', `Created invoice ${invoiceNumber} for ${inv.customerName} - ${inv.items.length} items, ₹${inv.totalAmount.toLocaleString()}`);
    showToast('success', 'Invoice Created', `${invoiceNumber} • ${inv.customerName} • ₹${inv.totalAmount.toLocaleString()}`);
  };

  const updateSalesInvoice = (inv: SalesInvoice) => {
    const before = salesInvoices.find(i => i.id === inv.id);
    setSalesInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
    addAuditLog('Sales', 'Update', inv.id, 'Sales Invoice', `Updated invoice ${inv.invoiceNumber}`, JSON.stringify(before), JSON.stringify(inv));
    showToast('success', 'Invoice Updated', `${inv.invoiceNumber} updated successfully`);
  };

  const deleteSalesInvoice = (id: string) => {
    const inv = salesInvoices.find(i => i.id === id);
    if (!inv) return;
    // Restore stock
    inv.items.forEach(item => {
      setBatches(prev => prev.map(b => b.id === item.batchId
        ? { ...b, currentStock: b.currentStock + item.quantity, quantityOut: Math.max(0, b.quantityOut - item.quantity) }
        : b
      ));
    });
    setSalesInvoices(prev => prev.filter(i => i.id !== id));
    addAuditLog('Sales', 'Delete', id, 'Sales Invoice', `Deleted invoice ${inv.invoiceNumber}. Stock restored to inventory.`);
    showToast('warning', 'Invoice Deleted', `${inv.invoiceNumber} removed - stock restored`);
  };

  const bulkDeleteSalesInvoices = (ids: string[]) => {
    // Restore stock for each invoice
    ids.forEach(id => {
      const inv = salesInvoices.find(i => i.id === id);
      if (!inv) return;
      inv.items.forEach(item => {
        setBatches(prev => prev.map(b => b.id === item.batchId
          ? { ...b, currentStock: b.currentStock + item.quantity, quantityOut: Math.max(0, b.quantityOut - item.quantity) }
          : b
        ));
      });
    });
    setSalesInvoices(prev => prev.filter(i => !ids.includes(i.id)));
    addAuditLog('Sales', 'Delete', ids.join(','), 'Sales Invoice', `Bulk cancelled ${ids.length} invoices and restored stock`);
    showToast('warning', 'Bulk Cancel', `${ids.length} invoices cancelled, stock restored`);
  };

  const bulkDeleteSalesReturns = (ids: string[]) => {
    setSalesReturns(prev => prev.filter(r => !ids.includes(r.id)));
    addAuditLog('Returns', 'Delete', ids.join(','), 'Sales Return', `Bulk deleted ${ids.length} sales returns`);
    showToast('warning', 'Bulk Delete', `${ids.length} sales returns removed`);
  };

  const bulkDeletePurchaseReturns = (ids: string[]) => {
    setPurchaseReturns(prev => prev.filter(r => !ids.includes(r.id)));
    addAuditLog('Returns', 'Delete', ids.join(','), 'Purchase Return', `Bulk deleted ${ids.length} purchase returns`);
    showToast('warning', 'Bulk Delete', `${ids.length} purchase returns removed`);
  };

  const bulkDeleteWarehouses = (ids: string[]) => {
    setWarehouses(prev => prev.filter(w => !ids.includes(w.id)));
    addAuditLog('Settings', 'Delete', ids.join(','), 'Warehouse', `Bulk deleted ${ids.length} warehouses`);
    showToast('warning', 'Bulk Delete', `${ids.length} warehouses removed`);
  };

  // SALES RETURN
  const addSalesReturn = (sr: Omit<SalesReturn, 'id' | 'returnNumber'>) => {
    const id = `SR${Date.now()}`;
    const seq = String(salesReturns.length + 1).padStart(3, '0');
    const returnNumber = `SR-${new Date().getFullYear()}-${seq}`;
    const newSR: SalesReturn = { ...sr, id, returnNumber };
    setSalesReturns(prev => [newSR, ...prev]);
    // Add returned stock back to batches (re-entry)
    sr.items.forEach(item => {
      setBatches(prev => prev.map(b => b.id === item.batchId
        ? { ...b, currentStock: b.currentStock + item.quantity, quantityOut: Math.max(0, b.quantityOut - item.quantity) }
        : b
      ));
    });
    addAuditLog('Returns', 'Create', id, 'Sales Return', `Created sales return ${returnNumber} for ${sr.customerName} - ${sr.items.length} items, ₹${sr.totalAmount}`);
    showToast('success', 'Sales Return Created', `${returnNumber} processed - stock re-entered to inventory`);
  };

  // PURCHASE RETURN
  const addPurchaseReturn = (pr: Omit<PurchaseReturn, 'id' | 'returnNumber'>) => {
    const id = `PR${Date.now()}`;
    const seq = String(purchaseReturns.length + 1).padStart(3, '0');
    const returnNumber = `PR-${new Date().getFullYear()}-${seq}`;
    const newPR: PurchaseReturn = { ...pr, id, returnNumber };
    setPurchaseReturns(prev => [newPR, ...prev]);
    // Deduct returned stock from batches
    pr.items.forEach(item => {
      setBatches(prev => prev.map(b => b.id === item.batchId
        ? { ...b, currentStock: Math.max(0, b.currentStock - item.quantity), quantityOut: b.quantityOut + item.quantity }
        : b
      ));
    });
    addAuditLog('Returns', 'Create', id, 'Purchase Return', `Created purchase return ${returnNumber} to ${pr.vendorName} - ${pr.items.length} items, ₹${pr.totalAmount}`);
    showToast('success', 'Purchase Return Created', `${returnNumber} created - stock deducted from inventory`);
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const markAllAlertsAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    showToast('info', 'All Alerts Marked Read', 'You have no unread alerts');
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <AppContext.Provider value={{
      drugs, batches, warehouses, vendors, customers, purchaseOrders, salesInvoices, salesReturns, purchaseReturns, auditLogs, alerts, profitLossData, users,
      addDrug, updateDrug, deleteDrug, bulkDeleteDrugs,
      addBatch, updateBatch, deleteBatch, bulkDeleteBatches, transferBatchStock, adjustBatchStock,
      addWarehouse, updateWarehouse, deleteWarehouse,
      addVendor, updateVendor, deleteVendor, bulkDeleteVendors, bulkAssignVendorWarehouse,
      addCustomer, updateCustomer, deleteCustomer, bulkDeleteCustomers,
      addUser, updateUser, deleteUser, toggleUserActive, updateUserPermissions, bulkDeleteUsers, bulkSetUserActive, bulkAssignRole,
      addPurchaseOrder, updatePurchaseOrder, cancelPurchaseOrder, updatePOStatus, receivePurchaseOrder, bulkUpdatePOStatus, bulkCancelPOs, bulkReceivePOs,
      addSalesInvoice, updateSalesInvoice, deleteSalesInvoice, bulkDeleteSalesInvoices, bulkDeleteSalesReturns, bulkDeletePurchaseReturns, bulkDeleteWarehouses,
      addSalesReturn, addPurchaseReturn,
      addAuditLog, markAlertAsRead, markAllAlertsAsRead, dismissAlert,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

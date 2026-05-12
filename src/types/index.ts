export interface Drug {
  id: string;
  name: string;
  genericName: string;
  brandName: string;
  composition: string;
  category: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Drops' | 'Inhaler' | 'Other';
  therapeuticCategory: 'Antibiotics' | 'Pain Killers' | 'Antidiabetic' | 'Antiulcer' | 'Antiallergic' | 'Antihypertensive' | 'Bronchodilator' | 'Corticosteroid' | 'Other';
  scheduleType: 'H' | 'H1' | 'X' | 'OTC';
  manufacturer: string;
  hsnCode: string;
  sku: string;
  defaultPurchasePrice: number;
  defaultSellingPrice: number;
  mrp: number;
  gstPercent: number;
  storageConditions: string;
  barcode: string;
  isActive: boolean;
  createdAt: string;
}

export interface Batch {
  id: string;
  drugId: string;
  drugName: string;
  batchNo: string;
  expiryDate: string;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  orderPlaced: number;
  rejected: number;
  quantityIn: number;
  quantityOut: number;
  currentStock: number;
  warehouseId: string;
  warehouseName: string;
  grnId: string;
  status: 'Active' | 'Expired' | 'Depleted' | 'Quarantine';
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentStock: number;
  isActive: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  drugLicense: string;
  paymentTerms: string;
  primaryWarehouseId?: string;
  primaryWarehouseName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  drugLicense: string;
  creditLimit: number;
  outstandingBalance: number;
  type: 'Hospital' | 'Pharmacy' | 'Clinic' | 'Distributor' | 'Other';
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  warehouseId: string;
  warehouseName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  gstAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Ordered' | 'In Transit' | 'Partial' | 'Received' | 'Cancelled';
  orderDate: string;
  expectedDate: string;
  receivedDate?: string;
  createdBy: string;
  trackingHistory?: TrackingEvent[];
  trackingNumber?: string;
  notes?: string;
}

export interface TrackingEvent {
  id: string;
  timestamp: string;
  status: string;
  location?: string;
  description: string;
  user: string;
}

export interface PurchaseOrderItem {
  drugId: string;
  drugName: string;
  quantity: number;
  purchasePrice: number;
  gstPercent: number;
  amount: number;
}

export interface GRN {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: GRNItem[];
  totalAmount: number;
  receivedDate: string;
  receivedBy: string;
  invoiceNumber: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Partial';
}

export interface GRNItem {
  drugId: string;
  drugName: string;
  batchNo: string;
  expiryDate: string;
  quantityOrdered: number;
  quantityReceived: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  gstPercent: number;
  amount: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentType: 'Cash' | 'Credit' | 'UPI' | 'Bank Transfer';
  status: 'Draft' | 'Confirmed' | 'Dispatched' | 'Delivered' | 'Cancelled' | 'Returned';
  invoiceDate: string;
  dueDate?: string;
  createdBy: string;
}

export interface SalesInvoiceItem {
  drugId: string;
  drugName: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  discount: number;
  amount: number;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: SalesReturnItem[];
  totalAmount: number;
  reason: string;
  returnDate: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  processedBy: string;
}

export interface SalesReturnItem {
  drugId: string;
  drugName: string;
  batchId: string;
  batchNo: string;
  quantity: number;
  amount: number;
  reason: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  grnId: string;
  grnNumber: string;
  vendorId: string;
  vendorName: string;
  items: PurchaseReturnItem[];
  totalAmount: number;
  reason: string;
  returnDate: string;
  status: 'Pending' | 'Dispatched' | 'Accepted' | 'Rejected';
  processedBy: string;
}

export interface PurchaseReturnItem {
  drugId: string;
  drugName: string;
  batchId: string;
  batchNo: string;
  quantity: number;
  amount: number;
  reason: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  module: string;
  action: 'Create' | 'Update' | 'Delete' | 'View' | 'Export' | 'Login' | 'Logout' | 'Stock Edit' | 'Price Change';
  entityId: string;
  entityType: string;
  description: string;
  beforeState?: string;
  afterState?: string;
  ipAddress: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Inventory Manager' | 'Sales Manager' | 'Purchase Manager' | 'Accountant' | 'Auditor' | 'Custom';
  isActive: boolean;
  lastLogin: string;
  customPermissions?: string[]; // Override role permissions if set
  createdAt?: string;
  phone?: string;
  warehouseAccess?: string[]; // Empty = all warehouses, else restrict to specific
}

export interface Alert {
  id: string;
  type: 'Low Stock' | 'Near Expiry' | 'Expired' | 'Price Mismatch' | 'Unusual Edit';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  isRead: boolean;
}

export interface ProfitLossData {
  period: string;
  fy: string;
  warehouseId: string;
  warehouseName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expiredLoss: number;
  damagedLoss: number;
  returnsLoss: number;
  totalLoss: number;
  netProfit: number;
  margin: number;
}

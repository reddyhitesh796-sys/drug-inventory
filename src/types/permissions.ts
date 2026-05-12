export type Permission =
  // Dashboard
  | 'dashboard.view'
  // Drugs
  | 'drugs.view' | 'drugs.create' | 'drugs.update' | 'drugs.delete'
  // Batches
  | 'batches.view' | 'batches.create' | 'batches.update' | 'batches.delete' | 'batches.transfer' | 'batches.adjust'
  // Warehouses
  | 'warehouses.view' | 'warehouses.create' | 'warehouses.update' | 'warehouses.delete'
  // Stock
  | 'stock.view'
  // Vendors
  | 'vendors.view' | 'vendors.create' | 'vendors.update' | 'vendors.delete'
  // Purchase Orders
  | 'purchase.view' | 'purchase.create' | 'purchase.update' | 'purchase.delete'
  // GRN
  | 'grn.view' | 'grn.create'
  // Customers
  | 'customers.view' | 'customers.create' | 'customers.update' | 'customers.delete'
  // Sales Invoices
  | 'sales.view' | 'sales.create' | 'sales.update' | 'sales.delete'
  // Returns
  | 'returns.view' | 'returns.create'
  // Financials
  | 'financials.view'
  // Expiry / Compliance
  | 'expiry.view'
  // Audit
  | 'audit.view'
  // Reports
  | 'reports.view' | 'reports.export'
  // Users
  | 'users.view' | 'users.create' | 'users.update' | 'users.delete'
  // Settings
  | 'settings.view' | 'settings.update' | 'settings.access_control';

export type Module =
  | 'dashboard' | 'drugs' | 'batches' | 'warehouses' | 'stock'
  | 'vendors' | 'purchase-orders' | 'grn' | 'purchase-returns'
  | 'customers' | 'sales-invoices' | 'sales-returns'
  | 'financials' | 'expiry' | 'audit' | 'reports'
  | 'users' | 'settings';

export type Role = 'Admin' | 'Inventory Manager' | 'Sales Manager' | 'Purchase Manager' | 'Accountant' | 'Auditor' | 'Custom';

// All permissions list grouped by module
export const PERMISSION_GROUPS: { module: string; label: string; permissions: { id: Permission; label: string; description: string }[] }[] = [
  {
    module: 'dashboard', label: 'Dashboard',
    permissions: [
      { id: 'dashboard.view', label: 'View Dashboard', description: 'Access main dashboard with KPIs' },
    ],
  },
  {
    module: 'drugs', label: 'Drug Master',
    permissions: [
      { id: 'drugs.view', label: 'View Drugs', description: 'See drug catalog' },
      { id: 'drugs.create', label: 'Create Drugs', description: 'Add new drugs' },
      { id: 'drugs.update', label: 'Update Drugs', description: 'Edit drug information' },
      { id: 'drugs.delete', label: 'Delete Drugs', description: 'Remove drugs from catalog' },
    ],
  },
  {
    module: 'batches', label: 'Batch Management',
    permissions: [
      { id: 'batches.view', label: 'View Batches', description: 'See inventory batches' },
      { id: 'batches.create', label: 'Create Batches', description: 'Add new inventory batches' },
      { id: 'batches.update', label: 'Update Batches', description: 'Edit batch details' },
      { id: 'batches.delete', label: 'Delete Batches', description: 'Remove batches' },
      { id: 'batches.transfer', label: 'Transfer Stock', description: 'Move stock between warehouses' },
      { id: 'batches.adjust', label: 'Adjust Stock', description: 'Manual stock corrections' },
    ],
  },
  {
    module: 'warehouses', label: 'Warehouses',
    permissions: [
      { id: 'warehouses.view', label: 'View Warehouses', description: 'See warehouse list and stock' },
      { id: 'warehouses.create', label: 'Create Warehouse', description: 'Add new warehouse' },
      { id: 'warehouses.update', label: 'Update Warehouse', description: 'Edit warehouse details' },
      { id: 'warehouses.delete', label: 'Delete Warehouse', description: 'Remove warehouses' },
    ],
  },
  {
    module: 'stock', label: 'Stock Reports',
    permissions: [
      { id: 'stock.view', label: 'View Stock Report', description: 'See aggregated stock' },
    ],
  },
  {
    module: 'vendors', label: 'Vendors',
    permissions: [
      { id: 'vendors.view', label: 'View Vendors', description: 'See vendor directory' },
      { id: 'vendors.create', label: 'Add Vendors', description: 'Create new vendor records' },
      { id: 'vendors.update', label: 'Edit Vendors', description: 'Modify vendor info' },
      { id: 'vendors.delete', label: 'Delete Vendors', description: 'Remove vendors' },
    ],
  },
  {
    module: 'purchase', label: 'Purchase Orders',
    permissions: [
      { id: 'purchase.view', label: 'View POs', description: 'See purchase orders' },
      { id: 'purchase.create', label: 'Create PO', description: 'Place new purchase orders' },
      { id: 'purchase.update', label: 'Update PO', description: 'Modify pending POs' },
      { id: 'purchase.delete', label: 'Cancel PO', description: 'Cancel purchase orders' },
      { id: 'grn.view', label: 'View GRN', description: 'See goods receipts' },
      { id: 'grn.create', label: 'Create GRN', description: 'Receive shipments' },
    ],
  },
  {
    module: 'customers', label: 'Customers',
    permissions: [
      { id: 'customers.view', label: 'View Customers', description: 'See customer directory' },
      { id: 'customers.create', label: 'Add Customers', description: 'Add new customers' },
      { id: 'customers.update', label: 'Edit Customers', description: 'Modify customer info' },
      { id: 'customers.delete', label: 'Delete Customers', description: 'Remove customers' },
    ],
  },
  {
    module: 'sales', label: 'Sales',
    permissions: [
      { id: 'sales.view', label: 'View Invoices', description: 'See sales invoices' },
      { id: 'sales.create', label: 'Create Invoice', description: 'Generate new sales invoices' },
      { id: 'sales.update', label: 'Update Invoice', description: 'Modify pending invoices' },
      { id: 'sales.delete', label: 'Cancel Invoice', description: 'Cancel invoices' },
    ],
  },
  {
    module: 'returns', label: 'Returns Management',
    permissions: [
      { id: 'returns.view', label: 'View Returns', description: 'See sales/purchase returns' },
      { id: 'returns.create', label: 'Process Returns', description: 'Create new returns' },
    ],
  },
  {
    module: 'financials', label: 'Financials',
    permissions: [
      { id: 'financials.view', label: 'View P&L', description: 'Access profit & loss data' },
    ],
  },
  {
    module: 'compliance', label: 'Compliance',
    permissions: [
      { id: 'expiry.view', label: 'View Expiry Reports', description: 'See expiry & compliance' },
      { id: 'audit.view', label: 'View Audit Logs', description: 'Access immutable audit trail' },
    ],
  },
  {
    module: 'reports', label: 'Reports',
    permissions: [
      { id: 'reports.view', label: 'View Reports', description: 'Access all reports' },
      { id: 'reports.export', label: 'Export Reports', description: 'Download PDF/Excel exports' },
    ],
  },
  {
    module: 'users', label: 'User Management',
    permissions: [
      { id: 'users.view', label: 'View Users', description: 'See user list' },
      { id: 'users.create', label: 'Add Users', description: 'Create new user accounts' },
      { id: 'users.update', label: 'Edit Users', description: 'Modify user roles & status' },
      { id: 'users.delete', label: 'Delete Users', description: 'Remove user accounts' },
    ],
  },
  {
    module: 'system', label: 'System Settings',
    permissions: [
      { id: 'settings.view', label: 'View Settings', description: 'Access system settings' },
      { id: 'settings.update', label: 'Update Settings', description: 'Modify system config' },
      { id: 'settings.access_control', label: 'Manage Access Control', description: 'Control user permissions (Admin only)' },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id));

// Default role permissions
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'Admin': ALL_PERMISSIONS,
  'Inventory Manager': [
    'dashboard.view',
    'drugs.view', 'drugs.create', 'drugs.update',
    'batches.view', 'batches.create', 'batches.update', 'batches.transfer', 'batches.adjust',
    'warehouses.view', 'warehouses.update',
    'stock.view',
    'expiry.view',
    'reports.view', 'reports.export',
    'settings.view',
  ],
  'Sales Manager': [
    'dashboard.view',
    'drugs.view',
    'stock.view',
    'customers.view', 'customers.create', 'customers.update',
    'sales.view', 'sales.create', 'sales.update',
    'returns.view', 'returns.create',
    'reports.view', 'reports.export',
    'settings.view',
  ],
  'Purchase Manager': [
    'dashboard.view',
    'drugs.view',
    'stock.view',
    'vendors.view', 'vendors.create', 'vendors.update',
    'purchase.view', 'purchase.create', 'purchase.update',
    'grn.view', 'grn.create',
    'returns.view', 'returns.create',
    'reports.view', 'reports.export',
    'settings.view',
  ],
  'Accountant': [
    'dashboard.view',
    'drugs.view',
    'stock.view',
    'sales.view',
    'purchase.view',
    'financials.view',
    'reports.view', 'reports.export',
    'audit.view',
    'settings.view',
  ],
  'Auditor': [
    'dashboard.view',
    'drugs.view',
    'batches.view',
    'warehouses.view',
    'stock.view',
    'vendors.view',
    'purchase.view',
    'grn.view',
    'customers.view',
    'sales.view',
    'returns.view',
    'financials.view',
    'expiry.view',
    'audit.view',
    'reports.view', 'reports.export',
    'settings.view',
  ],
  'Custom': [],
};

// Module → required permission to access (used for routing)
export const MODULE_PERMISSIONS: Record<Module, Permission> = {
  'dashboard': 'dashboard.view',
  'drugs': 'drugs.view',
  'batches': 'batches.view',
  'warehouses': 'warehouses.view',
  'stock': 'stock.view',
  'vendors': 'vendors.view',
  'purchase-orders': 'purchase.view',
  'grn': 'grn.view',
  'purchase-returns': 'returns.view',
  'customers': 'customers.view',
  'sales-invoices': 'sales.view',
  'sales-returns': 'returns.view',
  'financials': 'financials.view',
  'expiry': 'expiry.view',
  'audit': 'audit.view',
  'reports': 'reports.view',
  'users': 'users.view',
  'settings': 'settings.view',
};

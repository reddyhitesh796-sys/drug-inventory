import { useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, DollarSign,
  ClipboardList, FileText, Settings, Users, ChevronDown, ChevronRight,
  Pill, AlertTriangle, X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { Permission } from '../../types/permissions';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission?: Permission;
  children?: { id: string; label: string; permission?: Permission }[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, permission: 'dashboard.view' },
  {
    id: 'inventory', label: 'Inventory', icon: <Package size={18} />,
    children: [
      { id: 'drugs', label: 'Drug Master', permission: 'drugs.view' },
      { id: 'batches', label: 'Batch Management', permission: 'batches.view' },
      { id: 'warehouses', label: 'Warehouses', permission: 'warehouses.view' },
      { id: 'stock', label: 'Stock Report', permission: 'stock.view' },
    ],
  },
  {
    id: 'purchase-module', label: 'Purchase', icon: <ShoppingCart size={18} />,
    children: [
      { id: 'vendors', label: 'Vendors', permission: 'vendors.view' },
      { id: 'purchase-orders', label: 'Purchase Orders', permission: 'purchase.view' },
      { id: 'grn', label: 'GRN / Receipts', permission: 'grn.view' },
      { id: 'purchase-returns', label: 'Purchase Returns', permission: 'returns.view' },
    ],
  },
  {
    id: 'sales-module', label: 'Sales', icon: <Truck size={18} />,
    children: [
      { id: 'customers', label: 'Customers', permission: 'customers.view' },
      { id: 'sales-invoices', label: 'Sales Invoices', permission: 'sales.view' },
      { id: 'sales-returns', label: 'Sales Returns', permission: 'returns.view' },
    ],
  },
  { id: 'financials', label: 'Profit & Loss', icon: <DollarSign size={18} />, permission: 'financials.view' },
  { id: 'expiry', label: 'Expiry & Compliance', icon: <AlertTriangle size={18} />, permission: 'expiry.view' },
  { id: 'audit', label: 'Audit Logs', icon: <ClipboardList size={18} />, permission: 'audit.view' },
  { id: 'reports', label: 'Reports & Export', icon: <FileText size={18} />, permission: 'reports.view' },
  { id: 'users', label: 'User Management', icon: <Users size={18} />, permission: 'users.view' },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} />, permission: 'settings.view' },
];

export default function Sidebar({ activeModule, onModuleChange, isOpen, onToggle }: SidebarProps) {
  const { alerts, batches } = useApp();
  const { hasPermission, currentUser } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['inventory', 'purchase-module', 'sales-module']);

  const unreadAlerts = alerts.filter(a => !a.isRead).length;
  const expiredBatches = batches.filter(b => b.status === 'Expired' || new Date(b.expiryDate) < new Date()).length;

  const getBadge = (id: string): { count: number; color: string } | null => {
    if (id === 'expiry' && (unreadAlerts > 0 || expiredBatches > 0)) {
      return { count: unreadAlerts + expiredBatches, color: 'bg-red-500' };
    }
    return null;
  };

  // Filter menu by permission
  const visibleMenuItems = menuItems.filter(item => {
    if (item.permission) return hasPermission(item.permission);
    if (item.children) {
      const visibleChildren = item.children.filter(c => !c.permission || hasPermission(c.permission));
      return visibleChildren.length > 0;
    }
    return true;
  }).map(item => ({
    ...item,
    children: item.children?.filter(c => !c.permission || hasPermission(c.permission)),
  }));

  const toggleExpanded = (id: string) => {
    setExpandedMenus(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleClick = (item: MenuItem) => {
    if (item.children) toggleExpanded(item.id);
    else onModuleChange(item.id);
  };

  const isChildActive = (item: MenuItem): boolean => {
    return !!item.children?.some(c => c.id === activeModule);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in" onClick={onToggle} />
      )}
      <aside className={`fixed left-0 top-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">DDIAS</h1>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pharma ERP v2.0</p>
            </div>
          </div>
          <button onClick={onToggle} className="lg:hidden p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <nav className="h-[calc(100%-4rem)] overflow-y-auto px-3 py-4 space-y-0.5 pb-24">
          {visibleMenuItems.map(item => {
            const badge = getBadge(item.id);
            const isExpanded = expandedMenus.includes(item.id);
            const isActive = activeModule === item.id || isChildActive(item);
            return (
              <div key={item.id}>
                <button
                  onClick={() => handleClick(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge && (
                    <span className={`min-w-[18px] h-4 px-1 rounded-full text-[10px] text-white font-bold flex items-center justify-center ${badge.color}`}>
                      {badge.count}
                    </span>
                  )}
                  {item.children && (
                    isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  )}
                </button>
                {item.children && isExpanded && (
                  <div className="ml-9 mt-0.5 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-700 pl-3 animate-fade-in">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onModuleChange(child.id)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                          activeModule === child.id
                            ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20'
                            : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{currentUser.role}</p>
            </div>
            <div className={`w-2 h-2 rounded-full animate-pulse-soft ${currentUser.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </aside>
    </>
  );
}

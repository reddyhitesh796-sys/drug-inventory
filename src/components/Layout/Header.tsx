import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Moon, Sun, User, Menu, LogOut, ChevronDown, Pill, Package, FileText, Building2, X, CheckCheck, UserCog, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
  activeModule: string;
  onModuleChange: (m: string) => void;
  onLogout?: () => void;
}

const moduleLabels: Record<string, { label: string; subtitle: string }> = {
  dashboard: { label: 'Dashboard', subtitle: 'Real-time business overview' },
  drugs: { label: 'Drug Master', subtitle: 'Manage drug catalog and information' },
  batches: { label: 'Batch Management', subtitle: 'Track inventory at batch level' },
  warehouses: { label: 'Warehouses', subtitle: 'Storage locations and capacity' },
  stock: { label: 'Stock Report', subtitle: 'Aggregate stock by drug' },
  vendors: { label: 'Vendors', subtitle: 'Supplier directory' },
  'purchase-orders': { label: 'Purchase Orders', subtitle: 'Track orders to vendors' },
  grn: { label: 'Goods Receipt Notes', subtitle: 'Receiving documentation' },
  'purchase-returns': { label: 'Purchase Returns', subtitle: 'Returns to vendors' },
  customers: { label: 'Customers', subtitle: 'Pharmacies, hospitals, clinics' },
  'sales-invoices': { label: 'Sales Invoices', subtitle: 'Customer billing and orders' },
  'sales-returns': { label: 'Sales Returns', subtitle: 'Customer returns processing' },
  financials: { label: 'Profit & Loss', subtitle: 'Financial performance analytics' },
  expiry: { label: 'Expiry & Compliance', subtitle: 'Regulatory and expiry tracking' },
  audit: { label: 'Audit Logs', subtitle: 'Immutable activity trail' },
  reports: { label: 'Reports & Export', subtitle: 'Generate and export reports' },
  users: { label: 'User Management', subtitle: 'System users and roles' },
  settings: { label: 'Settings', subtitle: 'System configuration' },
};

export default function Header({ onMenuToggle, activeModule, onModuleChange, onLogout }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { alerts, drugs, batches, salesInvoices, users, markAlertAsRead, markAllAlertsAsRead, dismissAlert } = useApp();
  const { currentUser, switchUser, getEffectivePermissions } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadAlerts = alerts.filter(a => !a.isRead);
  const currentMod = moduleLabels[activeModule] || moduleLabels.dashboard;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
        setShowProfile(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const searchResults = searchQuery.length > 0 ? {
    drugs: drugs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.sku.toLowerCase().includes(searchQuery.toLowerCase()) || d.brandName.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 4),
    batches: batches.filter(b => b.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) || b.drugName.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 4),
    invoices: salesInvoices.filter(i => i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || i.customerName.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 4),
  } : null;

  const handleResultClick = (module: string) => {
    onModuleChange(module);
    setShowSearch(false);
    setSearchQuery('');
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
              {currentMod.label}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">{currentMod.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg px-3 py-2 w-64 transition-colors"
          >
            <Search size={16} className="text-slate-400" />
            <span className="text-sm text-slate-500 flex-1 text-left">Search anything...</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 font-mono">⌘K</kbd>
          </button>

          <button
            onClick={() => setShowSearch(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Search size={18} className="text-slate-500" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-slate-500" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
            >
              <Bell size={18} className="text-slate-500 dark:text-slate-400" />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse-soft">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
                    <p className="text-xs text-slate-500">{unreadAlerts.length} unread</p>
                  </div>
                  {unreadAlerts.length > 0 && (
                    <button onClick={markAllAlertsAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No notifications</p>
                    </div>
                  ) : (
                    alerts.slice(0, 10).map(alert => (
                      <div
                        key={alert.id}
                        className={`p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${!alert.isRead ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${getSeverityColor(alert.severity)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                alert.type === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                                alert.type === 'Near Expiry' ? 'bg-orange-100 text-orange-700' :
                                alert.type === 'Expired' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>{alert.type}</span>
                              <span className="text-[10px] text-slate-400">{alert.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{alert.message}</p>
                            <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!alert.isRead && (
                                <button onClick={() => markAlertAsRead(alert.id)} className="text-[10px] text-blue-600 hover:underline">Mark read</button>
                              )}
                              <button onClick={() => dismissAlert(alert.id)} className="text-[10px] text-red-500 hover:underline">Dismiss</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow text-white text-xs font-bold">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{currentUser.role}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden md:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow">{currentUser.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        currentUser.role === 'Admin' ? 'bg-red-100 text-red-700' :
                        currentUser.role === 'Custom' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                      }`}>{currentUser.role} • {getEffectivePermissions(currentUser).length} perms</span>
                    </div>
                  </div>
                </div>
                <div className="py-1 border-b border-slate-200 dark:border-slate-700">
                  <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1"><UserCog size={11} /> Switch User (Demo)</p>
                  <div className="max-h-40 overflow-y-auto">
                    {users.filter(u => u.isActive && u.id !== currentUser.id).slice(0, 6).map(u => (
                      <button
                        key={u.id}
                        onClick={() => { switchUser(u); setShowProfile(false); }}
                        className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-[10px] font-bold">{u.name.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.role}</p>
                        </div>
                        <Shield size={10} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="py-1">
                  <button onClick={() => { onModuleChange('users'); setShowProfile(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <User size={14} /> User Management
                  </button>
                  <button onClick={() => { onModuleChange('settings'); setShowProfile(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Pill size={14} /> Preferences & Access
                  </button>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <button onClick={() => { onLogout?.(); setShowProfile(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette / Global Search */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in" onClick={() => setShowSearch(false)}>
          <div ref={searchRef} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search drugs, batches, invoices, vendors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-white placeholder-slate-400"
              />
              <button onClick={() => setShowSearch(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {!searchQuery && (
                <div className="p-6 text-center">
                  <Search size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Start typing to search across the system</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {['Drug Master', 'Batches', 'Invoices', 'Vendors'].map(s => (
                      <span key={s} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {searchResults && (
                <>
                  {searchResults.drugs.length === 0 && searchResults.batches.length === 0 && searchResults.invoices.length === 0 && (
                    <div className="p-6 text-center">
                      <p className="text-sm text-slate-500">No results found for "{searchQuery}"</p>
                    </div>
                  )}
                  {searchResults.drugs.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">Drugs</p>
                      {searchResults.drugs.map(d => (
                        <button key={d.id} onClick={() => handleResultClick('drugs')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Pill size={14} className="text-blue-600" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.name}</p>
                            <p className="text-xs text-slate-500">{d.sku} • {d.manufacturer}</p>
                          </div>
                          <span className="text-[10px] text-slate-400">Drug</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.batches.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">Batches</p>
                      {searchResults.batches.map(b => (
                        <button key={b.id} onClick={() => handleResultClick('batches')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Package size={14} className="text-emerald-600" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{b.batchNo}</p>
                            <p className="text-xs text-slate-500">{b.drugName} • {b.currentStock} units</p>
                          </div>
                          <span className="text-[10px] text-slate-400">Batch</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.invoices.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">Invoices</p>
                      {searchResults.invoices.map(i => (
                        <button key={i.id} onClick={() => handleResultClick('sales-invoices')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-left">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><FileText size={14} className="text-violet-600" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{i.invoiceNumber}</p>
                            <p className="text-xs text-slate-500">{i.customerName} • ₹{i.totalAmount.toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] text-slate-400">Invoice</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-2"><Building2 size={11} /> DDIAS Global Search</span>
              <span><kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">ESC</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

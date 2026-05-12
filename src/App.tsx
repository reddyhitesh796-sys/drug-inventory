import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import DrugMaster from './components/DrugMaster/DrugMaster';
import BatchManagement from './components/Inventory/BatchManagement';
import StockReport from './components/Inventory/StockReport';
import Warehouses from './components/Inventory/Warehouses';
import Vendors from './components/Purchase/Vendors';
import PurchaseOrders from './components/Purchase/PurchaseOrders';
import GRN from './components/Purchase/GRN';
import PurchaseReturns from './components/Returns/PurchaseReturns';
import Customers from './components/Sales/Customers';
import SalesInvoices from './components/Sales/SalesInvoices';
import SalesReturns from './components/Returns/SalesReturns';
import ProfitLoss from './components/Financials/ProfitLoss';
import ExpiryCompliance from './components/Expiry/ExpiryCompliance';
import AuditLogs from './components/Audit/AuditLogs';
import Reports from './components/Reports/Reports';
import UserManagement from './components/Users/UserManagement';
import Settings from './components/Settings/Settings';
import AccessDenied from './components/Common/AccessDenied';
import LoginScreen from './components/Auth/LoginScreen';
import { MODULE_PERMISSIONS, type Module } from './types/permissions';

function AppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { hasPermission } = useAuth();

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderModule = () => {
    const modKey = activeModule as Module;
    const requiredPerm = MODULE_PERMISSIONS[modKey];
    if (requiredPerm && !hasPermission(requiredPerm)) {
      return <AccessDenied module={activeModule} />;
    }

    switch (activeModule) {
      case 'dashboard': return <Dashboard onNavigate={setActiveModule} />;
      case 'drugs': return <DrugMaster />;
      case 'batches': return <BatchManagement />;
      case 'stock': return <StockReport />;
      case 'warehouses': return <Warehouses />;
      case 'vendors': return <Vendors />;
      case 'purchase-orders': return <PurchaseOrders />;
      case 'grn': return <GRN />;
      case 'purchase-returns': return <PurchaseReturns />;
      case 'customers': return <Customers />;
      case 'sales-invoices': return <SalesInvoices />;
      case 'sales-returns': return <SalesReturns />;
      case 'financials': return <ProfitLoss />;
      case 'expiry': return <ExpiryCompliance />;
      case 'audit': return <AuditLogs />;
      case 'reports': return <Reports />;
      case 'users': return <UserManagement />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setActiveModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={(m) => { setActiveModule(m); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="lg:ml-64">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} activeModule={activeModule} onModuleChange={setActiveModule} onLogout={() => setIsLoggedIn(false)} />
        <main className="p-4 lg:p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

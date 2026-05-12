import { Package, AlertTriangle, TrendingUp, TrendingDown, ShoppingCart, IndianRupee, Clock, SkullIcon, ArrowRight, Plus, FileText, Users, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/exportUtils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface DashboardProps {
  onNavigate?: (m: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { drugs, batches, salesInvoices, alerts, profitLossData, customers, vendors, auditLogs } = useApp();

  const totalStockValue = batches.reduce((sum, b) => sum + b.currentStock * b.purchasePrice, 0);
  const totalStockUnits = batches.reduce((sum, b) => sum + b.currentStock, 0);
  const nearExpiryBatches = batches.filter(b => {
    const days = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 90;
  });
  const expiredBatches = batches.filter(b => b.status === 'Expired' || new Date(b.expiryDate) < new Date());
  const nearExpiryValue = nearExpiryBatches.reduce((sum, b) => sum + b.currentStock * b.purchasePrice, 0);
  const expiredValue = expiredBatches.reduce((sum, b) => sum + b.currentStock * b.purchasePrice, 0);
  const totalSalesValue = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalOutstanding = salesInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
  const monthlyProfit = profitLossData[profitLossData.length - 1]?.netProfit || 0;
  const lowStockBatches = batches.filter(b => b.currentStock <= 300 && b.currentStock > 0 && b.status === 'Active');
  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  const salesByMonth = profitLossData.map(d => ({
    period: d.period.split(' ')[0],
    Revenue: d.revenue,
    COGS: d.cogs,
    Profit: d.netProfit,
  }));

  const stockByCategory = drugs.reduce((acc, drug) => {
    const drugBatches = batches.filter(b => b.drugId === drug.id);
    const value = drugBatches.reduce((sum, b) => sum + b.currentStock * b.purchasePrice, 0);
    const existing = acc.find(a => a.name === drug.category);
    if (existing) existing.value += value;
    else if (value > 0) acc.push({ name: drug.category, value });
    return acc;
  }, [] as { name: string; value: number }[]);

  const topSellingDrugs = drugs.map(drug => {
    const soldQty = batches.filter(b => b.drugId === drug.id).reduce((sum, b) => sum + b.quantityOut, 0);
    const revenue = batches.filter(b => b.drugId === drug.id).reduce((sum, b) => sum + b.quantityOut * b.sellingPrice, 0);
    return { name: drug.brandName, generic: drug.genericName, soldQty, revenue, category: drug.category };
  }).filter(d => d.soldQty > 0).sort((a, b) => b.soldQty - a.soldQty).slice(0, 5);

  const recentActivity = auditLogs.slice(0, 5);

  const stockStats = [
    { label: 'Total Stock Value', value: formatCurrency(totalStockValue), icon: <IndianRupee size={20} />, color: 'from-blue-500 to-blue-600', change: '+12.5%', up: true, link: 'stock' },
    { label: 'Total Stock Units', value: totalStockUnits.toLocaleString(), icon: <Package size={20} />, color: 'from-emerald-500 to-emerald-600', change: '+8.3%', up: true, link: 'batches' },
    { label: 'Total Sales (YTD)', value: formatCurrency(totalSalesValue), icon: <ShoppingCart size={20} />, color: 'from-violet-500 to-violet-600', change: '+15.2%', up: true, link: 'sales-invoices' },
    { label: 'Monthly Net Profit', value: formatCurrency(monthlyProfit), icon: <TrendingUp size={20} />, color: 'from-amber-500 to-amber-600', change: '-4.2%', up: false, link: 'financials' },
    { label: 'Near Expiry Value', value: formatCurrency(nearExpiryValue), icon: <Clock size={20} />, color: 'from-orange-500 to-orange-600', change: `${nearExpiryBatches.length} batches`, up: false, link: 'expiry' },
    { label: 'Expired Stock Value', value: formatCurrency(expiredValue), icon: <SkullIcon size={20} />, color: 'from-red-500 to-red-600', change: `${expiredBatches.length} batches`, up: false, link: 'expiry' },
    { label: 'Outstanding Receivables', value: formatCurrency(totalOutstanding), icon: <TrendingDown size={20} />, color: 'from-pink-500 to-pink-600', change: `${salesInvoices.filter(i => i.dueAmount > 0).length} invoices`, up: false, link: 'sales-invoices' },
    { label: 'Active Alerts', value: unreadAlerts.toString(), icon: <AlertTriangle size={20} />, color: 'from-cyan-500 to-cyan-600', change: `${alerts.length} total`, up: false, link: 'expiry' },
  ];

  const quickActions = [
    { label: 'Add Drug', icon: <Plus size={16} />, color: 'bg-blue-600 hover:bg-blue-700', module: 'drugs' },
    { label: 'New Batch', icon: <Package size={16} />, color: 'bg-emerald-600 hover:bg-emerald-700', module: 'batches' },
    { label: 'Create Invoice', icon: <FileText size={16} />, color: 'bg-violet-600 hover:bg-violet-700', module: 'sales-invoices' },
    { label: 'Generate Report', icon: <Activity size={16} />, color: 'bg-amber-600 hover:bg-amber-700', module: 'reports' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, Admin 👋</h2>
            <p className="text-sm text-blue-100 mt-1">
              You have <span className="font-bold text-white">{unreadAlerts} unread alerts</span> · {nearExpiryBatches.length} batches near expiry · {lowStockBatches.length} low stock items
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onNavigate?.(action.module)}
                className={`flex items-center gap-1.5 px-3 py-2 ${action.color} rounded-lg text-xs font-medium shadow transition-all hover:scale-105`}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stockStats.map((stat, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(stat.link)}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{stat.label}</p>
                <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{stat.value}</p>
                <p className={`text-[10px] mt-1 font-medium ${stat.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow group-hover:scale-110 transition-transform flex-shrink-0`}>
                {stat.icon}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Revenue & Profit Trend</h3>
              <p className="text-xs text-slate-500">Monthly performance overview</p>
            </div>
            <button onClick={() => onNavigate?.('financials')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Details <ArrowRight size={12} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesByMonth}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(value: unknown) => formatCurrency(value as number)}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="Revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={2} fill="url(#profGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Stock Distribution</h3>
            <p className="text-xs text-slate-500">By drug category</p>
          </div>
          {stockByCategory.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">No stock data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stockByCategory} cx="50%" cy="45%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                  {stockByCategory.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value: unknown) => formatCurrency(value as number)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Sellers + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top Selling Drugs</h3>
              <p className="text-xs text-slate-500">By units sold</p>
            </div>
            <button onClick={() => onNavigate?.('reports')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </div>
          {topSellingDrugs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No sales recorded yet</p>
          ) : (
            <div className="space-y-3">
              {topSellingDrugs.map((drug, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-200 text-slate-700' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{drug.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{drug.generic} • {drug.category}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{drug.soldQty.toLocaleString()}</p>
                        <p className="text-[10px] text-emerald-600">{formatCurrency(drug.revenue)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(drug.soldQty / topSellingDrugs[0].soldQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Critical Alerts</h3>
              <p className="text-xs text-slate-500">{unreadAlerts} unread notifications</p>
            </div>
            <button onClick={() => onNavigate?.('expiry')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </div>
          {alerts.filter(a => !a.isRead).length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">All clear!</p>
              <p className="text-xs text-slate-500 mt-1">No critical alerts at the moment</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {alerts.filter(a => !a.isRead).slice(0, 6).map(alert => (
                <div key={alert.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.severity === 'Critical' ? 'bg-red-500 animate-pulse-soft' :
                    alert.severity === 'High' ? 'bg-orange-500' :
                    alert.severity === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        alert.type === 'Low Stock' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        alert.type === 'Near Expiry' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        alert.type === 'Expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{alert.type}</span>
                      <span className="text-[10px] text-slate-400">{alert.severity}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity & System Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
              <p className="text-xs text-slate-500">Latest user actions across the system</p>
            </div>
            <button onClick={() => onNavigate?.('audit')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Audit Log <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentActivity.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  log.action === 'Create' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                  log.action === 'Update' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  log.action === 'Delete' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                  log.action === 'Export' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700'
                }`}>
                  <Activity size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{log.userName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{log.module}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">{log.description}</p>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0">{log.timestamp.split(' ')[1]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">System Overview</h3>
          <div className="space-y-3">
            {[
              { label: 'Total Drugs', value: drugs.length, icon: <Package size={14} />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
              { label: 'Active Batches', value: batches.filter(b => b.status === 'Active').length, icon: <Activity size={14} />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
              { label: 'Total Customers', value: customers.length, icon: <Users size={14} />, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
              { label: 'Total Vendors', value: vendors.length, icon: <Users size={14} />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
              { label: 'Sales Invoices', value: salesInvoices.length, icon: <FileText size={14} />, color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30' },
              { label: 'Audit Entries', value: auditLogs.length, icon: <Activity size={14} />, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${stat.color} flex items-center justify-center`}>{stat.icon}</div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{stat.label}</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{stat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly P&L Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Monthly P&L Comparison</h3>
            <p className="text-xs text-slate-500">Revenue vs COGS vs Net Profit</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={salesByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value: unknown) => formatCurrency(value as number)} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="COGS" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

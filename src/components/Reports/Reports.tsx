import { useState, useMemo } from 'react';
import { Download, BarChart3, Package, ShoppingCart, Truck, AlertTriangle, ClipboardList, DollarSign, Activity, ArrowLeft, TrendingUp, TrendingDown, Users, Pill } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import WarehouseTabs from '../Common/WarehouseTabs';
import CategoryAccordion from '../Common/CategoryAccordion';

type ReportType = 'stock' | 'expiry' | 'purchase' | 'sales' | 'pnl' | 'audit' | 'deadstock' | 'batch' | 'drug-audit';

const reportTypes: { id: ReportType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: 'drug-audit', label: 'Drug Audit Report', desc: 'Performance analytics: best/worst sellers, top buyers per warehouse', icon: <Activity size={20} />, color: 'from-pink-500 to-rose-600' },
  { id: 'stock', label: 'Stock Report', desc: 'Complete stock inventory grouped by warehouse and category', icon: <Package size={20} />, color: 'from-blue-500 to-blue-600' },
  { id: 'expiry', label: 'Expiry Report', desc: 'Near expiry and expired stock analysis per warehouse', icon: <AlertTriangle size={20} />, color: 'from-orange-500 to-orange-600' },
  { id: 'purchase', label: 'Purchase Report', desc: 'Vendor-wise purchase analysis per warehouse', icon: <ShoppingCart size={20} />, color: 'from-emerald-500 to-emerald-600' },
  { id: 'sales', label: 'Sales Report', desc: 'Customer-wise sales analysis per warehouse', icon: <Truck size={20} />, color: 'from-violet-500 to-violet-600' },
  { id: 'pnl', label: 'P&L Report', desc: 'Profit & loss statement per warehouse', icon: <DollarSign size={20} />, color: 'from-amber-500 to-amber-600' },
  { id: 'audit', label: 'Audit Trail', desc: 'Complete activity audit log', icon: <ClipboardList size={20} />, color: 'from-red-500 to-red-600' },
  { id: 'deadstock', label: 'Dead Stock', desc: 'Stock with no movement >90 days', icon: <Package size={20} />, color: 'from-slate-500 to-slate-600' },
  { id: 'batch', label: 'Batch Traceability', desc: 'Track batches across warehouses', icon: <BarChart3 size={20} />, color: 'from-cyan-500 to-cyan-600' },
];

export default function Reports() {
  const { drugs, batches, purchaseOrders, salesInvoices, profitLossData, auditLogs, warehouses } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [groupBy, setGroupBy] = useState<'therapeutic' | 'category'>('therapeutic');

  const getDaysToExpiry = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // ============ DRUG AUDIT ANALYTICS (per warehouse) ============
  const drugAuditData = useMemo(() => {
    const targetWarehouses = warehouseFilter === 'All' ? warehouses : warehouses.filter(w => w.id === warehouseFilter);
    return targetWarehouses.map(wh => {
      const whInvoices = salesInvoices.filter(inv => inv.warehouseId === wh.id);

      // Drug performance (sales + revenue) for this warehouse
      const drugPerf: Record<string, { drug: typeof drugs[0]; soldQty: number; revenue: number; cogs: number; profit: number; invoiceCount: number; customers: Set<string> }> = {};
      whInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const drug = drugs.find(d => d.id === item.drugId);
          if (!drug) return;
          if (!drugPerf[item.drugId]) {
            drugPerf[item.drugId] = { drug, soldQty: 0, revenue: 0, cogs: 0, profit: 0, invoiceCount: 0, customers: new Set() };
          }
          const batch = batches.find(b => b.id === item.batchId);
          drugPerf[item.drugId].soldQty += item.quantity;
          drugPerf[item.drugId].revenue += item.amount;
          const cost = batch ? batch.purchasePrice * item.quantity : drug.defaultPurchasePrice * item.quantity;
          drugPerf[item.drugId].cogs += cost;
          drugPerf[item.drugId].profit += (item.amount - cost);
          drugPerf[item.drugId].invoiceCount += 1;
          drugPerf[item.drugId].customers.add(inv.customerName);
        });
      });

      const drugPerfArr = Object.values(drugPerf).map(d => ({ ...d, customerCount: d.customers.size }));
      const topSellers = [...drugPerfArr].sort((a, b) => b.soldQty - a.soldQty);
      const lowSellers = [...drugPerfArr].filter(d => d.soldQty > 0).sort((a, b) => a.soldQty - b.soldQty);
      const topRevenue = [...drugPerfArr].sort((a, b) => b.revenue - a.revenue);

      // Customer performance for this warehouse
      const customerPerf: Record<string, { name: string; invoiceCount: number; totalValue: number; totalQty: number; topDrugs: Record<string, number> }> = {};
      whInvoices.forEach(inv => {
        if (!customerPerf[inv.customerId]) {
          customerPerf[inv.customerId] = { name: inv.customerName, invoiceCount: 0, totalValue: 0, totalQty: 0, topDrugs: {} };
        }
        customerPerf[inv.customerId].invoiceCount += 1;
        customerPerf[inv.customerId].totalValue += inv.totalAmount;
        inv.items.forEach(item => {
          customerPerf[inv.customerId].totalQty += item.quantity;
          customerPerf[inv.customerId].topDrugs[item.drugName] = (customerPerf[inv.customerId].topDrugs[item.drugName] || 0) + item.quantity;
        });
      });
      const topCustomers = Object.values(customerPerf).sort((a, b) => b.totalValue - a.totalValue);

      // Stock at this warehouse — never sold
      const drugIdsSold = new Set(drugPerfArr.map(d => d.drug.id));
      const stockedDrugIds = new Set(batches.filter(b => b.warehouseId === wh.id && b.currentStock > 0).map(b => b.drugId));
      const neverSold = [...stockedDrugIds].filter(id => !drugIdsSold.has(id)).map(id => drugs.find(d => d.id === id)).filter(Boolean) as typeof drugs;

      return {
        warehouse: wh,
        totalRevenue: whInvoices.reduce((s, i) => s + i.totalAmount, 0),
        totalProfit: drugPerfArr.reduce((s, d) => s + d.profit, 0),
        invoiceCount: whInvoices.length,
        uniqueDrugsSold: drugPerfArr.length,
        uniqueCustomers: Object.keys(customerPerf).length,
        topSellers,
        lowSellers,
        topRevenue,
        topCustomers,
        neverSold,
        drugPerfArr,
      };
    });
  }, [warehouseFilter, warehouses, salesInvoices, drugs, batches]);

  // ============ EXPORT FUNCTIONS ============
  const generateAndExport = (report: ReportType, format: 'pdf' | 'excel') => {
    let title = '', headers: string[] = [], data: (string | number)[][] = [], filename = '';
    const whSuffix = warehouseFilter === 'All' ? 'All-Warehouses' : warehouses.find(w => w.id === warehouseFilter)?.name?.replace(/\s+/g, '-') || warehouseFilter;

    switch (report) {
      case 'stock': {
        title = `Stock Report - ${whSuffix}`;
        headers = ['Drug', 'SKU', 'Therapeutic Cat.', 'Drug Form', 'Warehouse', 'Batches', 'Stock', 'Stock Value', 'Margin %'];
        data = drugs.flatMap(d => {
          const drugBatches = batches.filter(b => b.drugId === d.id && b.status === 'Active' && (warehouseFilter === 'All' || b.warehouseId === warehouseFilter));
          if (drugBatches.length === 0) return [];
          const byWh: Record<string, typeof drugBatches> = {};
          drugBatches.forEach(b => { if (!byWh[b.warehouseId]) byWh[b.warehouseId] = []; byWh[b.warehouseId].push(b); });
          return Object.entries(byWh).map(([whId, bs]) => {
            const stk = bs.reduce((s, b) => s + b.currentStock, 0);
            const val = bs.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
            const margin = d.defaultSellingPrice > 0 ? ((d.defaultSellingPrice - d.defaultPurchasePrice) / d.defaultSellingPrice * 100) : 0;
            return [d.name, d.sku, d.therapeuticCategory, d.category, warehouses.find(w => w.id === whId)?.name || whId, bs.length, stk, val.toFixed(2), `${margin.toFixed(1)}%`];
          });
        });
        filename = `stock-report-${whSuffix}`;
        break;
      }
      case 'expiry': {
        title = `Expiry Report - ${whSuffix}`;
        headers = ['Drug', 'Therapeutic', 'Batch', 'Warehouse', 'Expiry', 'Stock', 'Value', 'Days Left'];
        data = batches.filter(b => b.currentStock > 0 && (warehouseFilter === 'All' || b.warehouseId === warehouseFilter)).map(b => {
          const drug = drugs.find(d => d.id === b.drugId);
          return [b.drugName, drug?.therapeuticCategory || '', b.batchNo, b.warehouseName, b.expiryDate, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2), getDaysToExpiry(b.expiryDate)];
        }).sort((a, b) => Number(a[7]) - Number(b[7]));
        filename = `expiry-report-${whSuffix}`;
        break;
      }
      case 'purchase': {
        title = `Purchase Report - ${whSuffix}`;
        headers = ['PO Number', 'Vendor', 'Date', 'Items', 'Grand Total', 'Status'];
        data = purchaseOrders.map(po => [po.poNumber, po.vendorName, po.orderDate, po.items.length, po.grandTotal, po.status]);
        filename = `purchase-report-${whSuffix}`;
        break;
      }
      case 'sales': {
        title = `Sales Report - ${whSuffix}`;
        headers = ['Invoice', 'Customer', 'Warehouse', 'Date', 'Total', 'Paid', 'Due', 'Status'];
        data = salesInvoices.filter(inv => warehouseFilter === 'All' || inv.warehouseId === warehouseFilter).map(inv => [inv.invoiceNumber, inv.customerName, inv.warehouseName, inv.invoiceDate, inv.totalAmount.toFixed(2), inv.paidAmount.toFixed(2), inv.dueAmount.toFixed(2), inv.status]);
        filename = `sales-report-${whSuffix}`;
        break;
      }
      case 'pnl': {
        title = `P&L Report - ${whSuffix}`;
        headers = ['Period', 'FY', 'Warehouse', 'Revenue', 'COGS', 'Net Profit', 'Margin %'];
        data = profitLossData.filter(d => warehouseFilter === 'All' || d.warehouseId === warehouseFilter).map(d => [d.period, d.fy, d.warehouseName, d.revenue, d.cogs, d.netProfit, `${d.margin}%`]);
        filename = `pnl-report-${whSuffix}`;
        break;
      }
      case 'audit': {
        title = `Audit Trail Report`;
        headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Description'];
        data = auditLogs.map(l => [l.timestamp, l.userName, l.userRole, l.module, l.action, l.description]);
        filename = `audit-trail`;
        break;
      }
      case 'deadstock': {
        title = `Dead Stock Report - ${whSuffix}`;
        headers = ['Drug', 'Batch', 'Warehouse', 'Stock', 'Value', 'Days Since Receipt'];
        data = batches.filter(b => {
          const days = Math.ceil((Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return days > 90 && b.quantityOut < b.quantityIn * 0.1 && b.status === 'Active' && (warehouseFilter === 'All' || b.warehouseId === warehouseFilter);
        }).map(b => {
          const days = Math.ceil((Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return [b.drugName, b.batchNo, b.warehouseName, b.currentStock, (b.currentStock * b.purchasePrice).toFixed(2), days];
        });
        filename = `dead-stock-${whSuffix}`;
        break;
      }
      case 'batch': {
        title = `Batch Traceability - ${whSuffix}`;
        headers = ['Drug', 'Batch', 'Warehouse', 'Expiry', 'Qty In', 'Qty Out', 'Stock', 'MRP', 'Purchase', 'Selling'];
        data = batches.filter(b => warehouseFilter === 'All' || b.warehouseId === warehouseFilter).map(b => [b.drugName, b.batchNo, b.warehouseName, b.expiryDate, b.quantityIn, b.quantityOut, b.currentStock, b.mrp, b.purchasePrice, b.sellingPrice]);
        filename = `batch-traceability-${whSuffix}`;
        break;
      }
      case 'drug-audit': {
        title = `Drug Audit Report - ${whSuffix}`;
        headers = ['Warehouse', 'Drug', 'Therapeutic', 'Units Sold', 'Revenue', 'Profit', 'Invoices', 'Customers'];
        data = drugAuditData.flatMap(wh => wh.drugPerfArr.map(d => [wh.warehouse.name, d.drug.name, d.drug.therapeuticCategory, d.soldQty, d.revenue.toFixed(2), d.profit.toFixed(2), d.invoiceCount, d.customerCount]));
        filename = `drug-audit-${whSuffix}`;
        break;
      }
    }
    format === 'pdf' ? downloadPDF(title, headers, data, filename) : downloadExcel(title, headers, data, filename);
  };

  // ============ RENDER ============
  if (!selectedReport) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Reports & Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Select a report type to view, analyze and export</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map(report => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5 transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${report.color} text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                {report.icon}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{report.label}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{report.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ============ DRUG AUDIT REPORT — DETAILED VIEW ============
  if (selectedReport === 'drug-audit') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedReport(null)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"><ArrowLeft size={16} /> Back</button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Drug Audit Report</h2>
              <p className="text-xs text-slate-500">Performance analytics by warehouse</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => generateAndExport('drug-audit', 'pdf')} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"><Download size={16} /> PDF</button>
            <button onClick={() => generateAndExport('drug-audit', 'excel')} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Download size={16} /> Excel</button>
          </div>
        </div>

        <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} />

        <div className="space-y-6">
          {drugAuditData.map(whData => (
            <div key={whData.warehouse.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Warehouse Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Activity size={18} /> {whData.warehouse.name}</h3>
                    <p className="text-xs text-blue-100 mt-0.5">{whData.warehouse.location}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-right">
                    <div><p className="text-[10px] text-blue-100 uppercase">Revenue</p><p className="text-sm font-bold">{formatCurrency(whData.totalRevenue)}</p></div>
                    <div><p className="text-[10px] text-blue-100 uppercase">Profit</p><p className="text-sm font-bold">{formatCurrency(whData.totalProfit)}</p></div>
                    <div><p className="text-[10px] text-blue-100 uppercase">Invoices</p><p className="text-sm font-bold">{whData.invoiceCount}</p></div>
                    <div><p className="text-[10px] text-blue-100 uppercase">Customers</p><p className="text-sm font-bold">{whData.uniqueCustomers}</p></div>
                  </div>
                </div>
              </div>

              {whData.invoiceCount === 0 ? (
                <div className="p-12 text-center">
                  <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No sales data for this warehouse yet</p>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Top Selling vs Low Selling */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl overflow-hidden">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-600" />
                        <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Top Selling Drugs</h4>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                        {whData.topSellers.slice(0, 5).map((d, i) => (
                          <div key={d.drug.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.drug.name}</p>
                              <p className="text-[10px] text-slate-500">{d.drug.therapeuticCategory} • {d.customerCount} customers • {d.invoiceCount} invoices</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{d.soldQty.toLocaleString()}</p>
                              <p className="text-[10px] text-emerald-600">{formatCurrency(d.revenue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
                        <TrendingDown size={16} className="text-amber-600" />
                        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Slow Moving Drugs</h4>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                        {whData.lowSellers.slice(0, 5).map((d, i) => (
                          <div key={d.drug.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.drug.name}</p>
                              <p className="text-[10px] text-slate-500">{d.drug.therapeuticCategory} • Only {d.invoiceCount} invoices</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-amber-600">{d.soldQty}</p>
                              <p className="text-[10px] text-slate-500">{formatCurrency(d.revenue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top Buyers + Never Sold */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden">
                      <div className="bg-violet-50 dark:bg-violet-900/20 p-3 border-b border-violet-200 dark:border-violet-800 flex items-center gap-2">
                        <Users size={16} className="text-violet-600" />
                        <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-300">Top Buyers from this Warehouse</h4>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                        {whData.topCustomers.slice(0, 5).map((c, i) => {
                          const topDrug = Object.entries(c.topDrugs).sort((a, b) => b[1] - a[1])[0];
                          return (
                            <div key={i} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <div className="flex items-center gap-3 mb-1">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-violet-100 text-violet-700'}`}>{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                                  <p className="text-[10px] text-slate-500">{c.invoiceCount} invoices • {c.totalQty.toLocaleString()} units</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-violet-600">{formatCurrency(c.totalValue)}</p>
                                </div>
                              </div>
                              {topDrug && <p className="text-[10px] text-slate-500 ml-10"><Pill size={10} className="inline" /> Most bought: <span className="font-medium text-slate-700 dark:text-slate-300">{topDrug[0]}</span> ({topDrug[1]} units)</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600" />
                        <h4 className="text-sm font-semibold text-red-900 dark:text-red-300">Never Sold (In Stock)</h4>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                        {whData.neverSold.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">All stocked drugs have sales 🎉</div>
                        ) : (
                          whData.neverSold.slice(0, 8).map(d => {
                            const drugBatches = batches.filter(b => b.drugId === d.id && b.warehouseId === whData.warehouse.id && b.currentStock > 0);
                            const totalStock = drugBatches.reduce((s, b) => s + b.currentStock, 0);
                            const stockValue = drugBatches.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
                            return (
                              <div key={d.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0"><Pill size={12} /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.name}</p>
                                  <p className="text-[10px] text-slate-500">{d.therapeuticCategory} • {totalStock} units stocked</p>
                                </div>
                                <p className="text-xs font-bold text-red-600">{formatCurrency(stockValue)}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Revenue Drugs */}
                  <div className="border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
                      <DollarSign size={16} className="text-blue-600" />
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Top Revenue Generators</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 dark:bg-slate-700/30">
                          <th className="text-left py-2 px-3 font-semibold text-slate-600">#</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600">Drug</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600">Therapeutic</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600">Sold</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600">Revenue</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600">Profit</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600">Customers</th>
                        </tr></thead>
                        <tbody>
                          {whData.topRevenue.slice(0, 8).map((d, i) => (
                            <tr key={d.drug.id} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="py-2 px-3 font-bold text-slate-400">#{i + 1}</td>
                              <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{d.drug.name}<p className="text-[10px] text-slate-500">{d.drug.brandName}</p></td>
                              <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 font-medium">{d.drug.therapeuticCategory}</span></td>
                              <td className="py-2 px-3 text-center font-medium">{d.soldQty.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-bold text-blue-600 font-mono">{formatCurrency(d.revenue)}</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-600 font-mono">{formatCurrency(d.profit)}</td>
                              <td className="py-2 px-3 text-center text-slate-600">{d.customerCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============ STANDARD REPORTS WITH WAREHOUSE + CATEGORY GROUPING ============
  // Build the data set that we'll group
  const renderStockGrouped = () => {
    const targetWarehouses = warehouseFilter === 'All' ? warehouses : warehouses.filter(w => w.id === warehouseFilter);
    return targetWarehouses.map(wh => {
      const whBatches = batches.filter(b => b.warehouseId === wh.id && b.currentStock > 0 && b.status === 'Active');
      if (whBatches.length === 0) return null;
      // Group by category
      const groups: Record<string, typeof whBatches> = {};
      whBatches.forEach(b => {
        const drug = drugs.find(d => d.id === b.drugId);
        if (!drug) return;
        const key = groupBy === 'therapeutic' ? drug.therapeuticCategory : drug.category;
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
      });
      const totalUnits = whBatches.reduce((s, b) => s + b.currentStock, 0);
      const totalValue = whBatches.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
      return (
        <div key={wh.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Package size={16} /> {wh.name}</h3>
              <p className="text-xs text-blue-100">{wh.location}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-100 uppercase">Total</p>
              <p className="text-sm font-bold">{totalUnits.toLocaleString()} units • {formatCurrency(totalValue)}</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => {
              const catUnits = items.reduce((s, b) => s + b.currentStock, 0);
              const catValue = items.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
              return (
                <CategoryAccordion key={cat} category={cat} count={items.length} summary={`${catUnits.toLocaleString()} units • ${formatCurrency(catValue)}`} defaultOpen={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 dark:bg-slate-700/30">
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">Drug</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">Batch</th>
                        <th className="text-center py-2 px-3 font-semibold text-slate-600">Stock</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-600">Value</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">Expiry</th>
                      </tr></thead>
                      <tbody>{items.map(b => (
                        <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="py-2 px-3 text-slate-900 dark:text-white">{b.drugName}</td>
                          <td className="py-2 px-3 font-mono text-xs text-slate-500">{b.batchNo}</td>
                          <td className="py-2 px-3 text-center">{b.currentStock}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(b.currentStock * b.purchasePrice)}</td>
                          <td className="py-2 px-3 text-xs text-slate-500">{formatDate(b.expiryDate)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </CategoryAccordion>
              );
            })}
          </div>
        </div>
      );
    }).filter(Boolean);
  };

  const renderSalesGrouped = () => {
    const targetWarehouses = warehouseFilter === 'All' ? warehouses : warehouses.filter(w => w.id === warehouseFilter);
    return targetWarehouses.map(wh => {
      const whInvs = salesInvoices.filter(inv => inv.warehouseId === wh.id);
      if (whInvs.length === 0) return null;
      // Group invoices by drug therapeutic category (via items)
      const catGroups: Record<string, { invoices: typeof whInvs; revenue: number }> = {};
      whInvs.forEach(inv => {
        inv.items.forEach(item => {
          const drug = drugs.find(d => d.id === item.drugId);
          if (!drug) return;
          const key = groupBy === 'therapeutic' ? drug.therapeuticCategory : drug.category;
          if (!catGroups[key]) catGroups[key] = { invoices: [], revenue: 0 };
          if (!catGroups[key].invoices.find(i => i.id === inv.id)) catGroups[key].invoices.push(inv);
          catGroups[key].revenue += item.amount;
        });
      });
      return (
        <div key={wh.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-pink-600 text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Truck size={16} /> {wh.name}</h3>
              <p className="text-xs text-violet-100">{whInvs.length} invoices • {formatCurrency(whInvs.reduce((s, i) => s + i.totalAmount, 0))}</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {Object.entries(catGroups).sort(([a], [b]) => a.localeCompare(b)).map(([cat, info]) => (
              <CategoryAccordion key={cat} category={cat} count={info.invoices.length} summary={`Revenue: ${formatCurrency(info.revenue)}`} defaultOpen={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 dark:bg-slate-700/30">
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Invoice</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Customer</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Date</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-600">Total</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-600">Status</th>
                    </tr></thead>
                    <tbody>{info.invoices.map(inv => (
                      <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                        <td className="py-2 px-3">{inv.customerName}</td>
                        <td className="py-2 px-3 text-xs text-slate-500">{formatDate(inv.invoiceDate)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(inv.totalAmount)}</td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{inv.status}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </CategoryAccordion>
            ))}
          </div>
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedReport(null)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"><ArrowLeft size={16} /> Back</button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{reportTypes.find(r => r.id === selectedReport)?.label}</h2>
            <p className="text-xs text-slate-500">{reportTypes.find(r => r.id === selectedReport)?.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(selectedReport === 'stock' || selectedReport === 'sales') && (
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
              <button onClick={() => setGroupBy('therapeutic')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'therapeutic' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>Therapeutic</button>
              <button onClick={() => setGroupBy('category')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'category' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>By Form</button>
            </div>
          )}
          <button onClick={() => generateAndExport(selectedReport, 'pdf')} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"><Download size={16} /> PDF</button>
          <button onClick={() => generateAndExport(selectedReport, 'excel')} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Download size={16} /> Excel</button>
        </div>
      </div>

      {selectedReport !== 'audit' && <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} />}

      {selectedReport === 'stock' && <div className="space-y-4">{renderStockGrouped()}</div>}
      {selectedReport === 'sales' && <div className="space-y-4">{renderSalesGrouped()}</div>}

      {/* For other reports, render a simple table */}
      {!['stock', 'sales', 'drug-audit'].includes(selectedReport) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  {selectedReport === 'expiry' && <>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Drug</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Batch</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Warehouse</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Expiry</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Stock</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Value</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Days</th>
                  </>}
                  {selectedReport === 'purchase' && <>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">PO</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Total</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
                  </>}
                  {selectedReport === 'pnl' && <>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Period</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Warehouse</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Net Profit</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Margin</th>
                  </>}
                  {selectedReport === 'audit' && <>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Action</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Description</th>
                  </>}
                  {selectedReport === 'deadstock' && <>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Drug</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Batch</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Warehouse</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Stock</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Value</th>
                  </>}
                  {selectedReport === 'batch' && <>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Drug</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Batch</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Warehouse</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">In</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Out</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Stock</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {selectedReport === 'expiry' && batches.filter(b => b.currentStock > 0 && (warehouseFilter === 'All' || b.warehouseId === warehouseFilter)).map(b => {
                  const days = getDaysToExpiry(b.expiryDate);
                  return (
                    <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{b.drugName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{b.batchNo}</td>
                      <td className="py-3 px-4 text-xs">{b.warehouseName}</td>
                      <td className="py-3 px-4 text-xs">{formatDate(b.expiryDate)}</td>
                      <td className="py-3 px-4 text-center">{b.currentStock}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(b.currentStock * b.purchasePrice)}</td>
                      <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${days <= 30 ? 'bg-red-100 text-red-700' : days <= 90 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{days}d</span></td>
                    </tr>
                  );
                })}
                {selectedReport === 'purchase' && purchaseOrders.map(po => (
                  <tr key={po.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{po.poNumber}</td>
                    <td className="py-3 px-4">{po.vendorName}</td>
                    <td className="py-3 px-4 text-xs">{formatDate(po.orderDate)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(po.grandTotal)}</td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{po.status}</span></td>
                  </tr>
                ))}
                {selectedReport === 'pnl' && profitLossData.filter(d => warehouseFilter === 'All' || d.warehouseId === warehouseFilter).map((d, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-3 px-4 font-medium">{d.period} <span className="text-[10px] text-slate-500">({d.fy})</span></td>
                    <td className="py-3 px-4 text-xs">{d.warehouseName}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(d.revenue)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">{formatCurrency(d.netProfit)}</td>
                    <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.margin >= 35 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.margin}%</span></td>
                  </tr>
                ))}
                {selectedReport === 'audit' && auditLogs.map(l => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{l.timestamp}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{l.userName}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{l.action}</span></td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{l.description}</td>
                  </tr>
                ))}
                {selectedReport === 'deadstock' && batches.filter(b => {
                  const days = Math.ceil((Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  return days > 90 && b.quantityOut < b.quantityIn * 0.1 && b.status === 'Active' && (warehouseFilter === 'All' || b.warehouseId === warehouseFilter);
                }).map(b => (
                  <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-3 px-4 font-medium">{b.drugName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{b.batchNo}</td>
                    <td className="py-3 px-4 text-xs">{b.warehouseName}</td>
                    <td className="py-3 px-4 text-center">{b.currentStock}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(b.currentStock * b.purchasePrice)}</td>
                  </tr>
                ))}
                {selectedReport === 'batch' && batches.filter(b => warehouseFilter === 'All' || b.warehouseId === warehouseFilter).map(b => (
                  <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-3 px-4 font-medium">{b.drugName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{b.batchNo}</td>
                    <td className="py-3 px-4 text-xs">{b.warehouseName}</td>
                    <td className="py-3 px-4 text-center">{b.quantityIn}</td>
                    <td className="py-3 px-4 text-center">{b.quantityOut}</td>
                    <td className="py-3 px-4 text-center font-bold">{b.currentStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Search, Download, Package, IndianRupee, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import EmptyState from '../Common/EmptyState';
import WarehouseTabs from '../Common/WarehouseTabs';
import CategoryAccordion from '../Common/CategoryAccordion';

export default function StockReport() {
  const { drugs, batches } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [groupBy, setGroupBy] = useState<'therapeutic' | 'category'>('therapeutic');

  // Per-warehouse stock counts for tabs
  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 };
    const drugSet = new Set<string>();
    batches.forEach(b => {
      if (b.status === 'Active' && b.currentStock > 0) drugSet.add(b.drugId);
    });
    counts.All = drugSet.size;
    return counts;
  }, [batches]);

  // Stock data per drug (filtered by warehouse)
  const stockData = useMemo(() => {
    return drugs.map(drug => {
      const drugBatches = batches.filter(b =>
        b.drugId === drug.id &&
        b.status === 'Active' &&
        (warehouseFilter === 'All' || b.warehouseId === warehouseFilter)
      );
      const totalStock = drugBatches.reduce((s, b) => s + b.currentStock, 0);
      const stockValue = drugBatches.reduce((s, b) => s + b.currentStock * b.purchasePrice, 0);
      const salesValue = drugBatches.reduce((s, b) => s + b.currentStock * b.sellingPrice, 0);
      const potentialProfit = salesValue - stockValue;
      const earliestExpiry = drugBatches.length > 0 ? drugBatches.reduce((min, b) => b.expiryDate < min ? b.expiryDate : min, drugBatches[0].expiryDate) : 'N/A';
      return { drug, totalStock, stockValue, salesValue, potentialProfit, batchCount: drugBatches.length, earliestExpiry, warehousesPresent: [...new Set(drugBatches.map(b => b.warehouseName))] };
    }).filter(d => d.totalStock > 0);
  }, [drugs, batches, warehouseFilter]);

  const filtered = useMemo(() => {
    return stockData.filter(d =>
      d.drug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.drug.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.drug.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stockData, searchQuery]);

  const totalValue = filtered.reduce((s, d) => s + d.stockValue, 0);
  const totalUnits = filtered.reduce((s, d) => s + d.totalStock, 0);
  const totalProfit = filtered.reduce((s, d) => s + d.potentialProfit, 0);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(d => {
      const key = groupBy === 'therapeutic' ? d.drug.therapeuticCategory : d.drug.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const handleExportPDF = () => {
    const headers = ['Drug', 'SKU', 'Therapeutic', 'Form', 'Batches', 'Stock', 'Stock Value', 'Potential Revenue', 'Earliest Expiry'];
    const data = filtered.map(d => [d.drug.name, d.drug.sku, d.drug.therapeuticCategory, d.drug.category, d.batchCount, d.totalStock, d.stockValue.toFixed(2), d.salesValue.toFixed(2), d.earliestExpiry]);
    downloadPDF(`Stock Report ${warehouseFilter === 'All' ? '(All Warehouses)' : ''}`, headers, data, 'stock-report');
  };

  const handleExportExcel = () => {
    const headers = ['Drug Name', 'SKU', 'Generic Name', 'Therapeutic Category', 'Drug Form', 'Manufacturer', 'Active Batches', 'Total Stock', 'Stock Value', 'Potential Revenue', 'Potential Profit', 'Earliest Expiry', 'Warehouses'];
    const data = filtered.map(d => [d.drug.name, d.drug.sku, d.drug.genericName, d.drug.therapeuticCategory, d.drug.category, d.drug.manufacturer, d.batchCount, d.totalStock, d.stockValue.toFixed(2), d.salesValue.toFixed(2), d.potentialProfit.toFixed(2), d.earliestExpiry, d.warehousesPresent.join(', ')]);
    downloadExcel('Stock Report', headers, data, 'stock-report');
  };

  const renderStockTable = (rows: typeof filtered) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Drug</th>
            <th className="text-center py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Batches</th>
            <th className="text-center py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Stock</th>
            <th className="text-right py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Stock Value</th>
            <th className="text-right py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Potential Revenue</th>
            <th className="text-right py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Potential Profit</th>
            <th className="text-left py-2 px-4 font-semibold text-slate-600 dark:text-slate-300">Earliest Expiry</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(d => (
            <tr key={d.drug.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <td className="py-3 px-4">
                <p className="font-medium text-slate-900 dark:text-white">{d.drug.name}</p>
                <p className="text-xs text-slate-500">{d.drug.sku} • {d.drug.manufacturer}</p>
              </td>
              <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{d.batchCount}</td>
              <td className="py-3 px-4 text-center font-medium text-slate-900 dark:text-white">{d.totalStock.toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(d.stockValue)}</td>
              <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(d.salesValue)}</td>
              <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(d.potentialProfit)}</td>
              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">{d.earliestExpiry}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 dark:bg-slate-700/30 border-t-2 border-slate-200 dark:border-slate-700">
          <tr>
            <td className="py-2 px-4 font-bold text-slate-900 dark:text-white" colSpan={2}>Subtotal</td>
            <td className="py-2 px-4 text-center font-bold text-slate-900 dark:text-white">{rows.reduce((s, d) => s + d.totalStock, 0).toLocaleString()}</td>
            <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(rows.reduce((s, d) => s + d.stockValue, 0))}</td>
            <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(rows.reduce((s, d) => s + d.salesValue, 0))}</td>
            <td className="py-2 px-4 text-right font-bold text-emerald-600">{formatCurrency(rows.reduce((s, d) => s + d.potentialProfit, 0))}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Drugs in Stock', value: filtered.length, icon: <Package size={18} />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Total Stock Units', value: totalUnits.toLocaleString(), icon: <Package size={18} />, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
          { label: 'Stock Value', value: formatCurrency(totalValue), icon: <IndianRupee size={18} />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Potential Profit', value: formatCurrency(totalProfit), icon: <TrendingUp size={18} />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 truncate">{s.label}</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} counts={whCounts} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search drug, SKU..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
          </div>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button onClick={() => setGroupBy('therapeutic')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'therapeutic' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>Therapeutic</button>
            <button onClick={() => setGroupBy('category')} className={`px-3 py-1.5 text-xs font-medium rounded ${groupBy === 'category' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>By Form</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<Package size={28} />} title="No stock found" message="No drugs in stock for the selected filters." />
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([cat, rows]) => {
            const catUnits = rows.reduce((s, d) => s + d.totalStock, 0);
            const catValue = rows.reduce((s, d) => s + d.stockValue, 0);
            return (
              <CategoryAccordion key={cat} category={cat} count={rows.length} summary={`${catUnits.toLocaleString()} units • ${formatCurrency(catValue)}`}>
                {renderStockTable(rows)}
              </CategoryAccordion>
            );
          })}
        </div>
      )}
    </div>
  );
}

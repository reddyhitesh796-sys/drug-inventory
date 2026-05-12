import { useState, useMemo } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown, IndianRupee, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import WarehouseTabs from '../Common/WarehouseTabs';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ProfitLoss() {
  const { profitLossData, warehouses } = useApp();
  const { downloadPDF, downloadExcel } = useExport();
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [fyFilter, setFyFilter] = useState('FY 2024-25');

  // Available financial years
  const availableFYs = useMemo(() => {
    return [...new Set(profitLossData.map(d => d.fy))].sort().reverse();
  }, [profitLossData]);

  // Filtered data
  const filteredData = useMemo(() => {
    return profitLossData.filter(d => d.fy === fyFilter && (warehouseFilter === 'All' || d.warehouseId === warehouseFilter));
  }, [profitLossData, fyFilter, warehouseFilter]);

  // Aggregate by period (combine all warehouses for the chart)
  const aggregatedByPeriod = useMemo(() => {
    const map: Record<string, { period: string; revenue: number; cogs: number; grossProfit: number; netProfit: number; totalLoss: number; expiredLoss: number; damagedLoss: number; returnsLoss: number; margin: number }> = {};
    filteredData.forEach(d => {
      if (!map[d.period]) {
        map[d.period] = { period: d.period, revenue: 0, cogs: 0, grossProfit: 0, netProfit: 0, totalLoss: 0, expiredLoss: 0, damagedLoss: 0, returnsLoss: 0, margin: 0 };
      }
      map[d.period].revenue += d.revenue;
      map[d.period].cogs += d.cogs;
      map[d.period].grossProfit += d.grossProfit;
      map[d.period].netProfit += d.netProfit;
      map[d.period].totalLoss += d.totalLoss;
      map[d.period].expiredLoss += d.expiredLoss;
      map[d.period].damagedLoss += d.damagedLoss;
      map[d.period].returnsLoss += d.returnsLoss;
    });
    // Recompute margin from aggregated
    Object.values(map).forEach(d => { d.margin = d.revenue > 0 ? Number(((d.netProfit / d.revenue) * 100).toFixed(1)) : 0; });
    // Sort by financial month order
    const monthOrder = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    return Object.values(map).sort((a, b) => monthOrder.indexOf(a.period.split(' ')[0]) - monthOrder.indexOf(b.period.split(' ')[0]));
  }, [filteredData]);

  // Aggregate by warehouse for the FY (used when "All" selected)
  const aggregatedByWarehouse = useMemo(() => {
    const map: Record<string, { warehouseId: string; warehouseName: string; revenue: number; cogs: number; netProfit: number; margin: number }> = {};
    profitLossData.filter(d => d.fy === fyFilter).forEach(d => {
      if (!map[d.warehouseId]) {
        map[d.warehouseId] = { warehouseId: d.warehouseId, warehouseName: d.warehouseName, revenue: 0, cogs: 0, netProfit: 0, margin: 0 };
      }
      map[d.warehouseId].revenue += d.revenue;
      map[d.warehouseId].cogs += d.cogs;
      map[d.warehouseId].netProfit += d.netProfit;
    });
    Object.values(map).forEach(d => { d.margin = d.revenue > 0 ? Number(((d.netProfit / d.revenue) * 100).toFixed(1)) : 0; });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [profitLossData, fyFilter]);

  // Totals
  const totals = aggregatedByPeriod.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue,
    cogs: acc.cogs + d.cogs,
    grossProfit: acc.grossProfit + d.grossProfit,
    totalLoss: acc.totalLoss + d.totalLoss,
    netProfit: acc.netProfit + d.netProfit,
  }), { revenue: 0, cogs: 0, grossProfit: 0, totalLoss: 0, netProfit: 0 });

  const overallMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue * 100) : 0;

  const lossBreakdown = [
    { name: 'Expired Stock', value: aggregatedByPeriod.reduce((s, d) => s + d.expiredLoss, 0) },
    { name: 'Damaged', value: aggregatedByPeriod.reduce((s, d) => s + d.damagedLoss, 0) },
    { name: 'Returns Loss', value: aggregatedByPeriod.reduce((s, d) => s + d.returnsLoss, 0) },
  ].filter(d => d.value > 0);

  const whCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 };
    profitLossData.filter(d => d.fy === fyFilter).forEach(d => {
      counts.All = (counts.All || 0) + 0; // just to ensure defined
      counts[d.warehouseId] = (counts[d.warehouseId] || 0) + 1;
    });
    counts.All = Object.keys(counts).filter(k => k !== 'All').length > 0 ? aggregatedByWarehouse.length : 0;
    return counts;
  }, [profitLossData, fyFilter, aggregatedByWarehouse]);

  const handleExportPDF = () => {
    const headers = ['Period', 'Revenue', 'COGS', 'Gross Profit', 'Losses', 'Net Profit', 'Margin %'];
    const data = aggregatedByPeriod.map(d => [d.period, d.revenue, d.cogs, d.grossProfit, d.totalLoss, d.netProfit, `${d.margin}%`]);
    data.push(['TOTAL', totals.revenue, totals.cogs, totals.grossProfit, totals.totalLoss, totals.netProfit, `${overallMargin.toFixed(1)}%`]);
    downloadPDF(`P&L Statement - ${fyFilter} ${warehouseFilter !== 'All' ? `(${warehouses.find(w => w.id === warehouseFilter)?.name})` : '(All Warehouses)'}`, headers, data, `pnl-${fyFilter.replace(/\s+/g, '-')}`);
  };

  const handleExportExcel = () => {
    const headers = ['Period', 'FY', 'Warehouse', 'Revenue', 'COGS', 'Gross Profit', 'Expired Loss', 'Damaged Loss', 'Returns Loss', 'Total Loss', 'Net Profit', 'Margin %'];
    const data = filteredData.map(d => [d.period, d.fy, d.warehouseName, d.revenue, d.cogs, d.grossProfit, d.expiredLoss, d.damagedLoss, d.returnsLoss, d.totalLoss, d.netProfit, d.margin]);
    downloadExcel('Profit & Loss Statement', headers, data, `pnl-${fyFilter.replace(/\s+/g, '-')}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* FY Selector and Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
            <Calendar size={16} className="text-blue-600" />
            <label className="text-xs font-medium text-slate-500">Financial Year:</label>
            <select value={fyFilter} onChange={e => setFyFilter(e.target.value)} className="bg-transparent text-sm font-semibold text-slate-900 dark:text-white outline-none cursor-pointer">
              {availableFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
          </div>
          {warehouseFilter !== 'All' && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Building2 size={14} className="text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{warehouses.find(w => w.id === warehouseFilter)?.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Download size={16} /> PDF</button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"><Download size={16} /> Excel</button>
        </div>
      </div>

      {/* Warehouse Tabs */}
      <WarehouseTabs selected={warehouseFilter} onChange={setWarehouseFilter} counts={whCounts} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Revenue', value: totals.revenue, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: <IndianRupee size={16} /> },
          { label: 'Total COGS', value: totals.cogs, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-700/50', icon: <TrendingDown size={16} /> },
          { label: 'Gross Profit', value: totals.grossProfit, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <TrendingUp size={16} /> },
          { label: 'Total Losses', value: totals.totalLoss, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: <TrendingDown size={16} /> },
          { label: 'Net Profit', value: totals.netProfit, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: <TrendingUp size={16} /> },
        ].map((card, i) => (
          <div key={i} className={`${card.bg} rounded-xl p-4 border border-slate-200 dark:border-slate-700`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{card.label}</p>
              <span className={card.color}>{card.icon}</span>
            </div>
            <p className={`text-base sm:text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Warehouse Comparison (only when All selected) */}
      {warehouseFilter === 'All' && aggregatedByWarehouse.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Warehouse-wise Performance — {fyFilter}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {aggregatedByWarehouse.map((w, i) => (
              <div key={w.warehouseId} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/30 dark:to-slate-800 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setWarehouseFilter(w.warehouseId)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">#{i + 1}</span>
                  <Building2 size={14} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{w.warehouseName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{w.margin.toFixed(1)}% margin</p>
                <div className="mt-3 space-y-0.5">
                  <div className="flex justify-between text-xs"><span className="text-slate-500">Revenue:</span><span className="font-bold text-blue-600">{formatCurrency(w.revenue)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500">Profit:</span><span className="font-bold text-emerald-600">{formatCurrency(w.netProfit)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Monthly P&L Breakdown — {fyFilter}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aggregatedByPeriod}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(v: unknown) => formatCurrency(v as number)} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cogs" name="COGS" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="netProfit" name="Net Profit" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="totalLoss" name="Losses" fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Loss Breakdown</h3>
          {lossBreakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">No losses recorded 🎉</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={lossBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {lossBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(v: unknown) => formatCurrency(v as number)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {lossBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span className="text-slate-600 dark:text-slate-400">{item.name}</span></div>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Profit Margin Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={aggregatedByPeriod}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(v: unknown) => `${v}%`} />
            <Line type="monotone" dataKey="margin" name="Margin %" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Detailed P&L — {fyFilter}{warehouseFilter !== 'All' ? ` (${warehouses.find(w => w.id === warehouseFilter)?.name})` : ''}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Period</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">COGS</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Gross Profit</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Expired</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Damaged</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Returns</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Net Profit</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Margin</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedByPeriod.map((d, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{d.period}</td>
                  <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(d.revenue)}</td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 font-mono">{formatCurrency(d.cogs)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(d.grossProfit)}</td>
                  <td className="py-3 px-4 text-right text-red-500 font-mono">{d.expiredLoss > 0 ? formatCurrency(d.expiredLoss) : '—'}</td>
                  <td className="py-3 px-4 text-right text-red-500 font-mono">{d.damagedLoss > 0 ? formatCurrency(d.damagedLoss) : '—'}</td>
                  <td className="py-3 px-4 text-right text-orange-500 font-mono">{d.returnsLoss > 0 ? formatCurrency(d.returnsLoss) : '—'}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600 dark:text-green-400 font-mono">{formatCurrency(d.netProfit)}</td>
                  <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.margin >= 35 ? 'bg-green-100 text-green-700' : d.margin >= 25 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{d.margin.toFixed(1)}%</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-700 font-bold">
                <td className="py-3 px-4 text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-3 px-4 text-right text-blue-600 font-mono">{formatCurrency(totals.revenue)}</td>
                <td className="py-3 px-4 text-right text-slate-600 font-mono">{formatCurrency(totals.cogs)}</td>
                <td className="py-3 px-4 text-right text-emerald-600 font-mono">{formatCurrency(totals.grossProfit)}</td>
                <td className="py-3 px-4 text-right font-mono" colSpan={3}>{formatCurrency(totals.totalLoss)}</td>
                <td className="py-3 px-4 text-right text-green-600 font-mono">{formatCurrency(totals.netProfit)}</td>
                <td className="py-3 px-4 text-center text-green-600">{overallMargin.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

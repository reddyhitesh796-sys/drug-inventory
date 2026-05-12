import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Package, MapPin, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/exportUtils';
import type { SalesInvoice, SalesInvoiceItem } from '../../types';

interface InvoiceFormProps {
  invoice?: SalesInvoice | null;
  onClose: () => void;
  defaultWarehouseId?: string;
}

export default function InvoiceForm({ invoice, onClose, defaultWarehouseId }: InvoiceFormProps) {
  const { customers, batches, drugs, warehouses, addSalesInvoice, updateSalesInvoice } = useApp();
  const isEdit = !!invoice;

  const [customerId, setCustomerId] = useState(invoice?.customerId || '');
  const [warehouseId, setWarehouseId] = useState(invoice?.warehouseId || defaultWarehouseId || '');
  const [paymentType, setPaymentType] = useState<SalesInvoice['paymentType']>(invoice?.paymentType || 'Cash');
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate || new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [discount, setDiscount] = useState(invoice?.discount || 0);
  const [paidAmount, setPaidAmount] = useState(invoice?.paidAmount || 0);
  const [items, setItems] = useState<SalesInvoiceItem[]>(invoice?.items || []);

  // Add-item helpers
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [addQty, setAddQty] = useState(0);
  const [addPrice, setAddPrice] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0);

  const customer = customers.find(c => c.id === customerId);
  const warehouse = warehouses.find(w => w.id === warehouseId);

  // Helper: a batch is sellable if active, has stock, and not expired
  const isSellable = (b: typeof batches[0]) =>
    b.currentStock > 0 && b.status === 'Active' && new Date(b.expiryDate) > new Date();

  // FEFO: Filter sellable batches for selected drug AT selected warehouse, sorted by expiry
  const availableBatches = useMemo(() => {
    if (!selectedDrugId || !warehouseId) return [];
    return batches
      .filter(b => b.drugId === selectedDrugId && b.warehouseId === warehouseId && isSellable(b))
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, selectedDrugId, warehouseId]);

  // When drug changes, reset batch (price will be set by next effect)
  useEffect(() => {
    setSelectedBatchId('');
  }, [selectedDrugId]);

  // When warehouse changes, reset everything (drug + batch)
  useEffect(() => {
    setSelectedDrugId('');
    setSelectedBatchId('');
    setAddPrice(0);
  }, [warehouseId]);

  // Auto-select FEFO batch as soon as drug + available batches are available
  useEffect(() => {
    if (selectedDrugId && availableBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(availableBatches[0].id);
    }
  }, [selectedDrugId, availableBatches, selectedBatchId]);

  // When batch changes, ALWAYS set selling price from that batch (not just when previously set)
  useEffect(() => {
    if (selectedBatchId) {
      const batch = batches.find(b => b.id === selectedBatchId);
      if (batch) setAddPrice(batch.sellingPrice);
    } else {
      setAddPrice(0);
    }
  }, [selectedBatchId, batches]);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  // Only list drugs that have at least one SELLABLE batch in this warehouse
  const drugList = useMemo(() => {
    if (!warehouseId) return [];
    const drugIds = new Set(
      batches.filter(b => b.warehouseId === warehouseId && isSellable(b)).map(b => b.drugId)
    );
    return drugs.filter(d => drugIds.has(d.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drugs, batches, warehouseId]);

  const handleAddItem = () => {
    if (!selectedBatchId || addQty <= 0 || !selectedBatch) return;
    if (addQty > selectedBatch.currentStock) {
      alert(`Only ${selectedBatch.currentStock} units available in this batch`);
      return;
    }
    const drug = drugs.find(d => d.id === selectedBatch.drugId);
    if (!drug) return;
    const baseAmount = addQty * addPrice;
    const itemDiscountAmount = baseAmount * (itemDiscount / 100);
    const newItem: SalesInvoiceItem = {
      drugId: selectedBatch.drugId,
      drugName: selectedBatch.drugName,
      batchId: selectedBatch.id,
      batchNo: selectedBatch.batchNo,
      expiryDate: selectedBatch.expiryDate,
      quantity: addQty,
      sellingPrice: addPrice,
      mrp: selectedBatch.mrp,
      gstPercent: drug.gstPercent,
      discount: itemDiscount,
      amount: baseAmount - itemDiscountAmount,
    };
    setItems(prev => [...prev, newItem]);
    setSelectedDrugId('');
    setSelectedBatchId('');
    setAddQty(0);
    setAddPrice(0);
    setItemDiscount(0);
  };

  const handleRemoveItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleUpdateQty = (idx: number, qty: number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const baseAmount = qty * it.sellingPrice;
      const itemDiscountAmount = baseAmount * (it.discount / 100);
      return { ...it, quantity: qty, amount: baseAmount - itemDiscountAmount };
    }));
  };

  const handleUpdateDiscount = (idx: number, disc: number) => {
    const safeDisc = Math.min(Math.max(0, disc), 100);
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const baseAmount = it.quantity * it.sellingPrice;
      const itemDiscountAmount = baseAmount * (safeDisc / 100);
      return { ...it, discount: safeDisc, amount: baseAmount - itemDiscountAmount };
    }));
  };

  const handleUpdatePrice = (idx: number, price: number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const baseAmount = it.quantity * price;
      const itemDiscountAmount = baseAmount * (it.discount / 100);
      return { ...it, sellingPrice: price, amount: baseAmount - itemDiscountAmount };
    }));
  };

  // Totals
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + it.amount, 0);
    const gst = items.reduce((s, it) => s + (it.amount * it.gstPercent / 100), 0);
    const total = subtotal + gst - discount;
    return { subtotal, gst, total, due: Math.max(0, total - paidAmount) };
  }, [items, discount, paidAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !warehouse || items.length === 0) return;

    const payload = {
      customerId: customer.id,
      customerName: customer.name,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      items,
      subtotal: totals.subtotal,
      gstAmount: totals.gst,
      discount,
      totalAmount: totals.total,
      paidAmount,
      dueAmount: totals.due,
      paymentType,
      status: 'Delivered' as const,
      invoiceDate,
      dueDate: paymentType === 'Credit' ? dueDate : undefined,
      createdBy: 'Admin User',
    };

    if (isEdit && invoice) {
      updateSalesInvoice({ ...invoice, ...payload });
    } else {
      addSalesInvoice(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={20} className="text-blue-600" /> {isEdit ? `Edit Invoice ${invoice?.invoiceNumber}` : 'Create New Sales Invoice'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Step 1: Customer & Warehouse → Step 2: Add items (FEFO from batches) → Submit</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Customer & Warehouse */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">1. Invoice Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Customer *</label>
                <select required value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="">-- Select customer --</option>
                  {customers.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name} • {c.type} • Outstanding: ₹{c.outstandingBalance.toLocaleString()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Source Warehouse *</label>
                <select required value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option value="">-- Select warehouse --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Invoice Date *</label>
                <input required type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Type *</label>
                <select required value={paymentType} onChange={e => setPaymentType(e.target.value as SalesInvoice['paymentType'])} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  <option>Cash</option><option>Credit</option><option>UPI</option><option>Bank Transfer</option>
                </select>
              </div>
              {paymentType === 'Credit' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date *</label>
                  <input required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
              )}
              {customer && (
                <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-700 dark:text-blue-400"><strong>{customer.name}</strong> • Credit Limit: {formatCurrency(customer.creditLimit)} • Outstanding: <span className="font-bold">{formatCurrency(customer.outstandingBalance)}</span></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Items */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">2. Items ({items.length})</h4>
            {!warehouseId ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-slate-400">
                <MapPin size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Select a warehouse first to load available drugs</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Drug</label>
                      <select value={selectedDrugId} onChange={e => setSelectedDrugId(e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-white">
                        <option value="">-- Choose drug --</option>
                        {drugList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Batch (FEFO)</label>
                      <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} disabled={!selectedDrugId} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-white disabled:opacity-50">
                        <option value="">-- Auto-FEFO --</option>
                        {availableBatches.map(b => <option key={b.id} value={b.id}>{b.batchNo} • Exp: {b.expiryDate} • {b.currentStock} units</option>)}
                      </select>
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Qty</label>
                      <input type="number" min="1" max={selectedBatch?.currentStock} value={addQty || ''} onChange={e => setAddQty(parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Price ₹</label>
                      <input type="number" step="0.01" value={addPrice || ''} onChange={e => setAddPrice(parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Disc %</label>
                      <input type="number" min="0" max="100" value={itemDiscount || ''} onChange={e => setItemDiscount(parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-white" />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <button type="button" onClick={handleAddItem} disabled={!selectedBatchId || addQty <= 0} className="w-full px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"><Plus size={12} /> Add Item</button>
                    </div>
                  </div>
                  {selectedBatch && (
                    <p className="text-[10px] text-blue-600 mt-2">Available: {selectedBatch.currentStock} units • MRP: {formatCurrency(selectedBatch.mrp)} • Expires: {selectedBatch.expiryDate}</p>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-400">
                    <Package size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No items added yet</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Drug / Batch</th>
                          <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-xs">Qty</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-xs">Price</th>
                          <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-xs">Disc%</th>
                          <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-xs">GST%</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-300 text-xs">Amount</th>
                          <th className="text-center py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 px-3"><p className="text-xs font-medium text-slate-900 dark:text-white">{it.drugName}</p><p className="text-[10px] text-slate-500 font-mono">{it.batchNo}</p></td>
                            <td className="py-2 px-2 text-center"><input type="number" min="1" value={it.quantity} onChange={e => handleUpdateQty(idx, parseInt(e.target.value) || 1)} className="w-16 px-1 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-center text-slate-900 dark:text-white" /></td>
                            <td className="py-2 px-2 text-right">
                              <input type="number" min="0" step="0.01" value={it.sellingPrice} onChange={e => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)} className="w-20 px-1 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-right text-slate-900 dark:text-white font-mono" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="inline-flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                                <input type="number" min="0" max="100" step="0.5" value={it.discount} onChange={e => handleUpdateDiscount(idx, parseFloat(e.target.value) || 0)} className="w-12 px-1 py-1 bg-transparent text-xs text-center text-slate-900 dark:text-white outline-none" />
                                <span className="text-[10px] text-slate-500 pr-1">%</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center text-xs">{it.gstPercent}%</td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-600 font-mono text-xs">{formatCurrency(it.amount)}</td>
                            <td className="py-2 px-2 text-center"><button type="button" onClick={() => handleRemoveItem(idx)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 size={12} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 3: Totals & Payment */}
          {items.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">3. Totals & Payment</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bill Discount ₹</label>
                  <input type="number" min="0" step="0.01" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Paid Amount ₹</label>
                  <input type="number" min="0" max={totals.total} step="0.01" value={paidAmount || ''} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <button type="button" onClick={() => setPaidAmount(totals.total)} className="w-full mt-5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-medium hover:bg-emerald-100">Mark Fully Paid</button>
                </div>
              </div>
              <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Subtotal:</span><span className="font-medium text-slate-900 dark:text-white font-mono">{formatCurrency(totals.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">GST:</span><span className="font-medium text-slate-900 dark:text-white font-mono">{formatCurrency(totals.gst)}</span></div>
                {discount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Discount:</span><span className="font-medium text-red-600 font-mono">-{formatCurrency(discount)}</span></div>}
                <div className="border-t border-blue-200 dark:border-blue-800 pt-2 flex justify-between"><span className="text-base font-bold text-slate-900 dark:text-white">Total:</span><span className="text-lg font-bold text-blue-700 dark:text-blue-400 font-mono">{formatCurrency(totals.total)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-emerald-700">Paid:</span><span className="font-medium text-emerald-600 font-mono">{formatCurrency(paidAmount)}</span></div>
                {totals.due > 0 && <div className="flex justify-between text-sm"><span className="text-red-700">Outstanding:</span><span className="font-bold text-red-600 font-mono">{formatCurrency(totals.due)}</span></div>}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between sticky bottom-0 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500">{items.length > 0 && customer ? <span className="font-semibold text-blue-600">{items.length} item(s) • {formatCurrency(totals.total)}</span> : <span className="text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> Select customer, warehouse, and add items</span>}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button type="submit" disabled={!customer || !warehouse || items.length === 0} className="flex items-center gap-1.5 px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium shadow"><FileText size={14} /> {isEdit ? 'Save Changes' : 'Generate Invoice'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

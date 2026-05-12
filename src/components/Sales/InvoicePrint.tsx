import { X, Printer, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { useExport } from '../../utils/useExport';
import type { SalesInvoice } from '../../types';

interface InvoicePrintProps {
  invoice: SalesInvoice;
  onClose: () => void;
}

export default function InvoicePrint({ invoice, onClose }: InvoicePrintProps) {
  const { customers, warehouses } = useApp();
  const { downloadPDF } = useExport();
  const customer = customers.find(c => c.id === invoice.customerId);
  const warehouse = warehouses.find(w => w.id === invoice.warehouseId);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const headers = ['Drug', 'Batch', 'Expiry', 'Qty', 'MRP', 'Rate', 'Disc%', 'GST%', 'Amount'];
    const data = invoice.items.map(it => [it.drugName, it.batchNo, it.expiryDate, it.quantity, it.mrp, it.sellingPrice, `${it.discount}%`, `${it.gstPercent}%`, it.amount.toFixed(2)]);
    downloadPDF(`Invoice ${invoice.invoiceNumber}`, headers, data, `invoice-${invoice.invoiceNumber}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl animate-scale-in print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:max-w-full" onClick={e => e.stopPropagation()}>
        {/* Action Bar - hidden in print */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Invoice Preview</h3>
            <p className="text-[10px] text-slate-500">{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"><Download size={14} /> PDF</button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"><Printer size={14} /> Print</button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={16} /></button>
          </div>
        </div>

        {/* Printable Invoice Content */}
        <div className="p-8 bg-white text-black print:p-12">
          {/* Header */}
          <div className="flex items-start justify-between border-b-4 border-blue-600 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">DDIAS</h1>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Drug Distributor Inventory & Audit System</p>
              <p className="text-xs text-slate-700 mt-2">{warehouse?.name}, {warehouse?.location}</p>
              <p className="text-xs text-slate-700">GSTIN: 27AABCD1234F1Z5 • DL: MH-DL-2024-001</p>
              <p className="text-xs text-slate-700">Phone: +91-22-1234-5678 • info@ddias.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-800">TAX INVOICE</h2>
              <p className="text-xs text-slate-500 mt-1">Original for Recipient</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Bill To</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{customer?.name}</p>
              <p className="text-xs text-slate-700">{customer?.contactPerson}</p>
              <p className="text-xs text-slate-700">{customer?.address}</p>
              <p className="text-xs text-slate-700 mt-1">GSTIN: <span className="font-mono">{customer?.gstNumber}</span></p>
              <p className="text-xs text-slate-700">DL: <span className="font-mono">{customer?.drugLicense}</span></p>
              <p className="text-xs text-slate-700">Phone: {customer?.phone}</p>
            </div>
            <div className="text-right">
              <table className="text-xs ml-auto">
                <tbody>
                  <tr><td className="text-slate-500 pr-4 py-0.5">Invoice #:</td><td className="font-bold text-slate-900">{invoice.invoiceNumber}</td></tr>
                  <tr><td className="text-slate-500 pr-4 py-0.5">Invoice Date:</td><td className="font-medium text-slate-700">{formatDate(invoice.invoiceDate)}</td></tr>
                  {invoice.dueDate && <tr><td className="text-slate-500 pr-4 py-0.5">Due Date:</td><td className="font-medium text-red-600">{formatDate(invoice.dueDate)}</td></tr>}
                  <tr><td className="text-slate-500 pr-4 py-0.5">Payment:</td><td className="font-medium text-slate-700">{invoice.paymentType}</td></tr>
                  <tr><td className="text-slate-500 pr-4 py-0.5">Status:</td><td className="font-medium text-emerald-600">{invoice.status}</td></tr>
                  <tr><td className="text-slate-500 pr-4 py-0.5">Created By:</td><td className="text-slate-700">{invoice.createdBy}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs border border-slate-300 mb-4">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Drug Description</th>
                <th className="text-left py-2 px-2">Batch / Exp</th>
                <th className="text-center py-2 px-2">Qty</th>
                <th className="text-right py-2 px-2">MRP</th>
                <th className="text-right py-2 px-2">Rate</th>
                <th className="text-center py-2 px-2">Disc</th>
                <th className="text-center py-2 px-2">GST</th>
                <th className="text-right py-2 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i} className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className="py-2 px-2 text-slate-700">{i + 1}</td>
                  <td className="py-2 px-2 text-slate-900 font-medium">{it.drugName}</td>
                  <td className="py-2 px-2 text-slate-600 font-mono text-[10px]">{it.batchNo}<br />{it.expiryDate}</td>
                  <td className="py-2 px-2 text-center text-slate-700">{it.quantity}</td>
                  <td className="py-2 px-2 text-right text-slate-600 font-mono">{formatCurrency(it.mrp)}</td>
                  <td className="py-2 px-2 text-right text-slate-700 font-mono">{formatCurrency(it.sellingPrice)}</td>
                  <td className="py-2 px-2 text-center text-slate-600">{it.discount}%</td>
                  <td className="py-2 px-2 text-center text-slate-600">{it.gstPercent}%</td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900 font-mono">{formatCurrency(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <table className="text-xs">
              <tbody>
                <tr><td className="pr-8 py-1 text-slate-600">Subtotal:</td><td className="text-right font-medium font-mono">{formatCurrency(invoice.subtotal)}</td></tr>
                <tr><td className="pr-8 py-1 text-slate-600">GST:</td><td className="text-right font-medium font-mono">{formatCurrency(invoice.gstAmount)}</td></tr>
                {invoice.discount > 0 && <tr><td className="pr-8 py-1 text-slate-600">Discount:</td><td className="text-right text-red-600 font-mono">-{formatCurrency(invoice.discount)}</td></tr>}
                <tr className="border-t-2 border-blue-600"><td className="pr-8 py-2 text-base font-bold text-slate-900">GRAND TOTAL:</td><td className="text-right text-base font-bold text-blue-700 font-mono">{formatCurrency(invoice.totalAmount)}</td></tr>
                <tr><td className="pr-8 py-1 text-emerald-700">Paid:</td><td className="text-right font-medium text-emerald-600 font-mono">{formatCurrency(invoice.paidAmount)}</td></tr>
                {invoice.dueAmount > 0 && <tr><td className="pr-8 py-1 text-red-700 font-bold">Outstanding:</td><td className="text-right font-bold text-red-600 font-mono">{formatCurrency(invoice.dueAmount)}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-[10px] text-slate-500">
            <div>
              <p className="font-bold text-slate-700 mb-1">Terms & Conditions:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Goods once sold will not be taken back</li>
                <li>Payment due within 30 days for credit sales</li>
                <li>Subject to local jurisdiction</li>
                <li>E&OE</li>
              </ul>
            </div>
            <div className="text-right">
              <p className="text-slate-700 font-bold">For DDIAS</p>
              <div className="h-12" />
              <p className="border-t border-slate-300 pt-1 inline-block">Authorized Signatory</p>
            </div>
          </div>

          <p className="text-center text-[9px] text-slate-400 mt-6">This is a computer-generated invoice and does not require signature.</p>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0 { position: absolute; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
          .fixed.inset-0 { left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}

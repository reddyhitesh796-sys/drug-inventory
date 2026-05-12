import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

function triggerDownload(blob: Blob, filename: string) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return true;
  } catch (err) {
    console.error('Download failed:', err);
    return false;
  }
}

export function exportToPDF(title: string, headers: string[], data: (string | number)[][], filename: string): boolean {
  try {
    const doc = new jsPDF({ orientation: headers.length > 8 ? 'landscape' : 'portrait' });

    // Header banner
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DDIAS — Drug Distributor Inventory & Audit System', 14, 12);

    // Title section
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 28);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 140, 141);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 34);
    doc.text(`Total Records: ${data.length}`, 14, 39);

    // Convert data to safe strings
    const safeData = data.map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'number') return cell.toString();
        return String(cell);
      })
    );

    autoTable(doc, {
      head: [headers],
      body: safeData,
      startY: 44,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      margin: { top: 44, left: 10, right: 10 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        const pageNumber = data.pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(127, 140, 141);
        doc.text(
          `Page ${pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 25,
          doc.internal.pageSize.getHeight() - 8
        );
      },
    });

    const safeFilename = filename.replace(/[^a-z0-9-_]/gi, '-');
    const fullName = `${safeFilename}-${new Date().toISOString().substring(0, 10)}.pdf`;

    // Use blob output for reliable downloads in singlefile builds
    const blob = doc.output('blob');
    return triggerDownload(blob, fullName);
  } catch (err) {
    console.error('PDF export failed:', err);
    return false;
  }
}

export function exportToExcel(title: string, headers: string[], data: (string | number)[][], filename: string): boolean {
  try {
    // Sanitize data for Excel
    const safeData = data.map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return '';
        return cell;
      })
    );

    // Info Sheet
    const infoWs = XLSX.utils.aoa_to_sheet([
      ['DDIAS — Drug Distributor Inventory & Audit System'],
      [],
      ['Report Title:', title],
      ['Generated On:', new Date().toLocaleString('en-IN')],
      ['Total Records:', data.length],
      [],
      ['This report is auto-generated and includes the latest data as per system records.'],
    ]);
    infoWs['!cols'] = [{ wch: 25 }, { wch: 50 }];

    // Data Sheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...safeData]);

    // Auto-fit columns
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...safeData.slice(0, 100).map(row => String(row[i] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws['!cols'] = colWidths;

    // Freeze first row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    const sheetName = title.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.utils.book_append_sheet(wb, infoWs, 'Info');

    const safeFilename = filename.replace(/[^a-z0-9-_]/gi, '-');
    const fullName = `${safeFilename}-${new Date().toISOString().substring(0, 10)}.xlsx`;

    // Generate as array buffer and use Blob for reliable downloads
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return triggerDownload(blob, fullName);
  } catch (err) {
    console.error('Excel export failed:', err);
    return false;
  }
}

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string): string {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return date;
  }
}

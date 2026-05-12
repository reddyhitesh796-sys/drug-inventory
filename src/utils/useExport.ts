import { useToast } from '../context/ToastContext';
import { exportToPDF, exportToExcel } from './exportUtils';

export function useExport() {
  const { showToast } = useToast();

  const downloadPDF = (title: string, headers: string[], data: (string | number)[][], filename: string) => {
    if (data.length === 0) {
      showToast('warning', 'No Data', 'There is no data to export');
      return;
    }
    const success = exportToPDF(title, headers, data, filename);
    if (success) {
      showToast('success', 'PDF Downloaded', `${title} (${data.length} records) exported successfully`);
    } else {
      showToast('error', 'Export Failed', 'Could not generate PDF. Please try again.');
    }
  };

  const downloadExcel = (title: string, headers: string[], data: (string | number)[][], filename: string) => {
    if (data.length === 0) {
      showToast('warning', 'No Data', 'There is no data to export');
      return;
    }
    const success = exportToExcel(title, headers, data, filename);
    if (success) {
      showToast('success', 'Excel Downloaded', `${title} (${data.length} records) exported successfully`);
    } else {
      showToast('error', 'Export Failed', 'Could not generate Excel file. Please try again.');
    }
  };

  return { downloadPDF, downloadExcel };
}

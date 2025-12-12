import { format } from 'date-fns';

export interface ExcelSheet {
  name: string;
  data: (string | number | null | undefined)[][];
}

export interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheet[];
}

export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  
  for (const sheet of options.sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
  }
  
  XLSX.writeFile(workbook, options.filename);
}

export function formatCurrencyForExcel(paise: number | null | undefined): number {
  if (paise === null || paise === undefined) return 0;
  return Number((paise / 100).toFixed(2));
}

export function formatDateForExcel(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd');
  } catch {
    return String(dateStr);
  }
}

export function formatDateTimeForExcel(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
  } catch {
    return String(dateStr);
  }
}

export function safeString(value: string | null | undefined): string {
  return value || '';
}

export function safeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

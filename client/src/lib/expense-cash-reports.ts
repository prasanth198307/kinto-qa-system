import { format } from 'date-fns';
import { downloadXLSX } from '@/lib/download-utils';
import { type TenantConfig, formatCurrency as fmtCur } from '@/hooks/use-tenant-config';

export interface ExpenseReportVoucher {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  payeeType: string;
  payeeName: string;
  paymentMode: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  purpose?: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    gstRate: string;
    gstAmount: number;
    categoryId?: string;
  }[];
}

export interface ExpenseReportData {
  vouchers: ExpenseReportVoucher[];
  summary: {
    totalVouchers: number;
    totalAmount: number;
    totalGST: number;
    byStatus: Record<string, number>;
    byPaymentMode: Record<string, number>;
  };
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

export interface CashRegisterDayReport {
  id: string;
  registerDate: string;
  salespersonName: string;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalCashReceived: number;
  totalExpenses: number;
  totalTransfers: number;
  variance: number;
  hasDiscrepancy: number;
  status: string;
  transactions?: {
    id: string;
    transactionType: string;
    amount: number;
    reference?: string;
    description?: string;
    transferTo?: string;
    expenseItems?: {
      id: string;
      itemLabel: string;
      amount: number;
    }[];
  }[];
}

export interface CashRegisterReportData {
  days: CashRegisterDayReport[];
  summary: {
    totalDays: number;
    startingBalance: number;
    endingBalance: number;
    totalCashReceived: number;
    totalDeposits: number;
    totalExpenses: number;
    totalTransfers: number;
    totalVariance: number;
    daysWithDiscrepancy: number;
    byStatus: Record<string, number>;
    bySalesperson: Record<string, { days: number; expenses: number; cashReceived: number }>;
  };
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

function formatCurrency(paiseAmount: number, config?: TenantConfig): string {
  if (config) return fmtCur(paiseAmount / 100, config);
  return (paiseAmount / 100).toFixed(2);
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd-MMM-yyyy');
  } catch {
    return dateStr;
  }
}

export async function fetchExpenseReport(
  startDate?: string,
  endDate?: string,
  status?: string,
  payeeType?: string
): Promise<ExpenseReportData> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (status) params.append('status', status);
  if (payeeType) params.append('payeeType', payeeType);
  
  const response = await fetch(`/api/reports/expenses?${params.toString()}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch expense report');
  }
  
  return response.json();
}

export async function fetchCashRegisterReport(
  startDate?: string,
  endDate?: string,
  salesperson?: string,
  status?: string
): Promise<CashRegisterReportData> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (salesperson) params.append('salesperson', salesperson);
  if (status) params.append('status', status);
  
  const response = await fetch(`/api/reports/cash-register?${params.toString()}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cash register report');
  }
  
  return response.json();
}

export async function exportExpenseReportAsExcel(data: ExpenseReportData, config?: TenantConfig): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  
  const period = data.dateRange.startDate && data.dateRange.endDate
    ? `${formatDate(data.dateRange.startDate)} to ${formatDate(data.dateRange.endDate)}`
    : 'All Time';
  
  const taxLabel = config?.tax_regime ?? 'Tax';
  const summaryData = [
    { 'Metric': 'Report Period', 'Value': period },
    { 'Metric': 'Total Vouchers', 'Value': data.summary.totalVouchers },
    { 'Metric': 'Total Amount', 'Value': formatCurrency(data.summary.totalAmount, config) },
    { 'Metric': `Total ${taxLabel}`, 'Value': formatCurrency(data.summary.totalGST, config) },
    { 'Metric': '', 'Value': '' },
    { 'Metric': 'By Status', 'Value': '' },
    { 'Metric': '  Draft', 'Value': data.summary.byStatus.draft || 0 },
    { 'Metric': '  Submitted', 'Value': data.summary.byStatus.submitted || 0 },
    { 'Metric': '  Approved', 'Value': data.summary.byStatus.approved || 0 },
    { 'Metric': '  Rejected', 'Value': data.summary.byStatus.rejected || 0 },
    { 'Metric': '  Paid', 'Value': data.summary.byStatus.paid || 0 },
  ];

  Object.entries(data.summary.byPaymentMode).forEach(([mode, amount]) => {
    summaryData.push({ 'Metric': `Payment: ${mode}`, 'Value': formatCurrency(amount as number, config) });
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const voucherData = data.vouchers.map(v => ({
    'Voucher No': v.voucherNumber,
    'Date': formatDate(v.voucherDate),
    'Payee Name': v.payeeName,
    'Payee Type': v.payeeType,
    'Payment Mode': v.paymentMode,
    'Purpose': v.purpose || '',
    'Subtotal': formatCurrency(v.subtotal, config),
    [taxLabel]: formatCurrency(v.gstAmount, config),
    'Total': formatCurrency(v.totalAmount, config),
    'Status': v.status,
    'Items Count': v.items?.length || 0,
  }));

  const vouchersSheet = XLSX.utils.json_to_sheet(voucherData);
  XLSX.utils.book_append_sheet(workbook, vouchersSheet, 'Vouchers');

  const allItems: any[] = [];
  data.vouchers.forEach(v => {
    (v.items || []).forEach(item => {
      allItems.push({
        'Voucher No': v.voucherNumber,
        'Voucher Date': formatDate(v.voucherDate),
        'Payee': v.payeeName,
        'Description': item.description,
        'Quantity': item.quantity,
        'Unit Price': formatCurrency(item.unitPrice, config),
        'Amount': formatCurrency(item.amount, config),
        [`${taxLabel} Rate (%)`]: item.gstRate || '0',
        [`${taxLabel} Amount`]: formatCurrency(item.gstAmount, config),
      });
    });
  });
  
  if (allItems.length > 0) {
    const itemsSheet = XLSX.utils.json_to_sheet(allItems);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Expense Items');
  }
  
  const filename = `Expense_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  await downloadXLSX(workbook, filename);
}

export async function exportCashRegisterReportAsExcel(data: CashRegisterReportData, config?: TenantConfig): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  const period = data.dateRange.startDate && data.dateRange.endDate
    ? `${formatDate(data.dateRange.startDate)} to ${formatDate(data.dateRange.endDate)}`
    : 'All Time';

  const summaryData = [
    { 'Metric': 'Report Period', 'Value': period },
    { 'Metric': 'Total Days', 'Value': data.summary.totalDays },
    { 'Metric': 'Starting Balance', 'Value': formatCurrency(data.summary.startingBalance, config) },
    { 'Metric': 'Ending Balance', 'Value': formatCurrency(data.summary.endingBalance, config) },
    { 'Metric': '', 'Value': '' },
    { 'Metric': 'Cash Flow Summary', 'Value': '' },
    { 'Metric': '  Total Cash Received', 'Value': formatCurrency(data.summary.totalCashReceived, config) },
    { 'Metric': '  Total Deposits', 'Value': formatCurrency(data.summary.totalDeposits, config) },
    { 'Metric': '  Total Expenses', 'Value': formatCurrency(data.summary.totalExpenses, config) },
    { 'Metric': '  Total Transfers', 'Value': formatCurrency(data.summary.totalTransfers, config) },
    { 'Metric': '  Total Variance', 'Value': formatCurrency(data.summary.totalVariance, config) },
    { 'Metric': '', 'Value': '' },
    { 'Metric': 'Days with Discrepancy', 'Value': data.summary.daysWithDiscrepancy },
    { 'Metric': '', 'Value': '' },
    { 'Metric': 'By Status', 'Value': '' },
    { 'Metric': '  Open', 'Value': data.summary.byStatus.open || 0 },
    { 'Metric': '  Reconciled', 'Value': data.summary.byStatus.reconciled || 0 },
    { 'Metric': '  Locked', 'Value': data.summary.byStatus.locked || 0 },
  ];

  Object.entries(data.summary.bySalesperson).forEach(([name, stats]) => {
    summaryData.push({ 'Metric': '', 'Value': '' });
    summaryData.push({ 'Metric': `Salesperson: ${name}`, 'Value': '' });
    summaryData.push({ 'Metric': '  Days', 'Value': stats.days });
    summaryData.push({ 'Metric': '  Cash Received', 'Value': formatCurrency(stats.cashReceived, config) });
    summaryData.push({ 'Metric': '  Expenses', 'Value': formatCurrency(stats.expenses, config) });
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const dailyData = data.days.map(d => ({
    'Date': formatDate(d.registerDate),
    'Salesperson': d.salespersonName,
    'Opening': formatCurrency(d.openingBalance, config),
    'Cash Received': formatCurrency(d.totalCashReceived, config),
    'Deposits': formatCurrency(d.totalDeposits, config),
    'Expenses': formatCurrency(d.totalExpenses, config),
    'Transfers': formatCurrency(d.totalTransfers, config),
    'Closing': formatCurrency(d.closingBalance, config),
    'Variance': formatCurrency(d.variance, config),
    'Status': d.status,
    'Discrepancy': d.hasDiscrepancy === 1 ? 'Yes' : 'No',
  }));

  const dailySheet = XLSX.utils.json_to_sheet(dailyData);
  XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Summary');

  const allTransactions: any[] = [];
  data.days.forEach(day => {
    (day.transactions || []).forEach(tx => {
      allTransactions.push({
        'Date': formatDate(day.registerDate),
        'Salesperson': day.salespersonName,
        'Type': tx.transactionType,
        'Amount': formatCurrency(tx.amount, config),
        'Reference': tx.reference || '',
        'Description': tx.description || '',
        'Transfer To': tx.transferTo || '',
      });
    });
  });
  
  if (allTransactions.length > 0) {
    const txSheet = XLSX.utils.json_to_sheet(allTransactions);
    XLSX.utils.book_append_sheet(workbook, txSheet, 'Transactions');
  }
  
  const allExpenseItems: any[] = [];
  data.days.forEach(day => {
    (day.transactions || []).filter(tx => tx.transactionType === 'expense').forEach(tx => {
      (tx.expenseItems || []).forEach(item => {
        allExpenseItems.push({
          'Date': formatDate(day.registerDate),
          'Salesperson': day.salespersonName,
          'Transaction Ref': tx.reference || '',
          'Item': item.itemLabel,
          'Amount': formatCurrency(item.amount, config),
        });
      });
    });
  });
  
  if (allExpenseItems.length > 0) {
    const expenseItemsSheet = XLSX.utils.json_to_sheet(allExpenseItems);
    XLSX.utils.book_append_sheet(workbook, expenseItemsSheet, 'Expense Items');
  }
  
  const filename = `Cash_Register_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  await downloadXLSX(workbook, filename);
}

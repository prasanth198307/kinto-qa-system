import * as XLSX from 'xlsx';
import { storage } from './storage';
import type { 
  InsertCashRegisterDay, 
  InsertCashRegisterTransaction, 
  InsertCashRegisterExpenseItem 
} from '@shared/schema';

// Type definitions for parsed data
export interface ParsedExpenseItem {
  label: string;
  amount: number; // in paise
  rawText: string;
}

export interface ParsedRow {
  rowNumber: number;
  date: string;
  salespersonName: string;
  openingBalance: number; // in paise
  depositAmount: number;
  receivedCash: number;
  expenses: number;
  itemDetails: string;
  parsedItems: ParsedExpenseItem[];
  balanceAmount: number;
  sentToTulasi: number;
  calculatedBalance: number;
  hasVariance: boolean;
  variance: number;
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  uniqueSalespersons: string[];
  unmappedSalespersons: string[];
  dateRange: { start: string; end: string } | null;
  rows: ParsedRow[];
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  daysCreated: number;
  transactionsCreated: number;
  expenseItemsCreated: number;
  errors: string[];
}

// Convert Excel serial date to ISO string
function excelDateToISO(excelDate: number | string | Date | null | undefined): string {
  try {
    // Handle null/undefined/empty
    if (excelDate === null || excelDate === undefined || excelDate === '') {
      return '';
    }
    
    // Handle Date objects (when xlsx parses with cellDates: true)
    if (excelDate instanceof Date) {
      if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() >= 1900 && excelDate.getFullYear() <= 2100) {
        return excelDate.toISOString().split('T')[0];
      }
      return '';
    }
    
    if (typeof excelDate === 'string') {
      const str = excelDate.trim();
      if (!str) return '';
      
      // Try DD/MM/YYYY or DD-MM-YYYY format (common in India)
      const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmyyyy) {
        const day = parseInt(ddmmyyyy[1], 10);
        const month = parseInt(ddmmyyyy[2], 10);
        const year = parseInt(ddmmyyyy[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      
      // Try YYYY-MM-DD format (ISO)
      const isoFormat = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoFormat) {
        const year = parseInt(isoFormat[1], 10);
        const month = parseInt(isoFormat[2], 10);
        const day = parseInt(isoFormat[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      
      // Try parsing as a general date string
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
        return parsed.toISOString().split('T')[0];
      }
      
      return '';
    }
    
    // Handle numeric Excel serial date
    if (typeof excelDate === 'number') {
      // Validate reasonable Excel date range (1 = Jan 1, 1900, ~45000 = year 2023)
      if (excelDate < 1 || excelDate > 100000 || !isFinite(excelDate)) {
        return '';
      }
      
      // Excel serial date conversion
      // Excel dates start from 1900-01-01 (day 1)
      // But there's a bug in Excel: it thinks 1900 was a leap year
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
      const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
      
      if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return '';
  } catch (error) {
    console.warn('[CASH_REGISTER] Date parsing error for:', excelDate, error);
    return '';
  }
}

// Parse currency string to paise (handles "6K", "5840", "260", "9,310/-", "NIL", etc.)
function parseCurrencyToPaise(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  
  if (typeof value === 'number') {
    return Math.round(value * 100);
  }
  
  let str = value.toString().trim().toUpperCase();
  
  // Handle "NIL" or "N/A" or "-" as zero
  if (str === 'NIL' || str === 'N/A' || str === '-' || str === 'NA' || str === '') {
    return 0;
  }
  
  // Remove common suffixes: "/-", "/=", "Rs", "Rs.", "₹"
  str = str.replace(/\/-$/, '').replace(/\/=$/, '').replace(/^RS\.?\s*/i, '').replace(/^₹\s*/, '').trim();
  
  // Handle "K" suffix (thousands) - e.g., "6K" = 6000
  const kMatch = str.match(/^(\d+(?:\.\d+)?)\s*K$/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000 * 100);
  }
  
  // Handle plain numbers with optional commas - e.g., "9,310" or "9310"
  const numMatch = str.match(/^[\d,]+(?:\.\d+)?$/);
  if (numMatch) {
    const cleanNum = str.replace(/,/g, '');
    const parsed = parseFloat(cleanNum);
    if (!isNaN(parsed)) {
      return Math.round(parsed * 100);
    }
  }
  
  // Handle numbers with currency symbols or other characters
  const currencyMatch = str.match(/[\d,]+(?:\.\d+)?/);
  if (currencyMatch) {
    const cleanNum = currencyMatch[0].replace(/,/g, '');
    const parsed = parseFloat(cleanNum);
    if (!isNaN(parsed)) {
      return Math.round(parsed * 100);
    }
  }
  
  return 0;
}

// Parse item details string into individual items
// Examples: "DIESEL-6K, PETROL-260", "RO FILTERS-5840,PETROL-260,STAFF DINNER-2100"
function parseItemDetails(itemDetails: string | undefined | null): ParsedExpenseItem[] {
  if (!itemDetails || typeof itemDetails !== 'string') return [];
  
  const items: ParsedExpenseItem[] = [];
  
  // Split by comma
  const parts = itemDetails.split(',').map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    // Try to extract amount from the end
    // Patterns: "DIESEL-6K", "PETROL-260", "RO FILTERS-5840", "FEVIQUIC,CELLO TAPE-110"
    
    // Match pattern: LABEL-AMOUNT or LABEL:AMOUNT
    const amountMatch = part.match(/^(.+?)[-:]\s*(\d+(?:\.\d+)?K?|\d{1,3}(?:,\d{3})*(?:\.\d+)?)$/i);
    
    if (amountMatch) {
      const label = amountMatch[1].trim();
      const amountStr = amountMatch[2];
      const amount = parseCurrencyToPaise(amountStr);
      
      items.push({
        label,
        amount,
        rawText: part
      });
    } else {
      // No amount found, add as label only
      items.push({
        label: part,
        amount: 0,
        rawText: part
      });
    }
  }
  
  return items;
}

// Parse Excel file buffer and return preview
export async function parseExcelFile(buffer: Buffer, fileName: string): Promise<ImportPreview> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  
  const result: ImportPreview = {
    fileName,
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    uniqueSalespersons: [],
    unmappedSalespersons: [],
    dateRange: null,
    rows: [],
    errors: []
  };
  
  const salespersonSet = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;
  let globalRowNumber = 0;
  
  console.log('[CASH_REGISTER] Processing', workbook.SheetNames.length, 'sheets:', workbook.SheetNames.join(', '));
  
  // Process ALL sheets in the workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];
    
    if (rawData.length < 2) {
      console.log('[CASH_REGISTER] Sheet', sheetName, 'is empty, skipping');
      continue;
    }
    
    // Find header row
    const headerRow = rawData[0];
    const columnMap = {
      date: -1,
      so: -1,
      openingBalance: -1,
      depositAmount: -1,
      receivedCash: -1,
      expenses: -1,
      itemDetails: -1,
      balanceAmount: -1,
      sentToTulasi: -1
    };
    
    // Map columns by header text
    headerRow.forEach((header: any, index: number) => {
      const h = String(header).toLowerCase().trim();
      if (h === 'date') columnMap.date = index;
      if (h === 'so' || h === 'salesperson') columnMap.so = index;
      if (h.includes('opening') && h.includes('balance')) columnMap.openingBalance = index;
      if (h.includes('deposit')) columnMap.depositAmount = index;
      if (h.includes('received') || h.includes('cash received')) columnMap.receivedCash = index;
      if (h === 'expenses' || h === 'expense') columnMap.expenses = index;
      if (h.includes('item') && h.includes('detail')) columnMap.itemDetails = index;
      if (h.includes('balance') && h.includes('amount')) columnMap.balanceAmount = index;
      if (h.includes('sent') && h.includes('tulasi')) columnMap.sentToTulasi = index;
    });
    
    // Skip sheet if missing required columns
    if (columnMap.date === -1 || columnMap.so === -1) {
      console.log('[CASH_REGISTER] Sheet', sheetName, 'missing required columns, skipping');
      continue;
    }
    
    console.log('[CASH_REGISTER] Processing sheet:', sheetName, 'with', rawData.length - 1, 'data rows');
    
    // Parse data rows from this sheet
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      globalRowNumber++;
      
      const parsedRow: ParsedRow = {
        rowNumber: globalRowNumber,
        date: '',
        salespersonName: '',
        openingBalance: 0,
        depositAmount: 0,
        receivedCash: 0,
        expenses: 0,
        itemDetails: '',
        parsedItems: [],
        balanceAmount: 0,
        sentToTulasi: 0,
        calculatedBalance: 0,
        hasVariance: false,
        variance: 0,
        errors: [],
        warnings: []
      };
      
      result.totalRows++;
      
      // Parse date
      if (columnMap.date >= 0) {
        const dateVal = row[columnMap.date];
        if (dateVal) {
          parsedRow.date = excelDateToISO(dateVal);
          if (!parsedRow.date) {
            parsedRow.errors.push('Invalid date format');
            console.log('[CASH_REGISTER] Row', i, 'invalid date:', dateVal);
          } else {
            if (!minDate || parsedRow.date < minDate) minDate = parsedRow.date;
            if (!maxDate || parsedRow.date > maxDate) maxDate = parsedRow.date;
          }
        } else {
          parsedRow.errors.push('Missing date');
          console.log('[CASH_REGISTER] Row', i, 'missing date');
        }
      }
      
      // Parse salesperson
      if (columnMap.so >= 0) {
        parsedRow.salespersonName = String(row[columnMap.so] || '').trim().toUpperCase();
      }
      
      // Skip rows where salesperson is a non-data marker (HOLIDAY, SUNDAY, ALL, NIL, empty)
      // These are summary/placeholder rows, not actual salesperson data
      const skipSalespersons = ['HOLIDAY', 'SUNDAY', 'ALL', 'NIL', 'NA', ''];
      if (skipSalespersons.includes(parsedRow.salespersonName)) {
        console.log('[CASH_REGISTER] Skipping non-salesperson row:', parsedRow.salespersonName || '(empty)', 'on', parsedRow.date);
        continue;
      }
      
      salespersonSet.add(parsedRow.salespersonName);
      
      // Parse numeric fields
      if (columnMap.openingBalance >= 0) {
        parsedRow.openingBalance = parseCurrencyToPaise(row[columnMap.openingBalance]);
      }
      if (columnMap.depositAmount >= 0) {
        parsedRow.depositAmount = parseCurrencyToPaise(row[columnMap.depositAmount]);
      }
      if (columnMap.receivedCash >= 0) {
        parsedRow.receivedCash = parseCurrencyToPaise(row[columnMap.receivedCash]);
      }
      if (columnMap.expenses >= 0) {
        parsedRow.expenses = parseCurrencyToPaise(row[columnMap.expenses]);
      }
      if (columnMap.balanceAmount >= 0) {
        parsedRow.balanceAmount = parseCurrencyToPaise(row[columnMap.balanceAmount]);
      }
      if (columnMap.sentToTulasi >= 0) {
        parsedRow.sentToTulasi = parseCurrencyToPaise(row[columnMap.sentToTulasi]);
      }
      
      // Parse item details
      if (columnMap.itemDetails >= 0) {
        parsedRow.itemDetails = String(row[columnMap.itemDetails] || '');
        parsedRow.parsedItems = parseItemDetails(parsedRow.itemDetails);
        
        // Check if parsed items sum matches expenses
        const itemsTotal = parsedRow.parsedItems.reduce((sum, item) => sum + item.amount, 0);
        if (itemsTotal > 0 && parsedRow.expenses > 0) {
          if (Math.abs(itemsTotal - parsedRow.expenses) > 100) { // Allow 1 rupee tolerance
            parsedRow.warnings.push(`Item details total (${itemsTotal/100}) doesn't match expenses (${parsedRow.expenses/100})`);
          }
        }
      }
      
      // Calculate expected balance
      // Opening + Cash Received - Expenses - Transfers = Closing
      parsedRow.calculatedBalance = parsedRow.openingBalance + parsedRow.receivedCash - parsedRow.expenses - parsedRow.sentToTulasi;
      
      // Check variance
      if (parsedRow.balanceAmount > 0) {
        parsedRow.variance = parsedRow.balanceAmount - parsedRow.calculatedBalance;
        parsedRow.hasVariance = Math.abs(parsedRow.variance) > 100; // 1 rupee tolerance
        
        if (parsedRow.hasVariance) {
          parsedRow.warnings.push(`Balance mismatch: expected ${parsedRow.calculatedBalance/100}, found ${parsedRow.balanceAmount/100}`);
        }
      }
      
      // Track valid/error rows
      if (parsedRow.errors.length > 0) {
        result.errorRows++;
      } else {
        result.validRows++;
      }
      
      result.rows.push(parsedRow);
    }
  } // End of sheet loop
  
  console.log('[CASH_REGISTER] Parse summary: Total:', result.totalRows, 'Valid:', result.validRows, 'Error:', result.errorRows);
  
  // Set date range
  if (minDate && maxDate) {
    result.dateRange = { start: minDate, end: maxDate };
  }
  
  // Get unique salespersons
  result.uniqueSalespersons = Array.from(salespersonSet).sort();
  
  // Check which salespersons are not mapped
  const mappings = await storage.getAllSalespersonMappings();
  const mappedNames = new Set(mappings.map(m => m.excelName.toUpperCase()));
  result.unmappedSalespersons = result.uniqueSalespersons.filter(name => !mappedNames.has(name));
  
  return result;
}

// Commit import - create database records
export async function commitImport(
  rows: ParsedRow[], 
  fileName: string, 
  createdBy: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    daysCreated: 0,
    transactionsCreated: 0,
    expenseItemsCreated: 0,
    errors: []
  };
  
  // Group rows by date and salesperson
  const dayGroups = new Map<string, ParsedRow[]>();
  
  for (const row of rows) {
    if (row.errors.length > 0) continue;
    if (!row.date || !row.salespersonName) continue;
    
    const key = `${row.date}|${row.salespersonName}`;
    if (!dayGroups.has(key)) {
      dayGroups.set(key, []);
    }
    dayGroups.get(key)!.push(row);
  }
  
  try {
    const entries = Array.from(dayGroups.entries());
    for (const [key, groupRows] of entries) {
      const [date, salespersonName] = key.split('|');
      
      // Check if day already exists
      const existingDay = await storage.getCashRegisterDayByDateAndPerson(date, salespersonName);
      if (existingDay) {
        result.errors.push(`Day already exists for ${salespersonName} on ${date}`);
        continue;
      }
      
      // Aggregate values from all rows for this day
      // Usually there's one row per day per person, but this handles multiple
      let totalDeposits = 0;
      let totalCashReceived = 0;
      let totalExpenses = 0;
      let totalTransfers = 0;
      let openingBalance = 0;
      let closingBalance = 0;
      
      for (const row of groupRows) {
        totalDeposits += row.depositAmount;
        totalCashReceived += row.receivedCash;
        totalExpenses += row.expenses;
        totalTransfers += row.sentToTulasi;
        
        // Use first row's opening balance and last row's closing balance
        if (openingBalance === 0) openingBalance = row.openingBalance;
        closingBalance = row.balanceAmount || row.calculatedBalance;
      }
      
      // Create day record
      const dayData: InsertCashRegisterDay = {
        registerDate: date,
        salespersonName,
        openingBalance,
        closingBalance,
        totalDeposits,
        totalCashReceived,
        totalExpenses,
        totalTransfers,
        status: 'open',
        importedFromFile: fileName,
        importedAt: new Date().toISOString(),
        createdBy,
      };
      
      const createdDay = await storage.createCashRegisterDay(dayData);
      result.daysCreated++;
      
      // Create transactions for each type
      for (const row of groupRows) {
        // Deposit transaction
        if (row.depositAmount > 0) {
          await storage.createCashRegisterTransaction({
            dayId: createdDay.id,
            transactionType: 'deposit',
            amount: row.depositAmount,
            description: 'Deposit from Excel import',
          });
          result.transactionsCreated++;
        }
        
        // Cash received transaction
        if (row.receivedCash > 0) {
          await storage.createCashRegisterTransaction({
            dayId: createdDay.id,
            transactionType: 'cash_received',
            amount: row.receivedCash,
            description: 'Cash received from Excel import',
          });
          result.transactionsCreated++;
        }
        
        // Expense transaction with items
        if (row.expenses > 0) {
          const expenseTransaction = await storage.createCashRegisterTransaction({
            dayId: createdDay.id,
            transactionType: 'expense',
            amount: row.expenses,
            description: row.itemDetails || 'Expense from Excel import',
          });
          result.transactionsCreated++;
          
          // Create expense items
          for (const item of row.parsedItems) {
            await storage.createCashRegisterExpenseItem({
              transactionId: expenseTransaction.id,
              itemLabel: item.label,
              amount: item.amount,
              rawText: item.rawText,
            });
            result.expenseItemsCreated++;
          }
        }
        
        // Transfer transaction
        if (row.sentToTulasi > 0) {
          await storage.createCashRegisterTransaction({
            dayId: createdDay.id,
            transactionType: 'transfer',
            amount: row.sentToTulasi,
            transferTo: 'TULASI',
            description: 'Transfer to Tulasi from Excel import',
          });
          result.transactionsCreated++;
        }
      }
    }
    
    result.success = true;
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
}

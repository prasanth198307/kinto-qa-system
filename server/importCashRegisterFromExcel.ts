import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from './db';
import { cashRegisterDays, cashRegisterTransactions, cashRegisterExpenseItems, expenseVouchers, expenseItems, expenseCategories, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

function excelDateToYYYYMMDD(serial: number | Date | string): string | null {
  if (!serial) return null;
  
  if (serial instanceof Date) {
    return serial.toISOString().split('T')[0];
  }
  
  if (typeof serial === 'string') {
    const match = serial.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return serial;
  }
  
  if (typeof serial !== 'number') return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function parseCurrency(val: any): number {
  if (!val || val === 'NIL' || val === '') return 0;
  const str = String(val).replace(/[₹,\/-]/g, '').replace(/\s+/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num); // Store in rupees
}

function parseItemDetails(details: string): { label: string; amount: number; rawText: string }[] {
  if (!details || details === 'NIL' || details === '') return [];
  const items: { label: string; amount: number; rawText: string }[] = [];
  
  const normalizedDetails = details.replace(/\r\n/g, ',').replace(/\n/g, ',');
  const parts = normalizedDetails.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const match = trimmed.match(/(.+?)[- ](\d+)(?:\/-)?$/);
    if (match) {
      items.push({
        label: match[1].trim().toUpperCase(),
        amount: parseInt(match[2]), // Store in rupees
        rawText: trimmed
      });
    } else {
      items.push({ label: trimmed.toUpperCase(), amount: 0, rawText: trimmed });
    }
  }
  return items;
}

export async function importCashRegisterFromExcel(filePath: string, userId: string): Promise<{
  success: boolean;
  daysCreated: number;
  transactionsCreated: number;
  expenseItemsCreated: number;
  vouchersCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let daysCreated = 0;
  let transactionsCreated = 0;
  let expenseItemsCreated = 0;
  let vouchersCreated = 0;

  try {
    // Read file as buffer and use XLSX.read instead of readFile
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    console.log('Importing sheets:', workbook.SheetNames);

    let defaultCategoryId: string | null = null;
    const existingCategories = await db.select().from(expenseCategories).limit(1);
    if (existingCategories.length > 0) {
      defaultCategoryId = existingCategories[0].id;
    } else {
      const [newCategory] = await db.insert(expenseCategories).values({
        name: 'Daily Operations',
        description: 'Daily operational expenses from cash register',
        gstApplicable: 0,
      }).returning();
      defaultCategoryId = newCategory.id;
    }

    for (const sheetName of workbook.SheetNames) {
      console.log(`Processing sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const dateStr = excelDateToYYYYMMDD(row[0]);
        const salesperson = String(row[1] || '').trim().toUpperCase();

        if (['HOLIDAY', 'SUNDAY', 'ALL', 'NIL', ''].includes(salesperson)) continue;
        if (!dateStr) continue;

        const openingBalance = parseCurrency(row[2]);
        const depositAmount = parseCurrency(row[3]);
        const receivedCash = parseCurrency(row[4]);
        const expenses = parseCurrency(row[5]);
        const itemDetails = String(row[6] || '');
        const parsedItems = parseItemDetails(itemDetails);
        const balanceAmount = parseCurrency(row[7]);
        const sentToTulasi = parseCurrency(row[8]);

        try {
          const existing = await db.select().from(cashRegisterDays)
            .where(and(
              eq(cashRegisterDays.registerDate, dateStr),
              eq(cashRegisterDays.salespersonName, salesperson)
            ))
            .limit(1);

          if (existing.length > 0) {
            console.log(`Skipping duplicate: ${dateStr} - ${salesperson}`);
            continue;
          }

          // Deposits are cash going OUT to bank, so subtract them
          const calculatedClosing = openingBalance + receivedCash - expenses - sentToTulasi - depositAmount;

          const [day] = await db.insert(cashRegisterDays).values({
            registerDate: dateStr,
            salespersonName: salesperson,
            openingBalance,
            totalDeposits: depositAmount,
            totalCashReceived: receivedCash,
            totalExpenses: expenses,
            totalTransfers: sentToTulasi,
            closingBalance: calculatedClosing,
            varianceAmount: calculatedClosing - balanceAmount,
            status: 'open',
            notes: `Imported from ${sheetName}. Expected closing: ₹${balanceAmount}`,
            importedFromFile: sheetName,
            importedAt: new Date().toISOString(),
          }).returning();

          daysCreated++;

          if (depositAmount > 0) {
            await db.insert(cashRegisterTransactions).values({
              dayId: day.id,
              transactionType: 'deposit',
              amount: depositAmount,
              description: 'Deposit',
              reference: `Import-${sheetName}`,
            });
            transactionsCreated++;
          }

          if (receivedCash > 0) {
            await db.insert(cashRegisterTransactions).values({
              dayId: day.id,
              transactionType: 'cash_received',
              amount: receivedCash,
              description: 'Cash Received from Sales',
              reference: `Import-${sheetName}`,
            });
            transactionsCreated++;
          }

          if (expenses > 0 && parsedItems.length > 0) {
            // Create SEPARATE voucher for EACH line item
            let itemCounter = 0;
            for (const item of parsedItems) {
              itemCounter++;
              const itemAmount = item.amount || Math.round(expenses / parsedItems.length);
              
              // Create unique voucher number for each item (format: CR-YYMMDD-SP-NN)
              const shortDate = dateStr.replace(/-/g, '').slice(2); // YYMMDD
              const voucherNumber = `CR-${shortDate}-${salesperson.substring(0, 2)}-${String(itemCounter).padStart(2, '0')}`;
              
              // Check for existing voucher with this number
              const existingVoucher = await db.select().from(expenseVouchers)
                .where(eq(expenseVouchers.voucherNumber, voucherNumber))
                .limit(1);
              
              if (existingVoucher.length > 0) {
                console.log(`Skipping duplicate voucher: ${voucherNumber}`);
                continue;
              }
              
              // Create expense voucher for this single item (convert rupees to paise for voucher)
              const itemAmountInPaise = itemAmount * 100;
              const [voucher] = await db.insert(expenseVouchers).values({
                voucherNumber,
                voucherDate: dateStr,
                payeeType: 'employee',
                payeeName: salesperson,
                paymentMode: 'cash',
                subtotal: itemAmountInPaise,
                gstAmount: 0,
                totalAmount: itemAmountInPaise,
                status: 'approved',
                purpose: item.label,
                remarks: `Auto-imported from Excel (${sheetName})`,
                preparedBy: userId,
              }).returning();
              vouchersCreated++;
              
              // Create single expense item for this voucher (in paise)
              await db.insert(expenseItems).values({
                voucherId: voucher.id,
                categoryId: defaultCategoryId,
                description: item.label,
                quantity: 1,
                unitPrice: itemAmountInPaise,
                amount: itemAmountInPaise,
                gstRate: '0',
                gstAmount: 0,
              });
              
              // Create expense transaction linked to this voucher
              const [expenseTx] = await db.insert(cashRegisterTransactions).values({
                dayId: day.id,
                transactionType: 'expense',
                amount: itemAmount,
                description: item.label,
                reference: `Import-${sheetName}`,
                convertedToVoucherId: voucher.id,
              }).returning();
              transactionsCreated++;
              
              // Create expense item record for cash register
              await db.insert(cashRegisterExpenseItems).values({
                transactionId: expenseTx.id,
                itemLabel: item.label,
                amount: itemAmount,
                rawText: item.rawText,
              });
              expenseItemsCreated++;
            }
          } else if (expenses > 0) {
            // Fallback: no parsed items, create single voucher for total expense
            const shortDate = dateStr.replace(/-/g, '').slice(2); // YYMMDD
            const voucherNumber = `CR-${shortDate}-${salesperson.substring(0, 2)}-01`;
            
            const existingVoucher = await db.select().from(expenseVouchers)
              .where(eq(expenseVouchers.voucherNumber, voucherNumber))
              .limit(1);
            
            if (existingVoucher.length === 0) {
              // Convert rupees to paise for expense voucher
              const expensesInPaise = expenses * 100;
              const [voucher] = await db.insert(expenseVouchers).values({
                voucherNumber,
                voucherDate: dateStr,
                payeeType: 'employee',
                payeeName: salesperson,
                paymentMode: 'cash',
                subtotal: expensesInPaise,
                gstAmount: 0,
                totalAmount: expensesInPaise,
                status: 'approved',
                purpose: itemDetails || 'Daily Expenses',
                remarks: `Auto-imported from Excel (${sheetName})`,
                preparedBy: userId,
              }).returning();
              vouchersCreated++;
              
              await db.insert(expenseItems).values({
                voucherId: voucher.id,
                categoryId: defaultCategoryId,
                description: itemDetails || 'Daily Expenses',
                quantity: 1,
                unitPrice: expensesInPaise,
                amount: expensesInPaise,
                gstRate: '0',
                gstAmount: 0,
              });
              
              const [expenseTx] = await db.insert(cashRegisterTransactions).values({
                dayId: day.id,
                transactionType: 'expense',
                amount: expenses,
                description: itemDetails || 'Daily Expenses',
                reference: `Import-${sheetName}`,
                convertedToVoucherId: voucher.id,
              }).returning();
              transactionsCreated++;
            }
          }

          if (sentToTulasi > 0) {
            await db.insert(cashRegisterTransactions).values({
              dayId: day.id,
              transactionType: 'transfer',
              amount: sentToTulasi,
              description: 'Sent to Tulasi',
              reference: `Import-${sheetName}`,
            });
            transactionsCreated++;
          }

        } catch (rowError: any) {
          errors.push(`Row ${i} (${dateStr}, ${salesperson}): ${rowError.message}`);
          console.error(`Error processing row ${i}:`, rowError.message);
        }
      }
    }

    return {
      success: true,
      daysCreated,
      transactionsCreated,
      expenseItemsCreated,
      vouchersCreated,
      errors
    };
  } catch (error: any) {
    console.error('Import failed:', error);
    return {
      success: false,
      daysCreated,
      transactionsCreated,
      expenseItemsCreated,
      vouchersCreated,
      errors: [error.message]
    };
  }
}

import { db } from "./db";
import { storage } from "./storage";
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  type InsertJournalEntry,
  type InsertJournalLine,
  type JournalEntry,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Account codes for the seeded Chart of Accounts
export const ACCOUNT_CODES = {
  // Assets
  CASH_IN_HAND: '1001',
  BANK_CURRENT: '1002',
  BANK_SAVINGS: '1003',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY_RAW_MATERIALS: '1200',
  INVENTORY_FINISHED_GOODS: '1201',
  INVENTORY_PACKING: '1202',

  // Liabilities
  ACCOUNTS_PAYABLE: '2001',
  CUSTOMER_ADVANCES: '2100',
  GST_CGST_PAYABLE: '2200',
  GST_SGST_PAYABLE: '2201',
  GST_IGST_PAYABLE: '2202',
  GST_CGST_INPUT: '2210',
  GST_SGST_INPUT: '2211',
  GST_IGST_INPUT: '2212',
  TDS_PAYABLE: '2300',
  TDS_RECEIVABLE: '2301',
  LOANS_PAYABLE: '2400',

  // Equity
  OWNERS_CAPITAL: '3001',
  OWNERS_DRAWINGS: '3002',
  RETAINED_EARNINGS: '3003',

  // Revenue
  SALES_REVENUE: '4001',
  DEBIT_NOTE_INCOME: '4002',
  INTEREST_EARNED: '4003',
  OTHER_INCOME: '4004',

  // Expenses
  COST_OF_GOODS_SOLD: '5001',
  PURCHASES_RAW_MATERIALS: '5002',
  PURCHASES_PACKING: '5003',
  PURCHASES_CONSUMABLES: '5004',
  FREIGHT_INWARD: '5005',
  PURCHASE_RETURNS: '5006',
  SALARY_WAGES: '5100',
  RENT: '5101',
  ELECTRICITY_UTILITIES: '5102',
  REPAIRS_MAINTENANCE: '5103',
  LEGAL_PROFESSIONAL: '5104',
  INSURANCE: '5105',
  BANK_CHARGES: '5106',
  INTEREST_PAID: '5107',
  MANUFACTURING_EXPENSES: '5200',
  OPERATING_EXPENSES: '5300',
  MISCELLANEOUS_EXPENSES: '5400',
  BAD_DEBTS: '5500',
  SALES_RETURNS: '5600',
  VENDOR_CLAIMS: '5700',
  LOANS_RECEIVABLE: '1300',
};

const DEFAULT_ACCOUNTS = [
  // ASSETS
  { code: '1001', name: 'Cash in Hand', accountType: 'asset', subType: 'current_asset', isSystemAccount: 1 },
  { code: '1002', name: 'Bank - Current Account', accountType: 'asset', subType: 'current_asset', isSystemAccount: 1 },
  { code: '1003', name: 'Bank - Savings Account', accountType: 'asset', subType: 'current_asset', isSystemAccount: 1 },
  { code: '1100', name: 'Accounts Receivable (Trade Debtors)', accountType: 'asset', subType: 'trade_receivable', isSystemAccount: 1 },
  { code: '1200', name: 'Inventory - Raw Materials', accountType: 'asset', subType: 'inventory', isSystemAccount: 1 },
  { code: '1201', name: 'Inventory - Finished Goods', accountType: 'asset', subType: 'inventory', isSystemAccount: 1 },
  { code: '1202', name: 'Inventory - Packing Materials', accountType: 'asset', subType: 'inventory', isSystemAccount: 1 },
  { code: '1300', name: 'Loans Receivable', accountType: 'asset', subType: 'current_asset', isSystemAccount: 1 },

  // LIABILITIES
  { code: '2001', name: 'Accounts Payable (Trade Creditors)', accountType: 'liability', subType: 'trade_payable', isSystemAccount: 1 },
  { code: '2100', name: 'Customer Advances (Advance Liability)', accountType: 'liability', subType: 'advance_liability', isSystemAccount: 1 },
  { code: '2200', name: 'GST Payable - CGST', accountType: 'liability', subType: 'gst', isSystemAccount: 1 },
  { code: '2201', name: 'GST Payable - SGST', accountType: 'liability', subType: 'gst', isSystemAccount: 1 },
  { code: '2202', name: 'GST Payable - IGST', accountType: 'liability', subType: 'gst', isSystemAccount: 1 },
  { code: '2210', name: 'GST Input Credit - CGST', accountType: 'liability', subType: 'gst_input', isSystemAccount: 1 },
  { code: '2211', name: 'GST Input Credit - SGST', accountType: 'liability', subType: 'gst_input', isSystemAccount: 1 },
  { code: '2212', name: 'GST Input Credit - IGST', accountType: 'liability', subType: 'gst_input', isSystemAccount: 1 },
  { code: '2300', name: 'TDS Payable', accountType: 'liability', subType: 'statutory', isSystemAccount: 1 },
  { code: '2301', name: 'TDS Receivable', accountType: 'liability', subType: 'statutory', isSystemAccount: 1 },
  { code: '2400', name: 'Loans Payable', accountType: 'liability', subType: 'loan', isSystemAccount: 1 },

  // EQUITY
  { code: '3001', name: "Owner's Capital", accountType: 'equity', subType: 'capital', isSystemAccount: 1 },
  { code: '3002', name: "Owner's Drawings", accountType: 'equity', subType: 'drawings', isSystemAccount: 1 },
  { code: '3003', name: 'Retained Earnings', accountType: 'equity', subType: 'retained', isSystemAccount: 1 },

  // REVENUE
  { code: '4001', name: 'Sales Revenue', accountType: 'revenue', subType: 'operating', isSystemAccount: 1 },
  { code: '4002', name: 'Debit Note Income', accountType: 'revenue', subType: 'operating', isSystemAccount: 1 },
  { code: '4003', name: 'Interest Earned', accountType: 'revenue', subType: 'other_income', isSystemAccount: 1 },
  { code: '4004', name: 'Other Income', accountType: 'revenue', subType: 'other_income', isSystemAccount: 1 },

  // EXPENSES
  { code: '5001', name: 'Cost of Goods Sold', accountType: 'expense', subType: 'direct', isSystemAccount: 1 },
  { code: '5002', name: 'Purchases - Raw Materials', accountType: 'expense', subType: 'direct', isSystemAccount: 1 },
  { code: '5003', name: 'Purchases - Packing Materials', accountType: 'expense', subType: 'direct', isSystemAccount: 1 },
  { code: '5004', name: 'Purchases - Consumables', accountType: 'expense', subType: 'direct', isSystemAccount: 1 },
  { code: '5005', name: 'Freight Inward / Transport', accountType: 'expense', subType: 'direct', isSystemAccount: 1 },
  { code: '5006', name: 'Purchase Returns', accountType: 'expense', subType: 'direct', isSystemAccount: 1 },
  { code: '5100', name: 'Salary & Wages', accountType: 'expense', subType: 'operating', isSystemAccount: 1 },
  { code: '5101', name: 'Rent', accountType: 'expense', subType: 'operating', isSystemAccount: 1 },
  { code: '5102', name: 'Electricity & Utilities', accountType: 'expense', subType: 'operating', isSystemAccount: 1 },
  { code: '5103', name: 'Repairs & Maintenance', accountType: 'expense', subType: 'operating', isSystemAccount: 1 },
  { code: '5104', name: 'Legal & Professional Fees', accountType: 'expense', subType: 'operating', isSystemAccount: 1 },
  { code: '5105', name: 'Insurance', accountType: 'expense', subType: 'operating', isSystemAccount: 1 },
  { code: '5106', name: 'Bank Charges / Fees', accountType: 'expense', subType: 'financial', isSystemAccount: 1 },
  { code: '5107', name: 'Interest Paid', accountType: 'expense', subType: 'financial', isSystemAccount: 1 },
  { code: '5200', name: 'Manufacturing Expenses', accountType: 'expense', subType: 'manufacturing', isSystemAccount: 1 },
  { code: '5300', name: 'Operating Expenses', accountType: 'expense', subType: 'operating', isSystemAccount: 1 },
  { code: '5400', name: 'Miscellaneous Expenses', accountType: 'expense', subType: 'other', isSystemAccount: 1 },
  { code: '5500', name: 'Bad Debts / Write-offs', accountType: 'expense', subType: 'other', isSystemAccount: 1 },
  { code: '5600', name: 'Sales Returns', accountType: 'expense', subType: 'adjustment', isSystemAccount: 1 },
  { code: '5700', name: 'Vendor Claims', accountType: 'expense', subType: 'adjustment', isSystemAccount: 1 },
];

export async function seedChartOfAccounts(): Promise<void> {
  for (const account of DEFAULT_ACCOUNTS) {
    const existing = await storage.getChartOfAccountByCode(account.code);
    if (!existing) {
      await storage.createChartOfAccount(account as any);
      console.log(`[COA SEED] Created account: ${account.code} - ${account.name}`);
    }
  }
  console.log('[COA SEED] Chart of Accounts seeding complete');
}

// Cache for account IDs by code
const accountIdCache: Record<string, string> = {};

async function getAccountId(code: string): Promise<string> {
  if (accountIdCache[code]) return accountIdCache[code];
  const account = await storage.getChartOfAccountByCode(code);
  if (!account) throw new Error(`Account not found for code: ${code}`);
  accountIdCache[code] = account.id;
  return account.id;
}

async function generateJournalNumber(isAuto: boolean): Promise<string> {
  const prefix = isAuto ? 'AUTO' : 'JRN';
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const result = await db.execute(sql`
    SELECT COUNT(*)::INTEGER as count FROM journal_entries 
    WHERE journal_number LIKE ${prefix + '-' + dateStr + '-%'}
    AND record_status = 1
  `);
  const seq = (Number(result.rows?.[0]?.count || 0)) + 1;
  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
}

interface JournalLineInput {
  accountCode: string;
  debit: number;
  credit: number;
  memo?: string;
  partyType?: string;
  partyId?: string;
  partyName?: string;
}

export async function createJournalWithLines(
  journalDate: string,
  description: string,
  lines: JournalLineInput[],
  options: {
    sourceType?: string;
    sourceId?: string;
    isAutoGenerated?: boolean;
    createdBy?: string;
    notes?: string;
    status?: string;
  } = {}
): Promise<JournalEntry | null> {
  const isAuto = options.isAutoGenerated ?? false;
  
  // Idempotency check for auto-generated entries
  if (isAuto && options.sourceType && options.sourceId) {
    const existing = await storage.getJournalEntryBySource(options.sourceType, options.sourceId);
    if (existing) {
      console.log(`[JOURNAL] Skipping duplicate: ${options.sourceType}/${options.sourceId} already has journal ${existing.journalNumber}`);
      return existing;
    }
  }

  // Validate debits = credits
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (totalDebit !== totalCredit) {
    console.error(`[JOURNAL] Debits (${totalDebit}) != Credits (${totalCredit}) for ${description}`);
    return null;
  }

  try {
    const journalNumber = await generateJournalNumber(isAuto);
    
    const entry = await storage.createJournalEntry({
      journalNumber,
      journalDate,
      sourceType: options.sourceType || (isAuto ? undefined : 'manual'),
      sourceId: options.sourceId,
      description,
      status: options.status || 'posted',
      isAutoGenerated: isAuto ? 1 : 0,
      createdBy: options.createdBy,
      notes: options.notes,
    } as any);

    // Update totals
    await db.update(journalEntries)
      .set({ totalDebit, totalCredit })
      .where(eq(journalEntries.id, entry.id));

    // Create lines
    for (const line of lines) {
      const accountId = await getAccountId(line.accountCode);
      await storage.createJournalLine({
        journalId: entry.id,
        accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
        partyType: line.partyType,
        partyId: line.partyId,
        partyName: line.partyName,
      } as any);
    }

    console.log(`[JOURNAL] Created ${journalNumber}: ${description} (${totalDebit} paise)`);
    return { ...entry, totalDebit, totalCredit };
  } catch (error: any) {
    console.error(`[JOURNAL] Error creating journal: ${error.message}`);
    return null;
  }
}

// ============================================================
// AUTO-GENERATION FUNCTIONS
// ============================================================

export async function journalForInvoice(invoice: any): Promise<void> {
  const subtotal = Number(invoice.subtotal) || 0;
  const cgst = Number(invoice.cgstAmount) || 0;
  const sgst = Number(invoice.sgstAmount) || 0;
  const igst = Number(invoice.igstAmount) || 0;
  const grandTotal = Number(invoice.grandTotal) || 0;

  if (grandTotal === 0 && subtotal === 0) return;

  const salesRevenue = grandTotal - cgst - sgst - igst;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: grandTotal, credit: 0, memo: `Invoice ${invoice.invoiceNumber}`, partyType: 'vendor', partyName: invoice.buyerName },
    { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: 0, credit: salesRevenue, memo: `Sales - Invoice ${invoice.invoiceNumber}` },
  ];

  if (cgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_PAYABLE, debit: 0, credit: cgst, memo: 'CGST on sale' });
  if (sgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_PAYABLE, debit: 0, credit: sgst, memo: 'SGST on sale' });
  if (igst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_IGST_PAYABLE, debit: 0, credit: igst, memo: 'IGST on sale' });

  await createJournalWithLines(
    invoice.invoiceDate || new Date().toISOString().slice(0, 10),
    `Sales Invoice: ${invoice.invoiceNumber} - ${invoice.buyerName}`,
    lines,
    { sourceType: 'invoice', sourceId: invoice.id, isAutoGenerated: true }
  );
}

export async function journalForPayment(payment: any, invoice: any): Promise<void> {
  const amount = payment.amount || 0;
  const method = (payment.paymentMethod || '').toLowerCase();
  const accountCode = (method === 'cash') ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_CURRENT;

  await createJournalWithLines(
    payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Payment received: ${invoice?.invoiceNumber || 'Unknown'} - ${payment.paymentMethod}${payment.referenceNumber ? ` (${payment.referenceNumber})` : ''}`,
    [
      { accountCode, debit: amount, credit: 0, memo: `${payment.paymentMethod} payment${payment.referenceNumber ? ' Ref: ' + payment.referenceNumber : ''}`, partyType: 'vendor', partyName: payment.payerName || invoice?.buyerName },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, memo: `Payment against Invoice ${invoice?.invoiceNumber || ''}`, partyType: 'vendor', partyName: invoice?.buyerName },
    ],
    { sourceType: 'payment', sourceId: payment.id, isAutoGenerated: true }
  );
}

export async function journalForCustomerAdvance(advance: any, vendorName: string): Promise<void> {
  const amount = advance.amount || 0;
  const method = (advance.paymentMethod || '').toLowerCase();
  const accountCode = (method === 'cash') ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_CURRENT;

  await createJournalWithLines(
    advance.receiptDate || new Date().toISOString().slice(0, 10),
    `Customer Advance received: ${advance.advanceNumber} - ${vendorName}`,
    [
      { accountCode, debit: amount, credit: 0, memo: `Advance ${advance.advanceNumber} - ${advance.paymentMethod}`, partyType: 'vendor', partyName: vendorName },
      { accountCode: ACCOUNT_CODES.CUSTOMER_ADVANCES, debit: 0, credit: amount, memo: `Advance liability for ${vendorName}`, partyType: 'vendor', partyName: vendorName },
    ],
    { sourceType: 'customer_advance', sourceId: advance.id, isAutoGenerated: true }
  );
}

export async function journalForAdvanceApplication(application: any, advance: any, invoice: any, vendorName: string): Promise<void> {
  const amount = application.appliedAmount || 0;

  await createJournalWithLines(
    application.applicationDate || new Date().toISOString().slice(0, 10),
    `Advance applied: ${advance?.advanceNumber || ''} to Invoice ${invoice?.invoiceNumber || ''}`,
    [
      { accountCode: ACCOUNT_CODES.CUSTOMER_ADVANCES, debit: amount, credit: 0, memo: `Advance ${advance?.advanceNumber} applied`, partyType: 'vendor', partyName: vendorName },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, memo: `Against Invoice ${invoice?.invoiceNumber}`, partyType: 'vendor', partyName: vendorName },
    ],
    { sourceType: 'advance_application', sourceId: application.id, isAutoGenerated: true }
  );
}

export async function journalForCreditNote(creditNote: any, invoiceNumber?: string, buyerName?: string): Promise<void> {
  const cgst = Number(creditNote.cgstAmount) || 0;
  const sgst = Number(creditNote.sgstAmount) || 0;
  const igst = Number(creditNote.igstAmount) || 0;
  const grandTotal = Number(creditNote.grandTotal) || 0;
  const salesReturn = grandTotal - cgst - sgst - igst;

  if (grandTotal === 0) return;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.SALES_RETURNS, debit: salesReturn, credit: 0, memo: `Credit Note ${creditNote.noteNumber}` },
  ];

  if (cgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_PAYABLE, debit: cgst, credit: 0, memo: 'CGST reversal' });
  if (sgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_PAYABLE, debit: sgst, credit: 0, memo: 'SGST reversal' });
  if (igst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_IGST_PAYABLE, debit: igst, credit: 0, memo: 'IGST reversal' });

  lines.push({ accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: grandTotal, memo: `Credit Note ${creditNote.noteNumber}${invoiceNumber ? ' against ' + invoiceNumber : ''}`, partyType: 'vendor', partyName: buyerName });

  await createJournalWithLines(
    creditNote.creditDate || new Date().toISOString().slice(0, 10),
    `Credit Note: ${creditNote.noteNumber}${invoiceNumber ? ' against Invoice ' + invoiceNumber : ''} - ${buyerName || ''}`,
    lines,
    { sourceType: 'credit_note', sourceId: creditNote.id, isAutoGenerated: true }
  );
}

export async function journalForExpenseVoucher(voucher: any): Promise<void> {
  const totalAmount = voucher.totalAmount || 0;
  const gstAmount = voucher.gstAmount || 0;
  const subtotal = voucher.subtotal || 0;
  const method = (voucher.paymentMode || '').toLowerCase();
  const accountCode = (method === 'cash') ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_CURRENT;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.OPERATING_EXPENSES, debit: subtotal, credit: 0, memo: `Expense ${voucher.voucherNumber} - ${voucher.purpose || ''}` },
  ];
  
  if (gstAmount > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_INPUT, debit: Math.round(gstAmount / 2), credit: 0, memo: 'GST input credit' });
    lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_INPUT, debit: gstAmount - Math.round(gstAmount / 2), credit: 0, memo: 'GST input credit' });
  }

  lines.push({ accountCode: accountCode, debit: 0, credit: totalAmount, memo: `Payment for ${voucher.voucherNumber}`, partyType: voucher.payeeType, partyName: voucher.payeeName });

  await createJournalWithLines(
    voucher.voucherDate || new Date().toISOString().slice(0, 10),
    `Expense Voucher: ${voucher.voucherNumber} - ${voucher.payeeName}`,
    lines,
    { sourceType: 'expense', sourceId: voucher.id, isAutoGenerated: true }
  );
}

export async function journalForWriteOff(payment: any, invoice: any): Promise<void> {
  const amount = payment.amount || 0;

  await createJournalWithLines(
    payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Payment Write-off: Invoice ${invoice?.invoiceNumber || ''} - ${invoice?.buyerName || ''}`,
    [
      { accountCode: ACCOUNT_CODES.BAD_DEBTS, debit: amount, credit: 0, memo: `Write-off for Invoice ${invoice?.invoiceNumber || ''}` },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount, memo: `Write-off balance`, partyType: 'vendor', partyName: invoice?.buyerName },
    ],
    { sourceType: 'write_off', sourceId: payment.id, isAutoGenerated: true }
  );
}

export async function journalForDebitNote(debitNote: any): Promise<void> {
  const subtotal = debitNote.subtotal || 0;
  const cgst = debitNote.cgstAmount || 0;
  const sgst = debitNote.sgstAmount || 0;
  const igst = debitNote.igstAmount || 0;
  const grandTotal = debitNote.grandTotal || 0;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: grandTotal, credit: 0, memo: `Debit Note ${debitNote.noteNumber}` },
    { accountCode: ACCOUNT_CODES.DEBIT_NOTE_INCOME, debit: 0, credit: subtotal, memo: `Corrective debit note ${debitNote.noteNumber}` },
  ];

  if (cgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_PAYABLE, debit: 0, credit: cgst, memo: 'CGST on debit note' });
  if (sgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_PAYABLE, debit: 0, credit: sgst, memo: 'SGST on debit note' });
  if (igst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_IGST_PAYABLE, debit: 0, credit: igst, memo: 'IGST on debit note' });

  await createJournalWithLines(
    debitNote.debitDate || new Date().toISOString().slice(0, 10),
    `Debit Note: ${debitNote.noteNumber} - Corrective note`,
    lines,
    { sourceType: 'debit_note', sourceId: debitNote.id, isAutoGenerated: true }
  );
}

export async function journalForVendorDebitNote(debitNote: any, vendorName: string): Promise<void> {
  const cgst = Number(debitNote.cgstAmount) || 0;
  const sgst = Number(debitNote.sgstAmount) || 0;
  const igst = Number(debitNote.igstAmount) || 0;
  const grandTotal = Number(debitNote.grandTotal) || 0;
  const claimAmount = grandTotal - cgst - sgst - igst;

  if (grandTotal === 0) return;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: grandTotal, credit: 0, memo: `Vendor Debit Note ${debitNote.noteNumber}`, partyType: 'vendor', partyName: vendorName },
    { accountCode: ACCOUNT_CODES.VENDOR_CLAIMS, debit: 0, credit: claimAmount, memo: `Claim against ${vendorName}` },
  ];

  if (cgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_INPUT, debit: 0, credit: cgst, memo: 'CGST reversal on claim' });
  if (sgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_INPUT, debit: 0, credit: sgst, memo: 'SGST reversal on claim' });
  if (igst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_IGST_INPUT, debit: 0, credit: igst, memo: 'IGST reversal on claim' });

  await createJournalWithLines(
    debitNote.debitDate || new Date().toISOString().slice(0, 10),
    `Vendor Debit Note: ${debitNote.noteNumber} - ${vendorName}`,
    lines,
    { sourceType: 'vendor_debit_note', sourceId: debitNote.id, isAutoGenerated: true }
  );
}

export async function journalForVDNAdjustment(adjustment: any, debitNote: any, vendorName: string): Promise<void> {
  const amount = adjustment.adjustmentAmount || 0;

  await createJournalWithLines(
    adjustment.adjustmentDate || new Date().toISOString().slice(0, 10),
    `VDN Adjustment: ${debitNote?.noteNumber || ''} settled - ${vendorName}`,
    [
      { accountCode: ACCOUNT_CODES.VENDOR_CLAIMS, debit: amount, credit: 0, memo: `Settlement of ${debitNote?.noteNumber || ''}`, partyType: 'vendor', partyName: vendorName },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: 0, credit: amount, memo: `Adjustment against vendor`, partyType: 'vendor', partyName: vendorName },
    ],
    { sourceType: 'vdn_adjustment', sourceId: adjustment.id, isAutoGenerated: true }
  );
}

// ============================================================
// CASH REGISTER JOURNAL FUNCTIONS
// ============================================================

export async function journalForCashRegisterDeposit(transaction: any, day: any): Promise<void> {
  const amount = Number(transaction.amount) || 0;
  if (amount <= 0) return;

  const amountPaise = amount * 100;
  const dateStr = day?.registerDate || new Date().toISOString().slice(0, 10);
  const salesperson = day?.salespersonName || 'Unknown';
  const ref = transaction.reference || transaction.description || 'Bank Deposit';

  await createJournalWithLines(
    dateStr,
    `Cash Deposit: ${ref} (${salesperson})`,
    [
      { accountCode: ACCOUNT_CODES.BANK_CURRENT, debit: amountPaise, credit: 0, memo: `Cash deposited to bank - ${ref}` },
      { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debit: 0, credit: amountPaise, memo: `Cash deposit by ${salesperson}` },
    ],
    { sourceType: 'cash_register_deposit', sourceId: transaction.id, isAutoGenerated: true }
  );
}

export async function journalForCashRegisterTransfer(transaction: any, day: any): Promise<void> {
  const amount = Number(transaction.amount) || 0;
  if (amount <= 0) return;

  const amountPaise = amount * 100;
  const dateStr = day?.registerDate || new Date().toISOString().slice(0, 10);
  const salesperson = day?.salespersonName || 'Unknown';
  const ref = transaction.reference || transaction.description || 'Cash Transfer';

  await createJournalWithLines(
    dateStr,
    `Cash Transfer: ${ref} (${salesperson})`,
    [
      { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debit: amountPaise, credit: 0, memo: `Cash transfer received - ${ref}` },
      { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debit: 0, credit: amountPaise, memo: `Cash transferred by ${salesperson}` },
    ],
    { sourceType: 'cash_register_transfer', sourceId: transaction.id, isAutoGenerated: true }
  );
}

// ============================================================
// MANUFACTURING / INVENTORY JOURNAL FUNCTIONS
// ============================================================

export async function journalForRawMaterialIssuance(issuance: any, items: any[], materialNames: Record<string, string>): Promise<void> {
  let totalValue = 0;
  const itemMemos: string[] = [];

  for (const item of items) {
    const qty = Number(item.quantityIssued) || 0;
    const unitCost = Number(item.unitCost) || 0;
    const lineValue = Math.round(unitCost * qty * 100) / 100;
    totalValue += lineValue;
    const matName = materialNames[item.rawMaterialId] || item.rawMaterialId;
    itemMemos.push(`${matName}: ${qty} units @ ${unitCost.toFixed(2)}`);
  }

  if (totalValue <= 0) return;

  const totalPaise = Math.round(totalValue * 100);

  await createJournalWithLines(
    issuance.issuanceDate ? String(issuance.issuanceDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Raw Material Issued: ${issuance.issuanceNumber} - ${itemMemos.length} material(s)`,
    [
      { accountCode: ACCOUNT_CODES.MANUFACTURING_EXPENSES, debit: totalPaise, credit: 0, memo: `Materials issued: ${itemMemos.join('; ').substring(0, 250)}` },
      { accountCode: ACCOUNT_CODES.INVENTORY_RAW_MATERIALS, debit: 0, credit: totalPaise, memo: `Issuance ${issuance.issuanceNumber}` },
    ],
    { sourceType: 'material_issuance', sourceId: issuance.id, isAutoGenerated: true }
  );
}

export async function journalForProductionEntry(productionEntry: any, productName: string, costValue: number): Promise<void> {
  const value = Math.round(Number(costValue) * 100);
  if (value <= 0) return;

  const qty = Number(productionEntry.producedQuantity) || 0;
  const batch = productionEntry.batchNumber || 'N/A';

  await createJournalWithLines(
    productionEntry.productionDate ? String(productionEntry.productionDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Production Output: ${productName} - ${qty} units (Batch: ${batch})`,
    [
      { accountCode: ACCOUNT_CODES.INVENTORY_FINISHED_GOODS, debit: value, credit: 0, memo: `${productName} - ${qty} units produced, Batch ${batch}` },
      { accountCode: ACCOUNT_CODES.MANUFACTURING_EXPENSES, debit: 0, credit: value, memo: `Cost transferred to finished goods` },
    ],
    { sourceType: 'production_entry', sourceId: productionEntry.id, isAutoGenerated: true }
  );
}

export async function journalForRawMaterialReceipt(material: any): Promise<void> {
  const qty = Number(material.currentStock) || Number(material.openingStock) || Number(material.quantity) || 0;
  const unitCost = Number(material.unitCost) || 0;
  const gstRate = Number(material.gstRate) || 0;

  if (qty <= 0 || unitCost <= 0) return;

  const baseValue = Math.round(unitCost * qty * 100);
  const gstValue = Math.round(unitCost * qty * (gstRate / 100) * 100);
  const totalPayable = baseValue + gstValue;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.INVENTORY_RAW_MATERIALS, debit: baseValue, credit: 0, memo: `${material.materialName} - ${qty} units @ ${unitCost}` },
  ];

  if (gstValue > 0) {
    const cgst = Math.round(gstValue / 2);
    const sgst = gstValue - cgst;
    lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_INPUT, debit: cgst, credit: 0, memo: 'CGST Input on purchase' });
    lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_INPUT, debit: sgst, credit: 0, memo: 'SGST Input on purchase' });
  }

  lines.push({ accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: 0, credit: totalPayable, memo: `Purchase of ${material.materialName}`, partyType: 'vendor', partyName: material.supplier || 'Unknown' });

  const receiptDate = material.receivedDate || material.openingDate || material.createdAt;

  await createJournalWithLines(
    receiptDate ? String(receiptDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Raw Material Receipt: ${material.materialName} - ${qty} units`,
    lines,
    { sourceType: 'material_receipt', sourceId: material.id, isAutoGenerated: true }
  );
}

// ============ BACKFILL: Generate journals for existing data ============

export async function backfillJournalEntries(): Promise<{
  invoices: { processed: number; skipped: number; errors: number };
  payments: { processed: number; skipped: number; errors: number };
  writeOffs: { processed: number; skipped: number; errors: number };
  creditNotes: { processed: number; skipped: number; errors: number };
  customerAdvances: { processed: number; skipped: number; errors: number };
  advanceApplications: { processed: number; skipped: number; errors: number };
  vendorDebitNotes: { processed: number; skipped: number; errors: number };
  vdnAdjustments: { processed: number; skipped: number; errors: number };
  expenseVouchers: { processed: number; skipped: number; errors: number };
  materialReceipts: { processed: number; skipped: number; errors: number };
  materialIssuances: { processed: number; skipped: number; errors: number };
  productionEntries: { processed: number; skipped: number; errors: number };
  total: { processed: number; skipped: number; errors: number };
}> {
  const results = {
    invoices: { processed: 0, skipped: 0, errors: 0 },
    payments: { processed: 0, skipped: 0, errors: 0 },
    writeOffs: { processed: 0, skipped: 0, errors: 0 },
    creditNotes: { processed: 0, skipped: 0, errors: 0 },
    customerAdvances: { processed: 0, skipped: 0, errors: 0 },
    advanceApplications: { processed: 0, skipped: 0, errors: 0 },
    vendorDebitNotes: { processed: 0, skipped: 0, errors: 0 },
    vdnAdjustments: { processed: 0, skipped: 0, errors: 0 },
    expenseVouchers: { processed: 0, skipped: 0, errors: 0 },
    materialReceipts: { processed: 0, skipped: 0, errors: 0 },
    materialIssuances: { processed: 0, skipped: 0, errors: 0 },
    productionEntries: { processed: 0, skipped: 0, errors: 0 },
    cashRegisterDeposits: { processed: 0, skipped: 0, errors: 0 },
    cashRegisterTransfers: { processed: 0, skipped: 0, errors: 0 },
    cashRegisterExpenses: { processed: 0, skipped: 0, errors: 0 },
    total: { processed: 0, skipped: 0, errors: 0 },
  };

  async function hasJournal(sourceType: string, sourceId: string): Promise<boolean> {
    const existing = await storage.getJournalEntryBySource(sourceType, sourceId);
    return !!existing;
  }

  // Use raw SQL queries to avoid TypeScript column name issues
  // All queries use the actual database column names

  // 1. Backfill Invoices
  console.log('[BACKFILL] Starting invoices...');
  const allInvoices: any[] = (await db.execute(sql`
    SELECT id, invoice_number, invoice_date, buyer_name, subtotal, cgst_amount, sgst_amount, igst_amount, total_amount
    FROM invoices WHERE record_status = 1 AND status != 'cancelled'
  `)).rows;

  for (const inv of allInvoices) {
    try {
      if (await hasJournal('invoice', inv.id)) { results.invoices.skipped++; continue; }
      await journalForInvoice({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        buyerName: inv.buyer_name || 'Unknown',
        subtotal: inv.subtotal || 0,
        cgstAmount: inv.cgst_amount || 0,
        sgstAmount: inv.sgst_amount || 0,
        igstAmount: inv.igst_amount || 0,
        grandTotal: inv.total_amount || 0,
      });
      results.invoices.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Invoice ${inv.invoice_number} error:`, e.message);
      results.invoices.errors++;
    }
  }
  console.log(`[BACKFILL] Invoices done: ${results.invoices.processed} created, ${results.invoices.skipped} skipped, ${results.invoices.errors} errors`);

  // 2. Backfill Payments (non-write-offs)
  console.log('[BACKFILL] Starting payments...');
  const allPayments: any[] = (await db.execute(sql`
    SELECT p.id, p.invoice_id, p.payment_date, p.amount, p.payment_method, p.reference_number, p.payer_name,
           i.invoice_number, i.buyer_name
    FROM invoice_payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE p.record_status = 1 AND (p.payment_type IS NULL OR p.payment_type != 'write_off')
  `)).rows;

  for (const pmt of allPayments) {
    try {
      if (await hasJournal('payment', pmt.id)) { results.payments.skipped++; continue; }
      await journalForPayment(
        {
          id: pmt.id,
          amount: pmt.amount || 0,
          paymentDate: pmt.payment_date,
          paymentMethod: pmt.payment_method,
          referenceNumber: pmt.reference_number,
          payerName: pmt.payer_name || pmt.buyer_name,
        },
        {
          invoiceNumber: pmt.invoice_number || 'Unknown',
          buyerName: pmt.buyer_name || 'Unknown',
        }
      );
      results.payments.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Payment ${pmt.id} error:`, e.message);
      results.payments.errors++;
    }
  }
  console.log(`[BACKFILL] Payments done: ${results.payments.processed} created, ${results.payments.skipped} skipped, ${results.payments.errors} errors`);

  // 3. Backfill Write-offs
  console.log('[BACKFILL] Starting write-offs...');
  const allWriteOffs: any[] = (await db.execute(sql`
    SELECT p.id, p.amount, p.payment_date, i.invoice_number, i.buyer_name
    FROM invoice_payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE p.record_status = 1 AND p.payment_type = 'write_off'
  `)).rows;

  for (const wo of allWriteOffs) {
    try {
      if (await hasJournal('write_off', wo.id)) { results.writeOffs.skipped++; continue; }
      await journalForWriteOff(
        { id: wo.id, amount: wo.amount || 0, paymentDate: wo.payment_date },
        { invoiceNumber: wo.invoice_number || 'Unknown', buyerName: wo.buyer_name || 'Unknown' }
      );
      results.writeOffs.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Write-off ${wo.id} error:`, e.message);
      results.writeOffs.errors++;
    }
  }
  console.log(`[BACKFILL] Write-offs done: ${results.writeOffs.processed} created, ${results.writeOffs.skipped} skipped, ${results.writeOffs.errors} errors`);

  // 4. Backfill Credit Notes
  console.log('[BACKFILL] Starting credit notes...');
  const allCreditNotes: any[] = (await db.execute(sql`
    SELECT cn.id, cn.note_number, cn.credit_date, cn.subtotal, cn.cgst_amount, cn.sgst_amount, cn.igst_amount, cn.grand_total,
           cn.vendor_id, i.invoice_number, i.buyer_name,
           COALESCE(i.buyer_name, v.vendor_name, 'Unknown') as resolved_name
    FROM credit_notes cn
    LEFT JOIN invoices i ON cn.invoice_id = i.id
    LEFT JOIN vendors v ON cn.vendor_id = v.id
    WHERE cn.record_status = 1
  `)).rows;

  for (const cn of allCreditNotes) {
    try {
      if (await hasJournal('credit_note', cn.id)) { results.creditNotes.skipped++; continue; }
      await journalForCreditNote(
        {
          id: cn.id,
          noteNumber: cn.note_number,
          creditDate: cn.credit_date,
          subtotal: cn.subtotal || 0,
          cgstAmount: cn.cgst_amount || 0,
          sgstAmount: cn.sgst_amount || 0,
          igstAmount: cn.igst_amount || 0,
          grandTotal: cn.grand_total || 0,
        },
        cn.invoice_number,
        cn.resolved_name || 'Unknown'
      );
      results.creditNotes.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Credit Note ${cn.note_number} error:`, e.message);
      results.creditNotes.errors++;
    }
  }
  console.log(`[BACKFILL] Credit Notes done: ${results.creditNotes.processed} created, ${results.creditNotes.skipped} skipped, ${results.creditNotes.errors} errors`);

  // 5. Backfill Customer Advances
  console.log('[BACKFILL] Starting customer advances...');
  const allAdvances: any[] = (await db.execute(sql`
    SELECT ca.id, ca.advance_number, ca.receipt_date, ca.amount, ca.payment_method, ca.vendor_id,
           v.vendor_name
    FROM customer_advances ca
    LEFT JOIN vendors v ON ca.vendor_id = v.id
    WHERE ca.record_status = 1
  `)).rows;

  for (const adv of allAdvances) {
    try {
      if (await hasJournal('customer_advance', adv.id)) { results.customerAdvances.skipped++; continue; }
      await journalForCustomerAdvance(
        {
          id: adv.id,
          advanceNumber: adv.advance_number,
          receiptDate: adv.receipt_date,
          amount: adv.amount || 0,
          paymentMethod: adv.payment_method,
        },
        adv.vendor_name || 'Unknown'
      );
      results.customerAdvances.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Customer Advance ${adv.advance_number} error:`, e.message);
      results.customerAdvances.errors++;
    }
  }
  console.log(`[BACKFILL] Customer Advances done: ${results.customerAdvances.processed} created, ${results.customerAdvances.skipped} skipped, ${results.customerAdvances.errors} errors`);

  // 6. Backfill Advance Applications
  console.log('[BACKFILL] Starting advance applications...');
  const allApplications: any[] = (await db.execute(sql`
    SELECT aa.id, aa.applied_amount, aa.application_date, aa.advance_id, aa.invoice_id,
           ca.advance_number, ca.vendor_id, i.invoice_number, v.vendor_name
    FROM advance_applications aa
    LEFT JOIN customer_advances ca ON aa.advance_id = ca.id
    LEFT JOIN invoices i ON aa.invoice_id = i.id
    LEFT JOIN vendors v ON ca.vendor_id = v.id
    WHERE aa.record_status = 1
  `)).rows;

  for (const app of allApplications) {
    try {
      if (await hasJournal('advance_application', app.id)) { results.advanceApplications.skipped++; continue; }
      await journalForAdvanceApplication(
        { id: app.id, appliedAmount: app.applied_amount || 0, applicationDate: app.application_date },
        { advanceNumber: app.advance_number },
        { invoiceNumber: app.invoice_number },
        app.vendor_name || 'Unknown'
      );
      results.advanceApplications.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Advance Application ${app.id} error:`, e.message);
      results.advanceApplications.errors++;
    }
  }
  console.log(`[BACKFILL] Advance Applications done: ${results.advanceApplications.processed} created, ${results.advanceApplications.skipped} skipped, ${results.advanceApplications.errors} errors`);

  // 7. Backfill Vendor Debit Notes
  console.log('[BACKFILL] Starting vendor debit notes...');
  const allVDNs: any[] = (await db.execute(sql`
    SELECT vdn.id, vdn.note_number, vdn.debit_date, vdn.subtotal, vdn.cgst_amount, vdn.sgst_amount, vdn.igst_amount, vdn.grand_total,
           v.vendor_name
    FROM vendor_debit_notes vdn
    LEFT JOIN vendors v ON vdn.vendor_id = v.id
    WHERE vdn.record_status = 1
  `)).rows;

  for (const vdn of allVDNs) {
    try {
      if (await hasJournal('vendor_debit_note', vdn.id)) { results.vendorDebitNotes.skipped++; continue; }
      await journalForVendorDebitNote(
        {
          id: vdn.id,
          noteNumber: vdn.note_number,
          debitDate: vdn.debit_date,
          subtotal: vdn.subtotal || 0,
          cgstAmount: vdn.cgst_amount || 0,
          sgstAmount: vdn.sgst_amount || 0,
          igstAmount: vdn.igst_amount || 0,
          grandTotal: vdn.grand_total || 0,
        },
        vdn.vendor_name || 'Unknown'
      );
      results.vendorDebitNotes.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Vendor Debit Note ${vdn.note_number} error:`, e.message);
      results.vendorDebitNotes.errors++;
    }
  }
  console.log(`[BACKFILL] Vendor Debit Notes done: ${results.vendorDebitNotes.processed} created, ${results.vendorDebitNotes.skipped} skipped, ${results.vendorDebitNotes.errors} errors`);

  // 8. Backfill VDN Adjustments
  console.log('[BACKFILL] Starting VDN adjustments...');
  const allAdjs: any[] = (await db.execute(sql`
    SELECT a.id, a.adjustment_amount, a.adjustment_date, a.vendor_debit_note_id,
           vdn.note_number, v.vendor_name
    FROM vendor_debit_note_adjustments a
    LEFT JOIN vendor_debit_notes vdn ON a.vendor_debit_note_id = vdn.id
    LEFT JOIN vendors v ON vdn.vendor_id = v.id
    WHERE a.record_status = 1
  `)).rows;

  for (const adj of allAdjs) {
    try {
      if (await hasJournal('vdn_adjustment', adj.id)) { results.vdnAdjustments.skipped++; continue; }
      await journalForVDNAdjustment(
        { id: adj.id, adjustmentAmount: adj.adjustment_amount || 0, adjustmentDate: adj.adjustment_date },
        { noteNumber: adj.note_number },
        adj.vendor_name || 'Unknown'
      );
      results.vdnAdjustments.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] VDN Adjustment ${adj.id} error:`, e.message);
      results.vdnAdjustments.errors++;
    }
  }
  console.log(`[BACKFILL] VDN Adjustments done: ${results.vdnAdjustments.processed} created, ${results.vdnAdjustments.skipped} skipped, ${results.vdnAdjustments.errors} errors`);

  // 9. Backfill Expense Vouchers
  console.log('[BACKFILL] Starting expense vouchers...');
  const allExpenses: any[] = (await db.execute(sql`
    SELECT id, voucher_number, voucher_date, total_amount, gst_amount, subtotal, payment_mode, purpose, payee_type, payee_name
    FROM expense_vouchers WHERE record_status = 1 AND status = 'approved'
  `)).rows;

  for (const exp of allExpenses) {
    try {
      if (await hasJournal('expense', exp.id)) { results.expenseVouchers.skipped++; continue; }
      await journalForExpenseVoucher({
        id: exp.id,
        voucherNumber: exp.voucher_number,
        voucherDate: exp.voucher_date,
        totalAmount: exp.total_amount || 0,
        gstAmount: exp.gst_amount || 0,
        subtotal: exp.subtotal || 0,
        paymentMode: exp.payment_mode,
        purpose: exp.purpose,
        payeeType: exp.payee_type,
        payeeName: exp.payee_name,
      });
      results.expenseVouchers.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Expense ${exp.voucher_number} error:`, e.message);
      results.expenseVouchers.errors++;
    }
  }
  console.log(`[BACKFILL] Expense Vouchers done: ${results.expenseVouchers.processed} created, ${results.expenseVouchers.skipped} skipped, ${results.expenseVouchers.errors} errors`);

  // 10. Backfill Raw Material Receipts
  console.log('[BACKFILL] Starting raw material receipts...');
  const allMaterials: any[] = (await db.execute(sql`
    SELECT id, material_code, material_name, current_stock, opening_stock, unit_cost, gst_rate, supplier, received_date, opening_date, created_at
    FROM raw_materials WHERE record_status = 1
  `)).rows;

  for (const mat of allMaterials) {
    try {
      if (await hasJournal('material_receipt', mat.id)) { results.materialReceipts.skipped++; continue; }
      await journalForRawMaterialReceipt({
        id: mat.id,
        materialName: mat.material_name || mat.material_code,
        currentStock: mat.current_stock,
        openingStock: mat.opening_stock,
        unitCost: mat.unit_cost,
        gstRate: mat.gst_rate,
        supplier: mat.supplier,
        receivedDate: mat.received_date,
        openingDate: mat.opening_date,
        createdAt: mat.created_at,
      });
      results.materialReceipts.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Material Receipt ${mat.material_name} error:`, e.message);
      results.materialReceipts.errors++;
    }
  }
  console.log(`[BACKFILL] Material Receipts done: ${results.materialReceipts.processed} created, ${results.materialReceipts.skipped} skipped, ${results.materialReceipts.errors} errors`);

  // 11. Backfill Raw Material Issuances
  console.log('[BACKFILL] Starting material issuances...');
  const allIssuances: any[] = (await db.execute(sql`
    SELECT id, issuance_number, issuance_date, product_id
    FROM raw_material_issuance WHERE record_status = 1
  `)).rows;

  for (const iss of allIssuances) {
    try {
      if (await hasJournal('material_issuance', iss.id)) { results.materialIssuances.skipped++; continue; }
      const issItems: any[] = (await db.execute(sql`
        SELECT rmii.id, rmii.raw_material_id, rmii.quantity_issued, rm.unit_cost, rm.gst_rate, rm.material_name
        FROM raw_material_issuance_items rmii
        LEFT JOIN raw_materials rm ON rmii.raw_material_id = rm.id
        WHERE rmii.issuance_id = ${iss.id}
      `)).rows;

      const materialNames: Record<string, string> = {};
      const itemsWithCost = issItems.map(item => {
        materialNames[item.raw_material_id] = item.material_name || 'Unknown';
        return {
          rawMaterialId: item.raw_material_id,
          quantityIssued: item.quantity_issued,
          unitCost: item.unit_cost || 0,
          gstRate: item.gst_rate || 0,
        };
      });

      await journalForRawMaterialIssuance(
        { id: iss.id, issuanceNumber: iss.issuance_number, issuanceDate: iss.issuance_date },
        itemsWithCost,
        materialNames
      );
      results.materialIssuances.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Material Issuance ${iss.issuance_number} error:`, e.message);
      results.materialIssuances.errors++;
    }
  }
  console.log(`[BACKFILL] Material Issuances done: ${results.materialIssuances.processed} created, ${results.materialIssuances.skipped} skipped, ${results.materialIssuances.errors} errors`);

  // 12. Backfill Production Entries (Finished Goods)
  console.log('[BACKFILL] Starting production entries...');
  const allProdEntries: any[] = (await db.execute(sql`
    SELECT pe.id, pe.issuance_id, pe.production_date, pe.shift, pe.produced_quantity, pe.batch_number, pe.product_id,
           p.product_name
    FROM production_entries pe
    LEFT JOIN products p ON pe.product_id = p.id
    WHERE pe.record_status = 1
  `)).rows;

  for (const pe of allProdEntries) {
    try {
      if (await hasJournal('production_entry', pe.id)) { results.productionEntries.skipped++; continue; }

      let costValue = 0;
      if (pe.issuance_id) {
        const issItemsResult: any[] = (await db.execute(sql`
          SELECT rmii.quantity_issued, rm.unit_cost
          FROM raw_material_issuance_items rmii
          LEFT JOIN raw_materials rm ON rmii.raw_material_id = rm.id
          WHERE rmii.issuance_id = ${pe.issuance_id}
        `)).rows;
        for (const item of issItemsResult) {
          const qty = Number(item.quantity_issued) || 0;
          const uc = Number(item.unit_cost) || 0;
          costValue += qty * uc;
        }
      }

      await journalForProductionEntry(
        {
          id: pe.id,
          productionDate: pe.production_date,
          producedQuantity: pe.produced_quantity,
          batchNumber: pe.batch_number,
        },
        pe.product_name || 'Unknown Product',
        costValue
      );
      results.productionEntries.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Production Entry ${pe.id} error:`, e.message);
      results.productionEntries.errors++;
    }
  }
  console.log(`[BACKFILL] Production Entries done: ${results.productionEntries.processed} created, ${results.productionEntries.skipped} skipped, ${results.productionEntries.errors} errors`);

  // 13. Backfill Cash Register Deposits
  console.log('[BACKFILL] Starting cash register deposits...');
  const allDeposits: any[] = (await db.execute(sql`
    SELECT crt.id, crt.day_id, crt.amount, crt.reference, crt.description,
           crd.register_date, crd.salesperson_name
    FROM cash_register_transactions crt
    JOIN cash_register_days crd ON crt.day_id = crd.id
    WHERE crt.transaction_type = 'deposit'
  `)).rows;

  for (const dep of allDeposits) {
    try {
      if (await hasJournal('cash_register_deposit', dep.id)) { results.cashRegisterDeposits.skipped++; continue; }
      await journalForCashRegisterDeposit(
        { id: dep.id, amount: dep.amount, reference: dep.reference, description: dep.description },
        { registerDate: dep.register_date, salespersonName: dep.salesperson_name }
      );
      results.cashRegisterDeposits.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Cash Register Deposit ${dep.id} error:`, e.message);
      results.cashRegisterDeposits.errors++;
    }
  }
  console.log(`[BACKFILL] Cash Register Deposits done: ${results.cashRegisterDeposits.processed} created, ${results.cashRegisterDeposits.skipped} skipped, ${results.cashRegisterDeposits.errors} errors`);

  // 14. Backfill Cash Register Transfers
  console.log('[BACKFILL] Starting cash register transfers...');
  const allTransfers: any[] = (await db.execute(sql`
    SELECT crt.id, crt.day_id, crt.amount, crt.reference, crt.description,
           crd.register_date, crd.salesperson_name
    FROM cash_register_transactions crt
    JOIN cash_register_days crd ON crt.day_id = crd.id
    WHERE crt.transaction_type = 'transfer'
  `)).rows;

  for (const tr of allTransfers) {
    try {
      if (await hasJournal('cash_register_transfer', tr.id)) { results.cashRegisterTransfers.skipped++; continue; }
      await journalForCashRegisterTransfer(
        { id: tr.id, amount: tr.amount, reference: tr.reference, description: tr.description },
        { registerDate: tr.register_date, salespersonName: tr.salesperson_name }
      );
      results.cashRegisterTransfers.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Cash Register Transfer ${tr.id} error:`, e.message);
      results.cashRegisterTransfers.errors++;
    }
  }
  console.log(`[BACKFILL] Cash Register Transfers done: ${results.cashRegisterTransfers.processed} created, ${results.cashRegisterTransfers.skipped} skipped, ${results.cashRegisterTransfers.errors} errors`);

  // 15. Backfill Cash Register Expenses (expense vouchers created from cash register that may lack journal entries)
  console.log('[BACKFILL] Starting cash register expense vouchers...');
  const crExpenseVouchers: any[] = (await db.execute(sql`
    SELECT ev.id, ev.voucher_number, ev.voucher_date, ev.total_amount, ev.gst_amount, ev.subtotal,
           ev.payment_mode, ev.purpose, ev.payee_type, ev.payee_name
    FROM expense_vouchers ev
    WHERE ev.voucher_number LIKE 'EV-CR-%' OR ev.voucher_number LIKE 'CR-%'
  `)).rows;

  for (const exp of crExpenseVouchers) {
    try {
      if (await hasJournal('expense', exp.id)) { results.cashRegisterExpenses.skipped++; continue; }
      await journalForExpenseVoucher({
        id: exp.id,
        voucherNumber: exp.voucher_number,
        voucherDate: exp.voucher_date,
        totalAmount: exp.total_amount || 0,
        gstAmount: exp.gst_amount || 0,
        subtotal: exp.subtotal || 0,
        paymentMode: exp.payment_mode,
        purpose: exp.purpose,
        payeeType: exp.payee_type,
        payeeName: exp.payee_name,
      });
      results.cashRegisterExpenses.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] CR Expense Voucher ${exp.voucher_number} error:`, e.message);
      results.cashRegisterExpenses.errors++;
    }
  }
  console.log(`[BACKFILL] Cash Register Expenses done: ${results.cashRegisterExpenses.processed} created, ${results.cashRegisterExpenses.skipped} skipped, ${results.cashRegisterExpenses.errors} errors`);

  // Totals
  for (const key of Object.keys(results) as Array<keyof typeof results>) {
    if (key === 'total') continue;
    results.total.processed += results[key].processed;
    results.total.skipped += results[key].skipped;
    results.total.errors += results[key].errors;
  }

  console.log(`[BACKFILL] === COMPLETE === Total: ${results.total.processed} created, ${results.total.skipped} skipped, ${results.total.errors} errors`);
  return results;
}

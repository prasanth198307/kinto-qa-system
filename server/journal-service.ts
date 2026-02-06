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
  const subtotal = invoice.subtotal || 0;
  const cgst = invoice.cgstAmount || 0;
  const sgst = invoice.sgstAmount || 0;
  const igst = invoice.igstAmount || 0;
  const grandTotal = invoice.grandTotal || 0;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: grandTotal, credit: 0, memo: `Invoice ${invoice.invoiceNumber}`, partyType: 'vendor', partyName: invoice.buyerName },
    { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: 0, credit: subtotal, memo: `Sales - Invoice ${invoice.invoiceNumber}` },
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
  const subtotal = creditNote.subtotal || 0;
  const cgst = creditNote.cgstAmount || 0;
  const sgst = creditNote.sgstAmount || 0;
  const igst = creditNote.igstAmount || 0;
  const grandTotal = creditNote.grandTotal || 0;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.SALES_RETURNS, debit: subtotal, credit: 0, memo: `Credit Note ${creditNote.noteNumber}` },
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
  const subtotal = debitNote.subtotal || 0;
  const cgst = debitNote.cgstAmount || 0;
  const sgst = debitNote.sgstAmount || 0;
  const igst = debitNote.igstAmount || 0;
  const grandTotal = debitNote.grandTotal || 0;

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: grandTotal, credit: 0, memo: `Vendor Debit Note ${debitNote.noteNumber}`, partyType: 'vendor', partyName: vendorName },
    { accountCode: ACCOUNT_CODES.VENDOR_CLAIMS, debit: 0, credit: subtotal, memo: `Claim against ${vendorName}` },
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

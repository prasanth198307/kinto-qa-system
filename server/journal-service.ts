import { db } from "./db";
import { storage } from "./storage";
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  roles,
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
  INVENTORY_SPARE_PARTS: '1203',

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
  TRAVEL_EXPENSES: '5108',
  FUEL_VEHICLE: '5109',
  STAFF_WELFARE: '5110',
  COURIER_SHIPPING: '5111',
  PRINTING_STATIONERY: '5112',
  INTERNET_PHONE: '5113',
  FURNITURE_FIXTURES: '5114',
  VEHICLE_EMI: '5115',
  OFFICE_SUPPLIES: '5116',
  SPARES_CONSUMABLES: '5117',
  CHEMICALS_CLEANING: '5118',
  WATER_CHARGES: '5119',
  MSME_CHARGES: '5120',
  TESTING_LAB_FEES: '5121',
  SECURITY_CHARGES: '5122',
  HOUSEKEEPING: '5123',
  AMC_SERVICE_CONTRACTS: '5124',
  LICENCE_RENEWAL: '5125',
  LOADING_UNLOADING: '5126',
  POLLUTION_COMPLIANCE: '5127',
  SAFETY_EQUIPMENT: '5128',
  DIESEL_GENERATOR: '5129',
  PACKAGING_EXPENSES: '5130',
  DEPRECIATION: '5131',
  MICROBIOLOGY_LAB: '5132',
  CHEMICAL_LAB: '5133',
  CONSULTANT_FEES: '5134',
  CONTRACT_PAYMENTS: '5135',
  VEHICLE_CONTRACTS: '5136',
  LOSS_ON_SCRAP: '5137',
  MANUFACTURING_EXPENSES: '5200',
  OPERATING_EXPENSES: '5300',
  MISCELLANEOUS_EXPENSES: '5400',
  BAD_DEBTS: '5500',
  SALES_RETURNS: '5600',
  VENDOR_CLAIMS: '5700',
  LOANS_RECEIVABLE: '1300',
};

// ============================================================
// PARTY-WISE SUB-LEDGER HELPER
// Creates (or retrieves) a customer-specific ledger account
// under Sundry Debtors (1100) and Sundry Creditors (2001) so each party
// has its own line in the Trial Balance and Ledger Drilldown.
// ============================================================
async function getOrCreateDebtorAccount(partyName: string): Promise<string> {
  if (!partyName || !partyName.trim()) return ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;

  const normalized = partyName.trim();
  const parent = await storage.getChartOfAccountByCode(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
  if (!parent) return ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;

  // Look for an existing sub-ledger account with this exact name under 1100
  const existing = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.parentId, parent.id),
        sql`lower(trim(${chartOfAccounts.name})) = lower(trim(${normalized}))`,
        eq(chartOfAccounts.recordStatus, 1)
      )
    )
    .limit(1);

  if (existing.length > 0) return existing[0].code;

  // Count existing children to generate a sequential code
  const countResult = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.parentId, parent.id), eq(chartOfAccounts.recordStatus, 1)));

  const seq = (Number(countResult[0]?.cnt) || 0) + 1;
  const newCode = `${ACCOUNT_CODES.ACCOUNTS_RECEIVABLE}-${String(seq).padStart(3, '0')}`;

  await storage.createChartOfAccount({
    code: newCode,
    name: normalized,
    accountType: 'Assets',
    subType: 'trade_receivable',
    nodeType: 'ledger',
    parentId: parent.id,
    isSystemAccount: 0,
    isActive: 1,
  } as any);

  console.log(`[COA] Auto-created debtor sub-ledger: ${newCode} - ${normalized}`);
  return newCode;
}

async function getOrCreateCreditorAccount(partyName: string): Promise<string> {
  if (!partyName || !partyName.trim()) return ACCOUNT_CODES.ACCOUNTS_PAYABLE;

  const normalized = partyName.trim();
  const parent = await storage.getChartOfAccountByCode(ACCOUNT_CODES.ACCOUNTS_PAYABLE);
  if (!parent) return ACCOUNT_CODES.ACCOUNTS_PAYABLE;

  // Look for an existing sub-ledger account with this exact name under 2001
  const existing = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.parentId, parent.id),
        sql`lower(trim(${chartOfAccounts.name})) = lower(trim(${normalized}))`,
        eq(chartOfAccounts.recordStatus, 1)
      )
    )
    .limit(1);

  if (existing.length > 0) return existing[0].code;

  // Count existing children to generate a sequential code
  const countResult = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.parentId, parent.id), eq(chartOfAccounts.recordStatus, 1)));

  const seq = (Number(countResult[0]?.cnt) || 0) + 1;
  const newCode = `${ACCOUNT_CODES.ACCOUNTS_PAYABLE}-${String(seq).padStart(3, '0')}`;

  await storage.createChartOfAccount({
    code: newCode,
    name: normalized,
    accountType: 'Liabilities',
    subType: 'trade_payable',
    nodeType: 'ledger',
    parentId: parent.id,
    isSystemAccount: 0,
    isActive: 1,
  } as any);

  console.log(`[COA] Auto-created creditor sub-ledger: ${newCode} - ${normalized}`);
  return newCode;
}

const HIERARCHY_GROUPS = [
  { code: '1000', name: 'Assets', accountType: 'Assets', parentCode: null, level: 1 },
  { code: 'G1100', name: 'Non-Current Assets', accountType: 'Assets', parentCode: '1000', level: 2 },
  { code: '1110', name: 'Property, Plant & Equipment', accountType: 'Assets', parentCode: 'G1100', level: 3 },
  { code: '1120', name: 'Accumulated Depreciation', accountType: 'Assets', parentCode: 'G1100', level: 3 },
  { code: '1130', name: 'Capital Work in Progress', accountType: 'Assets', parentCode: 'G1100', level: 3 },
  { code: '1140', name: 'Intangible Assets', accountType: 'Assets', parentCode: 'G1100', level: 3 },
  { code: '1150', name: 'Non-Current Financial Assets', accountType: 'Assets', parentCode: 'G1100', level: 3 },
  { code: 'G1200', name: 'Current Assets', accountType: 'Assets', parentCode: '1000', level: 2 },
  { code: '1210', name: 'Inventories', accountType: 'Assets', parentCode: 'G1200', level: 3 },
  { code: '1220', name: 'Trade Receivables', accountType: 'Assets', parentCode: 'G1200', level: 3 },
  { code: '1230', name: 'Cash & Cash Equivalents', accountType: 'Assets', parentCode: 'G1200', level: 3 },
  { code: '1240', name: 'Short-term Loans & Advances', accountType: 'Assets', parentCode: 'G1200', level: 3 },
  { code: '1250', name: 'Other Current Assets', accountType: 'Assets', parentCode: 'G1200', level: 3 },

  { code: '2000', name: 'Liabilities', accountType: 'Liabilities', parentCode: null, level: 1 },
  { code: 'G2100', name: 'Non-Current Liabilities', accountType: 'Liabilities', parentCode: '2000', level: 2 },
  { code: '2110', name: 'Long-term Borrowings', accountType: 'Liabilities', parentCode: 'G2100', level: 3 },
  { code: 'G2200', name: 'Current Liabilities', accountType: 'Liabilities', parentCode: '2000', level: 2 },
  { code: 'G2210', name: 'Trade Payables', accountType: 'Liabilities', parentCode: 'G2200', level: 3 },
  { code: '2220', name: 'Short-term Borrowings', accountType: 'Liabilities', parentCode: 'G2200', level: 3 },
  { code: '2230', name: 'Other Current Liabilities', accountType: 'Liabilities', parentCode: 'G2200', level: 3 },
  { code: '2240', name: 'Statutory Liabilities', accountType: 'Liabilities', parentCode: 'G2200', level: 3 },

  { code: '3000', name: 'Equity', accountType: 'Equity', parentCode: null, level: 1 },
  { code: '3200', name: 'Reserves & Surplus', accountType: 'Equity', parentCode: '3000', level: 2 },

  { code: '4000', name: 'Income', accountType: 'Income', parentCode: null, level: 1 },
  { code: '4100', name: 'Revenue from Operations', accountType: 'Income', parentCode: '4000', level: 2 },
  { code: '4200', name: 'Other Income', accountType: 'Income', parentCode: '4000', level: 2 },

  { code: '5000', name: 'Expenses', accountType: 'Expenses', parentCode: null, level: 1 },
  { code: 'G5100', name: 'Cost of Goods Sold', accountType: 'Expenses', parentCode: '5000', level: 2 },
  { code: 'G5200', name: 'Operating Expenses', accountType: 'Expenses', parentCode: '5000', level: 2 },
];

const DEFAULT_ACCOUNTS = [
  { code: '1001', name: 'Cash-in-Hand', accountType: 'Assets', subType: 'current_asset', isSystemAccount: 1, parentCode: '1230' },
  { code: '1002', name: 'Bank OCC A/c (Current Account)', accountType: 'Assets', subType: 'current_asset', isSystemAccount: 1, parentCode: '1230' },
  { code: '1003', name: 'Bank OD A/c (Savings Account)', accountType: 'Assets', subType: 'current_asset', isSystemAccount: 1, parentCode: '1230' },
  { code: '1004', name: 'Bank OCC A/c (Cash Credit)', accountType: 'Assets', subType: 'current_asset', isSystemAccount: 1, parentCode: '1230' },
  { code: '1100', name: 'Sundry Debtors', accountType: 'Assets', subType: 'trade_receivable', isSystemAccount: 1, parentCode: '1220' },
  { code: '1200', name: 'Stock-in-Hand (Raw Materials)', accountType: 'Assets', subType: 'inventory', isSystemAccount: 1, parentCode: '1210' },
  { code: '1201', name: 'Stock-in-Hand (Finished Goods)', accountType: 'Assets', subType: 'inventory', isSystemAccount: 1, parentCode: '1210' },
  { code: '1202', name: 'Stock-in-Hand (Packing Materials)', accountType: 'Assets', subType: 'inventory', isSystemAccount: 1, parentCode: '1210' },
  { code: '1203', name: 'Stock-in-Hand (Spare Parts)', accountType: 'Assets', subType: 'inventory', isSystemAccount: 1, parentCode: '1210' },
  { code: '1300', name: 'Loans & Advances (Asset)', accountType: 'Assets', subType: 'current_asset', isSystemAccount: 1, parentCode: '1240' },

  { code: '2001', name: 'Sundry Creditors', accountType: 'Liabilities', subType: 'trade_payable', isSystemAccount: 1, parentCode: 'G2210' },
  { code: '2100', name: 'Advance from Customers', accountType: 'Liabilities', subType: 'advance_liability', isSystemAccount: 1, parentCode: '2230' },
  { code: '2200', name: 'Duties & Taxes - CGST Payable', accountType: 'Liabilities', subType: 'gst', isSystemAccount: 1, parentCode: '2240' },
  { code: '2201', name: 'Duties & Taxes - SGST Payable', accountType: 'Liabilities', subType: 'gst', isSystemAccount: 1, parentCode: '2240' },
  { code: '2202', name: 'Duties & Taxes - IGST Payable', accountType: 'Liabilities', subType: 'gst', isSystemAccount: 1, parentCode: '2240' },
  { code: '2210', name: 'Duties & Taxes - CGST Input Credit', accountType: 'Assets', subType: 'gst_input', isSystemAccount: 1, parentCode: '1250' },
  { code: '2211', name: 'Duties & Taxes - SGST Input Credit', accountType: 'Assets', subType: 'gst_input', isSystemAccount: 1, parentCode: '1250' },
  { code: '2212', name: 'Duties & Taxes - IGST Input Credit', accountType: 'Assets', subType: 'gst_input', isSystemAccount: 1, parentCode: '1250' },
  { code: '2300', name: 'Duties & Taxes - TDS Payable', accountType: 'Liabilities', subType: 'statutory', isSystemAccount: 1, parentCode: '2240' },
  { code: '2301', name: 'Duties & Taxes - TDS Receivable', accountType: 'Assets', subType: 'statutory', isSystemAccount: 1, parentCode: '1250' },
  { code: '2400', name: 'Secured Loans', accountType: 'Liabilities', subType: 'loan', isSystemAccount: 1, parentCode: '2110' },
  { code: '2401', name: 'Secured Loans - Term Loan (SBI)', accountType: 'Liabilities', subType: 'loan', isSystemAccount: 1, parentCode: '2110' },
  { code: '2402', name: 'Unsecured Loans', accountType: 'Liabilities', subType: 'loan', isSystemAccount: 1, parentCode: '2110' },

  { code: '3001', name: 'Capital Account', accountType: 'Equity', subType: 'capital', isSystemAccount: 1, parentCode: '3000' },
  { code: '3002', name: 'Drawings Account', accountType: 'Equity', subType: 'drawings', isSystemAccount: 1, parentCode: '3000' },
  { code: '3003', name: 'Profit & Loss A/c', accountType: 'Equity', subType: 'retained', isSystemAccount: 1, parentCode: '3200' },

  { code: '4001', name: 'Sales Account', accountType: 'Income', subType: 'operating', isSystemAccount: 1, parentCode: '4100' },
  { code: '4002', name: 'Debit Note Income', accountType: 'Income', subType: 'operating', isSystemAccount: 1, parentCode: '4100' },
  { code: '4003', name: 'Interest Earned', accountType: 'Income', subType: 'other_income', isSystemAccount: 1, parentCode: '4200' },
  { code: '4004', name: 'Other Income', accountType: 'Income', subType: 'other_income', isSystemAccount: 1, parentCode: '4200' },

  { code: '5001', name: 'Direct Expenses', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5002', name: 'Purchase Account', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5003', name: 'Purchases - Packing Materials', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5004', name: 'Purchases - Consumables', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5005', name: 'Freight Inward / Transport', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5006', name: 'Purchase Returns', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5100', name: 'Salary & Wages', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5101', name: 'Rent', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5102', name: 'Electricity & Utilities', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5103', name: 'Repairs & Maintenance', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5104', name: 'Legal & Professional Fees', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5105', name: 'Insurance', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5106', name: 'Bank Charges / Fees', accountType: 'Expenses', subType: 'financial', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5107', name: 'Interest Paid', accountType: 'Expenses', subType: 'financial', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5108', name: 'Travel Expenses', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5109', name: 'Fuel & Vehicle Expenses', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5110', name: 'Staff Welfare', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5111', name: 'Courier & Shipping', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5112', name: 'Printing & Stationery', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5113', name: 'Internet & Phone Bills', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5114', name: 'Furniture & Fixtures', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5115', name: 'Vehicle EMI / Loan Repayment', accountType: 'Expenses', subType: 'financial', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5116', name: 'Office Supplies', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5117', name: 'Spares & Consumables', accountType: 'Expenses', subType: 'manufacturing', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5118', name: 'Chemicals & Cleaning', accountType: 'Expenses', subType: 'manufacturing', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5119', name: 'Water Charges', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5120', name: 'MSME Charges / Compliance', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5121', name: 'Testing & Lab Fees', accountType: 'Expenses', subType: 'manufacturing', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5122', name: 'Security Charges', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5123', name: 'Housekeeping Expenses', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5124', name: 'AMC & Service Contracts', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5125', name: 'Licence & Renewal Fees', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5126', name: 'Loading & Unloading Charges', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5127', name: 'Pollution & Environmental Compliance', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5128', name: 'Safety Equipment & PPE', accountType: 'Expenses', subType: 'manufacturing', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5129', name: 'Diesel & Generator Expenses', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5130', name: 'Packaging Expenses', accountType: 'Expenses', subType: 'direct', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5131', name: 'Depreciation', accountType: 'Expenses', subType: 'other', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5132', name: 'Microbiology Lab Expenses', accountType: 'Expenses', subType: 'manufacturing', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5133', name: 'Chemical Lab Expenses', accountType: 'Expenses', subType: 'manufacturing', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5134', name: 'Consultant Fees', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5135', name: 'Contract Payments', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5136', name: 'Vehicle Contracts / Hiring', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5137', name: 'Loss on Scrap / Write-Off', accountType: 'Expenses', subType: 'other', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5200', name: 'Manufacturing Expenses', accountType: 'Expenses', subType: 'manufacturing', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5300', name: 'Indirect Expenses', accountType: 'Expenses', subType: 'operating', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5400', name: 'Miscellaneous Expenses', accountType: 'Expenses', subType: 'other', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5500', name: 'Bad Debts / Write-offs', accountType: 'Expenses', subType: 'other', isSystemAccount: 1, parentCode: 'G5200' },
  { code: '5600', name: 'Sales Returns', accountType: 'Expenses', subType: 'adjustment', isSystemAccount: 1, parentCode: 'G5100' },
  { code: '5700', name: 'Vendor Claims', accountType: 'Expenses', subType: 'adjustment', isSystemAccount: 1, parentCode: 'G5100' },
];

const DIRECTOR_LOAN_ACCOUNTS = [
  { code: '2402A', name: 'Loan - AnanthRaj Polamarasetty', parentCode: '2402', description: 'Unsecured loan from Director AnanthRaj Polamarasetty' },
  { code: '2402B', name: 'Loan - Chintalapudi Syam Srinivas', parentCode: '2402', description: 'Unsecured loan from Director Chintalapudi Syam Srinivas' },
  { code: '2402C', name: 'Loan - Dusi Prasanth Kumar', parentCode: '2402', description: 'Unsecured loan from Director Dusi Prasanth Kumar' },
  { code: '2402D', name: 'Loan - Pallavi Pathivada', parentCode: '2402', description: 'Unsecured loan from Director Pallavi Pathivada' },
  { code: '2402E', name: 'Loan - Santhi Priya Dusi', parentCode: '2402', description: 'Unsecured loan from Director Santhi Priya Dusi' },
  { code: '2402F', name: 'Loan - Satish Pediredla', parentCode: '2402', description: 'Unsecured loan from Director Satish Pediredla' },
  { code: '2402G', name: 'Loan - Padmaja Togara', parentCode: '2402', description: 'Unsecured loan from Director Padmaja Togara' },
  { code: '2402H', name: 'Loan - DVG Santosh', parentCode: '2402', description: 'Unsecured loan from Director DVG Santosh' },
  { code: '2402I', name: 'Loan - Chintalapudi Anuradha', parentCode: '2402', description: 'Unsecured loan from Director Chintalapudi Anuradha' },
];

export async function seedChartOfAccounts(): Promise<void> {
  // 1. Seed hierarchy groups first (ordered by level so parents exist before children)
  for (const group of HIERARCHY_GROUPS) {
    const existing = await storage.getChartOfAccountByCode(group.code);
    const parentId = group.parentCode
      ? (await storage.getChartOfAccountByCode(group.parentCode))?.id || null
      : null;
    if (!existing) {
      await storage.createChartOfAccount({
        code: group.code,
        name: group.name,
        accountType: group.accountType,
        nodeType: 'group',
        level: group.level,
        parentId,
        isSystemAccount: 1,
        isActive: 1,
      } as any);
      console.log(`[COA SEED] Created group: ${group.code} - ${group.name}`);
    } else {
      // Update existing account to ensure nodeType, level, and parentId are correct
      const updates: any = {};
      if (existing.nodeType !== 'group') updates.nodeType = 'group';
      if (existing.level !== group.level) updates.level = group.level;
      if (!existing.parentId && parentId) updates.parentId = parentId;
      if (Object.keys(updates).length > 0) {
        await storage.updateChartOfAccount(existing.id, updates);
        console.log(`[COA SEED] Updated group: ${group.code} - ${group.name} (${Object.keys(updates).join(', ')})`);
      }
    }
  }

  // 2. Seed ledger accounts with parent assignments
  for (const account of DEFAULT_ACCOUNTS) {
    const existing = await storage.getChartOfAccountByCode(account.code);
    const parentId = account.parentCode
      ? (await storage.getChartOfAccountByCode(account.parentCode))?.id || null
      : null;
    if (!existing) {
      await storage.createChartOfAccount({
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        subType: account.subType,
        nodeType: 'ledger',
        parentId,
        isSystemAccount: account.isSystemAccount,
        isActive: 1,
      } as any);
      console.log(`[COA SEED] Created account: ${account.code} - ${account.name}`);
    } else {
      // Update existing accounts — only fix parentId and level for legacy data.
      // NEVER overwrite nodeType — user may have intentionally converted a ledger to group.
      const updates: any = {};
      if (!existing.parentId && parentId) updates.parentId = parentId;
      if (parentId && existing.nodeType === 'ledger') {
        // Only fix level if it's still a ledger (don't recalculate level for user-converted groups)
        const parent = await storage.getChartOfAccount(parentId);
        const expectedLevel = parent ? (parent.level || 1) + 1 : 1;
        if (existing.level !== expectedLevel) updates.level = expectedLevel;
      }
      if (Object.keys(updates).length > 0) {
        await storage.updateChartOfAccount(existing.id, updates);
        console.log(`[COA SEED] Updated account: ${account.code} - ${account.name} (${Object.keys(updates).join(', ')})`);
      }
    }
  }

  // 2b. Upgrade Sundry Debtors (1100) to group so party sub-ledgers can be created under it
  const sundryDebtors = await storage.getChartOfAccountByCode(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
  if (sundryDebtors && sundryDebtors.nodeType !== 'group') {
    await storage.updateChartOfAccount(sundryDebtors.id, { nodeType: 'group' });
    console.log('[COA SEED] Upgraded Sundry Debtors (1100) to group for party-wise sub-ledger support');
  }

  // 2c. Upgrade Sundry Creditors (2001) to group so vendor sub-ledgers can be created under it
  const sundryCreditors = await storage.getChartOfAccountByCode(ACCOUNT_CODES.ACCOUNTS_PAYABLE);
  if (sundryCreditors && sundryCreditors.nodeType !== 'group') {
    await storage.updateChartOfAccount(sundryCreditors.id, { nodeType: 'group' });
    console.log('[COA SEED] Upgraded Sundry Creditors (2001) to group for party-wise sub-ledger support');
  }

  // 3. Seed director loan accounts
  for (const dirAcct of DIRECTOR_LOAN_ACCOUNTS) {
    const existing = await storage.getChartOfAccountByCode(dirAcct.code);
    const parent = await storage.getChartOfAccountByCode(dirAcct.parentCode);
    if (!existing) {
      if (parent) {
        await storage.createChartOfAccount({
          code: dirAcct.code,
          name: dirAcct.name,
          accountType: 'Liabilities',
          subType: 'loan',
          nodeType: 'ledger',
          parentId: parent.id,
          description: dirAcct.description,
          isSystemAccount: 1,
        } as any);
        console.log(`[COA SEED] Created director account: ${dirAcct.code} - ${dirAcct.name}`);
      }
    } else if (parent) {
      const updates: any = {};
      if (!existing.parentId) updates.parentId = parent.id;
      // NEVER overwrite nodeType — user may have intentionally converted this account
      if (Object.keys(updates).length > 0) {
        await storage.updateChartOfAccount(existing.id, updates);
        console.log(`[COA SEED] Updated director account: ${dirAcct.code} - ${dirAcct.name} (${Object.keys(updates).join(', ')})`);
      }
    }
  }

  // 4. Fix GST Input Credit accounts that may have wrong type
  const gstInputCodes = ['2210', '2211', '2212'];
  for (const code of gstInputCodes) {
    const acct = await storage.getChartOfAccountByCode(code);
    if (acct && (acct.accountType === 'liability' || acct.accountType === 'Liabilities')) {
      await storage.updateChartOfAccount(acct.id, { accountType: 'Assets', subType: 'gst_input' });
      console.log(`[COA SEED] Fixed ${code} ${acct.name}: liability -> asset`);
    }
  }

  // 5. Normalize old-format accountType values to new capitalized format
  const typeNormalizationMap: Record<string, string> = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    revenue: 'Income',
    expense: 'Expenses',
  };
  const allAccounts = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.recordStatus, 1));
  let normalizedCount = 0;
  for (const acct of allAccounts) {
    const newType = typeNormalizationMap[acct.accountType];
    if (newType) {
      await storage.updateChartOfAccount(acct.id, { accountType: newType });
      normalizedCount++;
    }
  }
  if (normalizedCount > 0) {
    console.log(`[COA SEED] Normalized ${normalizedCount} accounts from old to new accountType format`);
  }

  console.log('[COA SEED] Chart of Accounts seeding complete');

  await seedAccountingPermissions();
}

const ACCOUNTING_SCREEN_KEYS = [
  'chart_of_accounts', 'account_subtypes', 'journal_entries', 'manual_journal_entry', 'trial_balance', 'profit_loss', 'balance_sheet',
  'ledger_view', 'day_book', 'aging_report', 'cash_flow_statement', 'group_summary', 'budget_variance',
  'bank_transactions', 'expenses', 'cash_register', 'cash_register_report', 'documents', 'customer_advances',
  'payment_writeoff', 'vendor_debit_notes', 'dispatch_tracking', 'dispatch_masters',
  'template_management', 'notification_settings', 'cancelled_invoices_report', 'scrap_inventory',
  'mis_dashboard', 'mis_production', 'mis_inventory', 'mis_sales', 'mis_delivery',
  'sales_dashboard', 'vendor_analytics', 'report_gst', 'report_finished_goods',
  'machine_startup_reminders', 'whatsapp_analytics',
];

async function seedAccountingPermissions(): Promise<void> {
  try {
    const adminRoles = await db.select().from(roles).where(
      sql`lower(${roles.name}) = 'admin'`
    );

    const viewOnlyScreens = new Set([
      'ledger_view', 'day_book', 'aging_report', 'cash_flow_statement', 'group_summary',
    ]);

    for (const role of adminRoles) {
      const existingPerms = await storage.getRolePermissions(role.id);
      const existingKeys = new Set(existingPerms.map(p => p.screenKey));

      for (const screenKey of ACCOUNTING_SCREEN_KEYS) {
        if (!existingKeys.has(screenKey)) {
          await storage.createRolePermission({
            roleId: role.id,
            screenKey,
            canView: 1,
            canCreate: viewOnlyScreens.has(screenKey) ? 0 : 1,
            canEdit: viewOnlyScreens.has(screenKey) ? 0 : 1,
            canDelete: viewOnlyScreens.has(screenKey) ? 0 : 1,
          });
          console.log(`[COA SEED] Added ${screenKey} permission for role ${role.name}`);
        }
      }
    }
  } catch (err) {
    console.error('[COA SEED] Error seeding accounting permissions:', err);
  }
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

async function generateJournalNumber(isAuto: boolean, attempt: number = 0): Promise<string> {
  const prefix = isAuto ? 'AUTO' : 'JRN';
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const likePattern = `${prefix}-${dateStr}-%`;

  // Use MAX of the numeric suffix to avoid reusing numbers and to tolerate
  // concurrent inserts better than COUNT(*) does.
  const result = await db.execute(sql`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(journal_number FROM LENGTH(${prefix + '-' + dateStr + '-'}) + 1) AS INTEGER)
    ), 0) AS max_seq
    FROM journal_entries
    WHERE journal_number LIKE ${likePattern}
  `);
  const maxSeq = Number(result.rows?.[0]?.max_seq || 0);
  // Add attempt offset so retries don't race to the same number again
  const seq = maxSeq + 1 + attempt;
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
  // Check if entry_date falls within a locked period
  if (journalDate) {
    try {
      const lockedPeriod = await db.execute(sql`
        SELECT period_name FROM accounting_periods
        WHERE status = 'locked'
          AND ${journalDate}::date BETWEEN start_date AND end_date
        LIMIT 1
      `);
      if (lockedPeriod.rows.length > 0) {
        const p = lockedPeriod.rows[0] as any;
        throw new Error(`Period is locked: ${p.period_name}`);
      }
    } catch (e: any) {
      if (e.message?.startsWith('Period is locked')) throw e;
      // If accounting_periods table doesn't exist yet, skip the check
    }
  }

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

  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const journalNumber = await generateJournalNumber(isAuto, attempt);
      
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
      const isDuplicate = error.message?.includes('duplicate key') && error.message?.includes('journal_number');
      if (isDuplicate && attempt < MAX_RETRIES - 1) {
        // Another concurrent journal grabbed the same number — retry with next available
        continue;
      }
      console.error(`[JOURNAL] Error creating journal: ${error.message}`);
      return null;
    }
  }
  console.error(`[JOURNAL] Failed after ${MAX_RETRIES} retries for: ${description}`);
  return null;
}

// ============================================================
// AUTO-GENERATION FUNCTIONS
// ============================================================

export async function journalForInvoice(invoice: any): Promise<void> {
  const subtotal = Number(invoice.subtotal) || 0;
  const cgst = Number(invoice.cgstAmount) || 0;
  const sgst = Number(invoice.sgstAmount) || 0;
  const igst = Number(invoice.igstAmount) || 0;
  const totalAmount = Number(invoice.totalAmount) || Number(invoice.grandTotal) || 0;

  if (totalAmount === 0 && subtotal === 0) return;

  const salesRevenue = totalAmount - cgst - sgst - igst;
  const debtorAccountCode = await getOrCreateDebtorAccount(invoice.buyerName);

  const lines: JournalLineInput[] = [
    { accountCode: debtorAccountCode, debit: totalAmount, credit: 0, memo: `Invoice ${invoice.invoiceNumber}`, partyType: 'vendor', partyName: invoice.buyerName },
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

export async function journalForInvoiceCancellation(invoice: any, reason?: string): Promise<void> {
  // For current-period cancellations, the correct accounting treatment is to void
  // the original invoice journal rather than posting a reversal entry.
  // Posting a reversal would leave a permanent debit-sales / credit-debtor entry in the
  // books with no offsetting original — resulting in a negative revenue balance.
  //
  // Instead: mark the original invoice journal (sourceType='invoice', sourceId=invoice.id)
  // as inactive (record_status = 0) along with all its lines.
  const label = reason ? ` (${reason})` : '';
  try {
    const existing: any[] = (await db.execute(sql`
      SELECT id FROM journal_entries
      WHERE source_type = 'invoice' AND source_id = ${invoice.id} AND record_status = 1
      LIMIT 1
    `)).rows;

    if (existing.length === 0) {
      console.log(`[JOURNAL] Invoice cancellation: no active journal found for invoice ${invoice.id}${label}`);
      return;
    }

    const jeId = existing[0].id;
    await db.execute(sql`UPDATE journal_entries SET record_status = 0 WHERE id = ${jeId}`);
    await db.execute(sql`UPDATE journal_lines SET record_status = 0 WHERE journal_id = ${jeId}`);
    console.log(`[JOURNAL] Voided journal ${jeId} for cancelled invoice ${invoice.invoiceNumber}${label}`);
  } catch (e: any) {
    console.error(`[JOURNAL] Failed to void journal for invoice ${invoice.id}:`, e.message);
  }
}

export async function journalForPayment(payment: any, invoice: any): Promise<void> {
  const amount = Number(payment.amount) || 0;
  const method = (payment.paymentMethod || '').toLowerCase();
  const accountCode = (method === 'cash') ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_CURRENT;
  const debtorAccountCode = await getOrCreateDebtorAccount(invoice?.buyerName || payment.payerName || '');

  await createJournalWithLines(
    payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Payment received: ${invoice?.invoiceNumber || 'Unknown'} - ${payment.paymentMethod}${payment.referenceNumber ? ` (${payment.referenceNumber})` : ''}`,
    [
      { accountCode, debit: amount, credit: 0, memo: `${payment.paymentMethod} payment${payment.referenceNumber ? ' Ref: ' + payment.referenceNumber : ''}`, partyType: 'vendor', partyName: payment.payerName || invoice?.buyerName },
      { accountCode: debtorAccountCode, debit: 0, credit: amount, memo: `Payment against Invoice ${invoice?.invoiceNumber || ''}`, partyType: 'vendor', partyName: invoice?.buyerName },
    ],
    { sourceType: 'payment', sourceId: payment.id, isAutoGenerated: true }
  );
}

export async function journalForCustomerAdvance(advance: any, vendorName: string): Promise<void> {
  const amount = Number(advance.amount) || 0;
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
  const amount = Number(application.appliedAmount) || 0;
  const debtorAccountCode = await getOrCreateDebtorAccount(vendorName);

  await createJournalWithLines(
    application.applicationDate || new Date().toISOString().slice(0, 10),
    `Advance applied: ${advance?.advanceNumber || ''} to Invoice ${invoice?.invoiceNumber || ''}`,
    [
      { accountCode: ACCOUNT_CODES.CUSTOMER_ADVANCES, debit: amount, credit: 0, memo: `Advance ${advance?.advanceNumber} applied`, partyType: 'vendor', partyName: vendorName },
      { accountCode: debtorAccountCode, debit: 0, credit: amount, memo: `Against Invoice ${invoice?.invoiceNumber}`, partyType: 'vendor', partyName: vendorName },
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

  const debtorAccountCode = await getOrCreateDebtorAccount(buyerName || '');
  lines.push({ accountCode: debtorAccountCode, debit: 0, credit: grandTotal, memo: `Credit Note ${creditNote.noteNumber}${invoiceNumber ? ' against ' + invoiceNumber : ''}`, partyType: 'vendor', partyName: buyerName });

  await createJournalWithLines(
    creditNote.creditDate || new Date().toISOString().slice(0, 10),
    `Credit Note: ${creditNote.noteNumber}${invoiceNumber ? ' against Invoice ' + invoiceNumber : ''} - ${buyerName || ''}`,
    lines,
    { sourceType: 'credit_note', sourceId: creditNote.id, isAutoGenerated: true }
  );
}

export async function journalForExpenseVoucher(voucher: any): Promise<void> {
  const totalAmount = Number(voucher.totalAmount) || 0;
  const gstAmount = Number(voucher.gstAmount) || 0;
  const subtotal = Number(voucher.subtotal) || (totalAmount - gstAmount) || 0;
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
  const amount = Number(payment.amount) || 0;
  const debtorAccountCode = await getOrCreateDebtorAccount(invoice?.buyerName || '');

  await createJournalWithLines(
    payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Payment Write-off: Invoice ${invoice?.invoiceNumber || ''} - ${invoice?.buyerName || ''}`,
    [
      { accountCode: ACCOUNT_CODES.BAD_DEBTS, debit: amount, credit: 0, memo: `Write-off for Invoice ${invoice?.invoiceNumber || ''}` },
      { accountCode: debtorAccountCode, debit: 0, credit: amount, memo: `Write-off balance`, partyType: 'vendor', partyName: invoice?.buyerName },
    ],
    { sourceType: 'write_off', sourceId: payment.id, isAutoGenerated: true }
  );
}

export async function journalForDebitNote(debitNote: any, buyerName?: string): Promise<void> {
  const cgst = Number(debitNote.cgstAmount) || 0;
  const sgst = Number(debitNote.sgstAmount) || 0;
  const igst = Number(debitNote.igstAmount) || 0;
  const grandTotal = Number(debitNote.grandTotal) || 0;
  const income = grandTotal - cgst - sgst - igst;  // derived — always balances
  const debtorAccountCode = await getOrCreateDebtorAccount(buyerName || '');

  const lines: JournalLineInput[] = [
    { accountCode: debtorAccountCode, debit: grandTotal, credit: 0, memo: `Debit Note ${debitNote.noteNumber}` },
    { accountCode: ACCOUNT_CODES.DEBIT_NOTE_INCOME, debit: 0, credit: income, memo: `Corrective debit note ${debitNote.noteNumber}` },
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

  const creditorAccountCode = await getOrCreateCreditorAccount(vendorName);
  const lines: JournalLineInput[] = [
    { accountCode: creditorAccountCode, debit: grandTotal, credit: 0, memo: `Vendor Debit Note ${debitNote.noteNumber}`, partyType: 'vendor', partyName: vendorName },
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
  // adjustmentAmount is stored in paise (same unit as VDN grandTotal)
  const amount = Number(adjustment.adjustmentAmount) || 0;
  if (amount <= 0) return;

  const creditorAccountCode = await getOrCreateCreditorAccount(vendorName);

  let creditAccountCode: string;
  let creditMemo: string;

  if (adjustment.referenceType === 'invoice') {
    // Vendor (acting as customer) uses the VDN credit to pay their sales invoice
    // Dr Vendor Claims (close the claim), Cr Debtor (reduce their A/R)
    const buyerName = adjustment.buyerName || vendorName;
    creditAccountCode = await getOrCreateDebtorAccount(buyerName);
    creditMemo = `VDN ${debitNote.noteNumber} applied to Invoice (${buyerName})`;
  } else {
    // VDN applied to a Purchase Order — offset the AP balance
    // Dr Vendor Claims (close the claim), Cr Creditor (re-credit AP)
    creditAccountCode = creditorAccountCode;
    creditMemo = `VDN ${debitNote.noteNumber} applied to PO (${vendorName})`;
  }

  await createJournalWithLines(
    adjustment.adjustmentDate || new Date().toISOString().slice(0, 10),
    `VDN Adjustment: ${debitNote.noteNumber} - ${vendorName}`,
    [
      { accountCode: ACCOUNT_CODES.VENDOR_CLAIMS, debit: amount, credit: 0, memo: `Settle claim: ${debitNote.noteNumber}`, partyType: 'vendor', partyName: vendorName },
      { accountCode: creditAccountCode, debit: 0, credit: amount, memo: creditMemo, partyType: 'vendor', partyName: vendorName },
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

export async function journalForCashRegisterCashReceived(transaction: any, day: any): Promise<void> {
  const amount = Number(transaction.amount) || 0;
  if (amount <= 0) return;

  const amountPaise = amount * 100;
  const dateStr = day?.registerDate || new Date().toISOString().slice(0, 10);
  const salesperson = day?.salespersonName || 'Unknown';
  const partyName = transaction.partyName || transaction.reference || transaction.description || 'Cash Receipt';

  await createJournalWithLines(
    dateStr,
    `Cash Received: ${partyName} (${salesperson})`,
    [
      { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debit: amountPaise, credit: 0, memo: `Cash received from ${partyName}` },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: 0, credit: amountPaise, memo: `Cash sale / collection from ${partyName}` },
    ],
    { sourceType: 'cash_register_cash_received', sourceId: transaction.id, isAutoGenerated: true }
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
    `Cash Transfer: ${ref} (from ${salesperson})`,
    [
      { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debit: amountPaise, credit: 0, memo: `Cash received by ${ref}`, partyType: 'other', partyName: ref },
      { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debit: 0, credit: amountPaise, memo: `Cash sent by ${salesperson}`, partyType: 'other', partyName: salesperson },
    ],
    { sourceType: 'cash_register_transfer', sourceId: transaction.id, isAutoGenerated: true }
  );
}

// ============================================================
// MANUFACTURING / INVENTORY JOURNAL FUNCTIONS
// ============================================================

export async function journalForRawMaterialIssuance(issuance: any, items: any[], materialNames: Record<string, string>): Promise<void> {
  let totalPaise = 0;
  const itemMemos: string[] = [];

  for (const item of items) {
    const qty = Number(item.quantityIssued) || 0;
    const unitCost = Number(item.unitCost) || 0;
    totalPaise += Math.round(unitCost * qty * 100);
    const matName = materialNames[item.rawMaterialId] || item.rawMaterialId;
    itemMemos.push(`${matName}: ${qty} units @ ${unitCost.toFixed(2)}`);
  }

  if (totalPaise <= 0) {
    console.log(`[JOURNAL] Skipping material issuance ${issuance.issuanceNumber || issuance.id}: total cost is zero (unit costs may not be set)`);
    return;
  }

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
  if (value <= 0) {
    console.log(`[JOURNAL] Skipping production entry ${productionEntry.id}: costValue=${costValue} (link an issuance with costed materials to enable journaling)`);
    return;
  }

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

export async function journalForDirectScrap(scrap: any): Promise<void> {
  const totalCost = Math.round(Number(scrap.totalCostValue) || 0);
  if (totalCost <= 0) return;

  const productName = scrap.productName || 'Product';
  const qty = Number(scrap.quantity) || 0;
  const batch = scrap.batchNumber ? ` (Batch: ${scrap.batchNumber})` : '';

  await createJournalWithLines(
    scrap.scrapDate ? String(scrap.scrapDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Direct Scrap: ${scrap.scrapNumber} - ${productName} ${qty} units${batch}`,
    [
      { accountCode: ACCOUNT_CODES.LOSS_ON_SCRAP, debit: totalCost, credit: 0, memo: `Scrap loss: ${productName} ${qty} units${batch}, Reason: ${scrap.damageReason}` },
      { accountCode: ACCOUNT_CODES.INVENTORY_FINISHED_GOODS, debit: 0, credit: totalCost, memo: `Stock written off: ${scrap.scrapNumber}` },
    ],
    { sourceType: 'direct_scrap', sourceId: scrap.id, isAutoGenerated: true }
  );
}

export async function journalForRawMaterialReceipt(material: any): Promise<void> {
  const qty = Number(material.currentStock) || Number(material.openingStock) || Number(material.quantity) || 0;
  const unitCost = Number(material.unitCost) || 0;
  const gstRate = Number(material.gstRate) || 0;

  if (qty <= 0 || unitCost <= 0) {
    console.log(`[JOURNAL] Skipping raw material receipt for ${material.materialName || material.id}: qty=${qty}, unitCost=${unitCost} (set unit cost to enable journaling)`);
    return;
  }

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

  const rawMatCreditorCode = await getOrCreateCreditorAccount(material.supplier || 'Unknown Vendor');
  lines.push({ accountCode: rawMatCreditorCode, debit: 0, credit: totalPayable, memo: `Purchase of ${material.materialName}`, partyType: 'vendor', partyName: material.supplier || 'Unknown Vendor' });

  const receiptDate = material.receivedDate || material.openingDate || material.createdAt;

  await createJournalWithLines(
    receiptDate ? String(receiptDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    `Raw Material Receipt: ${material.materialName} - ${qty} units`,
    lines,
    { sourceType: 'material_receipt', sourceId: material.id, isAutoGenerated: true }
  );
}

// Spare Part Receipt (Purchase)
// Debit: Inventory - Spare Parts (base cost)
// Debit: GST Input CGST/SGST (if applicable)
// Credit: Accounts Payable (total with GST)
export async function journalForSparePartReceipt(
  entry: { id: string; purchaseDate: string; quantity: number; unitPrice: number; gstPercent?: number; gstAmount?: number; totalAmount?: number; remarks?: string },
  partName: string,
  vendorName?: string
): Promise<void> {
  const qty = Number(entry.quantity) || 0;
  const unitPrice = Number(entry.unitPrice) || 0;
  if (qty <= 0 || unitPrice <= 0) return;

  const baseValue = Math.round(unitPrice * qty * 100);
  const gstPercent = Number(entry.gstPercent) || 0;
  const gstValue = entry.gstAmount ? Math.round(Number(entry.gstAmount) * 100) : Math.round(baseValue * (gstPercent / 100));
  const totalPayable = entry.totalAmount ? Math.round(Number(entry.totalAmount) * 100) : (baseValue + gstValue);

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.INVENTORY_SPARE_PARTS, debit: baseValue, credit: 0, memo: `${partName} - ${qty} units @ ${unitPrice}` },
  ];

  if (gstValue > 0) {
    const cgst = Math.round(gstValue / 2);
    const sgst = gstValue - cgst;
    lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_INPUT, debit: cgst, credit: 0, memo: 'CGST Input on spare part purchase' });
    lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_INPUT, debit: sgst, credit: 0, memo: 'SGST Input on spare part purchase' });
  }

  const sparePartCreditorCode = await getOrCreateCreditorAccount(vendorName || 'Unknown Vendor');
  lines.push({
    accountCode: sparePartCreditorCode, debit: 0, credit: totalPayable,
    memo: `Purchase of spare part: ${partName}`,
    partyType: 'vendor', partyName: vendorName || 'Unknown Vendor',
  });

  await createJournalWithLines(
    String(entry.purchaseDate).slice(0, 10),
    `Spare Part Receipt: ${partName} - ${qty} units`,
    lines,
    { sourceType: 'spare_part_receipt', sourceId: entry.id, isAutoGenerated: true }
  );
}

// Spare Part Issuance (Usage/Consumption)
// Debit: Repairs & Maintenance (cost of parts consumed)
// Credit: Inventory - Spare Parts (cost of parts removed from stock)
export async function journalForSparePartIssuance(
  issuance: { id: string; issueDate: string; quantity: number; purpose?: string },
  partName: string,
  unitPrice: number
): Promise<void> {
  const qty = Number(issuance.quantity) || 0;
  const price = Number(unitPrice) || 0;
  if (qty <= 0 || price <= 0) return;

  const costValue = Math.round(price * qty * 100);
  const purposeNote = issuance.purpose ? ` (${issuance.purpose})` : '';

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.REPAIRS_MAINTENANCE, debit: costValue, credit: 0, memo: `Spare part consumed: ${partName} - ${qty} units${purposeNote}` },
    { accountCode: ACCOUNT_CODES.INVENTORY_SPARE_PARTS, debit: 0, credit: costValue, memo: `Issued: ${partName} - ${qty} units` },
  ];

  await createJournalWithLines(
    String(issuance.issueDate).slice(0, 10),
    `Spare Part Issuance: ${partName} - ${qty} units${purposeNote}`,
    lines,
    { sourceType: 'spare_part_issuance', sourceId: issuance.id, isAutoGenerated: true }
  );
}

// Monthly Expense Payment
// Debit: Operating Expenses (category-labelled)
// Credit: Cash or Bank
export async function journalForMonthlyExpensePayment(
  payment: any,
  expense: any
): Promise<void> {
  const amount = Number(payment.amount) || 0;
  if (amount <= 0) return;

  const method = (payment.paymentMode || '').toLowerCase();
  const accountCode = method === 'cash' ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_CURRENT;
  const expenseName = expense?.name || 'Monthly Expense';
  const expenseMonth = expense?.expenseMonth || '';
  const refNote = payment.referenceNumber ? ` (Ref: ${payment.referenceNumber})` : '';

  await createJournalWithLines(
    payment.paymentDate || new Date().toISOString().slice(0, 10),
    `Monthly Expense Payment: ${expenseName} - ${expenseMonth}${refNote}`,
    [
      { accountCode: ACCOUNT_CODES.OPERATING_EXPENSES, debit: amount, credit: 0, memo: `${expenseName} - ${expenseMonth}` },
      { accountCode, debit: 0, credit: amount, memo: `Payment via ${payment.paymentMode || 'N/A'}${refNote}`, partyType: 'vendor', partyName: payment.paidBy || '' },
    ],
    { sourceType: 'monthly_expense_payment', sourceId: payment.id, isAutoGenerated: true }
  );
}

// ============ FIX: Repair broken invoice journal entries ============

export async function fixInvoiceJournalEntries(): Promise<{
  found: number;
  deleted: number;
  regenerated: number;
  errors: number;
  details: Array<{ invoiceId: string; invoiceNumber: string; action: string; oldAmount: number; newAmount: number }>;
}> {
  const result = {
    found: 0,
    deleted: 0,
    regenerated: 0,
    errors: 0,
    details: [] as Array<{ invoiceId: string; invoiceNumber: string; action: string; oldAmount: number; newAmount: number }>,
  };

  console.log('[FIX-JOURNALS] Starting invoice journal repair...');

  const brokenEntries: any[] = (await db.execute(sql`
    SELECT je.id as journal_id, je.source_id, je.total_debit, je.total_credit,
           i.invoice_number, i.total_amount, i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount,
           i.invoice_date, i.buyer_name
    FROM journal_entries je
    JOIN invoices i ON je.source_id = i.id
    WHERE je.source_type = 'invoice'
      AND je.record_status = 1
      AND i.record_status = 1
      AND i.status != 'cancelled'
      AND (
        je.total_debit = 0
        OR je.total_credit = 0
        OR je.total_debit != i.total_amount
      )
  `)).rows;

  result.found = brokenEntries.length;
  console.log(`[FIX-JOURNALS] Found ${brokenEntries.length} broken invoice journal entries`);

  for (const entry of brokenEntries) {
    try {
      const oldAmount = Number(entry.total_debit) || 0;
      const expectedAmount = Number(entry.total_amount) || 0;

      await db.execute(sql`DELETE FROM journal_lines WHERE journal_id = ${entry.journal_id}`);
      await db.execute(sql`DELETE FROM journal_entries WHERE id = ${entry.journal_id}`);
      result.deleted++;

      await journalForInvoice({
        id: entry.source_id,
        invoiceNumber: entry.invoice_number,
        invoiceDate: entry.invoice_date,
        buyerName: entry.buyer_name || 'Unknown',
        subtotal: Number(entry.subtotal) || 0,
        cgstAmount: Number(entry.cgst_amount) || 0,
        sgstAmount: Number(entry.sgst_amount) || 0,
        igstAmount: Number(entry.igst_amount) || 0,
        totalAmount: expectedAmount,
      });
      result.regenerated++;

      result.details.push({
        invoiceId: entry.source_id,
        invoiceNumber: entry.invoice_number,
        action: 'fixed',
        oldAmount,
        newAmount: expectedAmount,
      });

      console.log(`[FIX-JOURNALS] Fixed ${entry.invoice_number}: ${oldAmount} -> ${expectedAmount}`);
    } catch (e: any) {
      result.errors++;
      result.details.push({
        invoiceId: entry.source_id,
        invoiceNumber: entry.invoice_number,
        action: `error: ${e.message}`,
        oldAmount: Number(entry.total_debit) || 0,
        newAmount: 0,
      });
      console.error(`[FIX-JOURNALS] Error fixing ${entry.invoice_number}:`, e.message);
    }
  }

  const missingInvoices: any[] = (await db.execute(sql`
    SELECT i.id, i.invoice_number, i.invoice_date, i.buyer_name,
           i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount, i.total_amount
    FROM invoices i
    WHERE i.record_status = 1
      AND i.status != 'cancelled'
      AND (i.total_amount > 0 OR i.subtotal > 0)
      AND NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.source_type = 'invoice' AND je.source_id = i.id AND je.record_status = 1
      )
  `)).rows;

  console.log(`[FIX-JOURNALS] Found ${missingInvoices.length} invoices without journal entries`);

  for (const inv of missingInvoices) {
    try {
      const expectedAmount = Number(inv.total_amount) || 0;
      await journalForInvoice({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        buyerName: inv.buyer_name || 'Unknown',
        subtotal: Number(inv.subtotal) || 0,
        cgstAmount: Number(inv.cgst_amount) || 0,
        sgstAmount: Number(inv.sgst_amount) || 0,
        igstAmount: Number(inv.igst_amount) || 0,
        totalAmount: expectedAmount,
      });
      result.regenerated++;
      result.details.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        action: 'created_missing',
        oldAmount: 0,
        newAmount: expectedAmount,
      });
    } catch (e: any) {
      result.errors++;
      console.error(`[FIX-JOURNALS] Error creating missing journal for ${inv.invoice_number}:`, e.message);
    }
  }

  console.log(`[FIX-JOURNALS] Complete: ${result.found} broken found, ${result.deleted} deleted, ${result.regenerated} regenerated, ${result.errors} errors`);
  return result;
}

// ============ FIX: Reclassify write-off/adjustment payment journals ============

export async function fixPaymentJournals(): Promise<{
  adjustmentsFixed: number;
  writeOffsFixed: number;
  errors: number;
  details: Array<{ id: string; paymentType: string; invoiceNumber: string; amount: number; action: string }>;
}> {
  const result = {
    adjustmentsFixed: 0,
    writeOffsFixed: 0,
    errors: 0,
    details: [] as Array<{ id: string; paymentType: string; invoiceNumber: string; amount: number; action: string }>,
  };

  // 1. Find Adjustment payments that have incorrect 'payment' journal entries
  // These should NOT have payment journals — they already have vdn_adjustment journals
  console.log('[FIX-PAYMENT-JOURNALS] Finding misclassified Adjustment payment journals...');
  const adjustmentPayments: any[] = (await db.execute(sql`
    SELECT je.id as journal_id, je.source_id, je.description, je.total_debit,
           ip.payment_type, ip.amount, i.invoice_number
    FROM journal_entries je
    JOIN invoice_payments ip ON je.source_id = ip.id
    LEFT JOIN invoices i ON ip.invoice_id = i.id
    WHERE je.record_status = 1 
      AND je.is_auto_generated = 1
      AND je.source_type = 'payment'
      AND ip.payment_type = 'Adjustment'
      AND ip.record_status = 1
  `)).rows;

  for (const entry of adjustmentPayments) {
    try {
      // Soft-delete the incorrect payment journal entry and its lines
      await db.execute(sql`UPDATE journal_entries SET record_status = 0 WHERE id = ${entry.journal_id}`);
      await db.execute(sql`UPDATE journal_lines SET record_status = 0 WHERE journal_id = ${entry.journal_id}`);
      result.adjustmentsFixed++;
      result.details.push({
        id: entry.journal_id,
        paymentType: 'Adjustment',
        invoiceNumber: entry.invoice_number || 'Unknown',
        amount: entry.total_debit || entry.amount || 0,
        action: 'removed_duplicate',
      });
      console.log(`[FIX-PAYMENT-JOURNALS] Removed duplicate payment journal for Adjustment: ${entry.invoice_number}`);
    } catch (e: any) {
      result.errors++;
      console.error(`[FIX-PAYMENT-JOURNALS] Error fixing adjustment ${entry.journal_id}:`, e.message);
      result.details.push({
        id: entry.journal_id,
        paymentType: 'Adjustment',
        invoiceNumber: entry.invoice_number || 'Unknown',
        amount: entry.total_debit || 0,
        action: `error: ${e.message}`,
      });
    }
  }

  // 2. Find Write-off payments that have incorrect 'payment' journal entries
  // These should have 'write_off' journals (Debit Bad Debts, Credit AR) instead of 'payment' (Debit Bank, Credit AR)
  console.log('[FIX-PAYMENT-JOURNALS] Finding misclassified Write-off payment journals...');
  const writeOffPayments: any[] = (await db.execute(sql`
    SELECT je.id as journal_id, je.source_id, je.description, je.total_debit,
           ip.id as payment_id, ip.payment_type, ip.amount, ip.payment_date,
           i.invoice_number, i.buyer_name
    FROM journal_entries je
    JOIN invoice_payments ip ON je.source_id = ip.id
    LEFT JOIN invoices i ON ip.invoice_id = i.id
    WHERE je.record_status = 1 
      AND je.is_auto_generated = 1
      AND je.source_type = 'payment'
      AND ip.payment_type = 'Write-off'
      AND ip.record_status = 1
  `)).rows;

  for (const entry of writeOffPayments) {
    try {
      // Check if a correct write_off journal already exists
      const existingWriteOff: any[] = (await db.execute(sql`
        SELECT id FROM journal_entries 
        WHERE source_type = 'write_off' AND source_id = ${entry.payment_id} AND record_status = 1
        LIMIT 1
      `)).rows;

      // Soft-delete the incorrect payment journal
      await db.execute(sql`UPDATE journal_entries SET record_status = 0 WHERE id = ${entry.journal_id}`);
      await db.execute(sql`UPDATE journal_lines SET record_status = 0 WHERE journal_id = ${entry.journal_id}`);

      // If no correct write_off journal exists, create one
      if (existingWriteOff.length === 0) {
        await journalForWriteOff(
          { id: entry.payment_id, amount: entry.amount || 0, paymentDate: entry.payment_date },
          { invoiceNumber: entry.invoice_number || 'Unknown', buyerName: entry.buyer_name || 'Unknown' }
        );
        result.details.push({
          id: entry.journal_id,
          paymentType: 'Write-off',
          invoiceNumber: entry.invoice_number || 'Unknown',
          amount: entry.amount || 0,
          action: 'reclassified',
        });
      } else {
        result.details.push({
          id: entry.journal_id,
          paymentType: 'Write-off',
          invoiceNumber: entry.invoice_number || 'Unknown',
          amount: entry.amount || 0,
          action: 'removed_duplicate',
        });
      }

      result.writeOffsFixed++;
      console.log(`[FIX-PAYMENT-JOURNALS] Fixed write-off journal for: ${entry.invoice_number}`);
    } catch (e: any) {
      result.errors++;
      console.error(`[FIX-PAYMENT-JOURNALS] Error fixing write-off ${entry.journal_id}:`, e.message);
      result.details.push({
        id: entry.journal_id,
        paymentType: 'Write-off',
        invoiceNumber: entry.invoice_number || 'Unknown',
        amount: entry.amount || 0,
        action: `error: ${e.message}`,
      });
    }
  }

  console.log(`[FIX-PAYMENT-JOURNALS] Complete: ${result.adjustmentsFixed} adjustments fixed, ${result.writeOffsFixed} write-offs fixed, ${result.errors} errors`);
  return result;
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
  sparePartReceipts: { processed: number; skipped: number; errors: number };
  sparePartIssuances: { processed: number; skipped: number; errors: number };
  total: { processed: number; skipped: number; errors: number };
  orphansRemoved: number;
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
    sparePartReceipts: { processed: 0, skipped: 0, errors: 0 },
    sparePartIssuances: { processed: 0, skipped: 0, errors: 0 },
    cashRegisterDeposits: { processed: 0, skipped: 0, errors: 0 },
    cashRegisterTransfers: { processed: 0, skipped: 0, errors: 0 },
    cashRegisterCashReceived: { processed: 0, skipped: 0, errors: 0 },
    cashRegisterExpenses: { processed: 0, skipped: 0, errors: 0 },
    total: { processed: 0, skipped: 0, errors: 0 },
  };

  async function hasJournal(sourceType: string, sourceId: string): Promise<boolean> {
    const existing = await storage.getJournalEntryBySource(sourceType, sourceId);
    return !!existing;
  }

  // 0. Cleanup orphaned journal entries (source transaction deleted or record_status=0)
  console.log('[BACKFILL] Starting orphan cleanup...');
  let orphansRemoved = 0;
  try {
    const sourceTableMap: Record<string, { table: string; statusFilter?: string }> = {
      invoice: { table: 'invoices', statusFilter: "AND status != 'cancelled'" },
      payment: { table: 'invoice_payments', statusFilter: "AND (payment_type IS NULL OR payment_type NOT IN ('Write-off', 'Adjustment'))" },
      write_off: { table: 'invoice_payments', statusFilter: "AND payment_type = 'Write-off'" },
      credit_note: { table: 'credit_notes' },
      customer_advance: { table: 'customer_advances' },
      advance_application: { table: 'advance_applications' },
      vendor_debit_note: { table: 'vendor_debit_notes' },
      vdn_adjustment: { table: 'vendor_debit_note_adjustments' },
      expense: { table: 'expense_vouchers' },
      material_receipt: { table: 'raw_materials' },
      material_issuance: { table: 'raw_material_issuance' },
      production_entry: { table: 'production_entries' },
      spare_part_receipt: { table: 'spare_part_receipts' },
      spare_part_issuance: { table: 'spare_part_issuances' },
      cash_register_deposit: { table: 'cash_register_transactions' },
      cash_register_transfer: { table: 'cash_register_transactions' },
      cash_register_cash_received: { table: 'cash_register_transactions' },
    };

    const autoJournals: any[] = (await db.execute(sql`
      SELECT id, source_type, source_id FROM journal_entries 
      WHERE record_status = 1 AND is_auto_generated = 1 AND source_type IS NOT NULL AND source_id IS NOT NULL
    `)).rows;

    for (const je of autoJournals) {
      const mapping = sourceTableMap[je.source_type];
      if (!mapping) continue;

      const checkResult: any[] = (await db.execute(
        sql.raw(`SELECT id FROM ${mapping.table} WHERE id = '${je.source_id}' AND record_status = 1 ${mapping.statusFilter || ''} LIMIT 1`)
      )).rows;

      if (checkResult.length === 0) {
        await db.execute(sql`UPDATE journal_entries SET record_status = 0 WHERE id = ${je.id}`);
        await db.execute(sql`UPDATE journal_lines SET record_status = 0 WHERE journal_id = ${je.id}`);
        orphansRemoved++;
      }
    }
  } catch (e: any) {
    console.error('[BACKFILL] Orphan cleanup error:', e.message);
  }
  console.log(`[BACKFILL] Orphan cleanup done: ${orphansRemoved} orphaned entries removed`);

  // 0b. Fix misclassified payment journals (write-offs/adjustments recorded as regular payments)
  console.log('[BACKFILL] Fixing misclassified payment journals...');
  try {
    const fixResult = await fixPaymentJournals();
    console.log(`[BACKFILL] Payment journal fix: ${fixResult.adjustmentsFixed} adjustments removed, ${fixResult.writeOffsFixed} write-offs reclassified, ${fixResult.errors} errors`);
  } catch (e: any) {
    console.error('[BACKFILL] Payment journal fix error:', e.message);
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
      console.log(`[BACKFILL] Creating journal for invoice ${inv.invoice_number} (id: ${inv.id})`);
      await journalForInvoice({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        buyerName: inv.buyer_name || 'Unknown',
        subtotal: Number(inv.subtotal) || 0,
        cgstAmount: Number(inv.cgst_amount) || 0,
        sgstAmount: Number(inv.sgst_amount) || 0,
        igstAmount: Number(inv.igst_amount) || 0,
        totalAmount: Number(inv.total_amount) || 0,
      });
      results.invoices.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Invoice ${inv.invoice_number} error:`, e.message);
      results.invoices.errors++;
    }
  }
  console.log(`[BACKFILL] Invoices done: ${results.invoices.processed} created, ${results.invoices.skipped} skipped, ${results.invoices.errors} errors`);

  // 2. Backfill Payments (excludes write-offs and VDN adjustments which have their own journal entries)
  console.log('[BACKFILL] Starting payments...');
  const allPayments: any[] = (await db.execute(sql`
    SELECT p.id, p.invoice_id, p.payment_date, p.amount, p.payment_method, p.reference_number, p.payer_name,
           i.invoice_number, i.buyer_name
    FROM invoice_payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE p.record_status = 1 
      AND (p.payment_type IS NULL OR p.payment_type NOT IN ('Write-off', 'Adjustment'))
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
    WHERE p.record_status = 1 AND p.payment_type = 'Write-off'
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
  const allVdnAdjustments: any[] = (await db.execute(sql`
    SELECT a.id, a.vendor_debit_note_id, a.reference_type, a.invoice_id, a.purchase_order_id,
           a.adjustment_amount, a.adjustment_date, a.remarks,
           d.note_number, d.vendor_id, d.debit_date,
           v.vendor_name,
           i.buyer_name
    FROM vendor_debit_note_adjustments a
    JOIN vendor_debit_notes d ON d.id = a.vendor_debit_note_id
    LEFT JOIN vendors v ON v.id = d.vendor_id
    LEFT JOIN invoices i ON i.id = a.invoice_id
    WHERE a.record_status = 1
  `)).rows;

  for (const adj of allVdnAdjustments) {
    try {
      if (await hasJournal('vdn_adjustment', adj.id)) { results.vdnAdjustments.skipped++; continue; }
      const adjustmentObj = {
        id: adj.id,
        adjustmentAmount: adj.adjustment_amount,
        adjustmentDate: adj.adjustment_date,
        referenceType: adj.reference_type,
        invoiceId: adj.invoice_id,
        purchaseOrderId: adj.purchase_order_id,
        buyerName: adj.buyer_name,
        remarks: adj.remarks,
      };
      const debitNoteObj = {
        id: adj.vendor_debit_note_id,
        noteNumber: adj.note_number,
        vendorId: adj.vendor_id,
        debitDate: adj.debit_date,
      };
      await journalForVDNAdjustment(adjustmentObj, debitNoteObj, adj.vendor_name || 'Unknown');
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

  // 13. Backfill Spare Part Receipts
  console.log('[BACKFILL] Starting spare part receipts...');
  const allSparePartEntries: any[] = (await db.execute(sql`
    SELECT spe.id, spe.spare_part_id, spe.purchase_date, spe.quantity, spe.unit_price, spe.gst_percent, spe.gst_amount, spe.total_amount, spe.vendor_id,
           spc.part_name, v.vendor_name
    FROM spare_part_entries spe
    LEFT JOIN spare_parts_catalog spc ON spe.spare_part_id = spc.id
    LEFT JOIN vendors v ON spe.vendor_id = v.id
    WHERE spe.record_status = 1
  `)).rows;

  for (const spe of allSparePartEntries) {
    try {
      if (await hasJournal('spare_part_receipt', spe.id)) { results.sparePartReceipts.skipped++; continue; }
      await journalForSparePartReceipt(
        {
          id: spe.id,
          purchaseDate: spe.purchase_date,
          quantity: Number(spe.quantity),
          unitPrice: Number(spe.unit_price),
          gstPercent: Number(spe.gst_percent) || 0,
          gstAmount: Number(spe.gst_amount) || 0,
          totalAmount: Number(spe.total_amount) || 0,
        },
        spe.part_name || 'Unknown Part',
        spe.vendor_name || 'Unknown'
      );
      results.sparePartReceipts.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Spare Part Receipt ${spe.id} error:`, e.message);
      results.sparePartReceipts.errors++;
    }
  }
  console.log(`[BACKFILL] Spare Part Receipts done: ${results.sparePartReceipts.processed} created, ${results.sparePartReceipts.skipped} skipped, ${results.sparePartReceipts.errors} errors`);

  // 14. Backfill Spare Part Issuances
  console.log('[BACKFILL] Starting spare part issuances...');
  const allSparePartIssuances: any[] = (await db.execute(sql`
    SELECT spi.id, spi.spare_part_id, spi.issue_date, spi.quantity, spi.purpose, spi.status,
           spc.part_name, spc.unit_price
    FROM spare_part_issuances spi
    LEFT JOIN spare_parts_catalog spc ON spi.spare_part_id = spc.id
    WHERE spi.record_status = 1 AND spi.status IN ('issued', 'consumed')
  `)).rows;

  for (const spi of allSparePartIssuances) {
    try {
      if (await hasJournal('spare_part_issuance', spi.id)) { results.sparePartIssuances.skipped++; continue; }
      await journalForSparePartIssuance(
        {
          id: spi.id,
          issueDate: spi.issue_date,
          quantity: Number(spi.quantity),
          purpose: spi.purpose || undefined,
        },
        spi.part_name || 'Unknown Part',
        Number(spi.unit_price) || 0
      );
      results.sparePartIssuances.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Spare Part Issuance ${spi.id} error:`, e.message);
      results.sparePartIssuances.errors++;
    }
  }
  console.log(`[BACKFILL] Spare Part Issuances done: ${results.sparePartIssuances.processed} created, ${results.sparePartIssuances.skipped} skipped, ${results.sparePartIssuances.errors} errors`);

  // 15. Backfill Cash Register Deposits
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

  // 15b. Backfill Cash Register Cash Received
  console.log('[BACKFILL] Starting cash register cash received...');
  const allCashReceived: any[] = (await db.execute(sql`
    SELECT crt.id, crt.day_id, crt.amount, crt.reference, crt.description, crt.party_name,
           crd.register_date, crd.salesperson_name
    FROM cash_register_transactions crt
    JOIN cash_register_days crd ON crt.day_id = crd.id
    WHERE crt.transaction_type = 'cash_received'
  `)).rows;

  for (const cr of allCashReceived) {
    try {
      if (await hasJournal('cash_register_cash_received', cr.id)) { results.cashRegisterCashReceived.skipped++; continue; }
      await journalForCashRegisterCashReceived(
        { id: cr.id, amount: cr.amount, reference: cr.reference, description: cr.description, partyName: cr.party_name },
        { registerDate: cr.register_date, salespersonName: cr.salesperson_name }
      );
      results.cashRegisterCashReceived.processed++;
    } catch (e: any) {
      console.error(`[BACKFILL] Cash Register Cash Received ${cr.id} error:`, e.message);
      results.cashRegisterCashReceived.errors++;
    }
  }
  console.log(`[BACKFILL] Cash Register Cash Received done: ${results.cashRegisterCashReceived.processed} created, ${results.cashRegisterCashReceived.skipped} skipped, ${results.cashRegisterCashReceived.errors} errors`);

  // 16. Backfill Cash Register Expenses (expense vouchers created from cash register that may lack journal entries)
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

  console.log(`[BACKFILL] === COMPLETE === Total: ${results.total.processed} created, ${results.total.skipped} skipped, ${results.total.errors} errors, ${orphansRemoved} orphans removed`);
  return { ...results, orphansRemoved };
}

// ============================================================
// RECTIFY DEBTOR JOURNAL LINES
// Migrates old journal lines that posted directly to the
// generic Sundry Debtors (1100) account to the correct
// party-specific sub-ledger accounts.
// ============================================================
export async function rectifyDebtorJournalLines(): Promise<{ updated: number; skipped: number; errors: number }> {
  const results = { updated: 0, skipped: 0, errors: 0 };

  // Get the generic 1100 account
  const genericAccount = await storage.getChartOfAccountByCode(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
  if (!genericAccount) {
    console.log('[RECTIFY] Sundry Debtors (1100) account not found — nothing to do');
    return results;
  }

  // Find all active journal lines still pointing to the generic 1100 account
  const genericLines: any[] = (await db.execute(sql`
    SELECT id, party_name FROM journal_lines
    WHERE account_id = ${genericAccount.id}
      AND record_status = 1
  `)).rows;

  console.log(`[RECTIFY] Found ${genericLines.length} journal line(s) pointing to generic Sundry Debtors (1100)`);

  for (const line of genericLines) {
    try {
      const partyName = line.party_name;
      if (!partyName || !partyName.trim()) {
        results.skipped++;
        continue;
      }

      // Get or create the party-specific sub-account
      const partyCode = await getOrCreateDebtorAccount(partyName.trim());
      if (partyCode === ACCOUNT_CODES.ACCOUNTS_RECEIVABLE) {
        // Could not create sub-account — leave as-is
        results.skipped++;
        continue;
      }

      // Fetch the sub-account id
      const partyAccount = await storage.getChartOfAccountByCode(partyCode);
      if (!partyAccount) {
        results.skipped++;
        continue;
      }

      // Update the journal line to use the party-specific account
      await db.execute(sql`
        UPDATE journal_lines SET account_id = ${partyAccount.id} WHERE id = ${line.id}
      `);
      results.updated++;
    } catch (err: any) {
      console.error(`[RECTIFY] Error processing line ${line.id}:`, err.message);
      results.errors++;
    }
  }

  console.log(`[RECTIFY] === COMPLETE === ${results.updated} updated, ${results.skipped} skipped (no party name), ${results.errors} errors`);
  return results;
}

export async function rectifyCreditorJournalLines(): Promise<{ updated: number; skipped: number; errors: number }> {
  const results = { updated: 0, skipped: 0, errors: 0 };

  // Get the generic 2001 account
  const genericAccount = await storage.getChartOfAccountByCode(ACCOUNT_CODES.ACCOUNTS_PAYABLE);
  if (!genericAccount) {
    console.log('[RECTIFY CREDITORS] Sundry Creditors (2001) account not found — nothing to do');
    return results;
  }

  // Find all active journal lines still pointing to the generic 2001 account
  const genericLines: any[] = (await db.execute(sql`
    SELECT id, party_name FROM journal_lines
    WHERE account_id = ${genericAccount.id}
      AND record_status = 1
  `)).rows;

  console.log(`[RECTIFY CREDITORS] Found ${genericLines.length} journal line(s) pointing to generic Sundry Creditors (2001)`);

  for (const line of genericLines) {
    try {
      const partyName = line.party_name;
      if (!partyName || !partyName.trim()) {
        results.skipped++;
        continue;
      }

      const partyCode = await getOrCreateCreditorAccount(partyName.trim());
      if (partyCode === ACCOUNT_CODES.ACCOUNTS_PAYABLE) {
        results.skipped++;
        continue;
      }

      const partyAccount = await storage.getChartOfAccountByCode(partyCode);
      if (!partyAccount) {
        results.skipped++;
        continue;
      }

      await db.execute(sql`
        UPDATE journal_lines SET account_id = ${partyAccount.id} WHERE id = ${line.id}
      `);
      results.updated++;
    } catch (err: any) {
      console.error(`[RECTIFY CREDITORS] Error processing line ${line.id}:`, err.message);
      results.errors++;
    }
  }

  console.log(`[RECTIFY CREDITORS] === COMPLETE === ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`);
  return results;
}

// ============================================================
// GOLD ERP — ACCOUNT CODES (6xxx series, jewellery-specific)
// ============================================================
export const GOLD_ACCOUNT_CODES = {
  BULLION_STOCK:           '6001',  // Asset:     Bullion Stock (Gold/Silver in hand)
  GOLD_WIP:                '6002',  // Asset:     Work-in-Progress (Gold issued to karigar)
  GOLD_FINISHED_GOODS:     '6003',  // Asset:     Finished Jewellery Stock
  OLD_GOLD_STOCK:          '6004',  // Asset:     Old Gold Received (Buy-back)

  KARIGAR_WAGES_PAYABLE:   '6101',  // Liability: Karigar Making Charges Payable
  CHIT_SCHEME_LIABILITY:   '6102',  // Liability: Chit Scheme Collections

  GOLD_SALES_REVENUE:      '6201',  // Income:    Gold Jewellery Sales
  REPAIR_INCOME:           '6202',  // Income:    Repair Charges Income
  CHIT_MATURITY_INCOME:    '6203',  // Income:    Chit Scheme Maturity / Profit

  BULLION_PURCHASE:        '6301',  // Expense:   Bullion Purchase Cost
  MAKING_CHARGES_EXPENSE:  '6302',  // Expense:   Making Charges / Karigar Labour
  GHAT_WASTAGE_LOSS:       '6303',  // Expense:   Ghat / Wastage Loss
  OLD_GOLD_PURCHASE:       '6304',  // Expense:   Old Gold Buy-back Cost
  HALLMARKING_CHARGES:     '6305',  // Expense:   Hallmarking / Certification
};

// Helper: get-or-create a gold-specific chart of account
async function getOrCreateGoldAccount(
  code: string,
  name: string,
  accountType: 'Assets' | 'Liabilities' | 'Income' | 'Expenses',
  subType: string,
  parentCode: string
): Promise<string> {
  // Check if it already exists (any tenant context via AsyncLocalStorage)
  const existing = await db.execute(sql`
    SELECT code FROM chart_of_accounts
    WHERE code = ${code} AND record_status = 1
    LIMIT 1
  `);
  if (existing.rows.length > 0) return code;

  // Find parent
  const parent = await db.execute(sql`
    SELECT id FROM chart_of_accounts WHERE code = ${parentCode} AND record_status = 1 LIMIT 1
  `);
  const parentId = parent.rows[0]?.id || null;

  try {
    await db.execute(sql`
      INSERT INTO chart_of_accounts
        (code, name, account_type, sub_type, node_type, parent_id, is_system_account, is_active, record_status)
      VALUES
        (${code}, ${name}, ${accountType}, ${subType}, 'ledger', ${parentId}, 1, 1, 1)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log(`[GOLD COA] Ensured account: ${code} - ${name}`);
  } catch (_) { /* ignore if exists */ }
  return code;
}

// Ensure all gold accounts exist (called lazily per transaction)
async function ensureGoldAccounts(): Promise<void> {
  await Promise.all([
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.BULLION_STOCK,         'Bullion Stock (Gold/Silver)',           'Assets',     'inventory',         '1210'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.GOLD_WIP,              'Gold Work-in-Progress (Karigar)',       'Assets',     'inventory',         '1210'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.GOLD_FINISHED_GOODS,   'Finished Jewellery Stock',              'Assets',     'inventory',         '1210'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.OLD_GOLD_STOCK,        'Old Gold Received (Buy-back)',          'Assets',     'inventory',         '1210'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.KARIGAR_WAGES_PAYABLE, 'Karigar Wages Payable',                 'Liabilities','trade_payable',     'G2210'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.CHIT_SCHEME_LIABILITY, 'Chit Scheme Collections Payable',      'Liabilities','advance_liability', '2230'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.GOLD_SALES_REVENUE,    'Gold Jewellery Sales',                  'Income',     'operating',         '4100'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.REPAIR_INCOME,         'Repair Charges Income',                 'Income',     'other_income',      '4200'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.CHIT_MATURITY_INCOME,  'Chit Scheme Maturity Income',           'Income',     'other_income',      '4200'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.BULLION_PURCHASE,      'Bullion Purchase Cost',                 'Expenses',   'direct',            'G5100'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.MAKING_CHARGES_EXPENSE,'Making Charges / Karigar Labour',       'Expenses',   'direct',            'G5100'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.GHAT_WASTAGE_LOSS,     'Ghat / Wastage Loss',                   'Expenses',   'direct',            'G5100'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.OLD_GOLD_PURCHASE,     'Old Gold Buy-back Cost',                'Expenses',   'direct',            'G5100'),
    getOrCreateGoldAccount(GOLD_ACCOUNT_CODES.HALLMARKING_CHARGES,   'Hallmarking / Certification Charges',   'Expenses',   'operating',         'G5200'),
  ]);
}

// ============================================================
// GAP 1 — BULLION PURCHASE journal
// Dr. Bullion Stock + Dr. GST Input Credit, Cr. Supplier (Creditor) / Cash
// ============================================================
export async function journalForBullionPurchase(txn: any): Promise<void> {
  const amount   = Math.round(Number(txn.amount       || 0) * 100);
  const gstAmt   = Math.round(Number(txn.gst_amount   || 0) * 100);
  const total    = Math.round(Number(txn.total_amount  || txn.amount || 0) * 100);
  if (amount === 0) return;

  await ensureGoldAccounts();
  const partyName   = txn.party_name || 'Bullion Supplier';
  const creditorCode = await getOrCreateCreditorAccount(partyName);
  const cashCode     = ACCOUNT_CODES.CASH_IN_HAND;
  const payCredit    = ['cash','cash_purchase'].includes((txn.payment_mode||'').toLowerCase())
                       ? cashCode : creditorCode;

  const lines: JournalLineInput[] = [
    { accountCode: GOLD_ACCOUNT_CODES.BULLION_STOCK,     debit: amount,  credit: 0,      memo: `Bullion ${txn.txn_type} - ${txn.metal_type} ${txn.weight_gm}g @ ₹${txn.rate_per_gram}/g` },
  ];
  if (gstAmt > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_INPUT, debit: Math.round(gstAmt/2), credit: 0, memo: 'CGST Input on Bullion' });
    lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_INPUT, debit: Math.round(gstAmt/2), credit: 0, memo: 'SGST Input on Bullion' });
  }
  lines.push({ accountCode: payCredit, debit: 0, credit: total || (amount + gstAmt), memo: `Bullion payment - ${partyName}`, partyName });

  await createJournalWithLines(
    txn.txn_date || new Date().toISOString().slice(0,10),
    `Bullion ${txn.txn_type}: ${txn.txn_no || ''} — ${partyName} (${txn.weight_gm}g ${txn.metal_type})`,
    lines,
    { sourceType: 'bullion_purchase', sourceId: String(txn.id), isAutoGenerated: true }
  );
}

// ============================================================
// GAP 3 — KARIGAR SETTLEMENT journal
// Dr. Making Charges Expense + Dr. Ghat Loss, Cr. Cash / Karigar Wages Payable
// ============================================================
export async function journalForKarigarSettlement(settlement: any, karigarName: string): Promise<void> {
  const wage    = Math.round(Number(settlement.wage_amount || settlement.making_charges || 0) * 100);
  const ghat    = Math.round(Number(settlement.excess_deduction || 0) * 100);
  const net     = Math.round(Number(settlement.net_payable || 0) * 100);
  if (wage === 0 && net === 0) return;

  await ensureGoldAccounts();
  const creditorCode = await getOrCreateCreditorAccount(karigarName || 'Unknown Karigar');
  const lines: JournalLineInput[] = [];

  if (wage > 0) {
    lines.push({ accountCode: GOLD_ACCOUNT_CODES.MAKING_CHARGES_EXPENSE, debit: wage, credit: 0, memo: `Making charges — ${karigarName}` });
  }
  if (ghat > 0) {
    lines.push({ accountCode: GOLD_ACCOUNT_CODES.GHAT_WASTAGE_LOSS, debit: ghat, credit: 0, memo: `Excess ghat deduction — ${karigarName}` });
  }
  if (net > 0) {
    lines.push({ accountCode: creditorCode, debit: 0, credit: net, memo: `Net payable to karigar ${karigarName}`, partyName: karigarName });
  }
  // If wage > net (ghat deduction), balance goes to Ghat Loss account
  const totalDebit  = wage + ghat;
  const totalCredit = net;
  if (totalDebit !== totalCredit && totalDebit > 0 && totalCredit >= 0) {
    const diff = totalDebit - totalCredit;
    if (diff > 0) {
      // Move excess to Ghat Loss (already debited) — adjust creditor
      lines.forEach(l => { if (l.accountCode === creditorCode && l.credit > 0) l.credit = totalDebit; });
    }
  }

  await createJournalWithLines(
    settlement.settlement_date || new Date().toISOString().slice(0,10),
    `Karigar Settlement: ${settlement.settlement_no || settlement.id} — ${karigarName}`,
    lines,
    { sourceType: 'karigar_settlement', sourceId: String(settlement.id), isAutoGenerated: true }
  );
}

// ============================================================
// GAP 1 — GOLD SALE (from Estimate / Counter Booking) journal
// Dr. Cash / Customer, Cr. Gold Sales Revenue + GST Payable
// ============================================================
export async function journalForGoldSale(entity: any, entityType: 'estimate' | 'counter_booking' = 'estimate'): Promise<void> {
  const totalAmount  = Math.round(Number(entity.total_amount  || 0) * 100);
  const gstAmount    = Math.round(Number(entity.gst_amount    || 0) * 100);
  const metalValue   = Math.round(Number(entity.total_metal_value || entity.metal_value || 0) * 100);
  const makingChg    = Math.round(Number(entity.making_charges || 0) * 100);
  const stoneValue   = Math.round(Number(entity.stone_value   || 0) * 100);
  if (totalAmount === 0) return;

  await ensureGoldAccounts();
  const customerName = entity.customer_name || 'Cash Customer';
  const debtorCode   = entity.customer_name
    ? await getOrCreateDebtorAccount(customerName)
    : ACCOUNT_CODES.CASH_IN_HAND;

  const cgst = Math.round(gstAmount / 2);
  const sgst = gstAmount - cgst;
  const revenue = totalAmount - gstAmount;

  const lines: JournalLineInput[] = [
    { accountCode: debtorCode, debit: totalAmount, credit: 0, memo: `Gold sale — ${customerName}`, partyName: customerName },
    { accountCode: GOLD_ACCOUNT_CODES.GOLD_SALES_REVENUE, debit: 0, credit: revenue, memo: `Gold sales revenue` },
  ];
  if (cgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_CGST_PAYABLE, debit: 0, credit: cgst, memo: 'CGST on Gold Sale' });
  if (sgst > 0) lines.push({ accountCode: ACCOUNT_CODES.GST_SGST_PAYABLE, debit: 0, credit: sgst, memo: 'SGST on Gold Sale' });

  await createJournalWithLines(
    entity.created_at ? new Date(entity.created_at).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    `Gold Sale: ${entity.estimate_no || entity.booking_no || entity.id} — ${customerName}`,
    lines,
    { sourceType: entityType, sourceId: String(entity.id), isAutoGenerated: true }
  );
}

// ============================================================
// GAP 1 — OLD GOLD BUYBACK journal
// Dr. Old Gold Stock + Dr. Old Gold Purchase, Cr. Cash
// ============================================================
export async function journalForOldGoldBuyback(buyback: any): Promise<void> {
  const buybackValue = Math.round(Number(buyback.buyback_value || buyback.net_offered || 0) * 100);
  if (buybackValue === 0) return;

  await ensureGoldAccounts();
  const lines: JournalLineInput[] = [
    { accountCode: GOLD_ACCOUNT_CODES.OLD_GOLD_STOCK,    debit: buybackValue, credit: 0,           memo: `Old gold inward — ${buyback.customer_name} (${buyback.net_weight_gm}g)` },
    { accountCode: ACCOUNT_CODES.CASH_IN_HAND,           debit: 0,            credit: buybackValue, memo: `Cash paid for old gold — ${buyback.customer_name}` },
  ];

  await createJournalWithLines(
    buyback.created_at ? new Date(buyback.created_at).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    `Old Gold Buy-back: ${buyback.buyback_no || buyback.id} — ${buyback.customer_name}`,
    lines,
    { sourceType: 'old_gold_buyback', sourceId: String(buyback.id), isAutoGenerated: true }
  );
}

// ============================================================
// GAP 1 — REPAIR CHARGES journal (when repair is delivered)
// Dr. Cash / Customer, Cr. Repair Income
// ============================================================
export async function journalForRepairDelivery(repair: any): Promise<void> {
  const charges = Math.round(Number(repair.repair_charges || 0) * 100);
  if (charges === 0) return;

  await ensureGoldAccounts();
  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT_CODES.CASH_IN_HAND,      debit: charges, credit: 0,       memo: `Repair charges collected — ${repair.customer_name}` },
    { accountCode: GOLD_ACCOUNT_CODES.REPAIR_INCOME, debit: 0,       credit: charges, memo: `Repair income — ${repair.repair_no || repair.id}` },
  ];

  await createJournalWithLines(
    repair.delivered_date || new Date().toISOString().slice(0,10),
    `Repair Delivery: ${repair.repair_no || repair.id} — ${repair.customer_name}`,
    lines,
    { sourceType: 'repair_delivery', sourceId: String(repair.id), isAutoGenerated: true }
  );
}

// ============================================================
// GAP 1 — GHAT / WASTAGE journal (when ghat entry is recorded)
// Dr. Ghat Wastage Loss, Cr. Bullion Stock
// ============================================================
export async function journalForGhatEntry(ghat: any, goldRate: number): Promise<void> {
  const wastageGm = Number(ghat.gross_weight_gm || 0) - Number(ghat.net_metal_weight_gm || ghat.gross_weight_gm || 0);
  if (wastageGm <= 0 || goldRate <= 0) return;

  const wastageValue = Math.round(wastageGm * goldRate * 100);
  await ensureGoldAccounts();

  const lines: JournalLineInput[] = [
    { accountCode: GOLD_ACCOUNT_CODES.GHAT_WASTAGE_LOSS, debit: wastageValue, credit: 0,            memo: `Ghat loss at ${ghat.stage} — ${wastageGm.toFixed(3)}g` },
    { accountCode: GOLD_ACCOUNT_CODES.BULLION_STOCK,     debit: 0,            credit: wastageValue, memo: `Bullion stock reduction — ghat loss` },
  ];

  await createJournalWithLines(
    ghat.ghat_date || new Date().toISOString().slice(0,10),
    `Ghat Entry: ${ghat.id} — Stage: ${ghat.stage} (${wastageGm.toFixed(3)}g lost)`,
    lines,
    { sourceType: 'ghat_entry', sourceId: String(ghat.id), isAutoGenerated: true }
  );
}

// ============================================================
// Phase 1.3 — PAYROLL → GL
// When payroll is locked/finalized, post:
//   Dr. Salary & Wages (5100)    — gross pay
//   Dr. PF Employer (5130)       — employer PF contribution
//   Dr. ESI Employer (5131)      — employer ESI contribution
//   Cr. Salary Payable (2500)    — net pay due to employees
//   Cr. PF Payable (2501)        — PF deduction + employer share
//   Cr. ESI Payable (2502)       — ESI deduction + employer share
//   Cr. TDS Payable (2300)       — TDS deducted from salary
// ============================================================
export async function journalForPayroll(payrollRun: any, payslips: any[]): Promise<void> {
  if (!payslips?.length) return;

  const tenantId = payrollRun.tenant_id;
  const period = `${String(payrollRun.month).padStart(2,'0')}/${payrollRun.year}`;
  const entryDate = new Date(payrollRun.year, payrollRun.month - 1, 28).toISOString().slice(0, 10);

  let grossPay = 0, pfEmployee = 0, pfEmployer = 0, esiEmployee = 0, esiEmployer = 0, tds = 0, netPay = 0;
  for (const ps of payslips) {
    grossPay    += Number(ps.gross_salary ?? ps.gross_pay ?? 0);
    pfEmployee  += Number(ps.pf_employee ?? ps.pf_deduction ?? 0);
    pfEmployer  += Number(ps.pf_employer ?? 0);
    esiEmployee += Number(ps.esi_employee ?? ps.esi_deduction ?? 0);
    esiEmployer += Number(ps.esi_employer ?? 0);
    tds         += Number(ps.tds ?? ps.tds_deduction ?? 0);
    netPay      += Number(ps.net_salary ?? ps.net_pay ?? 0);
  }

  if (grossPay <= 0) return;

  // Ensure payroll-specific accounts exist
  await db.execute(sql`
    INSERT INTO chart_of_accounts (tenant_id, account_code, account_name, account_type, parent_code, is_active)
    VALUES
      (${tenantId}, '5130', 'PF Employer Contribution', 'expense', '5000', true),
      (${tenantId}, '5131', 'ESI Employer Contribution', 'expense', '5000', true),
      (${tenantId}, '2500', 'Salary & Wages Payable', 'liability', '2000', true),
      (${tenantId}, '2501', 'Provident Fund Payable', 'liability', '2000', true),
      (${tenantId}, '2502', 'ESI Payable', 'liability', '2000', true)
    ON CONFLICT (tenant_id, account_code) DO NOTHING
  `);

  type JournalLineInput = { accountCode: string; debit: number; credit: number; memo: string };
  const lines: JournalLineInput[] = [
    { accountCode: '5100', debit: Math.round(grossPay * 100),       credit: 0, memo: `Gross salary — ${payslips.length} employees` },
    { accountCode: '5130', debit: Math.round(pfEmployer * 100),     credit: 0, memo: `PF employer contribution` },
    { accountCode: '5131', debit: Math.round(esiEmployer * 100),    credit: 0, memo: `ESI employer contribution` },
    { accountCode: '2500', debit: 0, credit: Math.round(netPay * 100),         memo: `Net salary payable to employees` },
    { accountCode: '2501', debit: 0, credit: Math.round((pfEmployee + pfEmployer) * 100), memo: `PF payable (employee + employer)` },
    { accountCode: '2502', debit: 0, credit: Math.round((esiEmployee + esiEmployer) * 100), memo: `ESI payable (employee + employer)` },
    { accountCode: '2300', debit: 0, credit: Math.round(tds * 100), memo: `TDS on salary payable` },
  ].filter(l => l.debit > 0 || l.credit > 0);

  await createJournalWithLines(
    entryDate,
    `Payroll ${period} — ${payslips.length} employees (Run #${payrollRun.id})`,
    lines,
    { sourceType: 'payroll_run', sourceId: String(payrollRun.id), isAutoGenerated: true, tenantId }
  );
}

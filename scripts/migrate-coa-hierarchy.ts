import { db } from "../server/db";
import { chartOfAccounts } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

interface GroupDef {
  code: string;
  name: string;
  accountType: string; // asset, liability, equity, revenue, expense
  level: number;
  parentCode: string | null; // code of parent group
}

const GROUP_ACCOUNTS: GroupDef[] = [
  // Level 1 - Top-level groups
  { code: "1000", name: "Assets", accountType: "asset", level: 1, parentCode: null },
  { code: "2000", name: "Liabilities", accountType: "liability", level: 1, parentCode: null },
  { code: "3000", name: "Equity", accountType: "equity", level: 1, parentCode: null },
  { code: "4000", name: "Income", accountType: "revenue", level: 1, parentCode: null },
  { code: "5000", name: "Expenses", accountType: "expense", level: 1, parentCode: null },

  // Level 2 - Asset sub-groups (use G prefix for conflicts)
  { code: "G1100", name: "Non-Current Assets", accountType: "asset", level: 2, parentCode: "1000" },
  { code: "G1200", name: "Current Assets", accountType: "asset", level: 2, parentCode: "1000" },

  // Level 3 - Asset sub-sub-groups
  { code: "1110", name: "Property, Plant & Equipment", accountType: "asset", level: 3, parentCode: "G1100" },
  { code: "1120", name: "Accumulated Depreciation", accountType: "asset", level: 3, parentCode: "G1100" },
  { code: "1130", name: "Capital Work in Progress", accountType: "asset", level: 3, parentCode: "G1100" },
  { code: "1140", name: "Intangible Assets", accountType: "asset", level: 3, parentCode: "G1100" },
  { code: "1150", name: "Non-Current Financial Assets", accountType: "asset", level: 3, parentCode: "G1100" },
  { code: "1210", name: "Inventories", accountType: "asset", level: 3, parentCode: "G1200" },
  { code: "1220", name: "Trade Receivables", accountType: "asset", level: 3, parentCode: "G1200" },
  { code: "1230", name: "Cash & Cash Equivalents", accountType: "asset", level: 3, parentCode: "G1200" },
  { code: "1240", name: "Short-term Loans & Advances", accountType: "asset", level: 3, parentCode: "G1200" },
  { code: "1250", name: "Other Current Assets", accountType: "asset", level: 3, parentCode: "G1200" },

  // Level 2 - Liability sub-groups
  { code: "G2100", name: "Non-Current Liabilities", accountType: "liability", level: 2, parentCode: "2000" },
  { code: "G2200", name: "Current Liabilities", accountType: "liability", level: 2, parentCode: "2000" },

  // Level 3 - Liability sub-sub-groups
  { code: "2110", name: "Long-term Borrowings", accountType: "liability", level: 3, parentCode: "G2100" },
  { code: "G2210", name: "Trade Payables", accountType: "liability", level: 3, parentCode: "G2200" },
  { code: "2220", name: "Short-term Borrowings", accountType: "liability", level: 3, parentCode: "G2200" },
  { code: "2230", name: "Other Current Liabilities", accountType: "liability", level: 3, parentCode: "G2200" },
  { code: "2240", name: "Statutory Liabilities", accountType: "liability", level: 3, parentCode: "G2200" },

  // Level 2 - Equity sub-groups
  { code: "3200", name: "Reserves & Surplus", accountType: "equity", level: 2, parentCode: "3000" },

  // Level 2 - Income sub-groups
  { code: "4100", name: "Revenue from Operations", accountType: "revenue", level: 2, parentCode: "4000" },
  { code: "4200", name: "Other Income", accountType: "revenue", level: 2, parentCode: "4000" },

  // Level 2 - Expense sub-groups
  { code: "G5100", name: "Cost of Goods Sold", accountType: "expense", level: 2, parentCode: "5000" },
  { code: "G5200", name: "Operating Expenses", accountType: "expense", level: 2, parentCode: "5000" },
];

// Map existing ledger accounts to their parent group codes
const LEDGER_PARENT_MAP: Record<string, { parentCode: string; level: number }> = {
  // Assets - Cash & Bank
  "1001": { parentCode: "1230", level: 4 }, // Cash-in-Hand -> Cash & Cash Equivalents
  "1002": { parentCode: "1230", level: 4 }, // Bank OCC A/c -> Cash & Cash Equivalents
  "1003": { parentCode: "1230", level: 4 }, // Bank OD A/c -> Cash & Cash Equivalents
  "1004": { parentCode: "1230", level: 4 }, // Bank OCC A/c (Cash Credit) -> Cash & Cash Equivalents

  // Assets - Trade Receivables
  "1100": { parentCode: "1220", level: 4 }, // Sundry Debtors -> Trade Receivables

  // Assets - Inventories
  "1200": { parentCode: "1210", level: 4 }, // Stock-in-Hand (Raw Materials) -> Inventories
  "1201": { parentCode: "1210", level: 4 }, // Stock-in-Hand (Finished Goods) -> Inventories
  "1202": { parentCode: "1210", level: 4 }, // Stock-in-Hand (Packing Materials) -> Inventories
  "1203": { parentCode: "1210", level: 4 }, // Stock-in-Hand (Spare Parts) -> Inventories

  // Assets - Loans & Advances
  "1300": { parentCode: "1240", level: 4 }, // Loans & Advances (Asset) -> Short-term Loans & Advances

  // Assets - GST Input Credit (these are asset-type)
  "2210": { parentCode: "1250", level: 4 }, // CGST Input Credit -> Other Current Assets
  "2211": { parentCode: "1250", level: 4 }, // SGST Input Credit -> Other Current Assets
  "2212": { parentCode: "1250", level: 4 }, // IGST Input Credit -> Other Current Assets
  "2301": { parentCode: "1250", level: 4 }, // TDS Receivable -> Other Current Assets

  // Liabilities - Trade Payables
  "2001": { parentCode: "G2210", level: 4 }, // Sundry Creditors -> Trade Payables

  // Liabilities - Other Current
  "2100": { parentCode: "2230", level: 4 }, // Advance from Customers -> Other Current Liabilities

  // Liabilities - Statutory
  "2200": { parentCode: "2240", level: 4 }, // CGST Payable -> Statutory Liabilities
  "2201": { parentCode: "2240", level: 4 }, // SGST Payable -> Statutory Liabilities
  "2202": { parentCode: "2240", level: 4 }, // IGST Payable -> Statutory Liabilities
  "2300": { parentCode: "2240", level: 4 }, // TDS Payable -> Statutory Liabilities

  // Liabilities - Loans
  "2400": { parentCode: "2110", level: 3 }, // Secured Loans -> Long-term Borrowings
  "2401": { parentCode: "2110", level: 3 }, // Secured Loans - Term Loan -> Long-term Borrowings
  "2402": { parentCode: "2110", level: 3 }, // Unsecured Loans -> Long-term Borrowings

  // Individual loan accounts under Unsecured Loans (keep existing parent_id, just set level)
  "2402A": { parentCode: "KEEP", level: 4 },
  "2402B": { parentCode: "KEEP", level: 4 },
  "2402C": { parentCode: "KEEP", level: 4 },
  "2402D": { parentCode: "KEEP", level: 4 },
  "2402E": { parentCode: "KEEP", level: 4 },
  "2402F": { parentCode: "KEEP", level: 4 },
  "2402G": { parentCode: "KEEP", level: 4 },
  "2402H": { parentCode: "KEEP", level: 4 },
  "2402I": { parentCode: "KEEP", level: 4 },

  // Equity
  "3001": { parentCode: "3000", level: 2 }, // Capital Account -> Equity
  "3002": { parentCode: "3000", level: 2 }, // Drawings Account -> Equity
  "3003": { parentCode: "3200", level: 3 }, // Profit & Loss A/c -> Reserves & Surplus

  // Revenue
  "4001": { parentCode: "4100", level: 3 }, // Sales Account -> Revenue from Operations
  "4002": { parentCode: "4100", level: 3 }, // Debit Note Income -> Revenue from Operations
  "4003": { parentCode: "4200", level: 3 }, // Interest Earned -> Other Income
  "4004": { parentCode: "4200", level: 3 }, // Other Income -> Other Income

  // Expenses - COGS / Direct
  "5001": { parentCode: "G5100", level: 3 }, // Direct Expenses
  "5002": { parentCode: "G5100", level: 3 }, // Purchase Account
  "5003": { parentCode: "G5100", level: 3 }, // Purchases - Packing
  "5004": { parentCode: "G5100", level: 3 }, // Purchases - Consumables
  "5005": { parentCode: "G5100", level: 3 }, // Freight Inward
  "5006": { parentCode: "G5100", level: 3 }, // Purchase Returns
  "5126": { parentCode: "G5100", level: 3 }, // Loading & Unloading
  "5130": { parentCode: "G5100", level: 3 }, // Packaging Expenses

  // Expenses - Operating / Administrative
  "5100": { parentCode: "G5200", level: 3 }, // Salary & Wages
  "5101": { parentCode: "G5200", level: 3 }, // Rent
  "5102": { parentCode: "G5200", level: 3 }, // Electricity & Utilities
  "5103": { parentCode: "G5200", level: 3 }, // Repairs & Maintenance
  "5104": { parentCode: "G5200", level: 3 }, // Legal & Professional Fees
  "5105": { parentCode: "G5200", level: 3 }, // Insurance
  "5106": { parentCode: "G5200", level: 3 }, // Bank Charges
  "5107": { parentCode: "G5200", level: 3 }, // Interest Paid
  "5108": { parentCode: "G5200", level: 3 }, // Travel Expenses
  "5109": { parentCode: "G5200", level: 3 }, // Fuel & Vehicle
  "5110": { parentCode: "G5200", level: 3 }, // Staff Welfare
  "5111": { parentCode: "G5200", level: 3 }, // Courier & Shipping
  "5112": { parentCode: "G5200", level: 3 }, // Printing & Stationery
  "5113": { parentCode: "G5200", level: 3 }, // Internet & Phone
  "5114": { parentCode: "G5200", level: 3 }, // Furniture & Fixtures
  "5115": { parentCode: "G5200", level: 3 }, // Vehicle EMI
  "5116": { parentCode: "G5200", level: 3 }, // Office Supplies
  "5117": { parentCode: "G5200", level: 3 }, // Spares & Consumables
  "5118": { parentCode: "G5200", level: 3 }, // Chemicals & Cleaning
  "5119": { parentCode: "G5200", level: 3 }, // Water Charges
  "5120": { parentCode: "G5200", level: 3 }, // MSME Charges
  "5121": { parentCode: "G5200", level: 3 }, // Testing & Lab Fees
  "5122": { parentCode: "G5200", level: 3 }, // Security Charges
  "5123": { parentCode: "G5200", level: 3 }, // Housekeeping
  "5124": { parentCode: "G5200", level: 3 }, // AMC & Service Contracts
  "5125": { parentCode: "G5200", level: 3 }, // Licence & Renewal
  "5127": { parentCode: "G5200", level: 3 }, // Pollution & Environmental
  "5128": { parentCode: "G5200", level: 3 }, // Safety Equipment
  "5129": { parentCode: "G5200", level: 3 }, // Diesel & Generator
  "5131": { parentCode: "G5200", level: 3 }, // Depreciation
  "5132": { parentCode: "G5200", level: 3 }, // Microbiology Lab
  "5133": { parentCode: "G5200", level: 3 }, // Chemical Lab
  "5134": { parentCode: "G5200", level: 3 }, // Consultant Fees
  "5135": { parentCode: "G5200", level: 3 }, // Contract Payments
  "5136": { parentCode: "G5200", level: 3 }, // Vehicle Contracts

  // Manufacturing & Other Expenses
  "5200": { parentCode: "G5100", level: 3 }, // Manufacturing Expenses -> COGS
  "5300": { parentCode: "G5200", level: 3 }, // Indirect Expenses -> Operating
  "5400": { parentCode: "G5200", level: 3 }, // Miscellaneous Expenses -> Operating
  "5500": { parentCode: "G5200", level: 3 }, // Bad Debts -> Operating
  "5600": { parentCode: "G5100", level: 3 }, // Sales Returns -> COGS
  "5700": { parentCode: "G5100", level: 3 }, // Vendor Claims -> COGS
};

async function migrate() {
  console.log("=== COA Hierarchy Migration ===\n");

  // Step 1: Get all existing accounts
  const existing = await db.select().from(chartOfAccounts);
  const existingByCode = new Map(existing.map(a => [a.code, a]));
  console.log(`Found ${existing.length} existing accounts`);

  // Step 2: Insert Group accounts
  const groupIdByCode = new Map<string, string>();
  let groupsCreated = 0;

  for (const group of GROUP_ACCOUNTS) {
    if (existingByCode.has(group.code)) {
      console.log(`  SKIP group ${group.code} - code already used by ledger "${existingByCode.get(group.code)!.name}"`);
      continue;
    }

    // Check if group already exists (from previous migration run)
    const existsCheck = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, group.code));
    if (existsCheck.length > 0) {
      groupIdByCode.set(group.code, existsCheck[0].id);
      console.log(`  EXISTS group ${group.code} "${group.name}" (id: ${existsCheck[0].id})`);
      continue;
    }

    const [inserted] = await db.insert(chartOfAccounts).values({
      code: group.code,
      name: group.name,
      accountType: group.accountType,
      nodeType: 'group',
      level: group.level,
      isActive: 1,
      isSystemAccount: 1,
      recordStatus: 1,
    }).returning();

    groupIdByCode.set(group.code, inserted.id);
    groupsCreated++;
    console.log(`  CREATED group ${group.code} "${group.name}" (id: ${inserted.id})`);
  }

  console.log(`\nCreated ${groupsCreated} group accounts`);

  // Reload all accounts to get the group IDs
  const allAccounts = await db.select().from(chartOfAccounts);
  const allByCode = new Map(allAccounts.map(a => [a.code, a]));

  // Step 3: Set parent_id for group accounts (groups parenting other groups)
  console.log("\n--- Setting group parent relationships ---");
  for (const group of GROUP_ACCOUNTS) {
    if (!group.parentCode) continue;
    const groupAccount = allByCode.get(group.code);
    const parentAccount = allByCode.get(group.parentCode);
    if (groupAccount && parentAccount) {
      await db.update(chartOfAccounts)
        .set({ parentId: parentAccount.id })
        .where(eq(chartOfAccounts.id, groupAccount.id));
      console.log(`  ${group.code} "${group.name}" -> parent ${group.parentCode} "${parentAccount.name}"`);
    }
  }

  // Step 4: Set parent_id and level for existing ledger accounts
  console.log("\n--- Setting ledger parent relationships ---");
  let ledgersUpdated = 0;

  for (const [code, mapping] of Object.entries(LEDGER_PARENT_MAP)) {
    const account = allByCode.get(code);
    if (!account) {
      console.log(`  SKIP ${code} - not found in database`);
      continue;
    }

    if (mapping.parentCode === "KEEP") {
      // Just update level, keep existing parent_id
      await db.update(chartOfAccounts)
        .set({ nodeType: 'ledger', level: mapping.level })
        .where(eq(chartOfAccounts.id, account.id));
      console.log(`  ${code} "${account.name}" -> KEEP parent, level=${mapping.level}`);
    } else {
      const parentAccount = allByCode.get(mapping.parentCode);
      if (!parentAccount) {
        console.log(`  WARN ${code} "${account.name}" -> parent ${mapping.parentCode} NOT FOUND`);
        continue;
      }
      await db.update(chartOfAccounts)
        .set({ 
          parentId: parentAccount.id, 
          nodeType: 'ledger', 
          level: mapping.level 
        })
        .where(eq(chartOfAccounts.id, account.id));
      console.log(`  ${code} "${account.name}" -> parent ${mapping.parentCode} "${parentAccount.name}", level=${mapping.level}`);
      ledgersUpdated++;
    }
  }

  console.log(`\nUpdated ${ledgersUpdated} ledger accounts with parent relationships`);

  // Step 5: Verify - check for any orphan ledgers (no parent set)
  const finalAccounts = await db.select().from(chartOfAccounts);
  const orphans = finalAccounts.filter(a => a.nodeType === 'ledger' && !a.parentId && a.level === 1);
  if (orphans.length > 0) {
    console.log(`\nWARNING: ${orphans.length} orphan ledger accounts without parents:`);
    orphans.forEach(a => console.log(`  ${a.code} "${a.name}" (${a.accountType})`));
  }

  const groups = finalAccounts.filter(a => a.nodeType === 'group');
  const ledgers = finalAccounts.filter(a => a.nodeType === 'ledger');
  console.log(`\n=== Summary ===`);
  console.log(`Total accounts: ${finalAccounts.length}`);
  console.log(`Groups (non-postable): ${groups.length}`);
  console.log(`Ledgers (postable): ${ledgers.length}`);
  console.log(`Accounts with parent: ${finalAccounts.filter(a => a.parentId).length}`);

  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

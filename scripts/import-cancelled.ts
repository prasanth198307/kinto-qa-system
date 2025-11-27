import XLSX from 'xlsx';
import { db } from '../server/db.js';
import { invoices, vendors, invoiceTemplates } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';

function normalize(str: string | undefined): string {
  return (str || '').trim().toLowerCase();
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
}

console.log('🔧 Importing Cancelled Invoices...\n');

const saleWB = XLSX.readFile('attached_assets/SaleReport_1764228749066.xlsx');
const saleSheet = saleWB.Sheets[saleWB.SheetNames[0]];

interface SaleData {
  'Generated on Nov 21, 2025 at 2:51 pm': string;
  __EMPTY_1: string;
  __EMPTY_2: string;
  __EMPTY_4: string;
  __EMPTY_5: number;
}

const sales = XLSX.utils.sheet_to_json<SaleData>(saleSheet);

// Find cancelled sales
const cancelledSales = sales.filter(s => 
  s.__EMPTY_4?.includes('Cancelled') && s.__EMPTY_1 && !s.__EMPTY_1.includes('Invoice')
);

console.log(`📋 Found ${cancelledSales.length} cancelled invoices\n`);

const existingVendors = await db.select().from(vendors);
const defaultTemplate = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.isDefault, 1)).limit(1);

const vendorMap = new Map<string, typeof existingVendors[0]>();
existingVendors.forEach(v => {
  vendorMap.set(normalize(v.vendorName), v);
});

for (const sale of cancelledSales) {
  const invoiceNo = sale.__EMPTY_1?.trim();
  const partyName = sale.__EMPTY_2?.trim();
  
  // Check if already exists
  const existing = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNo)).limit(1);
  if (existing.length > 0) {
    console.log(`  ⏭️  Invoice ${invoiceNo} already exists`);
    continue;
  }
  
  let customer = vendorMap.get(normalize(partyName));
  if (!customer) {
    // Create minimal customer entry
    console.log(`  ⚠️  Customer not found: ${partyName}, creating placeholder`);
  }
  
  try {
    await db.insert(invoices).values({
      invoiceNumber: invoiceNo,
      invoiceDate: parseDate(sale['Generated on Nov 21, 2025 at 2:51 pm']),
      buyerName: customer?.vendorName || partyName,
      buyerAddress: customer?.address || '',
      buyerGstin: customer?.gstNumber || '',
      buyerContact: customer?.mobileNumber || '',
      subtotal: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessAmount: 0,
      roundOff: 0,
      totalAmount: 0,
      amountReceived: 0,
      status: 'cancelled',
      remarks: 'Cancelled in Vyapaar',
      templateId: defaultTemplate[0]?.id,
    });
    
    console.log(`  ✅ Created cancelled invoice ${invoiceNo} (${partyName})`);
  } catch (err: any) {
    console.log(`  ❌ Error: ${err.message}`);
  }
}

const finalCount = await db.select({ count: sql<number>`count(*)` }).from(invoices);
console.log(`\n📊 Total invoices now: ${finalCount[0].count}`);

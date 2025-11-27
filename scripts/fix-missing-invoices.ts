import XLSX from 'xlsx';
import { db } from '../server/db.js';
import { invoices, invoiceItems, invoicePayments, vendors, products, invoiceTemplates } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';

function normalize(str: string | undefined): string {
  return (str || '').trim().toLowerCase();
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
}

console.log('🔧 Fixing Missing Invoices...\n');

const saleWB = XLSX.readFile('attached_assets/SaleReport_1764228749066.xlsx');
const saleSheet = saleWB.Sheets[saleWB.SheetNames[0]];
const itemSheet = saleWB.Sheets['Item Details'];

interface SaleData {
  'Generated on Nov 21, 2025 at 2:51 pm': string;
  __EMPTY: string;
  __EMPTY_1: string;
  __EMPTY_2: string;
  __EMPTY_3: string;
  __EMPTY_4: string;
  __EMPTY_5: number;
  __EMPTY_6: string;
  __EMPTY_7: number;
  __EMPTY_8: number;
  __EMPTY_9: string;
  __EMPTY_10: string;
  __EMPTY_11: string;
}

interface ItemData {
  'Generated on Nov 21, 2025 at 2:51 pm': string;
  __EMPTY: string;
  __EMPTY_1: string;
  __EMPTY_2: string;
  __EMPTY_3?: string;
  __EMPTY_4: string;
  __EMPTY_9: number;
  __EMPTY_10: string;
  __EMPTY_11: number;
  __EMPTY_12: number;
  __EMPTY_13: number;
  __EMPTY_14: number;
  __EMPTY_15: number;
  __EMPTY_16: string;
  __EMPTY_17: number;
}

const salesRaw = XLSX.utils.sheet_to_json<SaleData>(saleSheet);
const itemsRaw = XLSX.utils.sheet_to_json<ItemData>(itemSheet);

const sales = salesRaw.filter(s => s.__EMPTY_1 && !s.__EMPTY_1.includes('Invoice'));
const items = itemsRaw.filter(i => i.__EMPTY && !i.__EMPTY.includes('Invoice'));

const existingInvoices = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices);
const existingNumbers = new Set(existingInvoices.map(i => i.invoiceNumber));

const existingVendors = await db.select().from(vendors);
const existingProducts = await db.select().from(products);
const defaultTemplate = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.isDefault, 1)).limit(1);

const vendorMap = new Map<string, typeof existingVendors[0]>();
existingVendors.forEach(v => {
  vendorMap.set(normalize(v.vendorName), v);
  const words = normalize(v.vendorName).split(/\s+/);
  if (words.length >= 2) {
    vendorMap.set(words.slice(0, 2).join(' '), v);
  }
});

const productMap = new Map<string, string>();
existingProducts.forEach(p => productMap.set(normalize(p.productName), p.id));

const missingSales = sales.filter(s => !existingNumbers.has(s.__EMPTY_1?.trim()));
console.log(`📋 Found ${missingSales.length} missing invoices\n`);

let created = 0, skipped = 0;

for (const sale of missingSales) {
  const invoiceNo = sale.__EMPTY_1?.trim();
  const partyName = sale.__EMPTY_2?.trim();
  
  if (!invoiceNo || !partyName) { skipped++; continue; }

  let customer = vendorMap.get(normalize(partyName));
  if (!customer) {
    const searchWords = normalize(partyName).split(/\s+/).slice(0, 3);
    for (const [key, vendor] of vendorMap) {
      if (searchWords.every(w => key.includes(w))) { customer = vendor; break; }
    }
  }
  
  if (!customer) { console.log(`  ⚠️  Customer not found: ${partyName}`); skipped++; continue; }

  const lineItems = items.filter(item => item.__EMPTY?.trim() === invoiceNo && item.__EMPTY_16?.includes('Sale'));
  
  if (lineItems.length === 0) { console.log(`  ⚠️  No line items for invoice ${invoiceNo}`); skipped++; continue; }

  try {
    await db.transaction(async (tx) => {
      let subtotalInPaise = 0, cgstTotalInPaise = 0, sgstTotalInPaise = 0;
      const invoiceItemsData: any[] = [];
      
      for (const item of lineItems) {
        const productName = item.__EMPTY_2?.trim();
        const productId = productMap.get(normalize(productName || ''));
        if (!productId) throw new Error(`Product not found: ${productName}`);
        
        const quantity = item.__EMPTY_9 || 0;
        const unitPriceInPaise = Math.round((item.__EMPTY_11 || 0) * 100);
        const discountInPaise = Math.round((item.__EMPTY_13 || 0) * 100);
        const taxPercent = item.__EMPTY_14 || 0;
        const taxAmountInPaise = Math.round((item.__EMPTY_15 || 0) * 100);
        const totalAmountInPaise = Math.round((item.__EMPTY_17 || 0) * 100);
        const taxableAmountInPaise = (quantity * unitPriceInPaise) - discountInPaise;
        
        const cgstAmountInPaise = Math.round(taxAmountInPaise / 2);
        const sgstAmountInPaise = taxAmountInPaise - cgstAmountInPaise;
        const cgstRate = Math.round((taxPercent / 2) * 100);
        
        subtotalInPaise += taxableAmountInPaise;
        cgstTotalInPaise += cgstAmountInPaise;
        sgstTotalInPaise += sgstAmountInPaise;
        
        invoiceItemsData.push({
          productId, hsnCode: item.__EMPTY_4 || '', description: productName || '',
          quantity, unitPrice: unitPriceInPaise, discount: discountInPaise,
          taxableAmount: taxableAmountInPaise, cgstRate, cgstAmount: cgstAmountInPaise,
          sgstRate: cgstRate, sgstAmount: sgstAmountInPaise,
          igstRate: 0, igstAmount: 0, cessRate: 0, cessAmount: 0, totalAmount: totalAmountInPaise,
        });
      }
      
      const vyapaarTotalInPaise = Math.round((sale.__EMPTY_5 || 0) * 100);
      const totalAmountInPaise = vyapaarTotalInPaise || (subtotalInPaise + cgstTotalInPaise + sgstTotalInPaise);
      const amountReceivedInPaise = Math.round((sale.__EMPTY_7 || 0) * 100);
      
      const [invoice] = await tx.insert(invoices).values({
        invoiceNumber: invoiceNo,
        invoiceDate: parseDate(sale['Generated on Nov 21, 2025 at 2:51 pm']),
        buyerName: customer.vendorName,
        buyerAddress: customer.address || '',
        buyerGstin: customer.gstNumber || '',
        buyerContact: customer.mobileNumber,
        isCluster: customer.isCluster,
        subtotal: subtotalInPaise,
        cgstAmount: cgstTotalInPaise,
        sgstAmount: sgstTotalInPaise,
        igstAmount: 0, cessAmount: 0, roundOff: 0,
        totalAmount: totalAmountInPaise,
        amountReceived: amountReceivedInPaise,
        status: 'delivered',
        vehicleNumber: sale.__EMPTY_11 || '',
        remarks: sale.__EMPTY_10 || '',
        templateId: defaultTemplate[0]?.id,
      }).returning();
      
      for (const itemData of invoiceItemsData) {
        await tx.insert(invoiceItems).values({ invoiceId: invoice.id, ...itemData });
      }
      
      if (amountReceivedInPaise > 0) {
        await tx.insert(invoicePayments).values({
          invoiceId: invoice.id,
          amount: amountReceivedInPaise,
          paymentType: amountReceivedInPaise >= invoice.totalAmount ? 'Full' : 'Partial',
          paymentMode: 'Cash',
          paymentMethod: 'cash',
          paymentDate: invoice.invoiceDate,
          reference: 'Vyapaar Import',
          createdBy: 'system',
        });
      }
      
      console.log(`  ✅ Created invoice ${invoiceNo} (${invoiceItemsData.length} items, ₹${(totalAmountInPaise/100).toFixed(2)})`);
      created++;
    });
  } catch (err: any) {
    console.log(`  ❌ Error creating ${invoiceNo}: ${err.message}`);
    skipped++;
  }
}

console.log(`\n✅ Created ${created} invoices, Skipped ${skipped}`);
const finalCount = await db.select({ count: sql<number>`count(*)` }).from(invoices);
console.log(`📊 Total invoices now: ${finalCount[0].count}`);

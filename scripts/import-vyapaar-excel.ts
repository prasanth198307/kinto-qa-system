import XLSX from 'xlsx';
import { db } from '../server/db.js';
import {
  productCategories,
  vendors,
  products,
  invoices,
  invoiceItems,
} from '../shared/schema.js';
import { sql } from 'drizzle-orm';

interface PartyData {
  Name: string;
  Email?: string;
  'Phone No.'?: string;
  Address?: string;
  GSTIN?: string;
  'Receivable Balance'?: number;
  'Payable Balance'?: number;
  'Credit Limit'?: string;
  Aadhar?: string;
}

interface SaleData {
  'Generated on Nov 21, 2025 at 2:51 pm': string; // Date
  __EMPTY: string; // Order No
  __EMPTY_1: string; // Invoice No
  __EMPTY_2: string; // Party Name
  __EMPTY_3: string; // Party Phone No.
  __EMPTY_4: string; // Transaction Type
  __EMPTY_5: number; // Total Amount
  __EMPTY_6: string; // Payment Type
  __EMPTY_7: number; // Received/Paid Amount
  __EMPTY_8: number; // Balance Due
  __EMPTY_9: string; // Payment Status
  __EMPTY_10: string; // Description
  __EMPTY_11: string; // Vehicle No
}

interface ItemData {
  'Generated on Nov 21, 2025 at 2:51 pm': string; // Date
  __EMPTY: string; // Invoice No./Txn No.
  __EMPTY_1: string; // Party Name
  __EMPTY_2: string; // Item Name
  __EMPTY_3?: string; // Item Code
  __EMPTY_4: string; // HSN/SAC
  __EMPTY_5?: string; // HSN Code
  __EMPTY_6?: string; // Category
  __EMPTY_7?: string; // Description
  __EMPTY_8?: string; // Challan/Order No.
  __EMPTY_9: number; // Quantity
  __EMPTY_10: string; // Unit
  __EMPTY_11: number; // UnitPrice
  __EMPTY_12: number; // Discount Percent
  __EMPTY_13: number; // Discount
  __EMPTY_14: number; // Tax Percent
  __EMPTY_15: number; // Tax
  __EMPTY_16: string; // Transaction Type
  __EMPTY_17: number; // Amount
}

// Helper function to normalize strings for matching (trim, lowercase)
function normalize(str: string | undefined): string {
  return (str || '').trim().toLowerCase();
}

// Helper function to parse date from DD/MM/YYYY format
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Helper function to generate unique codes
function generateCode(prefix: string, existingCodes: Set<string>): string {
  let counter = 1;
  let code = `${prefix}-${String(counter).padStart(3, '0')}`;
  while (existingCodes.has(code)) {
    counter++;
    code = `${prefix}-${String(counter).padStart(3, '0')}`;
  }
  existingCodes.add(code);
  return code;
}

// Helper function to extract state code from GSTIN (first 2 digits)
function getStateFromGSTIN(gstin: string | undefined): string {
  if (!gstin || gstin.length < 2) return '';
  return gstin.substring(0, 2);
}

console.log('🚀 Starting Vyapaar Excel Auto-Import...\n');

// Read Excel files
console.log('📖 Reading Excel files...');
const partyWB = XLSX.readFile('attached_assets/PartyReport_1763717077023.xlsx');
const saleWB = XLSX.readFile('attached_assets/SaleReport_1763717077023.xlsx');

const partySheet = partyWB.Sheets[partyWB.SheetNames[0]];
const saleSheet = saleWB.Sheets[saleWB.SheetNames[0]];
const itemSheet = saleWB.Sheets['Item Details'];

const parties = XLSX.utils.sheet_to_json<PartyData>(partySheet);
const salesRaw = XLSX.utils.sheet_to_json<SaleData>(saleSheet);
const itemsRaw = XLSX.utils.sheet_to_json<ItemData>(itemSheet);

// Filter out header rows (rows where Invoice No looks like a header)
const sales = salesRaw.filter(s => s.__EMPTY_1 && !s.__EMPTY_1.includes('Invoice'));
const items = itemsRaw.filter(i => i.__EMPTY && !i.__EMPTY.includes('Invoice'));

console.log(`✓ Found ${parties.length} parties`);
console.log(`✓ Found ${sales.length} sales`);
console.log(`✓ Found ${items.length} item details\n`);

// ============================================================
// PRELOAD ALL EXISTING DATA TO AVOID CODE CONFLICTS
// ============================================================
console.log('🔍 Preloading existing data from database...');

const existingCategories = await db.select().from(productCategories);
const existingVendors = await db.select().from(vendors);
const existingProducts = await db.select().from(products);

const categoryCodes = new Set(existingCategories.map(c => c.code));
const vendorCodes = new Set(existingVendors.map(v => v.vendorCode));
const productCodes = new Set(existingProducts.map(p => p.productCode));

// Create normalized lookup maps
const categoryMap = new Map<string, string>(); // normalized name -> id
const partyMap = new Map<string, string>(); // normalized name -> id
const productMap = new Map<string, string>(); // normalized name -> id

existingCategories.forEach(cat => {
  categoryMap.set(normalize(cat.name), cat.id);
});

existingVendors.forEach(v => {
  partyMap.set(normalize(v.vendorName), v.id);
});

existingProducts.forEach(p => {
  productMap.set(normalize(p.productName), p.id);
});

console.log(`✓ Loaded ${existingCategories.length} existing categories`);
console.log(`✓ Loaded ${existingVendors.length} existing vendors`);
console.log(`✓ Loaded ${existingProducts.length} existing products\n`);

// ============================================================
// STEP 1: Auto-create Product Categories
// ============================================================
console.log('📦 Step 1: Auto-creating Product Categories...');
const uniqueCategories = new Set<string>();
items.forEach(item => {
  if (item.__EMPTY_6 && item.__EMPTY_6.trim()) {
    uniqueCategories.add(item.__EMPTY_6.trim());
  }
});

// If no categories found, create a default one
if (uniqueCategories.size === 0) {
  uniqueCategories.add('General');
}

let newCategoryCount = 0;

for (const categoryName of uniqueCategories) {
  const normalizedName = normalize(categoryName);
  
  // Skip if already exists
  if (categoryMap.has(normalizedName)) {
    continue;
  }
  
  const categoryCode = generateCode('CAT', categoryCodes);
  
  try {
    const [category] = await db.insert(productCategories).values({
      code: categoryCode,
      name: categoryName,
      description: `Auto-imported from Vyapaar`,
      isActive: 'true',
    }).returning();
    
    categoryMap.set(normalizedName, category.id);
    newCategoryCount++;
    console.log(`  ✓ Created category: ${categoryName} (${categoryCode})`);
  } catch (err: any) {
    console.error(`  ❌ Error creating category ${categoryName}:`, err.message);
  }
}

console.log(`✅ Created ${newCategoryCount} new categories (Total: ${categoryMap.size})\n`);

// ============================================================
// STEP 2: Auto-create Customers from Party Report
// ============================================================
console.log('👥 Step 2: Auto-creating Customers...');
let newCustomerCount = 0;

for (const party of parties) {
  if (!party.Name || party.Name.trim() === '' || party.Name === 'a') continue;
  
  const normalizedName = normalize(party.Name);
  
  // Skip if already exists
  if (partyMap.has(normalizedName)) {
    continue;
  }
  
  const vendorCode = generateCode('CUST', vendorCodes);
  
  try {
    const [vendor] = await db.insert(vendors).values({
      vendorCode: vendorCode,
      vendorName: party.Name.trim(),
      address: party.Address || '',
      mobileNumber: party['Phone No.'] || '0000000000',
      email: party.Email || '',
      gstNumber: party.GSTIN || '',
      aadhaarNumber: party.Aadhar || '',
      vendorType: 'customer',
      isActive: 'true',
    }).returning();
    
    partyMap.set(normalizedName, vendor.id);
    newCustomerCount++;
    console.log(`  ✓ Created customer: ${party.Name.trim()} (${vendorCode})`);
  } catch (err: any) {
    console.error(`  ❌ Error creating customer ${party.Name.trim()}:`, err.message);
  }
}

console.log(`✅ Created ${newCustomerCount} new customers (Total: ${partyMap.size})\n`);

// ============================================================
// STEP 3: Auto-create Products from Item Details
// ============================================================
console.log('📦 Step 3: Auto-creating Products...');
const uniqueProducts = new Map<string, ItemData>();
items.forEach(item => {
  const itemName = item.__EMPTY_2?.trim();
  if (itemName && !uniqueProducts.has(itemName)) {
    uniqueProducts.set(itemName, item);
  }
});

let newProductCount = 0;

for (const [productName, itemData] of uniqueProducts) {
  const normalizedName = normalize(productName);
  
  // Skip if already exists
  if (productMap.has(normalizedName)) {
    continue;
  }
  
  const productCode = generateCode('PROD', productCodes);
  
  // Get category ID (use first category if category not specified)
  let categoryId = categoryMap.get(normalize(itemData.__EMPTY_6 || ''));
  if (!categoryId) {
    categoryId = categoryMap.values().next().value;
  }
  
  // Convert price from rupees to paise (and round to avoid float precision issues)
  const unitPriceInPaise = Math.round((itemData.__EMPTY_11 || 0) * 100);
  
  // Convert GST percent to basis points (e.g., 18% → 1800)
  const gstPercent = Math.round((itemData.__EMPTY_14 || 0) * 100);
  
  try {
    const [product] = await db.insert(products).values({
      productCode: productCode,
      productName: productName,
      skuCode: itemData.__EMPTY_3 || productCode,
      categoryId: categoryId,
      baseUnit: itemData.__EMPTY_10 || 'pcs',
      basePrice: unitPriceInPaise,
      gstPercent: gstPercent.toString(),
      hsnCode: itemData.__EMPTY_4 || '',
      description: itemData.__EMPTY_7 || '',
      isActive: 'true',
    }).returning();
    
    productMap.set(normalizedName, product.id);
    newProductCount++;
    console.log(`  ✓ Created product: ${productName} (${productCode})`);
  } catch (err: any) {
    console.error(`  ❌ Error creating product ${productName}:`, err.message);
  }
}

console.log(`✅ Created ${newProductCount} new products (Total: ${productMap.size})\n`);

// ============================================================
// STEP 4: Auto-create Invoices with Line Items (with Transactions)
// ============================================================
console.log('📄 Step 4: Auto-creating Invoices with Transactions...');
let invoiceCount = 0;
let skippedInvoices = 0;

// Get company state from environment or default to Andhra Pradesh (37)
// This is used to determine intra-state (CGST+SGST) vs inter-state (IGST) transactions
const COMPANY_STATE = process.env.COMPANY_GST_STATE_CODE || '37';

for (const sale of sales) {
  const invoiceNo = sale.__EMPTY_1?.trim();
  const partyName = sale.__EMPTY_2?.trim();
  const invoiceDate = parseDate(sale['Generated on Nov 21, 2025 at 2:51 pm']);
  
  if (!invoiceNo || !partyName) {
    skippedInvoices++;
    continue;
  }
  
  // Get customer ID (normalized lookup)
  const customerId = partyMap.get(normalize(partyName));
  if (!customerId) {
    console.log(`  ⚠️  Customer not found for invoice ${invoiceNo}: ${partyName}`);
    skippedInvoices++;
    continue;
  }
  
  // Get customer details
  const customer = existingVendors.find(v => v.id === customerId) || 
                   (await db.select().from(vendors).where(sql`id = ${customerId}`).limit(1))[0];
  if (!customer) {
    skippedInvoices++;
    continue;
  }
  
  // Find all line items for this invoice
  const lineItems = items.filter(item => 
    item.__EMPTY?.trim() === invoiceNo && item.__EMPTY_16?.includes('Sale')
  );
  
  if (lineItems.length === 0) {
    console.log(`  ⚠️  No line items found for invoice ${invoiceNo}`);
    skippedInvoices++;
    continue;
  }
  
  // Determine if inter-state or intra-state based on GSTIN
  const buyerState = getStateFromGSTIN(customer.gstNumber);
  const isInterState = buyerState && buyerState !== COMPANY_STATE;
  
  try {
    // *** USE DATABASE TRANSACTION FOR ATOMICITY ***
    await db.transaction(async (tx) => {
      // Calculate totals (all in paise)
      let subtotalInPaise = 0;
      let cgstTotalInPaise = 0;
      let sgstTotalInPaise = 0;
      let igstTotalInPaise = 0;
      
      const invoiceItemsData: any[] = [];
      
      for (const item of lineItems) {
        const productName = item.__EMPTY_2?.trim();
        const productId = productMap.get(normalize(productName || ''));
        
        if (!productId) {
          throw new Error(`Product not found for item: ${productName} in invoice ${invoiceNo}`);
        }
        
        const quantity = item.__EMPTY_9 || 0;
        const unitPriceInPaise = Math.round((item.__EMPTY_11 || 0) * 100);
        const discountInPaise = Math.round((item.__EMPTY_13 || 0) * 100);
        const taxPercent = item.__EMPTY_14 || 0;
        const taxAmountInPaise = Math.round((item.__EMPTY_15 || 0) * 100);
        const totalAmountInPaise = Math.round((item.__EMPTY_17 || 0) * 100);
        
        const taxableAmountInPaise = (quantity * unitPriceInPaise) - discountInPaise;
        
        // GST Handling: Intra-state (CGST+SGST) vs Inter-state (IGST)
        let cgstAmountInPaise = 0;
        let sgstAmountInPaise = 0;
        let igstAmountInPaise = 0;
        let cgstRate = 0;
        let sgstRate = 0;
        let igstRate = 0;
        
        if (isInterState) {
          // Inter-state: Use IGST
          igstAmountInPaise = taxAmountInPaise;
          igstRate = Math.round(taxPercent * 100); // Convert to basis points
          igstTotalInPaise += igstAmountInPaise;
        } else {
          // Intra-state: Split into CGST + SGST (50/50)
          cgstAmountInPaise = Math.round(taxAmountInPaise / 2);
          sgstAmountInPaise = taxAmountInPaise - cgstAmountInPaise;
          cgstRate = Math.round((taxPercent / 2) * 100); // Half of total rate in basis points
          sgstRate = cgstRate;
          cgstTotalInPaise += cgstAmountInPaise;
          sgstTotalInPaise += sgstAmountInPaise;
        }
        
        subtotalInPaise += taxableAmountInPaise;
        
        invoiceItemsData.push({
          productId: productId,
          hsnCode: item.__EMPTY_4 || '',
          description: productName || '',
          quantity: quantity,
          unitPrice: unitPriceInPaise,
          discount: discountInPaise,
          taxableAmount: taxableAmountInPaise,
          cgstRate: cgstRate,
          cgstAmount: cgstAmountInPaise,
          sgstRate: sgstRate,
          sgstAmount: sgstAmountInPaise,
          igstRate: igstRate,
          igstAmount: igstAmountInPaise,
          cessRate: 0,
          cessAmount: 0,
          totalAmount: totalAmountInPaise,
        });
      }
      
      const totalAmountInPaise = subtotalInPaise + cgstTotalInPaise + sgstTotalInPaise + igstTotalInPaise;
      const amountReceivedInPaise = Math.round((sale.__EMPTY_7 || 0) * 100);
      
      // Create invoice within transaction
      const [invoice] = await tx.insert(invoices).values({
        invoiceNumber: invoiceNo,
        invoiceDate: invoiceDate,
        buyerName: customer.vendorName,
        buyerAddress: customer.address || '',
        buyerGstin: customer.gstNumber || '',
        buyerContact: customer.mobileNumber,
        isCluster: customer.isCluster,
        subtotal: subtotalInPaise,
        cgstAmount: cgstTotalInPaise,
        sgstAmount: sgstTotalInPaise,
        igstAmount: igstTotalInPaise,
        cessAmount: 0,
        roundOff: 0,
        totalAmount: totalAmountInPaise,
        amountReceived: amountReceivedInPaise,
        status: sale.__EMPTY_9 === 'Paid' ? 'ready_for_gatepass' : 'draft',
        vehicleNumber: sale.__EMPTY_11 || '',
        remarks: sale.__EMPTY_10 || '',
      }).returning();
      
      // Create invoice items within same transaction
      for (const itemData of invoiceItemsData) {
        await tx.insert(invoiceItems).values({
          invoiceId: invoice.id,
          ...itemData,
        });
      }
      
      console.log(`  ✓ Created invoice: ${invoiceNo} (${lineItems.length} items, ${isInterState ? 'IGST' : 'CGST+SGST'}, ₹${(totalAmountInPaise / 100).toFixed(2)})`);
    });
    
    invoiceCount++;
  } catch (err: any) {
    if (err.message?.includes('unique')) {
      console.log(`  ⚠️  Invoice ${invoiceNo} already exists, skipping...`);
    } else {
      console.error(`  ❌ Error creating invoice ${invoiceNo}:`, err.message);
    }
    skippedInvoices++;
  }
}

console.log(`✅ Created ${invoiceCount} invoices (Skipped: ${skippedInvoices})\n`);

// ============================================================
// FINAL SUMMARY
// ============================================================
console.log('═══════════════════════════════════════');
console.log('✅ AUTO-IMPORT COMPLETE!');
console.log('═══════════════════════════════════════');
console.log(`📦 Product Categories: ${newCategoryCount} new (${categoryMap.size} total)`);
console.log(`👥 Customers: ${newCustomerCount} new (${partyMap.size} total)`);
console.log(`📦 Products: ${newProductCount} new (${productMap.size} total)`);
console.log(`📄 Invoices: ${invoiceCount} (Skipped: ${skippedInvoices})`);
console.log('═══════════════════════════════════════\n');

console.log('🎉 All data imported successfully!');
console.log('📊 You can now view your data in KINTO Smart Ops\n');

process.exit(0);

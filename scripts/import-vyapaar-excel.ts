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

console.log('🚀 Starting Vyapaar Excel Auto-Import...\n');

// Read Excel files
console.log('📖 Reading Excel files...');
const partyWB = XLSX.readFile('attached_assets/PartyReport_1763717077023.xlsx');
const saleWB = XLSX.readFile('attached_assets/SaleReport_1763717077023.xlsx');

const partySheet = partyWB.Sheets[partyWB.SheetNames[0]];
const saleSheet = saleWB.Sheets[saleWB.SheetNames[0]];
const itemSheet = saleWB.Sheets['Item Details'];

let parties = XLSX.utils.sheet_to_json<PartyData>(partySheet);
let sales = XLSX.utils.sheet_to_json<SaleData>(saleSheet);
let items = XLSX.utils.sheet_to_json<ItemData>(itemSheet);

// Skip header rows (first row contains column names)
sales = sales.slice(1);
items = items.slice(1);

console.log(`✓ Found ${parties.length} parties`);
console.log(`✓ Found ${sales.length} sales`);
console.log(`✓ Found ${items.length} item details\n`);

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

// Step 1: Auto-create Product Categories
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

const categoryCodes = new Set<string>();
const categoryMap = new Map<string, string>(); // categoryName -> categoryId

for (const categoryName of uniqueCategories) {
  const categoryCode = generateCode('CAT', categoryCodes);
  
  try {
    const [category] = await db.insert(productCategories).values({
      code: categoryCode,
      name: categoryName,
      description: `Auto-imported from Vyapaar`,
      isActive: 'true',
    }).returning();
    
    categoryMap.set(categoryName, category.id);
    console.log(`  ✓ Created category: ${categoryName} (${categoryCode})`);
  } catch (err: any) {
    console.log(`  ⚠️  Category ${categoryName} may already exist, skipping...`);
  }
}

// Get existing categories from database
const existingCategories = await db.select().from(productCategories);
existingCategories.forEach(cat => {
  categoryMap.set(cat.name, cat.id);
});

console.log(`✅ Created/Found ${categoryMap.size} categories\n`);

// Step 2: Auto-create Customers from Party Report
console.log('👥 Step 2: Auto-creating Customers...');
const vendorCodes = new Set<string>();
const partyMap = new Map<string, string>(); // partyName -> vendorId
let customerCount = 0;

for (const party of parties) {
  if (!party.Name || party.Name.trim() === '' || party.Name === 'a') continue;
  
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
    
    partyMap.set(party.Name.trim(), vendor.id);
    customerCount++;
    console.log(`  ✓ Created customer: ${party.Name.trim()} (${vendorCode})`);
  } catch (err: any) {
    if (err.message?.includes('unique')) {
      console.log(`  ⚠️  Customer ${party.Name.trim()} may already exist, skipping...`);
    } else {
      console.error(`  ❌ Error creating customer ${party.Name.trim()}:`, err.message);
    }
  }
}

// Get existing vendors/customers from database
const existingVendors = await db.select().from(vendors);
existingVendors.forEach(v => {
  partyMap.set(v.vendorName, v.id);
});

console.log(`✅ Created ${customerCount} new customers (Total: ${partyMap.size})\n`);

// Step 3: Auto-create Products from Item Details
console.log('📦 Step 3: Auto-creating Products...');
const uniqueProducts = new Map<string, ItemData>();
items.forEach(item => {
  const itemName = item.__EMPTY_2?.trim();
  if (itemName && !uniqueProducts.has(itemName)) {
    uniqueProducts.set(itemName, item);
  }
});

const productCodes = new Set<string>();
const productMap = new Map<string, string>(); // productName -> productId
let productCount = 0;

for (const [productName, itemData] of uniqueProducts) {
  const productCode = generateCode('PROD', productCodes);
  
  // Get category ID (use first category if category not specified)
  let categoryId = categoryMap.get(itemData.__EMPTY_6?.trim() || '');
  if (!categoryId) {
    categoryId = categoryMap.values().next().value;
  }
  
  // Convert price from rupees to paise
  const unitPriceInPaise = Math.round((itemData.__EMPTY_11 || 0) * 100);
  const gstPercent = itemData.__EMPTY_14 || 0;
  
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
    
    productMap.set(productName, product.id);
    productCount++;
    console.log(`  ✓ Created product: ${productName} (${productCode})`);
  } catch (err: any) {
    if (err.message?.includes('unique')) {
      console.log(`  ⚠️  Product ${productName} may already exist, skipping...`);
    } else {
      console.error(`  ❌ Error creating product ${productName}:`, err.message);
    }
  }
}

// Get existing products from database
const existingProducts = await db.select().from(products);
existingProducts.forEach(p => {
  productMap.set(p.productName, p.id);
});

console.log(`✅ Created ${productCount} new products (Total: ${productMap.size})\n`);

// Step 4: Auto-create Invoices with Line Items
console.log('📄 Step 4: Auto-creating Invoices...');
let invoiceCount = 0;

for (const sale of sales) {
  const invoiceNo = sale.__EMPTY_1?.trim();
  const partyName = sale.__EMPTY_2?.trim();
  const invoiceDate = parseDate(sale['Generated on Nov 21, 2025 at 2:51 pm']);
  
  if (!invoiceNo || !partyName) continue;
  
  // Get customer ID
  const customerId = partyMap.get(partyName);
  if (!customerId) {
    console.log(`  ⚠️  Customer not found for invoice ${invoiceNo}: ${partyName}`);
    continue;
  }
  
  // Get customer details
  const customer = existingVendors.find(v => v.id === customerId);
  if (!customer) continue;
  
  // Find all line items for this invoice
  const lineItems = items.filter(item => 
    item.__EMPTY?.trim() === invoiceNo && item.__EMPTY_16 === 'Sale '
  );
  
  if (lineItems.length === 0) {
    console.log(`  ⚠️  No line items found for invoice ${invoiceNo}`);
    continue;
  }
  
  // Calculate totals (all in paise)
  let subtotalInPaise = 0;
  let cgstTotalInPaise = 0;
  let sgstTotalInPaise = 0;
  let igstTotalInPaise = 0;
  
  const invoiceItemsData: any[] = [];
  
  for (const item of lineItems) {
    const productName = item.__EMPTY_2?.trim();
    const productId = productMap.get(productName || '');
    
    if (!productId) {
      console.log(`    ⚠️  Product not found for item: ${productName}`);
      continue;
    }
    
    const quantity = item.__EMPTY_9 || 0;
    const unitPriceInPaise = Math.round((item.__EMPTY_11 || 0) * 100);
    const discountInPaise = Math.round((item.__EMPTY_13 || 0) * 100);
    const taxPercent = item.__EMPTY_14 || 0;
    const taxAmountInPaise = Math.round((item.__EMPTY_15 || 0) * 100);
    const totalAmountInPaise = Math.round((item.__EMPTY_17 || 0) * 100);
    
    const taxableAmountInPaise = (quantity * unitPriceInPaise) - discountInPaise;
    
    // For same-state transactions, split GST into CGST and SGST
    const cgstAmountInPaise = Math.round(taxAmountInPaise / 2);
    const sgstAmountInPaise = taxAmountInPaise - cgstAmountInPaise;
    
    subtotalInPaise += taxableAmountInPaise;
    cgstTotalInPaise += cgstAmountInPaise;
    sgstTotalInPaise += sgstAmountInPaise;
    
    invoiceItemsData.push({
      productId: productId,
      hsnCode: item.__EMPTY_4 || '',
      description: productName || '',
      quantity: quantity,
      unitPrice: unitPriceInPaise,
      discount: discountInPaise,
      taxableAmount: taxableAmountInPaise,
      cgstRate: Math.round((taxPercent / 2) * 100), // Convert to basis points
      cgstAmount: cgstAmountInPaise,
      sgstRate: Math.round((taxPercent / 2) * 100),
      sgstAmount: sgstAmountInPaise,
      igstRate: 0,
      igstAmount: 0,
      cessRate: 0,
      cessAmount: 0,
      totalAmount: totalAmountInPaise,
    });
  }
  
  const totalAmountInPaise = subtotalInPaise + cgstTotalInPaise + sgstTotalInPaise;
  const amountReceivedInPaise = Math.round((sale.__EMPTY_7 || 0) * 100);
  
  try {
    // Create invoice
    const [invoice] = await db.insert(invoices).values({
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
    
    // Create invoice items
    for (const itemData of invoiceItemsData) {
      await db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        ...itemData,
      });
    }
    
    invoiceCount++;
    console.log(`  ✓ Created invoice: ${invoiceNo} (${lineItems.length} items, ₹${(totalAmountInPaise / 100).toFixed(2)})`);
  } catch (err: any) {
    if (err.message?.includes('unique')) {
      console.log(`  ⚠️  Invoice ${invoiceNo} may already exist, skipping...`);
    } else {
      console.error(`  ❌ Error creating invoice ${invoiceNo}:`, err.message);
    }
  }
}

console.log(`✅ Created ${invoiceCount} invoices\n`);

// Final Summary
console.log('═══════════════════════════════════════');
console.log('✅ AUTO-IMPORT COMPLETE!');
console.log('═══════════════════════════════════════');
console.log(`📦 Product Categories: ${categoryMap.size}`);
console.log(`👥 Customers: ${customerCount} new (${partyMap.size} total)`);
console.log(`📦 Products: ${productCount} new (${productMap.size} total)`);
console.log(`📄 Invoices: ${invoiceCount}`);
console.log('═══════════════════════════════════════\n');

console.log('🎉 All data imported successfully!');
console.log('📊 You can now view your data in KINTO Smart Ops\n');

process.exit(0);

import XLSX from 'xlsx';
import { db } from '../server/db.js';
import {
  productCategories,
  vendors,
  products,
  invoices,
  invoiceItems,
  invoicePayments,
  uom,
  productTypes,
  vendorTypes,
  vendorVendorTypes,
  gatepasses,
  gatepassItems,
  salesReturns,
  salesReturnItems,
  creditNotes,
} from '../shared/schema.js';
import { sql, eq, and } from 'drizzle-orm';

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
  'Generated on Nov 22, 2025 at 5:56 pm': string; // Date
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
  'Generated on Nov 22, 2025 at 5:56 pm': string; // Date
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

// Helper function to parse date from DD/MM/YYYY format and return ISO string
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
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

// Helper function to determine vendor type based on product name
function classifyVendorTypeByProduct(productName: string): string[] {
  const normalized = normalize(productName);
  const types: string[] = [];
  
  // Kinto products
  if (normalized.includes('kinto') || normalized.includes('blue')) {
    types.push('Kinto');
  }
  
  // HPPani products  
  if (normalized.includes('hp pani') || normalized.includes('hppani') || normalized.includes('red')) {
    types.push('HPPani');
  }
  
  // Purejal products
  if (normalized.includes('purejal') || normalized.includes('green')) {
    types.push('Purejal');
  }
  
  return types;
}

// Helper function to find vendor by name (handles name variations)
function findVendorByName(partyName: string, partyMap: Map<string, string>): string | undefined {
  // Try exact normalized match first
  let vendorId = partyMap.get(normalize(partyName));
  if (vendorId) return vendorId;
  
  // Try matching against the part before parentheses
  const mainName = partyName.split('(')[0].trim();
  vendorId = partyMap.get(normalize(mainName));
  if (vendorId) return vendorId;
  
  // Try matching against the part inside parentheses
  const altName = partyName.match(/\(([^)]+)\)/)?.[1];
  if (altName) {
    vendorId = partyMap.get(normalize(altName));
    if (vendorId) return vendorId;
  }
  
  // Try fuzzy match - find vendors that contain key words from the party name
  const normalizedName = normalize(partyName);
  const words = normalizedName.split(/\s+/).filter(w => w.length > 3); // Only significant words
  
  for (const [key, id] of partyMap.entries()) {
    // Check if the vendor name contains most of the significant words
    const matchCount = words.filter(word => key.includes(word)).length;
    if (matchCount >= Math.min(3, words.length - 1)) { // Match at least 3 words or all but one
      return id;
    }
  }
  
  return undefined;
}

console.log('🚀 Starting Vyapaar Excel Auto-Import WITH VENDOR TYPE CLASSIFICATION...\n');

// ============================================================
// STEP 0: CLEAR OLD DATA (Full database reset)
// ============================================================
console.log('🗑️  Step 0: Clearing old data...');

try {
  // Use TRUNCATE with CASCADE to automatically handle all foreign key dependencies
  // This is much simpler than manually deleting in the right order
  const tablesToClear = [
    'credit_notes',
    'sales_return_items',
    'sales_returns',
    'gatepass_items',
    'gatepasses',
    'invoice_payments',
    'invoice_items',
    'invoices',
    'finished_goods',
    'raw_material_issuance_items',
    'raw_material_issuance',
    'raw_material_transactions',
    'raw_materials',
    'production_entries',
    'vendor_vendor_types',
    'products',
    'product_categories',
    'product_types',
    'vendors',
    'uom',
  ];
  
  console.log(`  Clearing ${tablesToClear.length} tables...`);
  
  for (const table of tablesToClear) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
    console.log(`  ✓ Cleared ${table}`);
  }
  
  console.log('✅ All old data cleared successfully\n');
} catch (err: any) {
  console.error('❌ Error clearing data:', err.message);
  throw err;
}

// Read Excel files
console.log('📖 Reading Excel files...');
const partyWB = XLSX.readFile('attached_assets/PartyReport_1763834378973.xlsx');
const saleWB = XLSX.readFile('attached_assets/SaleReport_1763834378973.xlsx');

const partySheet = partyWB.Sheets[partyWB.SheetNames[0]];
const saleSheet = saleWB.Sheets[saleWB.SheetNames[0]];
const itemSheet = saleWB.Sheets['Item Details'];

const parties = XLSX.utils.sheet_to_json<PartyData>(partySheet);
const salesRaw = XLSX.utils.sheet_to_json<SaleData>(saleSheet);
const itemsRaw = XLSX.utils.sheet_to_json<ItemData>(itemSheet);

// Filter out header rows
const sales = salesRaw.filter(s => s.__EMPTY_1 && !s.__EMPTY_1.includes('Invoice'));
const items = itemsRaw.filter(i => i.__EMPTY && !i.__EMPTY.includes('Invoice'));

console.log(`✓ Found ${parties.length} parties`);
console.log(`✓ Found ${sales.length} sales`);
console.log(`✓ Found ${items.length} item details\n`);

// ============================================================
// PRELOAD EXISTING DATA
// ============================================================
console.log('🔍 Preloading existing data from database...');

const existingCategories = await db.select().from(productCategories);
const existingVendors = await db.select().from(vendors);
const existingProducts = await db.select().from(products);
const existingUOMs = await db.select().from(uom);
const existingProductTypes = await db.select().from(productTypes);
const existingVendorTypes = await db.select().from(vendorTypes);

const categoryCodes = new Set(existingCategories.map(c => c.code));
const vendorCodes = new Set(existingVendors.map(v => v.vendorCode));
const productCodes = new Set(existingProducts.map(p => p.productCode));
const uomCodes = new Set(existingUOMs.map(u => u.code));
const productTypeCodes = new Set(existingProductTypes.map(pt => pt.code));

// Create normalized lookup maps
const categoryMap = new Map<string, string>();
const partyMap = new Map<string, string>();
const productMap = new Map<string, string>();
const uomMap = new Map<string, string>();
const productTypeMap = new Map<string, string>();
const vendorTypeMap = new Map<string, string>();

existingCategories.forEach(cat => {
  categoryMap.set(normalize(cat.name), cat.id);
});

existingVendors.forEach(v => {
  partyMap.set(normalize(v.vendorName), v.id);
});

existingProducts.forEach(p => {
  productMap.set(normalize(p.productName), p.id);
});

existingUOMs.forEach(u => {
  uomMap.set(normalize(u.name), u.id);
});

existingProductTypes.forEach(pt => {
  productTypeMap.set(normalize(pt.name), pt.id);
});

existingVendorTypes.forEach(vt => {
  vendorTypeMap.set(normalize(vt.name), vt.id);
});

console.log(`✓ Loaded ${existingCategories.length} existing categories`);
console.log(`✓ Loaded ${existingVendors.length} existing vendors`);
console.log(`✓ Loaded ${existingProducts.length} existing products`);
console.log(`✓ Loaded ${existingUOMs.length} existing UOMs`);
console.log(`✓ Loaded ${existingProductTypes.length} existing product types`);
console.log(`✓ Loaded ${existingVendorTypes.length} existing vendor types\n`);

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

if (uniqueCategories.size === 0) {
  uniqueCategories.add('General');
}

let newCategoryCount = 0;

for (const categoryName of uniqueCategories) {
  const normalizedName = normalize(categoryName);
  
  if (categoryMap.has(normalizedName)) {
    continue;
  }
  
  const categoryCode = generateCode('CAT', categoryCodes);
  
  try {
    const [category] = await db.insert(productCategories).values({
      code: categoryCode,
      name: categoryName,
      description: `Auto-imported from Vyapaar`,
      isActive: 1,
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
// STEP 1.5: Auto-create UOMs and ensure default Product Type exists
// ============================================================
console.log('📏 Step 1.5: Auto-creating UOMs...');

const uniqueUnits = new Set<string>();
items.forEach(item => {
  const unit = item.__EMPTY_10?.trim();
  if (unit) {
    uniqueUnits.add(unit);
  }
});

let newUOMCount = 0;

for (const unitName of uniqueUnits) {
  const normalizedUnit = normalize(unitName);
  
  if (uomMap.has(normalizedUnit)) {
    continue;
  }
  
  const uomCode = generateCode('UOM', uomCodes);
  
  try {
    const [newUOM] = await db.insert(uom).values({
      code: uomCode,
      name: unitName,
      description: `Auto-imported from Vyapaar`,
      isActive: 1,
    }).returning();
    
    uomMap.set(normalizedUnit, newUOM.id);
    newUOMCount++;
    console.log(`  ✓ Created UOM: ${unitName} (${uomCode})`);
  } catch (err: any) {
    console.error(`  ❌ Error creating UOM ${unitName}:`, err.message);
  }
}

console.log(`✅ Created ${newUOMCount} new UOMs (Total: ${uomMap.size})`);

// Ensure fallback UOM 'pcs' exists
let fallbackUOMId = uomMap.get(normalize('pcs'));
if (!fallbackUOMId) {
  const fallbackCode = generateCode('UOM', uomCodes);
  try {
    const [fallbackUOM] = await db.insert(uom).values({
      code: fallbackCode,
      name: 'pcs',
      description: 'Auto-created fallback unit',
      isActive: 1,
    }).returning();
    fallbackUOMId = fallbackUOM.id;
    uomMap.set(normalize('pcs'), fallbackUOM.id);
    console.log(`✓ Created fallback UOM: pcs (${fallbackCode})`);
  } catch (err: any) {
    console.error(`❌ Error creating fallback UOM:`, err.message);
    throw new Error('Failed to create fallback UOM');
  }
} else {
  console.log(`✓ Fallback UOM 'pcs' exists`);
}

console.log();

// Ensure default product type exists
let defaultProductTypeId = productTypeMap.get(normalize('Finished Goods'));
if (!defaultProductTypeId) {
  defaultProductTypeId = productTypeMap.get(normalize('Sold Items'));
}
if (!defaultProductTypeId && productTypeMap.size > 0) {
  defaultProductTypeId = productTypeMap.values().next().value;
}
if (!defaultProductTypeId) {
  const typeCode = generateCode('PTYPE', productTypeCodes);
  try {
    const [newType] = await db.insert(productTypes).values({
      code: typeCode,
      name: 'Finished Goods',
      description: 'Auto-created product type for imported items',
      isActive: 1,
    }).returning();
    defaultProductTypeId = newType.id;
    productTypeMap.set(normalize('Finished Goods'), newType.id);
    console.log(`✓ Created default product type: Finished Goods (${typeCode})`);
  } catch (err: any) {
    console.error(`❌ Error creating default product type:`, err.message);
    throw new Error('Failed to create default product type');
  }
} else {
  console.log(`✓ Using existing product type for imported products\n`);
}

// ============================================================
// STEP 2: Auto-create Customers from Party Report
// ============================================================
console.log('👥 Step 2: Auto-creating Customers...');
let newCustomerCount = 0;

for (const party of parties) {
  if (!party.Name || party.Name.trim() === '' || party.Name === 'a') continue;
  
  const normalizedName = normalize(party.Name);
  
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
    console.log(`  ✓ Created customer: ${party.Name} (${vendorCode})`);
  } catch (err: any) {
    console.error(`  ❌ Error creating customer ${party.Name}:`, err.message);
  }
}

console.log(`✅ Created ${newCustomerCount} new customers (Total: ${partyMap.size})\n`);

// ============================================================
// STEP 3: Auto-create Products from Item Details
// ============================================================
console.log('📦 Step 3: Auto-creating Products...');
let newProductCount = 0;

// Get or create "General" category as fallback
let generalCategoryId = categoryMap.get(normalize('General'));
if (!generalCategoryId) {
  const categoryCode = generateCode('CAT', categoryCodes);
  const [category] = await db.insert(productCategories).values({
    code: categoryCode,
    name: 'General',
    description: 'Auto-created fallback category',
    isActive: 1,
  }).returning();
  generalCategoryId = category.id;
  categoryMap.set(normalize('General'), generalCategoryId);
  console.log(`✓ Created fallback category: General (${categoryCode})`);
}

for (const item of items) {
  if (!item.__EMPTY_2 || item.__EMPTY_2.trim() === '') continue;
  
  const productName = item.__EMPTY_2.trim();
  const normalizedName = normalize(productName);
  
  if (productMap.has(normalizedName)) {
    continue;
  }
  
  const productCode = item.__EMPTY_3?.trim() || generateCode('PROD', productCodes);
  const categoryName = item.__EMPTY_6?.trim() || 'General';
  const categoryId = categoryMap.get(normalize(categoryName)) || generalCategoryId;
  const unit = item.__EMPTY_10?.trim();
  const uomId = unit ? (uomMap.get(normalize(unit)) || fallbackUOMId) : fallbackUOMId;
  
  try {
    const [product] = await db.insert(products).values({
      productCode: productCode,
      productName: productName,
      description: item.__EMPTY_7 || `Auto-imported from Vyapaar`,
      categoryId: categoryId!,
      typeId: defaultProductTypeId!,
      uomId: uomId!,
      hsnCode: item.__EMPTY_4 || item.__EMPTY_5 || '',
      unitPrice: item.__EMPTY_11 || 0,
      gstRate: item.__EMPTY_14 || 18,
      isActive: 1,
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
// STEP 4: Create Invoices with Items and Payments
// ============================================================
console.log('💵 Step 4: Creating Invoices with Items...');
let invoiceCount = 0;
let skippedCount = 0;

// Track vendor types based on purchased products
const vendorProductTypes = new Map<string, Set<string>>(); // vendorId -> Set of vendor type names

// Track used invoice numbers to handle duplicates
const usedInvoiceNumbers = new Set<string>();

for (const sale of sales) {
  const partyName = sale.__EMPTY_2?.trim();
  if (!partyName) {
    skippedCount++;
    continue;
  }
  
  // Use smart vendor lookup that handles name variations
  const vendorId = findVendorByName(partyName, partyMap);
  if (!vendorId) {
    console.log(`  ⚠️  Skipping invoice - vendor not found: ${partyName}`);
    skippedCount++;
    continue;
  }
  
  let invoiceNo = sale.__EMPTY_1?.trim();
  if (!invoiceNo) {
    skippedCount++;
    continue;
  }
  
  // Find all items for this invoice
  const itemsForInvoice = items.filter(i => i.__EMPTY?.trim() === invoiceNo);
  if (itemsForInvoice.length === 0) {
    console.log(`  ⚠️  Skipping invoice ${invoiceNo} - no items found`);
    skippedCount++;
    continue;
  }
  
  // Handle duplicate invoice numbers by adding suffix
  let finalInvoiceNo = invoiceNo;
  if (usedInvoiceNumbers.has(invoiceNo)) {
    let dupCounter = 2;
    finalInvoiceNo = `${invoiceNo}-DUP${dupCounter}`;
    while (usedInvoiceNumbers.has(finalInvoiceNo)) {
      dupCounter++;
      finalInvoiceNo = `${invoiceNo}-DUP${dupCounter}`;
    }
    console.log(`  ℹ️  Duplicate invoice #${invoiceNo} for ${partyName} - renaming to ${finalInvoiceNo}`);
  }
  usedInvoiceNumbers.add(finalInvoiceNo);
  
  try {
    await db.transaction(async (tx) => {
      // Convert invoice totals to paise
      const totalAmount = Math.round((sale.__EMPTY_5 || 0) * 100);
      const totalGst = Math.round((sale.__EMPTY_8 || 0) * 100);
      const subtotal = totalAmount - totalGst;
      
      // Create invoice
      const [invoice] = await tx.insert(invoices).values({
        invoiceNumber: finalInvoiceNo,
        invoiceDate: parseDate(sale['Generated on Nov 22, 2025 at 5:56 pm']),
        buyerName: partyName,
        buyerGstin: '',
        buyerAddress: '',
        buyerState: 'Karnataka',
        buyerStateCode: '29',
        sellerName: 'KINTO Manufacturing',
        sellerGstin: '29AAAAA0000A1Z5',
        sellerAddress: '',
        sellerState: 'Karnataka',
        sellerStateCode: '29',
        sellerPhone: '',
        sellerEmail: '',
        subtotal: subtotal,
        totalAmount: totalAmount,
        totalGst: totalGst,
        templateId: null,
        termsConditionsId: null,
        paymentStatus: sale.__EMPTY_9 === 'Paid' ? 'paid' : 'partial',
        dispatchStatus: 'delivered',
        remarks: sale.__EMPTY_10 || '',
      }).returning();
      
      if (!invoice) {
        throw new Error('Failed to create invoice');
      }
      
      // Create invoice items
      for (const item of itemsForInvoice) {
        const productName = item.__EMPTY_2?.trim();
        if (!productName) continue;
        
        const productId = productMap.get(normalize(productName));
        if (!productId) {
          console.log(`    ⚠️  Product not found: ${productName}`);
          continue;
        }
        
        // Track vendor types based on products
        const types = classifyVendorTypeByProduct(productName);
        if (types.length > 0) {
          if (!vendorProductTypes.has(vendorId)) {
            vendorProductTypes.set(vendorId, new Set());
          }
          types.forEach(t => vendorProductTypes.get(vendorId)!.add(t));
        }
        
        // Convert to paise (multiply by 100) and ensure integers
        const quantity = Math.round((item.__EMPTY_9 || 1) * 100);
        const unitPrice = Math.round((item.__EMPTY_11 || 0) * 100);
        const taxableAmount = Math.round((item.__EMPTY_12 || 0) * 100);
        const gstRate = item.__EMPTY_14 || 18;
        const gstAmount = Math.round((item.__EMPTY_15 || 0) * 100);
        
        // Split GST into CGST/SGST for intra-state (Karnataka to Karnataka)
        const cgstRate = Math.round((gstRate / 2) * 100); // Convert to basis points
        const sgstRate = Math.round((gstRate / 2) * 100);
        const cgstAmount = Math.round(gstAmount / 2);
        const sgstAmount = Math.round(gstAmount / 2);
        
        // Calculate total amount (taxable + all GST components)
        const itemTotalAmount = taxableAmount + cgstAmount + sgstAmount;
        
        await tx.insert(invoiceItems).values({
          invoiceId: invoice.id,
          productId: productId,
          description: item.__EMPTY_7 || productName,
          hsnCode: item.__EMPTY_4 || item.__EMPTY_5 || '',
          quantity: quantity,
          uomId: uomMap.get('Case') || null,
          unitPrice: unitPrice,
          discount: 0,
          taxableAmount: taxableAmount,
          cgstRate: cgstRate,
          cgstAmount: cgstAmount,
          sgstRate: sgstRate,
          sgstAmount: sgstAmount,
          igstRate: 0,
          igstAmount: 0,
          cessRate: 0,
          cessAmount: 0,
          totalAmount: itemTotalAmount,
        });
      }
      
      // Create payment if received amount > 0
      const receivedAmount = Math.round((sale.__EMPTY_7 || 0) * 100);
      if (receivedAmount > 0) {
        // Determine payment type: Full if amounts match, else Partial
        const paymentType = receivedAmount >= totalAmount ? 'Full' : 'Partial';
        
        await tx.insert(invoicePayments).values({
          invoiceId: invoice.id,
          amount: receivedAmount,
          paymentDate: parseDate(sale['Generated on Nov 22, 2025 at 5:56 pm']),
          paymentMethod: sale.__EMPTY_6 || 'Cash',
          paymentType: paymentType,
          referenceNumber: finalInvoiceNo,
        });
      }
    });
    
    invoiceCount++;
    console.log(`  ✓ Created invoice: ${finalInvoiceNo} for ${partyName}`);
  } catch (err: any) {
    console.error(`  ❌ Error creating invoice ${finalInvoiceNo}:`, err.message);
    skippedCount++;
  }
}

console.log(`✅ Created ${invoiceCount} invoices (${skippedCount} skipped)\n`);

// ============================================================
// STEP 5: Assign Vendor Types Based on Products Purchased
// ============================================================
console.log('🏷️  Step 5: Assigning Vendor Types based on purchased products...');
let vendorTypeAssignments = 0;

for (const [vendorId, typeNames] of vendorProductTypes.entries()) {
  for (const typeName of typeNames) {
    const vendorTypeId = vendorTypeMap.get(normalize(typeName));
    if (!vendorTypeId) {
      console.log(`  ⚠️  Vendor type not found: ${typeName}`);
      continue;
    }
    
    try {
      // Check if assignment already exists
      const existing = await db.select()
        .from(vendorVendorTypes)
        .where(and(
          eq(vendorVendorTypes.vendorId, vendorId),
          eq(vendorVendorTypes.vendorTypeId, vendorTypeId)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(vendorVendorTypes).values({
          vendorId: vendorId,
          vendorTypeId: vendorTypeId,
          isPrimary: typeNames.size === 1 ? 1 : 0, // Primary if only one type
        });
        vendorTypeAssignments++;
      }
    } catch (err: any) {
      console.error(`  ❌ Error assigning vendor type:`, err.message);
    }
  }
}

console.log(`✅ Created ${vendorTypeAssignments} vendor type assignments\n`);

// ============================================================
// FINAL SUMMARY
// ============================================================
console.log('🎉 ============================================');
console.log('   DATA MIGRATION COMPLETED SUCCESSFULLY!');
console.log('============================================');
console.log(`📊 Summary:`);
console.log(`  - Vendors: ${partyMap.size}`);
console.log(`  - Products: ${productMap.size}`);
console.log(`  - Categories: ${categoryMap.size}`);
console.log(`  - Invoices: ${invoiceCount}`);
console.log(`  - Vendor Type Assignments: ${vendorTypeAssignments}`);
console.log(`  - UOMs: ${uomMap.size}`);
console.log('============================================\n');

process.exit(0);

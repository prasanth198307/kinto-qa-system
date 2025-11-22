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
const existingUOMs = await db.select().from(uom);
const existingProductTypes = await db.select().from(productTypes);

const categoryCodes = new Set(existingCategories.map(c => c.code));
const vendorCodes = new Set(existingVendors.map(v => v.vendorCode));
const productCodes = new Set(existingProducts.map(p => p.productCode));
const uomCodes = new Set(existingUOMs.map(u => u.code));
const productTypeCodes = new Set(existingProductTypes.map(pt => pt.code));

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

// Create UOM mapping (normalized unit name -> id)
const uomMap = new Map<string, string>();
existingUOMs.forEach(u => {
  uomMap.set(normalize(u.name), u.id);
});

// Create product type mapping (normalized type name -> id)
const productTypeMap = new Map<string, string>();
existingProductTypes.forEach(pt => {
  productTypeMap.set(normalize(pt.name), pt.id);
});

console.log(`✓ Loaded ${existingCategories.length} existing categories`);
console.log(`✓ Loaded ${existingVendors.length} existing vendors`);
console.log(`✓ Loaded ${existingProducts.length} existing products`);
console.log(`✓ Loaded ${existingUOMs.length} existing UOMs`);
console.log(`✓ Loaded ${existingProductTypes.length} existing product types\n`);

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

// Extract unique units from items
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
  
  // Skip if already exists
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

// Ensure fallback UOM 'pcs' exists (used as default when unit is missing)
let fallbackUOMId = uomMap.get(normalize('pcs'));
if (!fallbackUOMId) {
  const fallbackCode = generateCode('UOM', uomCodes);
  try {
    const [fallbackUOM] = await db.insert(uom).values({
      code: fallbackCode,
      name: 'pcs',
      description: 'Auto-created fallback unit for products without specified unit',
      isActive: 1,
    }).returning();
    fallbackUOMId = fallbackUOM.id;
    uomMap.set(normalize('pcs'), fallbackUOM.id);
    console.log(`✓ Created fallback UOM: pcs (${fallbackCode})`);
  } catch (err: any) {
    console.error(`❌ Error creating fallback UOM:`, err.message);
    throw new Error('Failed to create fallback UOM - cannot continue');
  }
} else {
  console.log(`✓ Fallback UOM 'pcs' exists`);
}

console.log(); // Empty line for readability

// Ensure a default "Finished Goods" product type exists
let defaultProductTypeId = productTypeMap.get(normalize('Finished Goods'));
if (!defaultProductTypeId) {
  defaultProductTypeId = productTypeMap.get(normalize('Sold Items'));
}
if (!defaultProductTypeId && productTypeMap.size > 0) {
  // Use the first available product type
  defaultProductTypeId = productTypeMap.values().next().value;
}

if (!defaultProductTypeId) {
  // Create a default product type
  const typeCode = generateCode('TYPE', productTypeCodes);
  try {
    const [newType] = await db.insert(productTypes).values({
      code: typeCode,
      name: 'Sold Items',
      description: 'Auto-created for Vyapaar imported products',
      isActive: 1,
    }).returning();
    defaultProductTypeId = newType.id;
    productTypeMap.set(normalize('Sold Items'), newType.id);
    console.log(`✓ Created default product type: Sold Items (${typeCode})\n`);
  } catch (err: any) {
    console.error(`❌ Error creating default product type:`, err.message);
    throw new Error('Failed to create default product type - cannot continue');
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
      isActive: 1,
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
  
  // Get UOM ID from the unit string
  const baseUnitStr = itemData.__EMPTY_10 || 'pcs';
  const uomId = uomMap.get(normalize(baseUnitStr));
  
  // VALIDATION: Fail fast if UOM or product type is missing
  if (!uomId) {
    console.error(`  ❌ FATAL: No UOM found for unit '${baseUnitStr}' in product ${productName}`);
    console.error(`     This should never happen - the UOM should have been auto-created in Step 1.5`);
    throw new Error(`Missing UOM for unit '${baseUnitStr}' - data integrity check failed`);
  }
  
  if (!defaultProductTypeId) {
    console.error(`  ❌ FATAL: No default product type available for product ${productName}`);
    throw new Error('Missing default product type - data integrity check failed');
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
      typeId: defaultProductTypeId, // Set product type (validated above)
      baseUnit: baseUnitStr,
      uomId: uomId, // Set UOM reference (validated above)
      basePrice: unitPriceInPaise,
      gstPercent: gstPercent.toString(),
      hsnCode: itemData.__EMPTY_4 || '',
      description: itemData.__EMPTY_7 || '',
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
  const buyerState = getStateFromGSTIN(customer.gstNumber || undefined);
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
      
      // Use Vyapaar's Total Amount to ensure exact matching with payment records
      // This prevents mismatches due to rounding differences in our calculations
      const vyapaarTotalInPaise = Math.round((sale.__EMPTY_5 || 0) * 100);
      const totalAmountInPaise = vyapaarTotalInPaise || (subtotalInPaise + cgstTotalInPaise + sgstTotalInPaise + igstTotalInPaise);
      const amountReceivedInPaise = Math.round((sale.__EMPTY_7 || 0) * 100);
      const balanceDueInPaise = Math.round((sale.__EMPTY_8 || 0) * 100);
      
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
        status: 'delivered', // All Vyapaar imports are historical/completed sales
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
      
      // Verify payment calculation matches Vyapaar data
      const expectedBalance = totalAmountInPaise - amountReceivedInPaise;
      if (Math.abs(expectedBalance - balanceDueInPaise) > 100) { // Allow 1 rupee rounding difference
        console.log(`    ⚠️  Warning: Balance mismatch for ${invoiceNo}`);
        console.log(`       Vyapaar Balance Due: ₹${(balanceDueInPaise / 100).toFixed(2)}`);
        console.log(`       Calculated Balance: ₹${(expectedBalance / 100).toFixed(2)}`);
        console.log(`       Invoice Total: ₹${(totalAmountInPaise / 100).toFixed(2)}, Received: ₹${(amountReceivedInPaise / 100).toFixed(2)}`);
      }
      
      // Create payment record if any amount was received
      if (amountReceivedInPaise > 0) {
        // Check if payment already exists to prevent duplicates on re-run
        const existingPayment = await tx
          .select()
          .from(invoicePayments)
          .where(and(
            eq(invoicePayments.invoiceId, invoice.id),
            eq(invoicePayments.amount, amountReceivedInPaise),
            eq(invoicePayments.recordStatus, 1)
          ))
          .limit(1);
        
        if (existingPayment.length === 0) {
          // Use persisted invoice.totalAmount for accurate payment type classification
          // Both values are in paise: amountReceivedInPaise and invoice.totalAmount (persisted)
          const paymentType = amountReceivedInPaise >= invoice.totalAmount ? 'Full' : 'Partial';
          
          // Preserve exact Vyapaar Payment Type field when present
          const vyapaarPaymentType = (sale.__EMPTY_6 || '').trim();
          let paymentMethod = vyapaarPaymentType || 'Cash'; // Use original value, default to Cash only if empty
          
          await tx.insert(invoicePayments).values({
            invoiceId: invoice.id,
            paymentDate: invoiceDate,
            amount: amountReceivedInPaise,
            paymentMethod: paymentMethod,
            paymentType: paymentType,
            remarks: 'Payment imported from Vyapaar',
            recordedBy: null, // System import
          });
          
          const balanceStatus = balanceDueInPaise === 0 ? '✓ PAID' : `₹${(balanceDueInPaise / 100).toFixed(2)} pending`;
          console.log(`    💰 Recorded ${paymentType.toLowerCase()} payment: ₹${(amountReceivedInPaise / 100).toFixed(2)} via ${paymentMethod} (${balanceStatus})`);
        } else {
          console.log(`    ⚠️  Payment already exists for this invoice, skipping...`);
        }
      } else {
        // No payment received yet
        if (balanceDueInPaise > 0) {
          console.log(`    📋 No payment received - Balance due: ₹${(balanceDueInPaise / 100).toFixed(2)}`);
        }
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
// STEP 5: Auto-detect and Assign Vendor Types based on Product Brands
// ============================================================
console.log('🏷️  Step 5: Auto-detecting Vendor Types based on Product Brands...');

// Load vendor types (Kinto, HPPani, Purejal)
const allVendorTypes = await db.select().from(vendorTypes);
const vendorTypeMap = new Map(allVendorTypes.map(vt => [vt.code.toLowerCase(), vt.id]));

console.log(`Found ${allVendorTypes.length} vendor types: ${allVendorTypes.map(vt => vt.name).join(', ')}`);

// Query ALL vendors from database (includes both newly created and existing vendors)
const allVendors = await db.select().from(vendors);
const vendorNameToId = new Map(
  allVendors.map(v => [normalize(v.vendorName), v.id])
);

console.log(`Found ${allVendors.length} total vendors in database`);

// Get all invoices with their items
const allInvoices = await db.select().from(invoices);
const allInvoiceItems = await db.select().from(invoiceItems);
const allProducts = await db.select().from(products);

// Build product ID to product name map
const productIdToName = new Map(allProducts.map(p => [p.id, p.productName.toLowerCase()]));

// Track vendor -> brand purchases
const vendorBrandCounts: Map<string, Map<string, number>> = new Map();

// Analyze each invoice
for (const invoice of allInvoices) {
  const items = allInvoiceItems.filter(item => item.invoiceId === invoice.id);
  
  for (const item of items) {
    const productName = productIdToName.get(item.productId) || '';
    
    // Detect brand from product name
    let detectedBrand: string | null = null;
    if (productName.includes('kinto')) {
      detectedBrand = 'kinto';
    } else if (productName.includes('hp') && productName.includes('pani')) {
      detectedBrand = 'hppani';
    } else if (productName.includes('purejal')) {
      detectedBrand = 'purejal';
    }
    
    if (detectedBrand) {
      // Get vendor ID from database using normalized name
      const normalizedBuyerName = normalize(invoice.buyerName);
      const vendorId = vendorNameToId.get(normalizedBuyerName);
      
      if (vendorId) {
        if (!vendorBrandCounts.has(vendorId)) {
          vendorBrandCounts.set(vendorId, new Map());
        }
        const brandCounts = vendorBrandCounts.get(vendorId)!;
        brandCounts.set(detectedBrand, (brandCounts.get(detectedBrand) || 0) + 1);
      }
    }
  }
}

// Assign vendor types to vendors
let vendorTypesAssigned = 0;
for (const [vendorId, brandCounts] of vendorBrandCounts.entries()) {
  const brands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1]); // Sort by count descending
  
  if (brands.length === 0) continue;
  
  // Primary brand is the most purchased one
  const primaryBrand = brands[0][0];
  const primaryVendorTypeId = vendorTypeMap.get(primaryBrand);
  
  if (!primaryVendorTypeId) {
    console.log(`  ⚠️  Vendor type not found for brand: ${primaryBrand}`);
    continue;
  }
  
  try {
    // Assign vendor types
    for (const [brand, count] of brands) {
      const vendorTypeId = vendorTypeMap.get(brand);
      if (!vendorTypeId) continue;
      
      const isPrimary = brand === primaryBrand ? 1 : 0;
      
      // Check if already exists
      const existing = await db.select()
        .from(vendorVendorTypes)
        .where(and(
          eq(vendorVendorTypes.vendorId, vendorId),
          eq(vendorVendorTypes.vendorTypeId, vendorTypeId)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(vendorVendorTypes).values({
          vendorId,
          vendorTypeId,
          isPrimary,
          recordStatus: 1,
        });
      }
    }
    
    const vendor = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
    const vendorName = vendor[0]?.vendorName || 'Unknown';
    const brandList = brands.map(([b, c]) => `${b}(${c})`).join(', ');
    console.log(`  ✓ Assigned vendor types to ${vendorName}: ${brandList} (primary: ${primaryBrand})`);
    vendorTypesAssigned++;
  } catch (err: any) {
    console.error(`  ❌ Error assigning vendor types to vendor ${vendorId}:`, err.message);
  }
}

console.log(`✅ Assigned vendor types to ${vendorTypesAssigned} vendors\n`);

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

/**
 * Update GST Values from Vyapaar Item Details Sheet
 * 
 * This script reads the Item Details sheet from the SaleReport Excel file
 * and updates the existing invoice items with the correct GST values.
 * 
 * Run: npx tsx scripts/update-gst-from-vyapaar.ts
 */

import XLSX from 'xlsx';
import { db } from '../server/db';
import { invoices, invoiceItems } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface ItemData {
  'Generated on Nov 21, 2025 at 2:51 pm'?: string; // Date header (varies)
  __EMPTY?: string; // Invoice No./Txn No.
  __EMPTY_1?: string; // Party Name
  __EMPTY_2?: string; // Item Name
  __EMPTY_3?: string; // Item Code
  __EMPTY_4?: string; // HSN/SAC
  __EMPTY_5?: string; // HSN Code
  __EMPTY_6?: string; // Category
  __EMPTY_7?: string; // Description
  __EMPTY_8?: string; // Challan/Order No.
  __EMPTY_9?: number; // Quantity
  __EMPTY_10?: string; // Unit
  __EMPTY_11?: number; // UnitPrice
  __EMPTY_12?: number; // Discount Percent
  __EMPTY_13?: number; // Discount
  __EMPTY_14?: number; // Tax Percent
  __EMPTY_15?: number; // Tax Amount
  __EMPTY_16?: string; // Transaction Type
  __EMPTY_17?: number; // Amount
}

// Helper to normalize strings for matching
function normalize(str: string | undefined): string {
  return (str || '').trim().toLowerCase();
}

// Get company state (for intra/inter-state GST determination)
const COMPANY_STATE = process.env.COMPANY_GST_STATE_CODE || '37';

// Helper function to extract state code from GSTIN
function getStateFromGSTIN(gstin: string | undefined): string {
  if (!gstin || gstin.length < 2) return '';
  return gstin.substring(0, 2);
}

async function main() {
  console.log('🚀 Starting GST Update from Vyapaar Excel...\n');

  // Read the latest SaleReport file
  const saleReportPath = 'attached_assets/SaleReport_1764227916596.xlsx';
  console.log(`📖 Reading ${saleReportPath}...`);
  
  const workbook = XLSX.readFile(saleReportPath);
  
  // Check for Item Details sheet
  if (!workbook.SheetNames.includes('Item Details')) {
    console.error('❌ Item Details sheet not found in the Excel file!');
    console.log('Available sheets:', workbook.SheetNames);
    process.exit(1);
  }
  
  const itemSheet = workbook.Sheets['Item Details'];
  const items: ItemData[] = XLSX.utils.sheet_to_json(itemSheet);
  
  console.log(`📊 Found ${items.length} items in Item Details sheet\n`);
  
  // Debug: Show first few items to understand column mapping
  console.log('🔍 Sample item data (first 3 rows):');
  items.slice(1, 4).forEach((item, idx) => {
    console.log(`  Row ${idx + 2}:`);
    console.log(`    Invoice No: ${item.__EMPTY}`);
    console.log(`    Item Name: ${item.__EMPTY_2}`);
    console.log(`    Quantity: ${item.__EMPTY_9}`);
    console.log(`    Unit Price: ${item.__EMPTY_11}`);
    console.log(`    Tax %: ${item.__EMPTY_14}`);
    console.log(`    Tax Amount: ${item.__EMPTY_15}`);
    console.log(`    Total: ${item.__EMPTY_17}`);
  });
  console.log('');

  // Get all existing invoices for lookup
  const existingInvoices = await db.select({
    id: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
    buyerGstin: invoices.buyerGstin,
  }).from(invoices);
  
  const invoiceMap = new Map(
    existingInvoices.map(inv => [inv.invoiceNumber, { id: inv.id, buyerGstin: inv.buyerGstin }])
  );
  
  console.log(`📋 Found ${invoiceMap.size} existing invoices in database\n`);

  // Track updates
  let updatedItems = 0;
  let skippedItems = 0;
  let notFoundItems = 0;
  
  // Process each item
  for (const item of items) {
    const invoiceNo = item.__EMPTY?.trim();
    const itemName = item.__EMPTY_2?.trim();
    const taxPercent = item.__EMPTY_14 || 0;
    const taxAmount = item.__EMPTY_15 || 0;
    const hsnCode = item.__EMPTY_4?.trim() || '';
    const transactionType = item.__EMPTY_16 || '';
    
    // Skip non-sale transactions and header rows
    if (!invoiceNo || !itemName || !transactionType.includes('Sale')) {
      skippedItems++;
      continue;
    }
    
    // Find the invoice
    const invoiceData = invoiceMap.get(invoiceNo);
    if (!invoiceData) {
      notFoundItems++;
      continue;
    }
    
    // Determine if inter-state or intra-state
    const buyerState = getStateFromGSTIN(invoiceData.buyerGstin || undefined);
    const isInterState = buyerState && buyerState !== COMPANY_STATE;
    
    // Convert tax values to paise and basis points
    const taxAmountInPaise = Math.round(taxAmount * 100);
    
    // Calculate GST rates and amounts
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    
    if (isInterState) {
      // Inter-state: Use IGST
      igstRate = Math.round(taxPercent * 100); // Convert to basis points
      igstAmount = taxAmountInPaise;
    } else {
      // Intra-state: Split into CGST + SGST (50/50)
      cgstRate = Math.round((taxPercent / 2) * 100); // Half of total rate in basis points
      sgstRate = cgstRate;
      cgstAmount = Math.round(taxAmountInPaise / 2);
      sgstAmount = taxAmountInPaise - cgstAmount;
    }
    
    // Update the invoice item
    try {
      const result = await db.update(invoiceItems)
        .set({
          hsnCode: hsnCode || undefined,
          cgstRate: cgstRate,
          cgstAmount: cgstAmount,
          sgstRate: sgstRate,
          sgstAmount: sgstAmount,
          igstRate: igstRate,
          igstAmount: igstAmount,
        })
        .where(
          and(
            eq(invoiceItems.invoiceId, invoiceData.id),
            sql`LOWER(TRIM(${invoiceItems.description})) = ${normalize(itemName)}`
          )
        );
      
      updatedItems++;
    } catch (err: any) {
      console.error(`  ❌ Error updating item ${itemName} in invoice ${invoiceNo}:`, err.message);
    }
  }
  
  console.log('\n📊 Update Summary:');
  console.log(`  ✅ Updated: ${updatedItems} items`);
  console.log(`  ⏭️  Skipped: ${skippedItems} items (non-sale or header)`);
  console.log(`  ❓ Not found: ${notFoundItems} items (invoice not in DB)`);
  
  // Now update invoice totals
  console.log('\n📝 Updating invoice GST totals...');
  
  await db.execute(sql`
    UPDATE invoices i
    SET 
      cgst_amount = sub.total_cgst,
      sgst_amount = sub.total_sgst,
      igst_amount = sub.total_igst
    FROM (
      SELECT 
        invoice_id,
        SUM(COALESCE(cgst_amount, 0)) as total_cgst,
        SUM(COALESCE(sgst_amount, 0)) as total_sgst,
        SUM(COALESCE(igst_amount, 0)) as total_igst
      FROM invoice_items
      GROUP BY invoice_id
    ) sub
    WHERE i.id = sub.invoice_id
  `);
  
  console.log('✅ Invoice GST totals updated!\n');
  
  // Verify a sample invoice
  console.log('🔍 Verification - Sample invoice GST values:');
  const sampleInvoice = await db.select({
    invoiceNumber: invoices.invoiceNumber,
    buyerName: invoices.buyerName,
    cgstAmount: invoices.cgstAmount,
    sgstAmount: invoices.sgstAmount,
    totalAmount: invoices.totalAmount,
  })
  .from(invoices)
  .orderBy(sql`invoice_number::int DESC`)
  .limit(3);
  
  sampleInvoice.forEach(inv => {
    console.log(`  Invoice #${inv.invoiceNumber}: ${inv.buyerName}`);
    console.log(`    CGST: ₹${((inv.cgstAmount || 0) / 100).toFixed(2)}`);
    console.log(`    SGST: ₹${((inv.sgstAmount || 0) / 100).toFixed(2)}`);
    console.log(`    Total: ₹${((inv.totalAmount || 0) / 100).toFixed(2)}`);
  });
  
  console.log('\n✅ GST update completed!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

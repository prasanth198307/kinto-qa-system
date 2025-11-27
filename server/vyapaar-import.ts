import { db } from './db';
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
} from '@shared/schema';
import { sql, eq, and } from 'drizzle-orm';
import { classifyAllVendors } from './classify-vendors';

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
  [key: string]: any; // Dynamic column names from Vyapaar export
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
  [key: string]: any; // Dynamic column names from Vyapaar export
  __EMPTY: string;
  __EMPTY_1: string;
  __EMPTY_2: string;
  __EMPTY_3?: string;
  __EMPTY_4: string;
  __EMPTY_5?: string;
  __EMPTY_6?: string;
  __EMPTY_7?: string;
  __EMPTY_8?: string;
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

function normalize(str: string | undefined): string {
  return (str || '').trim().toLowerCase();
}

function fuzzyMatch(str1: string, str2: string): boolean {
  const n1 = normalize(str1);
  const n2 = normalize(str2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // Extract parts before and inside parentheses
  const getVariants = (s: string): string[] => {
    const variants = [s];
    
    // Add version without parentheses
    variants.push(s.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());
    
    // Add text before first parenthesis
    const beforeParen = s.split('(')[0].trim();
    if (beforeParen && beforeParen !== s) {
      variants.push(beforeParen);
    }
    
    // Add text inside last parenthesis
    const parenMatch = s.match(/\(([^)]+)\)$/);
    if (parenMatch && parenMatch[1]) {
      variants.push(parenMatch[1].trim());
    }
    
    return variants.filter(v => v.length > 0);
  };
  
  const variants1 = getVariants(n1);
  const variants2 = getVariants(n2);
  
  // Check if any variant matches
  for (const v1 of variants1) {
    for (const v2 of variants2) {
      if (v1 === v2) return true;
      if (v1.includes(v2) || v2.includes(v1)) return true;
    }
  }
  
  return false;
}

// Exported function to clear all imported Vyapaar data
export async function clearImportedData(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await db.transaction(async (tx) => {
      console.log('Clearing all imported data...');
      
      // Delete in correct order to avoid foreign key violations
      await tx.execute(sql`DELETE FROM production_reconciliation_items`);
      await tx.execute(sql`DELETE FROM production_reconciliations`);
      await tx.execute(sql`DELETE FROM production_entries`);
      await tx.execute(sql`DELETE FROM credit_note_items`);
      await tx.execute(sql`DELETE FROM credit_notes`);
      await tx.execute(sql`DELETE FROM sales_return_items`);
      await tx.execute(sql`DELETE FROM sales_returns`);
      await tx.execute(sql`DELETE FROM gatepass_items`);
      await tx.execute(sql`DELETE FROM gatepasses`);
      await tx.execute(sql`DELETE FROM finished_goods`);
      await tx.execute(sql`DELETE FROM raw_material_issuance_items`);
      await tx.execute(sql`DELETE FROM raw_material_issuance`);
      await tx.execute(sql`DELETE FROM invoice_payments`);
      await tx.execute(sql`DELETE FROM invoice_items`);
      await tx.execute(sql`DELETE FROM invoices`);
      await tx.execute(sql`DELETE FROM vendor_vendor_types`);
      await tx.execute(sql`DELETE FROM vendors`);
      await tx.execute(sql`DELETE FROM products`);
      
      console.log('All imported data cleared successfully');
    });
    
    return {
      success: true,
      message: 'All transaction data cleared successfully. Master data (UOMs, roles, permissions, users, vendor types, product categories) preserved.'
    };
  } catch (error) {
    console.error('Failed to clear imported data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear imported data'
    };
  }
}

export async function importVyapaarData(
  partyFilePath: string | null, // Null when only re-importing invoices (vendors already exist)
  saleFilePath: string,
  itemFilePath?: string // Optional - if not provided, items are in saleFilePath (2-file format)
): Promise<{
  success: boolean;
  message: string;
  stats: {
    vendors: number;
    products: number;
    invoices: number;
    vendorTypes: number;
    skipped: number;
  };
}> {
  // Wrap entire import in a transaction for atomicity
  return await db.transaction(async (tx) => {
    try {
      console.log('Starting Vyapaar data import...');
      
      // Clear only the data we'll be repopulating (use DELETE instead of TRUNCATE for transaction safety)
      // Delete in correct order to avoid foreign key violations
      
      // If partyFilePath is null, we're only re-importing invoices (vendors/products preserved)
      const invoicesOnlyMode = partyFilePath === null;
      
      if (invoicesOnlyMode) {
        console.log('Invoices-only mode: Clearing invoice data only (preserving vendors and products)...');
        await tx.execute(sql`DELETE FROM credit_note_items`);
        await tx.execute(sql`DELETE FROM credit_notes`);
        await tx.execute(sql`DELETE FROM invoice_payments`);
        await tx.execute(sql`DELETE FROM invoice_items`);
        await tx.execute(sql`DELETE FROM invoices`);
      } else {
        console.log('Full import mode: Clearing all vendor, product, and invoice data...');
        await tx.execute(sql`DELETE FROM production_reconciliation_items`);
        await tx.execute(sql`DELETE FROM production_reconciliations`);
        await tx.execute(sql`DELETE FROM production_entries`);
        await tx.execute(sql`DELETE FROM credit_note_items`);
        await tx.execute(sql`DELETE FROM credit_notes`);
        await tx.execute(sql`DELETE FROM sales_return_items`);
        await tx.execute(sql`DELETE FROM sales_returns`);
        await tx.execute(sql`DELETE FROM gatepass_items`);
        await tx.execute(sql`DELETE FROM gatepasses`);
        await tx.execute(sql`DELETE FROM finished_goods`);
        await tx.execute(sql`DELETE FROM raw_material_issuance_items`);
        await tx.execute(sql`DELETE FROM raw_material_issuance`);
        await tx.execute(sql`DELETE FROM invoice_payments`);
        await tx.execute(sql`DELETE FROM invoice_items`);
        await tx.execute(sql`DELETE FROM invoices`);
        await tx.execute(sql`DELETE FROM vendor_vendor_types`);
        await tx.execute(sql`DELETE FROM vendors`);
        await tx.execute(sql`DELETE FROM products`);
      }
    
      // Dynamically import XLSX for Mac compatibility
      const { default: XLSX } = await import('xlsx');
      
      // Read Excel files
      const saleWorkbook = XLSX.readFile(saleFilePath);
      
      // Support both 2-file and 3-file formats
      // If itemFilePath is provided, use it; otherwise, items are in saleFilePath (second sheet or same sheet)
      const itemWorkbook = itemFilePath ? XLSX.readFile(itemFilePath) : saleWorkbook;
      
      // Party data is optional - if not provided, use existing vendors
      let partyData: PartyData[] = [];
      if (partyFilePath) {
        const partyWorkbook = XLSX.readFile(partyFilePath);
        partyData = XLSX.utils.sheet_to_json(partyWorkbook.Sheets[partyWorkbook.SheetNames[0]]);
      }
      
      let saleData: SaleData[] = XLSX.utils.sheet_to_json(saleWorkbook.Sheets[saleWorkbook.SheetNames[0]]);
      
      // For 2-file format, items might be in second sheet or same sheet with different columns
      // Try second sheet first, fall back to first sheet
      const itemSheetName = itemWorkbook.SheetNames[1] || itemWorkbook.SheetNames[0];
      let itemData: ItemData[] = XLSX.utils.sheet_to_json(itemWorkbook.Sheets[itemSheetName]);
      
      console.log(`Read raw data: ${partyData.length} parties, ${saleData.length} sales (before filtering), ${itemData.length} items (before filtering)`);
      
      // Filter out header rows (where invoice number is "Invoice No" or "Date" in date column)
      const filteredSales = saleData.filter(sale => 
        sale.__EMPTY_1 && 
        sale.__EMPTY_1 !== 'Invoice No' && 
        String(sale.__EMPTY_1).trim() !== ''
      );
      
      const filteredItems = itemData.filter(item => 
        item.__EMPTY && 
        item.__EMPTY !== 'Invoice No' && 
        String(item.__EMPTY).trim() !== ''
      );
      
      // Log what was filtered out
      const removedSales = saleData.length - filteredSales.length;
      const removedItems = itemData.length - filteredItems.length;
      if (removedSales > 0) {
        console.log(`Filtered out ${removedSales} header/empty sale rows`);
      }
      if (removedItems > 0) {
        console.log(`Filtered out ${removedItems} header/empty item rows`);
      }
      
      saleData = filteredSales;
      itemData = filteredItems;
      
      console.log(`After filtering: ${partyData.length} parties, ${saleData.length} sales, ${itemData.length} items`);
      
      // Find the dynamic date column (starts with "Generated on")
      const dateColumn = saleData.length > 0 
        ? Object.keys(saleData[0]).find(key => key.startsWith('Generated on'))
        : undefined;
      
      if (!dateColumn) {
        throw new Error('Could not find date column in Sale Report. Expected column starting with "Generated on"');
      }
      
      console.log(`Using date column: ${dateColumn}`);
      
      // Create UOM if they don't exist (preserve existing master data)
      const existingUoms = await tx.select().from(uom);
      const uomCodes = new Set(existingUoms.map(u => u.code));
      
      const uomsToCreate = [
        { code: 'CASES', name: 'Cases' },
        { code: 'PCS', name: 'Pieces' },
        { code: 'L', name: 'Liters' },
        { code: 'KG', name: 'Kilograms' },
      ].filter(u => !uomCodes.has(u.code));
      
      if (uomsToCreate.length > 0) {
        await tx.insert(uom).values(uomsToCreate);
      }
    
      // Import vendors with unique codes OR use existing vendors (invoices-only mode)
      const vendorMap = new Map<string, string>();
      
      if (invoicesOnlyMode) {
        // Use existing vendors - build map from database
        console.log('Using existing vendors from database...');
        const existingVendors = await tx.select().from(vendors);
        for (const vendor of existingVendors) {
          vendorMap.set(normalize(vendor.vendorName), vendor.id);
        }
        console.log(`Loaded ${existingVendors.length} existing vendors`);
      } else {
        // Import new vendors from party data
        const usedVendorCodes = new Set<string>();
        let vendorCounter = 1;
        
        for (const party of partyData) {
          if (!party.Name) continue;
          
          // Generate unique vendor code with fallback for empty base codes
          let baseCode = party.Name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (!baseCode) baseCode = `VEN${vendorCounter}`; // Fallback for non-alphanumeric names
          
          let vendorCode = baseCode;
          let suffix = 1;
          while (usedVendorCodes.has(vendorCode)) {
            vendorCode = `${baseCode}-${suffix}`;
            suffix++;
          }
          usedVendorCodes.add(vendorCode);
          
          const [newVendor] = await tx.insert(vendors).values({
            vendorName: party.Name,
            vendorCode,
            email: party.Email || null,
            mobileNumber: party['Phone No.'] || '0000000000', // Required field, use placeholder if missing
            address: party.Address || null,
            city: null,
            state: null,
            pincode: null,
            gstNumber: party.GSTIN || null,
            creditLimit: null,
          }).returning();
          
          vendorMap.set(normalize(party.Name), newVendor.id);
          vendorCounter++;
        }
      }
      
      // Get or create default product category and type (preserve existing master data)
      let category = await tx.select().from(productCategories).where(eq(productCategories.code, 'GEN')).limit(1).then(rows => rows[0]);
      
      if (!category) {
        [category] = await tx.insert(productCategories).values({
          name: 'General',
          code: 'GEN',
          description: null,
        }).returning();
      }
      
      let productType = await tx.select().from(productTypes).where(eq(productTypes.code, 'GEN')).limit(1).then(rows => rows[0]);
      
      if (!productType) {
        [productType] = await tx.insert(productTypes).values({
          name: 'General',
          code: 'GEN',
          categoryId: category.id,
          description: null,
        }).returning();
      }
      
      // Get UOM IDs for products - CASES must exist for imported products
      const casesUom = await tx.select().from(uom).where(eq(uom.code, 'CASES')).limit(1).then(rows => rows[0]);
      
      if (!casesUom) {
        throw new Error('CASES UOM not found. Cannot import products without valid UOM.');
      }
      
      // Import products with unique codes OR use existing products (invoices-only mode)
      const productMap = new Map<string, string>();
      
      if (invoicesOnlyMode) {
        // Use existing products - build map from database
        console.log('Using existing products from database...');
        const existingProducts = await tx.select().from(products);
        for (const product of existingProducts) {
          productMap.set(normalize(product.productName), product.id);
        }
        console.log(`Loaded ${existingProducts.length} existing products`);
      } else {
        // Import new products from item data
        const uniqueProducts = new Set<string>();
        const usedProductCodes = new Set<string>();
        
        for (const item of itemData) {
          const productName = item.__EMPTY_2;
          if (!productName || uniqueProducts.has(normalize(productName))) continue;
          
          uniqueProducts.add(normalize(productName));
          
          // Generate unique product code with fallback for empty base codes
          let baseCode = (item.__EMPTY_3 || productName.substring(0, 10)).toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (!baseCode) baseCode = `PRD${uniqueProducts.size + 1}`; // Fallback for non-alphanumeric names
          
          let productCode = baseCode;
          let suffix = 1;
          while (usedProductCodes.has(productCode)) {
            productCode = `${baseCode}-${suffix}`;
            suffix++;
          }
          usedProductCodes.add(productCode);
          
          const [newProduct] = await tx.insert(products).values({
            productName: productName,
            productCode,
            categoryId: category.id,
            typeId: productType.id,
            hsnCode: item.__EMPTY_4 || null,
            uomId: casesUom.id, // CASES UOM for all imported products
            sellingPrice: Math.round((item.__EMPTY_11 || 0) * 100),
            description: item.__EMPTY_7 || null,
          }).returning();
          
          productMap.set(normalize(productName), newProduct.id);
        }
      }
      
      // Import invoices
      const invoiceNumbers = new Set<string>();
      const usedNumbers = new Set<string>();
      let invoiceCount = 0;
      let skippedCount = 0;
      
      for (const sale of saleData) {
      let invoiceNumber = sale.__EMPTY_1;
      if (!invoiceNumber) continue;
      
      // Handle duplicates - keep incrementing suffix until unique
      const originalInvoiceNumber = invoiceNumber;
      let dupSuffix = 2;
      while (usedNumbers.has(invoiceNumber)) {
        invoiceNumber = `${originalInvoiceNumber}-DUP${dupSuffix}`;
        dupSuffix++;
      }
      
      // Log if this was a duplicate
      if (invoiceNumber !== originalInvoiceNumber) {
        console.log(`Duplicate invoice number detected: ${originalInvoiceNumber} → ${invoiceNumber}`);
      }
      
      usedNumbers.add(invoiceNumber);
      
      const vendorName = sale.__EMPTY_2;
      const vendorId = Array.from(vendorMap.entries())
        .find(([name, id]) => fuzzyMatch(name, vendorName))?.[1];
      
      if (!vendorId) {
        console.log(`Skipping invoice ${invoiceNumber}: vendor not found`);
        skippedCount++;
        continue;
      }
      
      // Get vendor details for buyer info
      const [vendorRecord] = await tx.select().from(vendors).where(eq(vendors.id, vendorId));
      
      const invoiceItemsData = itemData.filter(item => item.__EMPTY === invoiceNumber);
      
      // Pre-validate items to find valid products (but allow invoices with no items for cancelled invoices)
      const validItems = invoiceItemsData.filter(item => {
        const productId = productMap.get(normalize(item.__EMPTY_2));
        return !!productId;
      });
      
      // Log if this is a cancelled invoice (no items)
      if (invoiceItemsData.length === 0) {
        console.log(`Importing cancelled invoice ${invoiceNumber}: no items`);
      } else if (validItems.length === 0) {
        console.log(`Importing invoice ${invoiceNumber} with unmatched products - creating without line items`);
      }
      
        // Use the dynamically detected date column
        const invoiceDateStr = sale[dateColumn];
        let invoiceDate: Date;
        
        if (!invoiceDateStr || invoiceDateStr === '') {
          console.warn(`Skipping invoice ${invoiceNumber}: no date found`);
          skippedCount++;
          continue;
        }
        
        try {
          // Vyapaar exports dates in DD/MM/YYYY format, convert to YYYY-MM-DD for parsing
          const dateStr = String(invoiceDateStr).trim();
          const parts = dateStr.split('/');
          
          if (parts.length === 3) {
            // Convert DD/MM/YYYY to YYYY-MM-DD
            const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            invoiceDate = new Date(isoDate);
          } else {
            // Fallback to direct parsing
            invoiceDate = new Date(dateStr);
          }
          
          if (isNaN(invoiceDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch (error) {
          console.warn(`Skipping invoice ${invoiceNumber}: invalid date "${invoiceDateStr}"`);
          skippedCount++;
          continue;
        }
        
        // Calculate totals from valid items with proper number validation
        let subtotal = 0;
        let cgstTotal = 0;
        let sgstTotal = 0;
        let igstTotal = 0;
        let grandTotal = 0;
        
        for (const item of validItems) {
          const totalAmount = Number(item.__EMPTY_17) || 0;
          const taxAmount = Number(item.__EMPTY_15) || 0;
          const taxableAmount = totalAmount - taxAmount;
          
          subtotal += taxableAmount;
          cgstTotal += taxAmount / 2;
          sgstTotal += taxAmount / 2;
          grandTotal += totalAmount;
        }
        
        const [newInvoice] = await tx.insert(invoices).values({
        invoiceNumber,
        invoiceDate: invoiceDate.toISOString(),
        buyerName: vendorRecord?.vendorName || vendorName,
        buyerId: vendorId,
        buyerAddress: vendorRecord?.address || null,
        buyerGstin: vendorRecord?.gstNumber || null,
        buyerContact: vendorRecord?.mobileNumber || null,
        buyerState: vendorRecord?.state || null,
        buyerStateCode: vendorRecord?.gstNumber ? vendorRecord.gstNumber.substring(0, 2) : null,
        subtotal: Math.round(subtotal * 100),
        cgstAmount: Math.round(cgstTotal * 100),
        sgstAmount: Math.round(sgstTotal * 100),
        igstAmount: Math.round(igstTotal * 100),
        roundOff: 0,
        totalAmount: Math.round(grandTotal * 100),
        remarks: sale.__EMPTY_10 || null,
        vehicleNumber: sale.__EMPTY_11 || null,
        placeOfSupply: null,
        status: 'delivered',
        }).returning();
        
        // Add only valid invoice items
        for (const item of validItems) {
          const productId = productMap.get(normalize(item.__EMPTY_2));
          // productId is guaranteed to exist because we filtered above
          
          const totalAmount = Number(item.__EMPTY_17) || 0;
          const taxAmount = Number(item.__EMPTY_15) || 0;
          const unitPrice = Number(item.__EMPTY_11) || 0;
          const discount = Number(item.__EMPTY_13) || 0;
          const quantity = Number(item.__EMPTY_9) || 0;
          const taxableAmount = totalAmount - taxAmount;
          
          // Calculate GST rate from tax amount and taxable amount
          // GST rate = (taxAmount / taxableAmount) * 100
          // Then split equally for CGST and SGST
          let gstRate = 0;
          if (taxableAmount > 0 && taxAmount > 0) {
            gstRate = Math.round((taxAmount / taxableAmount) * 10000); // In basis points (1800 = 18%)
          }
          const cgstRate = Math.round(gstRate / 2); // Half for CGST (e.g., 900 = 9%)
          const sgstRate = Math.round(gstRate / 2); // Half for SGST (e.g., 900 = 9%)
          
          await tx.insert(invoiceItems).values({
          invoiceId: newInvoice.id,
          productId: productId!,
          description: item.__EMPTY_2 || '',
          hsnCode: item.__EMPTY_4 || null,
          quantity,
          unitPrice: Math.round(unitPrice * 100),
          discount: Math.round(discount * 100),
          taxableAmount: Math.round(taxableAmount * 100),
          cgstRate: cgstRate,
          cgstAmount: Math.round((taxAmount / 2) * 100),
          sgstRate: sgstRate,
          sgstAmount: Math.round((taxAmount / 2) * 100),
          igstRate: 0,
          igstAmount: 0,
          totalAmount: Math.round(totalAmount * 100),
          });
        }
        
        // Add payment if exists (with number validation)
        const paymentAmount = Number(sale.__EMPTY_7) || 0;
        if (paymentAmount > 0) {
          await tx.insert(invoicePayments).values({
          invoiceId: newInvoice.id,
          paymentDate: invoiceDate.toISOString(),
          amount: Math.round(paymentAmount * 100),
          paymentMethod: sale.__EMPTY_6 || 'Cash',
          paymentType: 'Partial',
          referenceNumber: null,
          remarks: null,
          });
        }
        
        invoiceCount++;
      }
      
      console.log('Import transaction completed successfully');
      
      // Return stats (classification will happen after transaction commits)
      const modeLabel = invoicesOnlyMode ? 'Invoices-only import' : 'Full data import';
      return {
        success: true,
        message: `${modeLabel} completed successfully`,
        stats: {
          vendors: vendorMap.size,
          products: productMap.size,
          invoices: invoiceCount,
          vendorTypes: 0, // Will be updated after classification
          skipped: skippedCount,
        },
      };
    } catch (error: any) {
      console.error('Import failed within transaction:', error);
      // Transaction will automatically rollback
      throw error;
    }
  }).then(async (result) => {
    // If import succeeded, run vendor classification based on imported data
    if (result.success) {
      try {
        console.log('\n🔄 Running post-import vendor classification...');
        
        // Run vendor classification using static import (works in both dev and production)
        await classifyAllVendors();
        
        // Get the actual count of vendor type assignments
        const typeCount = await db.select().from(vendorVendorTypes);
        result.stats.vendorTypes = typeCount.length;
        
        console.log(`✅ Post-import classification complete: ${result.stats.vendorTypes} vendor-type assignments\n`);
      } catch (classifyError: any) {
        console.error('⚠️  Vendor classification failed (import succeeded):', classifyError);
        // Don't fail the entire import if classification fails
        result.stats.vendorTypes = 0;
      }
    }
    return result;
  }).catch((error: any) => {
    console.error('Import transaction failed:', error);
    return {
      success: false,
      message: error.message || 'Import failed - database rolled back',
      stats: {
        vendors: 0,
        products: 0,
        invoices: 0,
        vendorTypes: 0,
        skipped: 0,
      },
    };
  });
}

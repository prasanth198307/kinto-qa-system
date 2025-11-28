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
  invoiceTemplates,
  termsConditions,
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

// GST State Code to State Name mapping
function getStateNameFromCode(stateCode: string): string | null {
  const stateMap: Record<string, string> = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman & Diu',
    '26': 'Dadra & Nagar Haveli',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
  };
  return stateMap[stateCode] || null;
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
  itemFilePath?: string, // Optional - if not provided, items are in saleFilePath (2-file format)
  paymentsFilePath?: string | null // Optional - separate payments file for additional payments
): Promise<{
  success: boolean;
  message: string;
  stats: {
    vendors: number;
    products: number;
    invoices: number;
    vendorTypes: number;
    skipped: number;
    payments: number;
    paymentsSkipped: number;
    paymentsUnallocated: number;
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
      
      // Fetch default invoice template and terms for populating seller details
      const [defaultTemplate] = await tx.select().from(invoiceTemplates).where(eq(invoiceTemplates.isDefault, 1));
      const [defaultTerms] = await tx.select().from(termsConditions).where(eq(termsConditions.isDefault, 1));
      
      if (defaultTemplate) {
        console.log(`Using default template: ${defaultTemplate.templateName}`);
      } else {
        console.log('Warning: No default invoice template found');
      }
      if (defaultTerms) {
        console.log(`Using default terms: ${defaultTerms.tcName}`);
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
      
      // IMPROVED VENDOR MATCHING: Try exact match first, then fuzzy as fallback
      let vendorId = vendorMap.get(normalize(vendorName));
      
      if (!vendorId) {
        // Fallback to fuzzy matching, but check for ambiguous matches
        const fuzzyMatches = Array.from(vendorMap.entries())
          .filter(([name, id]) => fuzzyMatch(name, vendorName));
        
        if (fuzzyMatches.length === 1) {
          vendorId = fuzzyMatches[0][1];
          console.log(`Fuzzy matched vendor for invoice ${invoiceNumber}: "${vendorName}" → "${fuzzyMatches[0][0]}"`);
        } else if (fuzzyMatches.length > 1) {
          // Multiple matches - log warning and use first match (could be wrong!)
          console.warn(`⚠️ AMBIGUOUS vendor match for invoice ${invoiceNumber}: "${vendorName}" matches ${fuzzyMatches.length} vendors: ${fuzzyMatches.map(m => m[0]).join(', ')}`);
          vendorId = fuzzyMatches[0][1];
        }
      }
      
      if (!vendorId) {
        console.log(`Skipping invoice ${invoiceNumber}: vendor not found - "${vendorName}"`);
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
        
        // Derive buyer state from GSTIN if available
        const buyerStateCode = vendorRecord?.gstNumber ? vendorRecord.gstNumber.substring(0, 2) : null;
        const buyerState = vendorRecord?.state || (buyerStateCode ? getStateNameFromCode(buyerStateCode) : null);
        
        // Extract payment info from Sale Report
        // New format column mapping (with Due Date column):
        // __EMPTY_5=Total, __EMPTY_6=Payment Type, __EMPTY_7=Received Amount, __EMPTY_8=Balance Due
        // __EMPTY_9=Due Date, __EMPTY_10=Status, __EMPTY_11=Description, __EMPTY_12=Vehicle No
        const receivedAmount = Number(sale.__EMPTY_7) || 0;
        const paymentType = sale.__EMPTY_6 || 'Cash';
        const paymentStatus = sale.__EMPTY_10 || ''; // Status column (Paid, Unpaid, Overdue)
        
        const [newInvoice] = await tx.insert(invoices).values({
          invoiceNumber,
          invoiceDate: invoiceDate.toISOString(),
          // Buyer details from vendor record
          buyerName: vendorRecord?.vendorName || vendorName,
          buyerId: vendorId,
          buyerAddress: vendorRecord?.address || null,
          buyerGstin: vendorRecord?.gstNumber || null,
          buyerContact: vendorRecord?.mobileNumber || null,
          buyerState: buyerState,
          buyerStateCode: buyerStateCode,
          // Seller details from default template
          sellerName: defaultTemplate?.defaultSellerName || null,
          sellerAddress: defaultTemplate?.defaultSellerAddress || null,
          sellerGstin: defaultTemplate?.defaultSellerGstin || null,
          sellerState: defaultTemplate?.defaultSellerState || null,
          sellerStateCode: defaultTemplate?.defaultSellerStateCode || null,
          sellerPhone: defaultTemplate?.defaultSellerPhone || null,
          sellerEmail: defaultTemplate?.defaultSellerEmail || null,
          // Bank details from default template
          bankName: defaultTemplate?.defaultBankName || null,
          bankAccountNumber: defaultTemplate?.defaultBankAccountNumber || null,
          bankIfscCode: defaultTemplate?.defaultBankIfscCode || null,
          accountHolderName: defaultTemplate?.defaultAccountHolderName || null,
          branchName: defaultTemplate?.defaultBranchName || null,
          upiId: defaultTemplate?.defaultUpiId || null,
          // Link to template and terms
          templateId: defaultTemplate?.id || null,
          termsConditionsId: defaultTerms?.id || null,
          // Amounts
          subtotal: Math.round(subtotal * 100),
          cgstAmount: Math.round(cgstTotal * 100),
          sgstAmount: Math.round(sgstTotal * 100),
          igstAmount: Math.round(igstTotal * 100),
          roundOff: 0,
          totalAmount: Math.round(grandTotal * 100),
          amountReceived: Math.round(receivedAmount * 100), // Set payment received from Vyapaar data
          remarks: sale.__EMPTY_11 || null, // Description column
          vehicleNumber: (sale.__EMPTY_12 || '').substring(0, 50) || null, // Vehicle No column (truncate to 50 chars)
          placeOfSupply: buyerState ? `${buyerStateCode}-${buyerState}` : null,
          status: 'delivered',
        }).returning();
        
        // Add only valid invoice items
        for (const item of validItems) {
          const productId = productMap.get(normalize(item.__EMPTY_2));
          // productId is guaranteed to exist because we filtered above
          
          // Get product's UOM (should be CASES)
          const [productRecord] = await tx.select().from(products).where(eq(products.id, productId!));
          const itemUomId = productRecord?.uomId || casesUom.id;
          
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
          uomId: itemUomId,
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
        
        // Add payment record if payment received
        if (receivedAmount > 0) {
          // Determine payment type based on balance
          const balanceDue = Number(sale.__EMPTY_8) || 0;
          const invoicePaymentType = balanceDue === 0 ? 'Full' : 'Partial';
          
          await tx.insert(invoicePayments).values({
            invoiceId: newInvoice.id,
            paymentDate: invoiceDate.toISOString(),
            amount: Math.round(receivedAmount * 100),
            paymentMethod: paymentType, // Cash, UPI, Bank Transfer, etc.
            paymentType: invoicePaymentType,
            referenceNumber: `VY-${invoiceNumber}`, // Vyapaar import reference
            remarks: paymentStatus ? `Vyapaar status: ${paymentStatus}` : 'Imported from Vyapaar',
          });
        }
        
        invoiceCount++;
      }
      
      // Import separate payments file if provided (FIFO allocation to invoices)
      let paymentsImported = 0;
      let paymentsSkipped = 0;
      let paymentsUnallocated = 0;
      
      if (paymentsFilePath) {
        console.log('Processing separate Payments file...');
        
        const paymentsWorkbook = XLSX.readFile(paymentsFilePath);
        const paymentsSheet = paymentsWorkbook.Sheets[paymentsWorkbook.SheetNames[0]];
        const paymentsData: any[] = XLSX.utils.sheet_to_json(paymentsSheet, { header: 1 });
        
        // Find header row dynamically (look for "Date" column)
        let headerRowIndex = -1;
        let columnMapping: Record<string, number> = {};
        
        for (let i = 0; i < Math.min(10, paymentsData.length); i++) {
          const row = paymentsData[i];
          if (!row) continue;
          
          // Check if this row contains header keywords
          const rowStr = JSON.stringify(row).toLowerCase();
          if (rowStr.includes('date') && rowStr.includes('party')) {
            headerRowIndex = i;
            // Map column indices by header names
            for (let j = 0; j < row.length; j++) {
              const header = String(row[j] || '').toLowerCase().trim();
              if (header.includes('date') && !header.includes('due')) columnMapping['date'] = j;
              else if (header.includes('reference') || header.includes('ref')) columnMapping['reference'] = j;
              else if (header.includes('party')) columnMapping['party'] = j;
              else if (header.includes('payment type') || header.includes('mode')) columnMapping['paymentType'] = j;
              else if (header.includes('received')) columnMapping['received'] = j;
              else if (header.includes('description') || header.includes('remarks')) columnMapping['description'] = j;
            }
            break;
          }
        }
        
        // Fallback to positional mapping if header not found
        if (headerRowIndex === -1) {
          headerRowIndex = 2; // Default: skip first 3 rows
          columnMapping = { date: 0, reference: 1, party: 2, paymentType: 6, received: 8, description: 12 };
          console.log('Using positional column mapping (header row not detected)');
        } else {
          console.log(`Found header at row ${headerRowIndex + 1}, columns:`, columnMapping);
        }
        
        const paymentRows = paymentsData.slice(headerRowIndex + 1).filter(row => {
          return row && row[columnMapping['date'] || 0] && row[columnMapping['party'] || 2];
        });
        
        console.log(`Found ${paymentRows.length} payment records to process`);
        
        // Create deduplication signatures using (vendorName, paymentDate, amount)
        // This works regardless of VY- or PY- reference prefixes
        const existingPaymentSignatures = new Set<string>();
        const existingPayments = await tx.select({
          paymentDate: invoicePayments.paymentDate,
          amount: invoicePayments.amount,
          invoiceId: invoicePayments.invoiceId,
        }).from(invoicePayments);
        
        // Get invoice to vendor mapping for existing payments
        const existingInvoices = await tx.select({
          id: invoices.id,
          buyerName: invoices.buyerName,
        }).from(invoices);
        const invoiceVendorMap = new Map(existingInvoices.map(inv => [inv.id, inv.buyerName]));
        
        for (const payment of existingPayments) {
          const vendorName = invoiceVendorMap.get(payment.invoiceId) || '';
          // Normalize: vendorName + date (YYYY-MM-DD) + amount in paise
          const sig = `${normalize(vendorName)}-${payment.paymentDate?.substring(0, 10)}-${payment.amount}`;
          existingPaymentSignatures.add(sig);
        }
        
        for (const row of paymentRows) {
          const dateStr = String(row[columnMapping['date'] || 0] || '').trim();
          const referenceNo = String(row[columnMapping['reference'] || 1] || '').trim();
          const partyName = String(row[columnMapping['party'] || 2] || '').trim();
          const paymentMethod = String(row[columnMapping['paymentType'] || 6] || 'Cash').trim();
          const receivedAmount = Number(row[columnMapping['received'] || 8]) || 0;
          const description = String(row[columnMapping['description'] || 12] || '').trim();
          
          if (!partyName || receivedAmount <= 0) {
            paymentsSkipped++;
            continue;
          }
          
          // Parse date (DD/MM/YYYY format or Excel date serial)
          let paymentDate: Date;
          try {
            if (typeof dateStr === 'number') {
              // Excel date serial number
              paymentDate = new Date((dateStr - 25569) * 86400 * 1000);
            } else {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                paymentDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              } else {
                paymentDate = new Date(dateStr);
              }
            }
            if (isNaN(paymentDate.getTime())) {
              console.log(`Skipping payment: invalid date "${dateStr}" for ${partyName}`);
              paymentsSkipped++;
              continue;
            }
          } catch {
            paymentsSkipped++;
            continue;
          }
          
          // Find vendor by fuzzy matching
          let vendorId: string | undefined;
          let matchedVendorName: string | undefined;
          const normalizedPartyName = normalize(partyName);
          vendorId = vendorMap.get(normalizedPartyName);
          
          if (vendorId) {
            matchedVendorName = partyName;
          } else {
            // Fuzzy match
            const fuzzyMatches = Array.from(vendorMap.entries())
              .filter(([name]) => fuzzyMatch(name, partyName));
            if (fuzzyMatches.length > 0) {
              vendorId = fuzzyMatches[0][1];
              matchedVendorName = fuzzyMatches[0][0];
            }
          }
          
          if (!vendorId) {
            console.log(`Skipping payment: vendor not found - "${partyName}"`);
            paymentsSkipped++;
            continue;
          }
          
          // Check for duplicates using (normalized vendor name, date, amount)
          const amountPaise = Math.round(receivedAmount * 100);
          const paymentSig = `${normalize(matchedVendorName || partyName)}-${paymentDate.toISOString().substring(0, 10)}-${amountPaise}`;
          if (existingPaymentSignatures.has(paymentSig)) {
            console.log(`Skipping duplicate payment: ${partyName}, ${paymentDate.toISOString().substring(0, 10)}, ₹${receivedAmount}`);
            paymentsSkipped++;
            continue;
          }
          existingPaymentSignatures.add(paymentSig);
          
          // Get vendor's unpaid invoices sorted by date (FIFO)
          // Query fresh to get current amountReceived (may have been updated by earlier allocations)
          const vendorRecord = await tx.select().from(vendors).where(eq(vendors.id, vendorId)).then(r => r[0]);
          const vendorInvoices = await tx.select().from(invoices)
            .where(and(
              eq(invoices.buyerName, vendorRecord.vendorName),
              sql`${invoices.total_amount} > ${invoices.amount_received}`
            ))
            .orderBy(sql`${invoices.invoice_date} ASC`);
          
          let remainingAmount = amountPaise;
          
          // Allocate payment to invoices using FIFO
          for (const invoice of vendorInvoices) {
            if (remainingAmount <= 0) break;
            
            const outstanding = invoice.totalAmount - invoice.amountReceived;
            const allocationAmount = Math.min(remainingAmount, outstanding);
            
            if (allocationAmount > 0) {
              // Create payment record for this invoice
              await tx.insert(invoicePayments).values({
                invoiceId: invoice.id,
                paymentDate: paymentDate.toISOString(),
                amount: allocationAmount,
                paymentMethod: paymentMethod,
                paymentType: allocationAmount >= outstanding ? 'Full' : 'Partial',
                referenceNumber: referenceNo ? `PY-${referenceNo}` : `PY-${invoice.invoiceNumber}`,
                remarks: description || 'Imported from Vyapaar Payments file (FIFO allocated)',
              });
              
              // Update invoice amountReceived
              await tx.update(invoices)
                .set({ amountReceived: invoice.amountReceived + allocationAmount })
                .where(eq(invoices.id, invoice.id));
              
              remainingAmount -= allocationAmount;
              paymentsImported++;
            }
          }
          
          // If there's remaining amount (overpayment), log it
          if (remainingAmount > 0) {
            console.log(`⚠️ Unallocated payment for ${partyName}: ₹${(remainingAmount / 100).toFixed(2)} (no more unpaid invoices)`);
            paymentsUnallocated++;
          }
        }
        
        console.log(`✅ Payments import complete: ${paymentsImported} imported, ${paymentsSkipped} skipped, ${paymentsUnallocated} unallocated`);
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
          payments: paymentsImported,
          paymentsSkipped,
          paymentsUnallocated,
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
        payments: 0,
        paymentsSkipped: 0,
        paymentsUnallocated: 0,
      },
    };
  });
}

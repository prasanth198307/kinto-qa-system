import XLSX from 'xlsx';
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
  
  if (n1 === n2) return true;
  
  const clean = (s: string) => s.replace(/[()]/g, '').trim();
  if (clean(n1) === clean(n2)) return true;
  
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  return false;
}

export async function importVyapaarData(
  partyFilePath: string,
  saleFilePath: string,
  itemFilePath: string
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
      console.log('Clearing vendor and product data...');
      await tx.execute(sql`DELETE FROM production_reconciliation_items`); // References production_reconciliations
      await tx.execute(sql`DELETE FROM production_reconciliations`); // References raw_material_issuance, production_entries
      await tx.execute(sql`DELETE FROM production_entries`); // References raw_material_issuance
      await tx.execute(sql`DELETE FROM credit_note_items`); // References credit_notes
      await tx.execute(sql`DELETE FROM credit_notes`); // References invoices
      await tx.execute(sql`DELETE FROM sales_return_items`); // References sales_returns
      await tx.execute(sql`DELETE FROM sales_returns`); // References invoices and gatepasses
      await tx.execute(sql`DELETE FROM gatepass_items`); // References gatepasses, finished_goods, products
      await tx.execute(sql`DELETE FROM gatepasses`); // Referenced by sales_returns and gatepass_items
      await tx.execute(sql`DELETE FROM finished_goods`); // Referenced by gatepass_items, references products
      await tx.execute(sql`DELETE FROM raw_material_issuance_items`); // References raw_material_issuance
      await tx.execute(sql`DELETE FROM raw_material_issuance`); // References products
      await tx.execute(sql`DELETE FROM invoice_payments`);
      await tx.execute(sql`DELETE FROM invoice_items`);
      await tx.execute(sql`DELETE FROM invoices`);
      await tx.execute(sql`DELETE FROM vendor_vendor_types`);
      await tx.execute(sql`DELETE FROM vendors`);
      await tx.execute(sql`DELETE FROM products`);
    
      // Read Excel files
      const partyWorkbook = XLSX.readFile(partyFilePath);
      const saleWorkbook = XLSX.readFile(saleFilePath);
      const itemWorkbook = XLSX.readFile(itemFilePath);
      
      const partyData: PartyData[] = XLSX.utils.sheet_to_json(partyWorkbook.Sheets[partyWorkbook.SheetNames[0]]);
      const saleData: SaleData[] = XLSX.utils.sheet_to_json(saleWorkbook.Sheets[saleWorkbook.SheetNames[0]]);
      const itemData: ItemData[] = XLSX.utils.sheet_to_json(itemWorkbook.Sheets[itemWorkbook.SheetNames[0]]);
      
      console.log(`Read ${partyData.length} parties, ${saleData.length} sales, ${itemData.length} items`);
      
      // Find the invoice date column - use the first non-__EMPTY column that's not "Generated on"
      // Vyapaar exports have the date in __EMPTY column (first column after party name)
      console.log('Sale data sample columns:', saleData.length > 0 ? Object.keys(saleData[0]) : 'no data');
      
      // Create UOM if they don't exist (preserve existing master data)
      const existingUoms = await tx.select().from(uom);
      const uomCodes = new Set(existingUoms.map(u => u.code));
      
      const uomsToCreate = [
        { code: 'PCS', name: 'Pieces' },
        { code: 'L', name: 'Liters' },
        { code: 'KG', name: 'Kilograms' },
      ].filter(u => !uomCodes.has(u.code));
      
      if (uomsToCreate.length > 0) {
        await tx.insert(uom).values(uomsToCreate);
      }
    
      // Import vendors with unique codes
      const vendorMap = new Map<string, string>();
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
      
      // Get UOM IDs for products - PCS must exist
      const pcsUom = await tx.select().from(uom).where(eq(uom.code, 'PCS')).limit(1).then(rows => rows[0]);
      
      if (!pcsUom) {
        throw new Error('PCS UOM not found. Cannot import products without valid UOM.');
      }
      
      // Import products with unique codes
      const productMap = new Map<string, string>();
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
        uomId: pcsUom.id, // PCS UOM is required and validated above
        sellingPrice: Math.round((item.__EMPTY_11 || 0) * 100),
        description: item.__EMPTY_7 || null,
        }).returning();
        
        productMap.set(normalize(productName), newProduct.id);
      }
      
      // Import invoices
      const invoiceNumbers = new Set<string>();
      const usedNumbers = new Set<string>();
      let invoiceCount = 0;
      let skippedCount = 0;
      
      for (const sale of saleData) {
      let invoiceNumber = sale.__EMPTY_1;
      if (!invoiceNumber) continue;
      
      // Handle duplicates
      if (usedNumbers.has(invoiceNumber)) {
        invoiceNumber = `${invoiceNumber}-DUP2`;
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
      
      const invoiceItemsData = itemData.filter(item => item.__EMPTY === invoiceNumber);
      if (invoiceItemsData.length === 0) {
        console.log(`Skipping invoice ${invoiceNumber}: no items`);
        skippedCount++;
        continue;
      }
      
      // Pre-validate items to ensure at least one valid item exists
      const validItems = invoiceItemsData.filter(item => {
        const productId = productMap.get(normalize(item.__EMPTY_2));
        return !!productId;
      });
      
      if (validItems.length === 0) {
        console.warn(`Skipping invoice ${invoiceNumber}: no valid products found for any items`);
        skippedCount++;
        continue;
      }
      
        // Vyapaar exports use __EMPTY for invoice date (column after invoice number)
        const invoiceDateStr = sale.__EMPTY;
        let invoiceDate: Date;
        
        if (!invoiceDateStr || invoiceDateStr === '') {
          console.warn(`Skipping invoice ${invoiceNumber}: no date found`);
          skippedCount++;
          continue;
        }
        
        try {
          invoiceDate = new Date(invoiceDateStr);
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
        buyerName: vendorName,
        buyerId: vendorId,
        subtotalAmount: Math.round(subtotal * 100),
        cgst: Math.round(cgstTotal * 100),
        sgst: Math.round(sgstTotal * 100),
        igst: Math.round(igstTotal * 100),
        roundOffAmount: 0,
        totalAmount: Math.round(grandTotal * 100),
        remarks: sale.__EMPTY_10 || null,
        vehicleNumber: sale.__EMPTY_11 || null,
        placeOfSupply: null,
        dispatchStatus: 'delivered',
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
          
          await tx.insert(invoiceItems).values({
          invoiceId: newInvoice.id,
          productId: productId!,
          description: item.__EMPTY_2 || '',
          quantity,
          unitPrice: Math.round(unitPrice * 100),
          discount: Math.round(discount * 100),
          taxableAmount: Math.round((totalAmount - taxAmount) * 100),
          cgst: Math.round((taxAmount / 2) * 100),
          sgst: Math.round((taxAmount / 2) * 100),
          igst: 0,
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
      
      // Auto-classify vendor types
      const vendorProductMap = new Map<string, Set<string>>();
      for (const item of itemData) {
      const vendorName = item.__EMPTY_1;
      const productName = normalize(item.__EMPTY_2);
      
      const vendorId = Array.from(vendorMap.entries())
        .find(([name, id]) => fuzzyMatch(name, vendorName))?.[1];
      
      if (vendorId) {
        if (!vendorProductMap.has(vendorId)) {
          vendorProductMap.set(vendorId, new Set());
        }
          vendorProductMap.get(vendorId)!.add(productName);
        }
      }
      
      // Get vendor types
      const allVendorTypes = await tx.select().from(vendorTypes);
      const kintoType = allVendorTypes.find(vt => vt.code === 'KINTO');
      const hppaniType = allVendorTypes.find(vt => vt.code === 'HPPANI');
      const purejalType = allVendorTypes.find(vt => vt.code === 'PUREJAL');
      
      let vendorTypesAssigned = 0;
      
      // Process vendor type assignments synchronously to avoid transaction issues
      for (const [vendorId, productSet] of Array.from(vendorProductMap.entries())) {
        const productList: string[] = [...productSet];
        const assignedTypes: string[] = [];
        
        const hasKinto = productList.some((p: string) => 
          p.includes('blue') || p.includes('kinto')
        );
        const hasHPPani = productList.some((p: string) => 
          p.includes('red') || p.includes('hppani') || p.includes('hp')
        );
        const hasPurejal = productList.some((p: string) => 
          p.includes('green') || p.includes('purejal')
        );
        
        if (hasKinto && kintoType) assignedTypes.push(kintoType.id);
        if (hasHPPani && hppaniType) assignedTypes.push(hppaniType.id);
        if (hasPurejal && purejalType) assignedTypes.push(purejalType.id);
        
        for (let index = 0; index < assignedTypes.length; index++) {
          await tx.insert(vendorVendorTypes).values({
            vendorId,
            vendorTypeId: assignedTypes[index],
            isPrimary: index === 0 ? 1 : 0,
          });
          vendorTypesAssigned++;
        }
      }
      
      console.log('Import completed successfully');
      
      return {
        success: true,
        message: 'Data imported successfully',
        stats: {
          vendors: vendorMap.size,
          products: productMap.size,
          invoices: invoiceCount,
          vendorTypes: vendorTypesAssigned,
          skipped: skippedCount,
        },
      };
    } catch (error: any) {
      console.error('Import failed within transaction:', error);
      // Transaction will automatically rollback
      throw error;
    }
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

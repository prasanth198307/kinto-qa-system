import { db } from './db';
import {
  vendors,
  products,
  creditNotes,
  creditNoteItems,
  uom,
} from '@shared/schema';
import { sql, eq, and, ilike } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

interface CreditNoteHeaderRow {
  date: string;
  referenceNo: string;
  partyName: string;
  total: number;
  status: string;
}

interface CreditNoteItemRow {
  date: string;
  invoiceNo: string;
  partyName: string;
  itemName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  discount: number;
  taxPercent: number;
  tax: number;
  amount: number;
}

function normalize(str: string | undefined): string {
  return (str || '').trim().toLowerCase();
}

function fuzzyMatch(str1: string, str2: string): boolean {
  const n1 = normalize(str1);
  const n2 = normalize(str2);
  
  if (n1 === n2) return true;
  
  const getVariants = (s: string): string[] => {
    const variants = [s];
    variants.push(s.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());
    const beforeParen = s.split('(')[0].trim();
    if (beforeParen && beforeParen !== s) {
      variants.push(beforeParen);
    }
    const parenMatch = s.match(/\(([^)]+)\)$/);
    if (parenMatch && parenMatch[1]) {
      variants.push(parenMatch[1].trim());
    }
    return variants.filter(v => v.length > 0);
  };
  
  const variants1 = getVariants(n1);
  const variants2 = getVariants(n2);
  
  for (const v1 of variants1) {
    for (const v2 of variants2) {
      if (v1 === v2) return true;
      if (v1.length >= 4 && v2.length >= 4) {
        if (v1.includes(v2) || v2.includes(v1)) return true;
      }
    }
  }
  
  return false;
}

function parseVyapaarDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

export async function importCreditNotesFromExcel(filePath: string): Promise<{
  success: boolean;
  message: string;
  stats: {
    creditNotes: number;
    creditNoteItems: number;
    skippedNotes: number;
    skippedItems: number;
    unmatchedVendors: string[];
    unmatchedProducts: string[];
  };
}> {
  const stats = {
    creditNotes: 0,
    creditNoteItems: 0,
    skippedNotes: 0,
    skippedItems: 0,
    unmatchedVendors: [] as string[],
    unmatchedProducts: [] as string[],
  };

  try {
    // Use fs.readFileSync + XLSX.read for ESM compatibility
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    const customReportSheet = workbook.Sheets['Custom Report'];
    const itemDetailsSheet = workbook.Sheets['Item Details'];
    
    if (!customReportSheet || !itemDetailsSheet) {
      return {
        success: false,
        message: 'Excel file must contain "Custom Report" and "Item Details" sheets',
        stats,
      };
    }

    const headerData = XLSX.utils.sheet_to_json<any>(customReportSheet, { header: 1 });
    const itemData = XLSX.utils.sheet_to_json<any>(itemDetailsSheet, { header: 1 });

    const headerStartRow = headerData.findIndex((row: any[]) => 
      row && row[0] === 'Date' && row[1] === 'Reference No'
    );
    
    const itemStartRow = itemData.findIndex((row: any[]) => 
      row && row[0] === 'Date' && row[1] === 'Invoice No./Txn No.'
    );

    if (headerStartRow === -1 || itemStartRow === -1) {
      return {
        success: false,
        message: 'Could not find header row in Excel sheets. Expected columns: Date, Reference No, Party Name...',
        stats,
      };
    }

    const creditNoteHeaders: CreditNoteHeaderRow[] = [];
    for (let i = headerStartRow + 1; i < headerData.length; i++) {
      const row = headerData[i] as any[];
      if (!row || !row[0] || row[0] === '' || row[0] === 'Total') continue;
      
      creditNoteHeaders.push({
        date: String(row[0] || ''),
        referenceNo: String(row[1] || '').trim(),
        partyName: String(row[2] || ''),
        total: Number(row[5]) || 0,
        status: String(row[11] || 'Unpaid'),
      });
    }

    const creditNoteItemsMap: Map<string, CreditNoteItemRow[]> = new Map();
    for (let i = itemStartRow + 1; i < itemData.length; i++) {
      const row = itemData[i] as any[];
      if (!row || !row[0] || row[0] === '' || row[0] === 'Total') continue;
      
      const invoiceNo = String(row[1] || '').trim();
      const item: CreditNoteItemRow = {
        date: String(row[0] || ''),
        invoiceNo,
        partyName: String(row[2] || ''),
        itemName: String(row[3] || ''),
        hsnCode: String(row[5] || row[6] || ''),
        quantity: Number(row[10]) || 0,
        unit: String(row[11] || 'Case'),
        unitPrice: Number(row[12]) || 0,
        discountPercent: Number(row[13]) || 0,
        discount: Number(row[14]) || 0,
        taxPercent: Number(row[15]) || 0,
        tax: Number(row[16]) || 0,
        amount: Number(row[18]) || 0,
      };
      
      if (!creditNoteItemsMap.has(invoiceNo)) {
        creditNoteItemsMap.set(invoiceNo, []);
      }
      creditNoteItemsMap.get(invoiceNo)!.push(item);
    }
    
    console.log('[CREDIT NOTES IMPORT] Parsed headers:', creditNoteHeaders.length);
    console.log('[CREDIT NOTES IMPORT] Header reference numbers:', creditNoteHeaders.map(h => `"${h.referenceNo}"`).join(', '));
    console.log('[CREDIT NOTES IMPORT] Item map keys:', Array.from(creditNoteItemsMap.keys()).map(k => `"${k}"`).join(', '));

    const existingVendors = await db.select().from(vendors).where(eq(vendors.recordStatus, 1));
    const existingProducts = await db.select().from(products).where(eq(products.recordStatus, 1));
    const existingUoms = await db.select().from(uom).where(eq(uom.recordStatus, 1));

    const caseUom = existingUoms.find(u => normalize(u.name) === 'case' || normalize(u.name) === 'cases');
    const defaultUomId = caseUom?.id || existingUoms[0]?.id;

    await db.transaction(async (tx) => {
      for (const header of creditNoteHeaders) {
        const matchedVendor = existingVendors.find(v => 
          fuzzyMatch(v.vendorName, header.partyName) || 
          fuzzyMatch(v.gstLegalName || '', header.partyName) ||
          fuzzyMatch(v.gstTradeName || '', header.partyName)
        );

        if (!matchedVendor) {
          if (!stats.unmatchedVendors.includes(header.partyName)) {
            stats.unmatchedVendors.push(header.partyName);
          }
          stats.skippedNotes++;
          continue;
        }

        const items = creditNoteItemsMap.get(header.referenceNo) || [];
        
        if (items.length === 0) {
          console.log(`Credit Note ${header.referenceNo}: No items found, skipping`);
          stats.skippedNotes++;
          continue;
        }

        let subtotal = 0;
        let totalTax = 0;
        const processedItems: {
          productId: string;
          description: string;
          quantity: number;
          unitPrice: number;
          discountAmount: number;
          taxableValue: number;
          cgstRate: number;
          cgstAmount: number;
          sgstRate: number;
          sgstAmount: number;
          igstRate: number;
          igstAmount: number;
          totalAmount: number;
        }[] = [];

        for (const item of items) {
          const matchedProduct = existingProducts.find(p => 
            fuzzyMatch(p.productName, item.itemName) ||
            fuzzyMatch(p.productName.replace(/\s+/g, ''), item.itemName.replace(/\s+/g, ''))
          );

          if (!matchedProduct) {
            if (!stats.unmatchedProducts.includes(item.itemName)) {
              stats.unmatchedProducts.push(item.itemName);
            }
            stats.skippedItems++;
            continue;
          }

          const quantity = Math.round(item.quantity);
          const unitPricePaise = Math.round(item.unitPrice * 100);
          const taxableValue = Math.round((item.amount - item.tax) * 100);
          const discountPaise = Math.round(item.discount * 100);
          
          const taxRate = item.taxPercent;
          const halfRate = Math.round((taxRate / 2) * 100);
          const taxAmountPaise = Math.round(item.tax * 100);
          const halfTaxPaise = Math.round(taxAmountPaise / 2);

          subtotal += taxableValue;
          totalTax += taxAmountPaise;

          processedItems.push({
            productId: matchedProduct.id,
            description: item.itemName,
            quantity,
            unitPrice: unitPricePaise,
            discountAmount: discountPaise,
            taxableValue,
            cgstRate: halfRate,
            cgstAmount: halfTaxPaise,
            sgstRate: halfRate,
            sgstAmount: taxAmountPaise - halfTaxPaise,
            igstRate: 0,
            igstAmount: 0,
            totalAmount: taxableValue + taxAmountPaise,
          });
        }

        if (processedItems.length === 0) {
          stats.skippedNotes++;
          continue;
        }

        const grandTotal = subtotal + totalTax;
        const creditDate = parseVyapaarDate(header.date);
        const noteNumber = `CN-VY-${header.referenceNo}`;

        const existingNote = await tx.select().from(creditNotes).where(eq(creditNotes.noteNumber, noteNumber));
        if (existingNote.length > 0) {
          console.log(`Credit Note ${noteNumber} already exists, skipping`);
          stats.skippedNotes++;
          continue;
        }

        const [newCreditNote] = await tx.insert(creditNotes).values({
          noteNumber,
          vendorId: matchedVendor.id,
          creditDate,
          reason: 'other',
          status: 'issued',
          subtotal,
          cgstAmount: Math.round(totalTax / 2),
          sgstAmount: totalTax - Math.round(totalTax / 2),
          igstAmount: 0,
          grandTotal,
          notes: `Imported from Vyapaar. Party: ${header.partyName}`,
          recordStatus: 1,
        }).returning();

        stats.creditNotes++;

        for (const item of processedItems) {
          await tx.insert(creditNoteItems).values({
            creditNoteId: newCreditNote.id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxableValue: item.taxableValue,
            cgstRate: item.cgstRate,
            cgstAmount: item.cgstAmount,
            sgstRate: item.sgstRate,
            sgstAmount: item.sgstAmount,
            igstRate: item.igstRate,
            igstAmount: item.igstAmount,
            totalAmount: item.totalAmount,
            recordStatus: 1,
          });
          stats.creditNoteItems++;
        }
      }
    });

    return {
      success: true,
      message: `Imported ${stats.creditNotes} credit notes with ${stats.creditNoteItems} items`,
      stats,
    };
  } catch (error) {
    console.error('Credit note import error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during import',
      stats,
    };
  }
}

import type { Invoice, InvoiceWithItems, CreditNote, DebitNote, VendorDebitNote } from '@shared/schema';
import { downloadJSON, downloadXLSX } from '@/lib/download-utils';

// GST Report Types
export type GSTReportType = 'GSTR1' | 'GSTR3B';
export type PeriodType = 'monthly' | 'quarterly' | 'annual';

// Credit Note with related invoice data for GST reporting
export interface CreditNoteWithInvoice {
  creditNote: CreditNote;
  invoice: Invoice;
  items: any[];
}

// Debit Note with related invoice data for GST reporting
export interface DebitNoteWithInvoice {
  debitNote: DebitNote;
  invoice: Invoice;
  items: any[];
}

// Vendor Debit Note with vendor details for GST reporting (ITC adjustments)
export interface VendorDebitNoteWithDetails {
  vendorDebitNote: VendorDebitNote;
  vendor: {
    id: string;
    vendorName: string;
    gstNumber?: string | null;
    vendorStateCode?: string | null;
  };
  items: any[];
}

// API Response Type
export interface GSTReportAPIResponse {
  invoices: Array<{
    invoice: Invoice;
    items: any[];
  }>;
  creditNotes: CreditNoteWithInvoice[];
  debitNotes: DebitNoteWithInvoice[];
  vendorDebitNotes?: VendorDebitNoteWithDetails[];
  hsnSummary: Array<{
    hsnCode: string;
    description: string;
    uom: string;
    quantity: number;
    taxableValue: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    cessAmount: number;
    taxRate: number;
  }>;
  metadata: {
    period: string;
    periodType: string;
    startDate: string;
    endDate: string;
    totalInvoices: number;
    totalCreditNotes: number;
    totalDebitNotes: number;
    totalVendorDebitNotes?: number;
    totalTaxableValue: number;
    totalTax: number;
    vendorDebitNoteTaxableTotal?: number;
    vendorDebitNoteTaxTotal?: number;
  };
}

// GSTR-1 Report Structure (Outward Supplies)
export interface GSTR1Report {
  gstin: string;
  fp: string; // Filing Period (MMYYYY)
  b2b: B2BInvoice[];
  b2cl: B2CLInvoice[];
  b2cs: B2CSInvoice[];
  exp: ExportInvoice[];
  cdnr: CDNRNote[]; // Credit/Debit Notes for Registered dealers
  cdnur: CDNURNote[]; // Credit/Debit Notes for Unregistered dealers
  hsn: HSNSummary[];
}

// CDNR - Credit/Debit Notes for Registered Dealers (with GSTIN)
export interface CDNRNote {
  ctin: string; // Customer GSTIN
  nt: {
    ntty: string; // Note Type: C for Credit, D for Debit
    nt_num: string; // Note Number
    nt_dt: string; // Note Date (DD-MM-YYYY)
    val: number; // Note Value
    pos: string; // Place of Supply
    rchrg: string; // Reverse Charge (Y/N)
    inv_typ: string; // Invoice Type
    inum: string; // Original Invoice Number
    idt: string; // Original Invoice Date
    txval: number; // Taxable Value
    rt: number; // Tax Rate
    csamt: number; // Cess Amount
    camt: number; // CGST Amount
    samt: number; // SGST Amount
    iamt: number; // IGST Amount
  }[];
}

// CDNUR - Credit/Debit Notes for Unregistered Dealers (without GSTIN)
export interface CDNURNote {
  ntty: string; // Note Type: C for Credit, D for Debit
  nt_num: string; // Note Number
  nt_dt: string; // Note Date (DD-MM-YYYY)
  val: number; // Note Value
  pos: string; // Place of Supply
  inum: string; // Original Invoice Number
  idt: string; // Original Invoice Date
  txval: number; // Taxable Value
  rt: number; // Tax Rate
  csamt: number; // Cess Amount
  iamt: number; // IGST Amount (for inter-state)
}

export interface B2BInvoice {
  ctin: string; // Customer GSTIN
  inv: {
    inum: string; // Invoice Number
    idt: string; // Invoice Date
    val: number; // Invoice Value
    pos: string; // Place of Supply
    rchrg: string; // Reverse Charge (Y/N)
    inv_typ: string; // Invoice Type
    txval: number; // Taxable Value
    rt: number; // Tax Rate (calculated)
    csamt: number; // Cess Amount
    camt: number; // CGST Amount
    samt: number; // SGST Amount
    iamt: number; // IGST Amount
  }[];
}

export interface B2CLInvoice {
  pos: string;
  inv: {
    inum: string;
    idt: string;
    val: number;
    txval: number;
    rt: number;
    csamt: number;
    iamt: number;
  }[];
}

export interface B2CSInvoice {
  sply_ty: string; // Supply Type
  pos: string;
  typ: string; // Tax Type (OE/E)
  txval: number;
  rt: number;
  csamt: number;
  camt: number;
  samt: number;
  iamt: number;
}

export interface ExportInvoice {
  exp_typ: string; // Export Type (WPAY/WOPAY)
  inv: {
    inum: string;
    idt: string;
    val: number;
    txval: number;
    rt: number;
    iamt: number;
  }[];
}

export interface HSNSummary {
  hsn_sc: string; // HSN Code
  desc: string; // Description
  uqc: string; // Unit of Measurement
  qty: number; // Quantity
  txval: number; // Taxable Value
  rt: number; // Tax Rate
  csamt: number; // Cess Amount
  camt: number; // CGST Amount
  samt: number; // SGST Amount
  iamt: number; // IGST Amount
}

// GSTR-3B Report Structure (Summary Return)
export interface GSTR3BReport {
  gstin: string;
  ret_period: string;
  sup_details: {
    osup_det: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
  };
  // Table 4: ITC details (from vendor debit notes and purchase data)
  itc_elg?: {
    itc_avl: {
      // ITC available from vendor payments (processing, job work, freight, etc.)
      iamt: number;
      camt: number;
      samt: number;
    };
    itc_rev: {
      // ITC reversal from vendor claims (defective goods, quality issues, etc.)
      iamt: number;
      camt: number;
      samt: number;
    };
  };
}

/**
 * Fetch GST report data with HSN summary from API
 */
export async function fetchGSTReportData(
  periodType: PeriodType,
  month: number,
  year: number
): Promise<GSTReportAPIResponse> {
  const response = await fetch('/api/gst-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ periodType, month, year }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch GST report data' }));
    throw new Error(error.message || 'Failed to fetch GST report data');
  }

  return response.json();
}

/**
 * Convert paise to rupees
 */
function paiseToRupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

/**
 * Calculate tax rate from amounts
 */
// Standard Indian GST slab rates (combined CGST+SGST or IGST)
const STANDARD_GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 12, 18, 28];

function snapToStandardGSTRate(rate: number): number {
  let closest = rate;
  let minDiff = Infinity;
  for (const std of STANDARD_GST_RATES) {
    const diff = Math.abs(rate - std);
    if (diff < minDiff) {
      minDiff = diff;
      closest = std;
    }
  }
  // Only snap if the raw rate is within 0.5% of a standard slab.
  // Beyond that, return the raw value (non-standard rate on the invoice).
  return minDiff <= 0.5 ? closest : rate;
}

function calculateTaxRate(taxableValue: number, taxAmount: number): number {
  if (taxableValue === 0) return 0;
  const raw = (taxAmount / taxableValue) * 100;
  return snapToStandardGSTRate(Number(raw.toFixed(2)));
}

/**
 * Format date to DD-MM-YYYY for GST portal
 */
function formatDateForGST(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Generate GSTR-1 Report from invoices with real HSN data from API
 */
export function generateGSTR1(
  invoices: Invoice[],
  period: string,
  companyGSTIN: string,
  hsnSummary?: GSTReportAPIResponse['hsnSummary'],
  creditNotes?: CreditNoteWithInvoice[],
  debitNotes?: DebitNoteWithInvoice[]
): GSTR1Report {
  const b2bInvoices: B2BInvoice[] = [];
  const b2clInvoices: B2CLInvoice[] = [];
  const b2csInvoices: B2CSInvoice[] = [];
  const expInvoices: ExportInvoice[] = [];
  const cdnrNotes: CDNRNote[] = [];
  const cdnurNotes: CDNURNote[] = [];
  const hsnMap = new Map<string, HSNSummary>();

  invoices.forEach((invoice) => {
    // Convert from paise to rupees
    const totalAmount = paiseToRupees(invoice.totalAmount);
    // Under Indian GST law (Section 15 CGST Act), transport charges billed on the same
    // invoice are part of the "transaction value" (taxable supply). Include them here.
    const taxableValue = paiseToRupees(invoice.subtotal + (invoice.transportCharges || 0));
    const cgstAmount = paiseToRupees(invoice.cgstAmount);
    const sgstAmount = paiseToRupees(invoice.sgstAmount);
    const igstAmount = paiseToRupees(invoice.igstAmount);
    const cessAmount = paiseToRupees(invoice.cessAmount);
    
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const taxRate = calculateTaxRate(taxableValue, totalTax);
    
    // Determine if this is intra-state or inter-state
    const isSameState = invoice.sellerState === invoice.buyerState;
    
    // Classify invoice based on buyer GSTIN and export indicators
    const hasBuyerGSTIN = invoice.buyerGstin && invoice.buyerGstin.length === 15;
    const isExport = !hasBuyerGSTIN && invoice.placeOfSupply && 
                     (invoice.placeOfSupply.toLowerCase().includes('export') || 
                      invoice.buyerState === 'EXPORT');
    
    if (isExport) {
      // Export Invoice
      const expInv: ExportInvoice = {
        exp_typ: 'WPAY', // With Payment of Tax (default)
        inv: [{
          inum: invoice.invoiceNumber,
          idt: new Date(invoice.invoiceDate).toISOString().split('T')[0],
          val: totalAmount,
          txval: taxableValue,
          rt: taxRate,
          iamt: 0, // Exports are zero-rated or exempted
        }]
      };
      expInvoices.push(expInv);
    } else if (hasBuyerGSTIN) {
      // B2B Invoice
      const b2bInv: B2BInvoice = {
        ctin: invoice.buyerGstin || '',
        inv: [{
          inum: invoice.invoiceNumber,
          idt: new Date(invoice.invoiceDate).toISOString().split('T')[0],
          val: totalAmount,
          pos: invoice.buyerStateCode || '00',
          rchrg: invoice.reverseCharge === 1 ? 'Y' : 'N',
          inv_typ: 'R',
          txval: taxableValue,
          rt: taxRate,
          csamt: cessAmount,
          camt: cgstAmount,
          samt: sgstAmount,
          iamt: igstAmount,
        }]
      };
      b2bInvoices.push(b2bInv);
    } else if (totalAmount > 250000) {
      // B2CL Invoice (B2C Large - above 2.5 lakhs)
      const b2clInv: B2CLInvoice = {
        pos: invoice.buyerStateCode || '00',
        inv: [{
          inum: invoice.invoiceNumber,
          idt: new Date(invoice.invoiceDate).toISOString().split('T')[0],
          val: totalAmount,
          txval: taxableValue,
          rt: taxRate,
          csamt: cessAmount,
          iamt: igstAmount || totalTax, // Use IGST or total tax for inter-state
        }]
      };
      b2clInvoices.push(b2clInv);
    } else {
      // B2CS Invoice (B2C Small - below 2.5 lakhs)
      const b2csInv: B2CSInvoice = {
        sply_ty: 'INTRA',
        pos: invoice.buyerStateCode || '00',
        typ: isSameState ? 'OE' : 'E',
        txval: taxableValue,
        rt: taxRate,
        csamt: cessAmount,
        camt: cgstAmount,
        samt: sgstAmount,
        iamt: igstAmount,
      };
      b2csInvoices.push(b2csInv);
    }
    
  });

  // Transform HSN summary from API response to report format
  const hsnData: HSNSummary[] = (hsnSummary || []).map(hsn => ({
    hsn_sc: hsn.hsnCode,
    desc: hsn.description,
    uqc: hsn.uom,
    qty: hsn.quantity,
    txval: hsn.taxableValue,
    rt: hsn.taxRate,
    csamt: hsn.cessAmount,
    camt: hsn.cgstAmount,
    samt: hsn.sgstAmount,
    iamt: hsn.igstAmount,
  }));

  // Process Credit Notes for CDNR and CDNUR sections
  if (creditNotes && creditNotes.length > 0) {
    // Group by GSTIN for CDNR (registered dealers)
    const cdnrMap = new Map<string, CDNRNote['nt']>();
    
    creditNotes.forEach(({ creditNote, invoice }) => {
      // Convert from paise to rupees
      const noteValue = paiseToRupees(creditNote.grandTotal);
      const taxableValue = paiseToRupees(creditNote.subtotal);
      const cgstAmount = paiseToRupees(creditNote.cgstAmount);
      const sgstAmount = paiseToRupees(creditNote.sgstAmount);
      const igstAmount = paiseToRupees(creditNote.igstAmount);
      const cessAmount = 0; // Credit notes don't have cess in our schema
      
      const totalTax = cgstAmount + sgstAmount + igstAmount;
      const taxRate = calculateTaxRate(taxableValue, totalTax);
      
      const hasBuyerGSTIN = invoice.buyerGstin && invoice.buyerGstin.length === 15;
      
      if (hasBuyerGSTIN) {
        // CDNR - Credit Note for Registered dealer
        const noteData = {
          ntty: 'C', // C for Credit Note
          nt_num: creditNote.noteNumber,
          nt_dt: formatDateForGST(creditNote.creditDate),
          val: noteValue,
          pos: invoice.buyerStateCode || '00',
          rchrg: invoice.reverseCharge === 1 ? 'Y' : 'N',
          inv_typ: 'R',
          inum: invoice.invoiceNumber,
          idt: formatDateForGST(invoice.invoiceDate),
          txval: taxableValue,
          rt: taxRate,
          csamt: cessAmount,
          camt: cgstAmount,
          samt: sgstAmount,
          iamt: igstAmount,
        };
        
        const gstin = invoice.buyerGstin!;
        if (!cdnrMap.has(gstin)) {
          cdnrMap.set(gstin, []);
        }
        cdnrMap.get(gstin)!.push(noteData);
      } else {
        // CDNUR - Credit Note for Unregistered dealer
        const cdnurNote: CDNURNote = {
          ntty: 'C', // C for Credit Note
          nt_num: creditNote.noteNumber,
          nt_dt: formatDateForGST(creditNote.creditDate),
          val: noteValue,
          pos: invoice.buyerStateCode || '00',
          inum: invoice.invoiceNumber,
          idt: formatDateForGST(invoice.invoiceDate),
          txval: taxableValue,
          rt: taxRate,
          csamt: cessAmount,
          iamt: igstAmount || totalTax, // Use IGST or total tax for inter-state
        };
        cdnurNotes.push(cdnurNote);
      }
    });
    
    // Convert CDNR map to array format
    cdnrMap.forEach((notes, ctin) => {
      cdnrNotes.push({ ctin, nt: notes });
    });
  }

  // Process Debit Notes for CDNR and CDNUR sections (note type 'D')
  if (debitNotes && debitNotes.length > 0) {
    // Group by GSTIN for CDNR (registered dealers)
    const debitCdnrMap = new Map<string, CDNRNote['nt']>();
    
    debitNotes.forEach(({ debitNote, invoice }) => {
      // Convert from paise to rupees
      const noteValue = paiseToRupees(debitNote.grandTotal);
      const taxableValue = paiseToRupees(debitNote.subtotal);
      const cgstAmount = paiseToRupees(debitNote.cgstAmount);
      const sgstAmount = paiseToRupees(debitNote.sgstAmount);
      const igstAmount = paiseToRupees(debitNote.igstAmount);
      const cessAmount = 0; // Debit notes don't have cess in our schema
      
      const totalTax = cgstAmount + sgstAmount + igstAmount;
      const taxRate = calculateTaxRate(taxableValue, totalTax);
      
      const hasBuyerGSTIN = invoice.buyerGstin && invoice.buyerGstin.length === 15;
      
      if (hasBuyerGSTIN) {
        // CDNR - Debit Note for Registered dealer
        const noteData = {
          ntty: 'D', // D for Debit Note
          nt_num: debitNote.noteNumber,
          nt_dt: formatDateForGST(debitNote.debitDate),
          val: noteValue,
          pos: invoice.buyerStateCode || '00',
          rchrg: invoice.reverseCharge === 1 ? 'Y' : 'N',
          inv_typ: 'R',
          inum: invoice.invoiceNumber,
          idt: formatDateForGST(invoice.invoiceDate),
          txval: taxableValue,
          rt: taxRate,
          csamt: cessAmount,
          camt: cgstAmount,
          samt: sgstAmount,
          iamt: igstAmount,
        };
        
        const gstin = invoice.buyerGstin!;
        if (!debitCdnrMap.has(gstin)) {
          debitCdnrMap.set(gstin, []);
        }
        debitCdnrMap.get(gstin)!.push(noteData);
      } else {
        // CDNUR - Debit Note for Unregistered dealer
        const cdnurNote: CDNURNote = {
          ntty: 'D', // D for Debit Note
          nt_num: debitNote.noteNumber,
          nt_dt: formatDateForGST(debitNote.debitDate),
          val: noteValue,
          pos: invoice.buyerStateCode || '00',
          inum: invoice.invoiceNumber,
          idt: formatDateForGST(invoice.invoiceDate),
          txval: taxableValue,
          rt: taxRate,
          csamt: cessAmount,
          iamt: igstAmount || totalTax,
        };
        cdnurNotes.push(cdnurNote);
      }
    });
    
    // Add debit CDNR entries to the main CDNR array
    debitCdnrMap.forEach((notes, ctin) => {
      // Check if this GSTIN already exists in cdnrNotes
      const existingEntry = cdnrNotes.find(entry => entry.ctin === ctin);
      if (existingEntry) {
        existingEntry.nt.push(...notes);
      } else {
        cdnrNotes.push({ ctin, nt: notes });
      }
    });
  }

  return {
    gstin: companyGSTIN,
    fp: period,
    b2b: b2bInvoices,
    b2cl: b2clInvoices,
    b2cs: b2csInvoices,
    exp: expInvoices,
    cdnr: cdnrNotes,
    cdnur: cdnurNotes,
    hsn: hsnData,
  };
}

/**
 * Generate GSTR-3B Report from invoices
 * Note: Vendor debit notes are excluded from GST reports as they are internal adjustments without GST
 */
export function generateGSTR3B(
  outwardInvoices: Invoice[],
  inwardPurchases: any[],
  period: string,
  companyGSTIN: string
): GSTR3BReport {
  let totalTaxableValue = 0;
  let totalIGST = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalCess = 0;

  outwardInvoices.forEach((invoice) => {
    // Include transport charges in taxable value (same rule as GSTR-1 — Section 15 CGST Act)
    totalTaxableValue += paiseToRupees(invoice.subtotal + (invoice.transportCharges || 0));
    totalIGST += paiseToRupees(invoice.igstAmount);
    totalCGST += paiseToRupees(invoice.cgstAmount);
    totalSGST += paiseToRupees(invoice.sgstAmount);
    totalCess += paiseToRupees(invoice.cessAmount);
  });

  // Note: Vendor debit notes are excluded from GST reports - they are internal adjustments without GST
  // ITC values are set to 0 as vendor debit notes no longer carry GST amounts
  const itcIGST = 0;
  const itcCGST = 0;
  const itcSGST = 0;
  const itcReversalIGST = 0;
  const itcReversalCGST = 0;
  const itcReversalSGST = 0;

  return {
    gstin: companyGSTIN,
    ret_period: period,
    sup_details: {
      osup_det: {
        txval: Number(totalTaxableValue.toFixed(2)),
        iamt: Number(totalIGST.toFixed(2)),
        camt: Number(totalCGST.toFixed(2)),
        samt: Number(totalSGST.toFixed(2)),
        csamt: Number(totalCess.toFixed(2)),
      },
    },
    // Table 4: ITC details from vendor debit notes
    itc_elg: {
      itc_avl: {
        // ITC eligible from vendor payments (processing, job work, etc.)
        iamt: Number(itcIGST.toFixed(2)),
        camt: Number(itcCGST.toFixed(2)),
        samt: Number(itcSGST.toFixed(2)),
      },
      itc_rev: {
        // ITC reversal from vendor claims (defective goods, quality issues, etc.)
        iamt: Number(itcReversalIGST.toFixed(2)),
        camt: Number(itcReversalCGST.toFixed(2)),
        samt: Number(itcReversalSGST.toFixed(2)),
      },
    },
  };
}

/**
 * Filter invoices by period
 */
export function filterInvoicesByPeriod(
  invoices: Invoice[],
  month: number,
  year: number,
  periodType: PeriodType
): Invoice[] {
  return invoices.filter((invoice) => {
    const invDate = new Date(invoice.invoiceDate);
    const invYear = invDate.getFullYear();
    const invMonth = invDate.getMonth() + 1;

    if (periodType === 'monthly') {
      return invYear === year && invMonth === month;
    } else if (periodType === 'quarterly') {
      const quarterMonth = month; // 3, 6, 9, or 12
      const quarterStart = quarterMonth - 2;
      const quarterEnd = quarterMonth;
      return invYear === year && invMonth >= quarterStart && invMonth <= quarterEnd;
    } else {
      // Annual
      return invYear === year;
    }
  });
}

/**
 * Get period string for report
 */
export function getPeriodString(month: number, year: number): string {
  const monthStr = month.toString().padStart(2, '0');
  return `${monthStr}${year}`;
}

/**
 * Export GST Report as JSON
 */
export function exportGSTReportAsJSON(
  report: GSTR1Report | GSTR3BReport,
  reportType: GSTReportType,
  period: string
): void {
  downloadJSON(report, `${reportType}_${period}.json`);
}

/**
 * Export GSTR-1 as Excel
 */
export async function exportGSTR1AsExcel(report: GSTR1Report, period: string): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  // B2B Sheet
  if (report.b2b.length > 0) {
    const b2bData = report.b2b.flatMap((b2b) =>
      b2b.inv.map((inv) => ({
        'Customer GSTIN': b2b.ctin,
        'Invoice Number': inv.inum,
        'Invoice Date': inv.idt,
        'Invoice Value': inv.val,
        'Place of Supply': inv.pos,
        'Reverse Charge': inv.rchrg,
        'Invoice Type': inv.inv_typ,
        'Taxable Value': inv.txval,
        'Tax Rate': inv.rt,
        'CGST': inv.camt,
        'SGST': inv.samt,
        'IGST': inv.iamt,
        'Cess': inv.csamt,
      }))
    );
    const b2bSheet = XLSX.utils.json_to_sheet(b2bData);
    XLSX.utils.book_append_sheet(workbook, b2bSheet, 'B2B');
  }

  // B2CL Sheet
  if (report.b2cl.length > 0) {
    const b2clData = report.b2cl.flatMap((b2cl) =>
      b2cl.inv.map((inv) => ({
        'Place of Supply': b2cl.pos,
        'Invoice Number': inv.inum,
        'Invoice Date': inv.idt,
        'Invoice Value': inv.val,
        'Taxable Value': inv.txval,
        'Tax Rate': inv.rt,
        'IGST': inv.iamt,
        'Cess': inv.csamt,
      }))
    );
    const b2clSheet = XLSX.utils.json_to_sheet(b2clData);
    XLSX.utils.book_append_sheet(workbook, b2clSheet, 'B2CL');
  }

  // B2CS Sheet
  if (report.b2cs.length > 0) {
    const b2csData = report.b2cs.map((b2cs) => ({
      'Supply Type': b2cs.sply_ty,
      'Place of Supply': b2cs.pos,
      'Type': b2cs.typ,
      'Taxable Value': b2cs.txval,
      'Tax Rate': b2cs.rt,
      'CGST': b2cs.camt,
      'SGST': b2cs.samt,
      'IGST': b2cs.iamt,
      'Cess': b2cs.csamt,
    }));
    const b2csSheet = XLSX.utils.json_to_sheet(b2csData);
    XLSX.utils.book_append_sheet(workbook, b2csSheet, 'B2CS');
  }

  // Export Sheet
  if (report.exp.length > 0) {
    const expData = report.exp.flatMap((exp) =>
      exp.inv.map((inv) => ({
        'Export Type': exp.exp_typ,
        'Invoice Number': inv.inum,
        'Invoice Date': inv.idt,
        'Invoice Value': inv.val,
        'Taxable Value': inv.txval,
        'Tax Rate': inv.rt,
        'IGST': inv.iamt,
      }))
    );
    const expSheet = XLSX.utils.json_to_sheet(expData);
    XLSX.utils.book_append_sheet(workbook, expSheet, 'EXPORT');
  }

  // CDNR Sheet - Credit/Debit Notes for Registered Dealers
  if (report.cdnr && report.cdnr.length > 0) {
    const cdnrData = report.cdnr.flatMap((cdnr) =>
      cdnr.nt.map((nt) => ({
        'Receiver GSTIN': cdnr.ctin,
        'Note Type': nt.ntty === 'C' ? 'Credit Note' : 'Debit Note',
        'Note Number': nt.nt_num,
        'Note Date': nt.nt_dt,
        'Note Value': nt.val,
        'Original Invoice Number': nt.inum,
        'Original Invoice Date': nt.idt,
        'Place of Supply': nt.pos,
        'Reverse Charge': nt.rchrg,
        'Invoice Type': nt.inv_typ,
        'Taxable Value': nt.txval,
        'Tax Rate': nt.rt,
        'CGST': nt.camt,
        'SGST': nt.samt,
        'IGST': nt.iamt,
        'Cess': nt.csamt,
      }))
    );
    const cdnrSheet = XLSX.utils.json_to_sheet(cdnrData);
    XLSX.utils.book_append_sheet(workbook, cdnrSheet, 'CDNR');
  }

  // CDNUR Sheet - Credit/Debit Notes for Unregistered Dealers
  if (report.cdnur && report.cdnur.length > 0) {
    const cdnurData = report.cdnur.map((cdnur) => ({
      'Note Type': cdnur.ntty === 'C' ? 'Credit Note' : 'Debit Note',
      'Note Number': cdnur.nt_num,
      'Note Date': cdnur.nt_dt,
      'Note Value': cdnur.val,
      'Original Invoice Number': cdnur.inum,
      'Original Invoice Date': cdnur.idt,
      'Place of Supply': cdnur.pos,
      'Taxable Value': cdnur.txval,
      'Tax Rate': cdnur.rt,
      'IGST': cdnur.iamt,
      'Cess': cdnur.csamt,
    }));
    const cdnurSheet = XLSX.utils.json_to_sheet(cdnurData);
    XLSX.utils.book_append_sheet(workbook, cdnurSheet, 'CDNUR');
  }

  // HSN Summary Sheet
  if (report.hsn.length > 0) {
    const hsnData = report.hsn.map((hsn) => ({
      'HSN Code': hsn.hsn_sc,
      'Description': hsn.desc,
      'UQC': hsn.uqc,
      'Quantity': hsn.qty,
      'Taxable Value': hsn.txval,
      'Tax Rate': hsn.rt,
      'CGST': hsn.camt,
      'SGST': hsn.samt,
      'IGST': hsn.iamt,
      'Cess': hsn.csamt,
    }));
    const hsnSheet = XLSX.utils.json_to_sheet(hsnData);
    XLSX.utils.book_append_sheet(workbook, hsnSheet, 'HSN');
  }

  // Always add a Summary sheet so the workbook is never empty (SheetJS throws on empty workbooks)
  const summaryRows = [
    { 'Field': 'GSTIN',             'Value': report.gstin },
    { 'Field': 'Filing Period',     'Value': report.fp },
    { 'Field': 'B2B Invoices',      'Value': report.b2b.reduce((s, b) => s + b.inv.length, 0) },
    { 'Field': 'B2CL Invoices',     'Value': report.b2cl.reduce((s, b) => s + b.inv.length, 0) },
    { 'Field': 'B2CS Entries',      'Value': report.b2cs.length },
    { 'Field': 'Export Invoices',   'Value': report.exp.reduce((s, e) => s + e.inv.length, 0) },
    { 'Field': 'Credit/Debit Notes','Value': report.cdnr.reduce((s, c) => s + c.nt.length, 0) + report.cdnur.length },
    { 'Field': 'HSN Entries',        'Value': report.hsn.length },
  ];
  const XLSX2 = await import('xlsx');
  const summarySheet = XLSX2.utils.json_to_sheet(summaryRows);
  XLSX2.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Write file
  await downloadXLSX(workbook, `GSTR1_${period}.xlsx`);
}

/**
 * Export GSTR-3B as Excel
 */
export async function exportGSTR3BAsExcel(report: GSTR3BReport, period: string): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  // Table 3.1 - Outward Supplies Summary
  const summaryData = [
    {
      'Description': 'Table 3.1 - Outward Taxable Supplies',
      'Taxable Value': report.sup_details.osup_det.txval,
      'IGST': report.sup_details.osup_det.iamt,
      'CGST': report.sup_details.osup_det.camt,
      'SGST': report.sup_details.osup_det.samt,
      'Cess': report.sup_details.osup_det.csamt,
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Table 3.1 - Outward');

  // Table 4 - ITC Details (if present from vendor debit notes)
  if (report.itc_elg) {
    const itcData = [
      {
        'Description': 'Table 4A - ITC Available (Vendor Payments)',
        'Type': 'Processing, Job Work, Freight, etc.',
        'IGST': report.itc_elg.itc_avl.iamt,
        'CGST': report.itc_elg.itc_avl.camt,
        'SGST': report.itc_elg.itc_avl.samt,
      },
      {
        'Description': 'Table 4B - ITC Reversal (Vendor Claims)',
        'Type': 'Defective Goods, Quality Rejections, etc.',
        'IGST': report.itc_elg.itc_rev.iamt,
        'CGST': report.itc_elg.itc_rev.camt,
        'SGST': report.itc_elg.itc_rev.samt,
      },
      {
        'Description': 'Net ITC',
        'Type': 'Available - Reversal',
        'IGST': report.itc_elg.itc_avl.iamt - report.itc_elg.itc_rev.iamt,
        'CGST': report.itc_elg.itc_avl.camt - report.itc_elg.itc_rev.camt,
        'SGST': report.itc_elg.itc_avl.samt - report.itc_elg.itc_rev.samt,
      },
    ];

    const itcSheet = XLSX.utils.json_to_sheet(itcData);
    XLSX.utils.book_append_sheet(workbook, itcSheet, 'Table 4 - ITC');
  }

  // Guarantee at least a Summary sheet so the workbook is never empty
  const XLSX2 = await import('xlsx');
  const gstr3bSummaryRows = [
    { 'Field': 'GSTIN',                    'Value': report.gstin },
    { 'Field': 'Filing Period',            'Value': report.ret_period },
    { 'Field': 'Taxable Outward Supplies', 'Value': report.sup_details.osup_det.txval },
    { 'Field': 'Total IGST',               'Value': report.sup_details.osup_det.iamt },
    { 'Field': 'Total CGST',               'Value': report.sup_details.osup_det.camt },
    { 'Field': 'Total SGST',               'Value': report.sup_details.osup_det.samt },
  ];
  const gstr3bSummarySheet = XLSX2.utils.json_to_sheet(gstr3bSummaryRows);
  XLSX2.utils.book_append_sheet(workbook, gstr3bSummarySheet, 'GSTR3B Summary');

  await downloadXLSX(workbook, `GSTR3B_${period}.xlsx`);
}

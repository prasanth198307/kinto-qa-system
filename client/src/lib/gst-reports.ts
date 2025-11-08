import type { Invoice, InvoiceWithItems } from '@shared/schema';

// GST Report Types
export type GSTReportType = 'GSTR1' | 'GSTR3B';
export type PeriodType = 'monthly' | 'quarterly' | 'annual';

// API Response Type
export interface GSTReportAPIResponse {
  invoices: Array<{
    invoice: Invoice;
    items: any[];
  }>;
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
    totalTaxableValue: number;
    totalTax: number;
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
  hsn: HSNSummary[];
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
function calculateTaxRate(taxableValue: number, taxAmount: number): number {
  if (taxableValue === 0) return 0;
  return Number(((taxAmount / taxableValue) * 100).toFixed(2));
}

/**
 * Generate GSTR-1 Report from invoices with real HSN data from API
 */
export function generateGSTR1(
  invoices: Invoice[],
  period: string,
  companyGSTIN: string,
  hsnSummary?: GSTReportAPIResponse['hsnSummary']
): GSTR1Report {
  const b2bInvoices: B2BInvoice[] = [];
  const b2clInvoices: B2CLInvoice[] = [];
  const b2csInvoices: B2CSInvoice[] = [];
  const expInvoices: ExportInvoice[] = [];
  const hsnMap = new Map<string, HSNSummary>();

  invoices.forEach((invoice) => {
    // Convert from paise to rupees
    const totalAmount = paiseToRupees(invoice.totalAmount);
    const taxableValue = paiseToRupees(invoice.subtotal);
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

  return {
    gstin: companyGSTIN,
    fp: period,
    b2b: b2bInvoices,
    b2cl: b2clInvoices,
    b2cs: b2csInvoices,
    exp: expInvoices,
    hsn: hsnData,
  };
}

/**
 * Generate GSTR-3B Report from invoices
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
    totalTaxableValue += paiseToRupees(invoice.subtotal);
    totalIGST += paiseToRupees(invoice.igstAmount);
    totalCGST += paiseToRupees(invoice.cgstAmount);
    totalSGST += paiseToRupees(invoice.sgstAmount);
    totalCess += paiseToRupees(invoice.cessAmount);
  });

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
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportType}_${period}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

  // Write file
  XLSX.writeFile(workbook, `GSTR1_${period}.xlsx`);
}

/**
 * Export GSTR-3B as Excel
 */
export async function exportGSTR3BAsExcel(report: GSTR3BReport, period: string): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    {
      'Description': 'Outward Taxable Supplies',
      'Taxable Value': report.sup_details.osup_det.txval,
      'IGST': report.sup_details.osup_det.iamt,
      'CGST': report.sup_details.osup_det.camt,
      'SGST': report.sup_details.osup_det.samt,
      'Cess': report.sup_details.osup_det.csamt,
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  XLSX.writeFile(workbook, `GSTR3B_${period}.xlsx`);
}

// Tax Engine — Phase 5
// Handles multi-country tax computation: India GST, Saudi ZATCA, UAE VAT, EU VAT, US Sales Tax

export interface TaxParams {
  country: string;
  state?: string;
  sellerState?: string;
  taxableAmount: number; // in paise (×100)
  taxRate?: number;      // percentage override
  isB2B?: boolean;
  customerVatNumber?: string;
}

export interface TaxLine {
  name: string;
  rate: number;
  amount: number; // paise
}

export interface TaxResult {
  regime: string;
  taxName: string;
  lines: TaxLine[];
  totalTax: number;
  grandTotal: number;
  isReverseCharge: boolean;
  zatcaRequired: boolean;
}

// EU country standard VAT rates (%)
const EU_RATES: Record<string, number> = {
  Germany: 19,
  France: 20,
  Netherlands: 21,
  Italy: 22,
  Spain: 21,
  Belgium: 21,
  Austria: 20,
  Portugal: 23,
  Poland: 23,
  Sweden: 25,
  Denmark: 25,
  Finland: 24,
  Ireland: 23,
  Greece: 24,
  'Czech Republic': 21,
  Romania: 19,
  Hungary: 27,
  Croatia: 25,
  Slovakia: 20,
  Bulgaria: 20,
  Lithuania: 21,
  Latvia: 21,
  Estonia: 22,
  Slovenia: 22,
  Luxembourg: 17,
  Malta: 18,
  Cyprus: 19,
};

// US state sales tax rates (%)
const US_STATE_RATES: Record<string, number> = {
  CA: 7.25,
  TX: 6.25,
  NY: 4.0,
  FL: 6.0,
  IL: 6.25,
  PA: 6.0,
  OH: 5.75,
  GA: 4.0,
  NC: 4.75,
  MI: 6.0,
};

export function computeTax(params: TaxParams): TaxResult {
  const { country, state, sellerState, taxableAmount, taxRate, isB2B, customerVatNumber } = params;

  // India GST
  if (country === 'India') {
    const rate = taxRate ?? 18;
    const isIntraState = sellerState && state && sellerState.toLowerCase() === state.toLowerCase();
    if (isIntraState) {
      const cgstRate = rate / 2;
      const sgstRate = rate / 2;
      const cgstAmt = Math.round(taxableAmount * cgstRate / 100);
      const sgstAmt = Math.round(taxableAmount * sgstRate / 100);
      const totalTax = cgstAmt + sgstAmt;
      return {
        regime: 'GST',
        taxName: 'CGST+SGST',
        lines: [
          { name: 'CGST', rate: cgstRate, amount: cgstAmt },
          { name: 'SGST', rate: sgstRate, amount: sgstAmt },
        ],
        totalTax,
        grandTotal: taxableAmount + totalTax,
        isReverseCharge: false,
        zatcaRequired: false,
      };
    } else {
      const igstAmt = Math.round(taxableAmount * rate / 100);
      return {
        regime: 'GST',
        taxName: 'IGST',
        lines: [{ name: 'IGST', rate, amount: igstAmt }],
        totalTax: igstAmt,
        grandTotal: taxableAmount + igstAmt,
        isReverseCharge: false,
        zatcaRequired: false,
      };
    }
  }

  // Saudi Arabia — ZATCA VAT 15%
  if (country === 'Saudi Arabia') {
    const rate = taxRate ?? 15;
    const vatAmt = Math.round(taxableAmount * rate / 100);
    return {
      regime: 'ZATCA',
      taxName: 'VAT',
      lines: [{ name: 'VAT', rate, amount: vatAmt }],
      totalTax: vatAmt,
      grandTotal: taxableAmount + vatAmt,
      isReverseCharge: false,
      zatcaRequired: true,
    };
  }

  // UAE — VAT 5%
  if (country === 'UAE') {
    const rate = taxRate ?? 5;
    const vatAmt = Math.round(taxableAmount * rate / 100);
    return {
      regime: 'VAT',
      taxName: 'VAT',
      lines: [{ name: 'VAT', rate, amount: vatAmt }],
      totalTax: vatAmt,
      grandTotal: taxableAmount + vatAmt,
      isReverseCharge: false,
      zatcaRequired: false,
    };
  }

  // EU countries
  if (country in EU_RATES) {
    // Reverse charge: B2B with valid VAT number
    if (isB2B && customerVatNumber) {
      return {
        regime: 'VAT',
        taxName: 'VAT (Reverse Charge)',
        lines: [],
        totalTax: 0,
        grandTotal: taxableAmount,
        isReverseCharge: true,
        zatcaRequired: false,
      };
    }
    const rate = taxRate ?? EU_RATES[country];
    const vatAmt = Math.round(taxableAmount * rate / 100);
    return {
      regime: 'VAT',
      taxName: 'VAT',
      lines: [{ name: 'VAT', rate, amount: vatAmt }],
      totalTax: vatAmt,
      grandTotal: taxableAmount + vatAmt,
      isReverseCharge: false,
      zatcaRequired: false,
    };
  }

  // USA — state sales tax
  if (country === 'USA') {
    const stateKey = (state ?? '').toUpperCase();
    const rate = taxRate ?? (US_STATE_RATES[stateKey] ?? 0);
    if (rate === 0) {
      return {
        regime: 'Sales Tax',
        taxName: 'Sales Tax',
        lines: [],
        totalTax: 0,
        grandTotal: taxableAmount,
        isReverseCharge: false,
        zatcaRequired: false,
      };
    }
    const taxAmt = Math.round(taxableAmount * rate / 100);
    return {
      regime: 'Sales Tax',
      taxName: 'Sales Tax',
      lines: [{ name: `${stateKey} Sales Tax`, rate, amount: taxAmt }],
      totalTax: taxAmt,
      grandTotal: taxableAmount + taxAmt,
      isReverseCharge: false,
      zatcaRequired: false,
    };
  }

  // No tax
  return {
    regime: 'None',
    taxName: 'No Tax',
    lines: [],
    totalTax: 0,
    grandTotal: taxableAmount,
    isReverseCharge: false,
    zatcaRequired: false,
  };
}

// ZATCA TLV-encoded QR code (base64)
export function generateZATCAQR(invoice: {
  sellerName: string;
  vatNumber: string;
  invoiceDate: string;
  totalWithVat: number;
  vatAmount: number;
}): string {
  function tlvEntry(tag: number, value: string): Buffer {
    const valueBuf = Buffer.from(value, 'utf8');
    const tagBuf = Buffer.from([tag]);
    const lenBuf = Buffer.from([valueBuf.length]);
    return Buffer.concat([tagBuf, lenBuf, valueBuf]);
  }

  const tlv = Buffer.concat([
    tlvEntry(1, invoice.sellerName),
    tlvEntry(2, invoice.vatNumber),
    tlvEntry(3, invoice.invoiceDate),
    tlvEntry(4, invoice.totalWithVat.toFixed(2)),
    tlvEntry(5, invoice.vatAmount.toFixed(2)),
  ]);

  return tlv.toString('base64');
}

export const EU_VAT_RATES = EU_RATES;
export const US_SALES_TAX_RATES = US_STATE_RATES;

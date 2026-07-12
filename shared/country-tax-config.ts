export interface CountryTaxProfile {
  country: string;
  flag: string;
  taxName: string;           // "GST", "VAT", "Sales Tax", etc.
  taxNumberLabel: string;    // Label shown on forms
  taxNumberPlaceholder: string;
  taxNumberRegex?: string;   // Optional validation regex
  taxRate: number;           // Primary/standard rate %
  currency: string;          // ISO 4217
  currencySymbol: string;
  dateFormat: string;
  phoneCode: string;
  invoicePrefix: string;
}

export const COUNTRY_TAX_PROFILES: CountryTaxProfile[] = [
  {
    country: "India",
    flag: "🇮🇳",
    taxName: "GST",
    taxNumberLabel: "GSTIN",
    taxNumberPlaceholder: "22AAAAA0000A1Z5",
    taxNumberRegex: "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
    taxRate: 18,
    currency: "INR",
    currencySymbol: "₹",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+91",
    invoicePrefix: "INV",
  },
  {
    country: "UAE",
    flag: "🇦🇪",
    taxName: "VAT",
    taxNumberLabel: "TRN (Tax Registration Number)",
    taxNumberPlaceholder: "100123456700003",
    taxNumberRegex: "^[0-9]{15}$",
    taxRate: 5,
    currency: "AED",
    currencySymbol: "د.إ",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+971",
    invoicePrefix: "INV",
  },
  {
    country: "Saudi Arabia",
    flag: "🇸🇦",
    taxName: "VAT (ZATCA)",
    taxNumberLabel: "VAT Registration Number",
    taxNumberPlaceholder: "310122393500003",
    taxNumberRegex: "^3[0-9]{14}$",
    taxRate: 15,
    currency: "SAR",
    currencySymbol: "ر.س",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+966",
    invoicePrefix: "INV",
  },
  {
    country: "United Kingdom",
    flag: "🇬🇧",
    taxName: "VAT",
    taxNumberLabel: "VAT Registration Number",
    taxNumberPlaceholder: "GB123456789",
    taxNumberRegex: "^GB[0-9]{9}$",
    taxRate: 20,
    currency: "GBP",
    currencySymbol: "£",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+44",
    invoicePrefix: "INV",
  },
  {
    country: "European Union",
    flag: "🇪🇺",
    taxName: "VAT",
    taxNumberLabel: "VAT Number",
    taxNumberPlaceholder: "DE123456789",
    taxRate: 20,
    currency: "EUR",
    currencySymbol: "€",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+49",
    invoicePrefix: "INV",
  },
  {
    country: "United States",
    flag: "🇺🇸",
    taxName: "Sales Tax",
    taxNumberLabel: "EIN / Sales Tax ID",
    taxNumberPlaceholder: "12-3456789",
    taxRate: 0,
    currency: "USD",
    currencySymbol: "$",
    dateFormat: "MM/DD/YYYY",
    phoneCode: "+1",
    invoicePrefix: "INV",
  },
  {
    country: "Australia",
    flag: "🇦🇺",
    taxName: "GST",
    taxNumberLabel: "ABN (Australian Business Number)",
    taxNumberPlaceholder: "51 824 753 556",
    taxRate: 10,
    currency: "AUD",
    currencySymbol: "A$",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+61",
    invoicePrefix: "INV",
  },
  {
    country: "Singapore",
    flag: "🇸🇬",
    taxName: "GST",
    taxNumberLabel: "GST Registration Number",
    taxNumberPlaceholder: "M90123456A",
    taxRate: 9,
    currency: "SGD",
    currencySymbol: "S$",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+65",
    invoicePrefix: "INV",
  },
  {
    country: "Other",
    flag: "🌍",
    taxName: "Tax",
    taxNumberLabel: "Tax Registration Number",
    taxNumberPlaceholder: "Your tax registration number",
    taxRate: 0,
    currency: "USD",
    currencySymbol: "$",
    dateFormat: "DD/MM/YYYY",
    phoneCode: "+1",
    invoicePrefix: "INV",
  },
];

export function getCountryProfile(country: string): CountryTaxProfile {
  return COUNTRY_TAX_PROFILES.find(p => p.country === country) ?? COUNTRY_TAX_PROFILES[COUNTRY_TAX_PROFILES.length - 1];
}

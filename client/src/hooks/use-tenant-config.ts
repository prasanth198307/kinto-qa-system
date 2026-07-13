import { useQuery } from "@tanstack/react-query";

export interface TenantConfig {
  currency_code: string;
  currency_symbol: string;
  country_code: string;
  timezone: string;
  tax_regime: string; // e.g. 'GST' | 'VAT' | 'Sales Tax' | 'VAT (ZATCA)'
  tax_rate: number;
  date_format: string;
  default_locale: string;
  country: string;
}

// Maps country_code → BCP-47 locale used by Intl APIs
const LOCALE_MAP: Record<string, string> = {
  IN: "en-IN", US: "en-US", AE: "ar-AE", SA: "ar-SA",
  GB: "en-GB", EU: "de-DE", AU: "en-AU", SG: "en-SG",
  CA: "en-CA", DE: "de-DE", FR: "fr-FR",
};

const DEFAULT_CONFIG: TenantConfig = {
  currency_code: "INR",
  currency_symbol: "₹",
  country_code: "IN",
  timezone: "Asia/Kolkata",
  tax_regime: "GST",
  tax_rate: 18,
  date_format: "DD/MM/YYYY",
  default_locale: "en",
  country: "India",
};

export function useTenantConfig(): TenantConfig {
  const { data } = useQuery<TenantConfig>({
    queryKey: ["/api/tenant-config"],
    queryFn: () =>
      fetch("/api/tenant-config", { credentials: "include" }).then((r) =>
        r.json()
      ),
    staleTime: 10 * 60 * 1000,
  });
  return data && data.currency_symbol ? data : DEFAULT_CONFIG;
}

/** Format a raw amount (not in paise) using the tenant's locale + currency */
export function formatCurrency(amount: number, config: TenantConfig): string {
  const intlLocale = LOCALE_MAP[config.country_code] ?? "en-US";
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: config.currency_code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency code is not recognised by Intl
    return `${config.currency_symbol}${amount.toFixed(2)}`;
  }
}

/** Format a number (no currency) using the tenant's locale — respects decimal separator */
export function formatNumber(amount: number, config: TenantConfig, decimals = 2): string {
  const intlLocale = LOCALE_MAP[config.country_code] ?? "en-US";
  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

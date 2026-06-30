import { useQuery } from "@tanstack/react-query";

export interface TenantConfig {
  currency_code: string;
  currency_symbol: string;
  country_code: string;
  timezone: string;
  tax_regime: string; // 'GST' | 'VAT' | 'SALES_TAX' | 'SST'
  date_format: string;
}

const DEFAULT_CONFIG: TenantConfig = {
  currency_code: "INR",
  currency_symbol: "₹",
  country_code: "IN",
  timezone: "Asia/Kolkata",
  tax_regime: "GST",
  date_format: "DD/MM/YYYY",
};

export function useTenantConfig(): TenantConfig {
  const { data } = useQuery<TenantConfig>({
    queryKey: ["/api/tenant-config"],
    queryFn: () =>
      fetch("/api/tenant-config", { credentials: "include" }).then((r) =>
        r.json()
      ),
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
  return data && data.currency_symbol ? data : DEFAULT_CONFIG;
}

export function formatCurrency(amount: number, config: TenantConfig): string {
  return `${config.currency_symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

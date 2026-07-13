import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { Download, Calendar, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";

interface AgingInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOld: number;
  bucket: string;
}

interface AgingOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  vendorName: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOld: number;
  bucket: string;
}

interface AgingVendor {
  vendorName: string;
  vendorId: string;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  over90: number;
  total: number;
  invoices?: AgingInvoice[];
  orders?: AgingOrder[];
}

interface AgingSummary {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  over90: number;
  total: number;
}

interface AgingResponse {
  type: "receivable" | "payable";
  asOfDate: string;
  vendors: AgingVendor[];
  summary: AgingSummary;
}

function formatAmount(paise: number | null | undefined, locale: string): string {
  const val = Number(paise) || 0;
  if (val === 0) return "-";
  const abs = Math.abs(val);
  const formatted = (abs / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
  return val < 0 ? `(${formatted})` : formatted;
}

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const BUCKET_COLORS: Record<string, string> = {
  current: "text-green-700 dark:text-green-400",
  d1_30: "text-blue-700 dark:text-blue-400",
  d31_60: "text-yellow-700 dark:text-yellow-400",
  d61_90: "text-orange-700 dark:text-orange-400",
  over90: "text-red-700 dark:text-red-400",
};

const BUCKET_BG: Record<string, string> = {
  current: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  d1_30: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  d31_60: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
  d61_90: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  over90: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  total: "bg-muted/50 border-border",
};

const BUCKETS = [
  { key: "current", label: "Current" },
  { key: "d1_30", label: "1-30 Days" },
  { key: "d31_60", label: "31-60 Days" },
  { key: "d61_90", label: "61-90 Days" },
  { key: "over90", label: "Over 90 Days" },
  { key: "total", label: "Total" },
] as const;

export default function AgingReportPage() {
  const tenantConfig = useTenantConfig();
  const fmt = (paise: number | null | undefined) => formatAmount(paise, tenantConfig.default_locale);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"receivable" | "payable">("receivable");
  const [asOfDate, setAsOfDate] = useState(getTodayString());
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery<AgingResponse>({
    queryKey: ["/api/aging-report", activeTab, asOfDate],
    queryFn: async () => {
      const res = await fetch(`/api/aging-report?type=${activeTab}&asOfDate=${asOfDate}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  const vendors = data?.vendors ?? [];
  const summary = data?.summary ?? { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0, total: 0 };

  function toggleVendor(vendorId: string) {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  }

  function handleTabChange(tab: "receivable" | "payable") {
    setActiveTab(tab);
    setExpandedVendors(new Set());
  }

  function handleExcelDownload() {
    if (!data) return;

    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const typeLabel = activeTab === "receivable" ? "Receivables" : "Payables";

    const rows: (string | number | null)[][] = [
      [`Outstanding / Aging Report - ${typeLabel}`],
      [`As of Date: ${asOfDate}`],
      [],
      ["Vendor", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "Over 90 Days", "Total"],
    ];

    for (const vendor of vendors) {
      rows.push([
        vendor.vendorName,
        fmtRupees(vendor.current),
        fmtRupees(vendor.d1_30),
        fmtRupees(vendor.d31_60),
        fmtRupees(vendor.d61_90),
        fmtRupees(vendor.over90),
        fmtRupees(vendor.total),
      ]);

      const details = activeTab === "receivable" ? vendor.invoices : vendor.orders;
      if (details && details.length > 0) {
        for (const item of details) {
          const ref = activeTab === "receivable"
            ? (item as AgingInvoice).invoiceNumber
            : (item as AgingOrder).poNumber;
          const date = activeTab === "receivable"
            ? (item as AgingInvoice).invoiceDate
            : (item as AgingOrder).orderDate;
          rows.push([
            `  ${ref}`,
            date,
            `${item.daysOld} days`,
            fmtRupees(item.totalAmount),
            fmtRupees(item.paidAmount),
            fmtRupees(item.outstanding),
            item.bucket,
          ]);
        }
      }
    }

    rows.push([]);
    rows.push([
      "TOTAL",
      fmtRupees(summary.current),
      fmtRupees(summary.d1_30),
      fmtRupees(summary.d31_60),
      fmtRupees(summary.d61_90),
      fmtRupees(summary.over90),
      fmtRupees(summary.total),
    ]);

    exportToExcel({
      filename: `Aging_Report_${typeLabel}_${asOfDate}.xlsx`,
      sheets: [{ name: `${typeLabel} Aging`, data: rows }],
    });

    toast({ title: "Downloaded", description: `Aging report exported as Excel` });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-aging-report">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="page-aging-report">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Outstanding / Aging Report</h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === "receivable" ? "Receivables" : "Payables"} aging analysis
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-[160px]"
              data-testid="input-as-of-date"
            />
          </div>
          <Button variant="outline" onClick={handleExcelDownload} disabled={!data} data-testid="button-download-excel">
            <Download className="w-4 h-4 mr-1" /> Download Excel
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2" data-testid="tab-container">
        <Button
          variant={activeTab === "receivable" ? "default" : "outline"}
          onClick={() => handleTabChange("receivable")}
          data-testid="tab-receivables"
        >
          Receivables
        </Button>
        <Button
          variant={activeTab === "payable" ? "default" : "outline"}
          onClick={() => handleTabChange("payable")}
          data-testid="tab-payables"
        >
          Payables
        </Button>
      </div>

      {isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <span className="text-sm text-destructive">Failed to load aging report. Please try again.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="summary-cards">
        {BUCKETS.map(bucket => {
          const value = summary[bucket.key as keyof AgingSummary];
          const colorClass = BUCKET_COLORS[bucket.key] || "";
          const bgClass = BUCKET_BG[bucket.key] || "";
          return (
            <Card key={bucket.key} className={`border ${bgClass}`} data-testid={`card-summary-${bucket.key}`}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{bucket.label}</div>
                <div className={`text-sm font-semibold mt-1 font-mono tabular-nums ${bucket.key !== "total" ? colorClass : ""}`}>
                  {fmt(value)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-aging">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  {activeTab === "receivable" ? "Customer" : "Vendor"}
                </th>
                <th className={`text-right px-3 py-2.5 text-xs font-medium whitespace-nowrap ${BUCKET_COLORS.current}`}>Current</th>
                <th className={`text-right px-3 py-2.5 text-xs font-medium whitespace-nowrap ${BUCKET_COLORS.d1_30}`}>1-30</th>
                <th className={`text-right px-3 py-2.5 text-xs font-medium whitespace-nowrap ${BUCKET_COLORS.d31_60}`}>31-60</th>
                <th className={`text-right px-3 py-2.5 text-xs font-medium whitespace-nowrap ${BUCKET_COLORS.d61_90}`}>61-90</th>
                <th className={`text-right px-3 py-2.5 text-xs font-medium whitespace-nowrap ${BUCKET_COLORS.over90}`}>Over 90</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vendors.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-data">
                    No outstanding {activeTab === "receivable" ? "receivables" : "payables"} found
                  </td>
                </tr>
              )}
              {vendors.map(vendor => {
                const isExpanded = expandedVendors.has(vendor.vendorId);
                const details = activeTab === "receivable" ? vendor.invoices : vendor.orders;
                const hasDetails = details && details.length > 0;
                return (
                  <VendorRow
                    key={vendor.vendorId}
                    vendor={vendor}
                    isExpanded={isExpanded}
                    hasDetails={!!hasDetails}
                    onToggle={() => toggleVendor(vendor.vendorId)}
                    details={details}
                    activeTab={activeTab}
                  />
                );
              })}
            </tbody>
            {vendors.length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-muted/50 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="text-right px-3 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="footer-current">{fmt(summary.current)}</td>
                  <td className="text-right px-3 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="footer-d1-30">{fmt(summary.d1_30)}</td>
                  <td className="text-right px-3 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="footer-d31-60">{fmt(summary.d31_60)}</td>
                  <td className="text-right px-3 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="footer-d61-90">{fmt(summary.d61_90)}</td>
                  <td className="text-right px-3 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="footer-over90">{fmt(summary.over90)}</td>
                  <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="footer-total">{fmt(summary.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}

function VendorRow({
  vendor,
  isExpanded,
  hasDetails,
  onToggle,
  details,
  activeTab,
}: {
  vendor: AgingVendor;
  isExpanded: boolean;
  hasDetails: boolean;
  onToggle: () => void;
  details?: AgingInvoice[] | AgingOrder[];
  activeTab: "receivable" | "payable";
}) {
  const tenantConfig = useTenantConfig();
  const fmtAmt = (paise: number | null | undefined) => formatAmount(paise, tenantConfig.default_locale);
  return (
    <>
      <tr
        className={`hover-elevate ${hasDetails ? "cursor-pointer" : ""}`}
        onClick={hasDetails ? onToggle : undefined}
        data-testid={`row-vendor-${vendor.vendorId}`}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {hasDetails ? (
              isExpanded ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className="truncate font-medium" data-testid={`text-vendor-name-${vendor.vendorId}`}>{vendor.vendorName}</span>
            {hasDetails && (
              <Badge variant="secondary" data-testid={`badge-count-${vendor.vendorId}`}>
                {details!.length}
              </Badge>
            )}
          </div>
        </td>
        <td className={`text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap ${BUCKET_COLORS.current}`}>{fmtAmt(vendor.current)}</td>
        <td className={`text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap ${BUCKET_COLORS.d1_30}`}>{fmtAmt(vendor.d1_30)}</td>
        <td className={`text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap ${BUCKET_COLORS.d31_60}`}>{fmtAmt(vendor.d31_60)}</td>
        <td className={`text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap ${BUCKET_COLORS.d61_90}`}>{fmtAmt(vendor.d61_90)}</td>
        <td className={`text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap ${BUCKET_COLORS.over90}`}>{fmtAmt(vendor.over90)}</td>
        <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap font-medium">{fmtAmt(vendor.total)}</td>
      </tr>
      {isExpanded && hasDetails && details!.map((item, idx) => {
        const isInvoice = activeTab === "receivable";
        const ref = isInvoice ? (item as AgingInvoice).invoiceNumber : (item as AgingOrder).poNumber;
        const date = isInvoice ? (item as AgingInvoice).invoiceDate : (item as AgingOrder).orderDate;
        const bucketColor = getBucketColor(item.bucket);
        return (
          <tr
            key={item.id || idx}
            className="bg-muted/20"
            data-testid={`row-detail-${item.id || idx}`}
          >
            <td className="px-4 py-2 pl-12" colSpan={1}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono" data-testid={`text-ref-${item.id}`}>{ref}</span>
                <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
                <Badge variant="secondary" className={`text-[10px] ${bucketColor}`} data-testid={`badge-bucket-${item.id}`}>
                  {item.daysOld}d &middot; {item.bucket}
                </Badge>
              </div>
            </td>
            <td className="text-right px-3 py-2 text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap" colSpan={2}>
              Amt: {fmtAmt(item.totalAmount)}
            </td>
            <td className="text-right px-3 py-2 text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap" colSpan={2}>
              Paid: {fmtAmt(item.paidAmount)}
            </td>
            <td className="text-right px-3 py-2 text-xs font-mono tabular-nums whitespace-nowrap font-medium" colSpan={2}>
              O/S: {fmtAmt(item.outstanding)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function formatDate(dateStr: string | null | undefined, locale = "en-IN"): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getBucketColor(bucket: string): string {
  const lower = (bucket || "").toLowerCase();
  if (lower === "current") return BUCKET_COLORS.current;
  if (lower.includes("1-30") || lower.includes("1_30")) return BUCKET_COLORS.d1_30;
  if (lower.includes("31-60") || lower.includes("31_60")) return BUCKET_COLORS.d31_60;
  if (lower.includes("61-90") || lower.includes("61_90")) return BUCKET_COLORS.d61_90;
  if (lower.includes("over") || lower.includes("90+") || lower.includes("over90")) return BUCKET_COLORS.over90;
  return "";
}

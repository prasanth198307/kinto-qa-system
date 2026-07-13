import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, ChevronDown, ChevronRight, TrendingUp, TrendingDown, ArrowDown, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { exportToExcel } from "@/lib/excel-export";

interface CashFlowItem {
  source: string;
  amount: number;
}

interface CashFlowSection {
  total: number;
  items: CashFlowItem[];
}

interface CashFlowData {
  dateStart: string;
  dateEnd: string;
  openingCash: number;
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChange: number;
  closingCash: number;
  cashAccounts: { id: string; code: string; name: string }[];
}

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return String(year);
}

function getAvailableFYs(): string[] {
  const currentFYStart = parseInt(getCurrentFY());
  return Array.from({ length: 4 }, (_, i) => String(currentFYStart - i));
}

function getFYLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function formatAmount(paise: number | null | undefined, config: ReturnType<typeof useTenantConfig>): string {
  const val = Number(paise) || 0;
  if (val === 0) return "-";
  const formatted = fmtCur(Math.abs(val) / 100, config);
  return val < 0 ? `(${formatted})` : formatted;
}

function formatSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    invoice: "Sales / Invoice Receipts",
    payment: "Customer Payments",
    expense: "Operating Expenses",
    credit_note: "Credit Note Adjustments",
    customer_advance: "Customer Advances",
    advance_application: "Advance Applications",
    write_off: "Write-offs",
    manual: "Manual Entries",
    raw_material_receipt: "Raw Material Purchases",
    raw_material_issuance: "Material Issuance",
    production_entry: "Production",
    spare_part_receipt: "Spare Part Purchases",
    spare_part_issuance: "Spare Part Usage",
    cash_deposit: "Cash Deposits",
    cash_transfer: "Cash Transfers",
    vendor_debit_note: "Vendor Debit Notes",
    debit_note: "Debit Notes",
    other: "Other Transactions",
  };
  return labels[source] || source.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatDateDisplay(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function AmountCell({ value, testId }: { value: number | null | undefined; testId?: string }) {
  const tenantConfig = useTenantConfig();
  const val = Number(value) || 0;
  const isNegative = val < 0;
  return (
    <span
      className={`font-mono tabular-nums whitespace-nowrap ${isNegative ? "text-red-600 dark:text-red-400" : ""}`}
      data-testid={testId}
    >
      {formatAmount(val, tenantConfig)}
    </span>
  );
}

function SectionBlock({
  title,
  icon,
  section,
  color,
  expanded,
  onToggle,
  testIdPrefix,
}: {
  title: string;
  icon: typeof TrendingUp;
  section: CashFlowSection;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  testIdPrefix: string;
}) {
  const Icon = icon;
  const isPositive = section.total >= 0;

  return (
    <Card data-testid={`card-${testIdPrefix}`}>
      <button
        className="w-full text-left"
        onClick={onToggle}
        data-testid={`button-toggle-${testIdPrefix}`}
      >
        <div className={`flex items-center justify-between gap-2 px-4 py-3 ${color}`}>
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{title}</span>
            <Badge variant="secondary" className="ml-1" data-testid={`badge-${testIdPrefix}-count`}>
              {section.items.length} items
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <ArrowUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            )}
            <AmountCell value={section.total} testId={`text-${testIdPrefix}-total`} />
          </div>
        </div>
      </button>

      {expanded && section.items.length > 0 && (
        <CardContent className="p-0">
          <table className="w-full text-sm" data-testid={`table-${testIdPrefix}`}>
            <tbody>
              {section.items.map((item, idx) => {
                const isNeg = item.amount < 0;
                return (
                  <tr
                    key={item.source}
                    className="border-t hover-elevate"
                    data-testid={`row-${testIdPrefix}-${idx}`}
                  >
                    <td className="px-4 py-2 pl-10">
                      <div className="flex items-center gap-2">
                        {isNeg ? (
                          <ArrowDown className="w-3 h-3 text-red-500 dark:text-red-400 flex-shrink-0" />
                        ) : (
                          <ArrowUp className="w-3 h-3 text-green-500 dark:text-green-400 flex-shrink-0" />
                        )}
                        <span data-testid={`text-source-${testIdPrefix}-${idx}`}>
                          {formatSourceLabel(item.source)}
                        </span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-2 w-[160px]">
                      <AmountCell value={item.amount} testId={`text-amount-${testIdPrefix}-${idx}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}

export default function CashFlowStatementPage() {
  const { toast } = useToast();
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [dateMode, setDateMode] = useState<"fy" | "custom">("fy");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: false,
    financing: false,
  });

  const isCustomValid = dateMode === "custom" && customFrom && customTo && customFrom <= customTo;

  const apiUrl = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `/api/cash-flow-statement?fromDate=${customFrom}&toDate=${customTo}`;
    }
    return `/api/cash-flow-statement?fy=${selectedFY}`;
  })();

  const { data: invoiceTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });
  const companyName = invoiceTemplate?.defaultSellerName || '';

  const { data, isLoading, isError } = useQuery<CashFlowData>({
    queryKey: ["/api/cash-flow-statement", dateMode, selectedFY, customFrom, customTo],
    queryFn: async () => {
      const res = await fetch(apiUrl, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch cash flow statement");
      return res.json();
    },
  });

  function toggleSection(key: string) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleExcelDownload() {
    if (!data) return;

    const fmtRupees = (paise: number) => {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
      const val = Number(paise) || 0;
      return val === 0 ? 0 : Number((val / 100).toFixed(2));
    };

    const periodStr = dateMode === "custom" && isCustomValid
      ? `${formatDateDisplay(data.dateStart)} to ${formatDateDisplay(data.dateEnd)}`
      : `${getFYLabel(selectedFY)} (${formatDateDisplay(data.dateStart)} to ${formatDateDisplay(data.dateEnd)})`;
    const rows: (string | number | null)[][] = [
      [`${companyName} - Cash Flow Statement`],
      [periodStr],
      [],
      ["Category", "Source", "Amount (Rs.)"],
      [],
      ["Opening Cash Balance", "", fmtRupees(data.openingCash)],
      [],
      ["A. OPERATING ACTIVITIES", "", ""],
    ];

    for (const item of data.operating.items) {
      rows.push(["", formatSourceLabel(item.source), fmtRupees(item.amount)]);
    }
    rows.push(["", "Net from Operating Activities", fmtRupees(data.operating.total)]);

    rows.push([]);
    rows.push(["B. INVESTING ACTIVITIES", "", ""]);
    for (const item of data.investing.items) {
      rows.push(["", formatSourceLabel(item.source), fmtRupees(item.amount)]);
    }
    rows.push(["", "Net from Investing Activities", fmtRupees(data.investing.total)]);

    rows.push([]);
    rows.push(["C. FINANCING ACTIVITIES", "", ""]);
    for (const item of data.financing.items) {
      rows.push(["", formatSourceLabel(item.source), fmtRupees(item.amount)]);
    }
    rows.push(["", "Net from Financing Activities", fmtRupees(data.financing.total)]);

    rows.push([]);
    rows.push(["Net Change in Cash", "", fmtRupees(data.netChange)]);
    rows.push(["Closing Cash Balance", "", fmtRupees(data.closingCash)]);

    if (data.cashAccounts && data.cashAccounts.length > 0) {
      rows.push([]);
      rows.push(["Cash & Cash Equivalents", "", ""]);
      for (const acc of data.cashAccounts) {
        rows.push([acc.code, acc.name, ""]);
      }
    }

    exportToExcel({
      filename: `Cash_Flow_Statement_${getFYLabel(selectedFY).replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Cash Flow", data: rows }],
    });

    toast({ title: "Downloaded", description: "Cash flow statement exported to Excel." });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-cash-flow">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="error-cash-flow">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Failed to load cash flow statement.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} data-testid="button-retry">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const periodLabel = `${formatDateDisplay(data.dateStart)} to ${formatDateDisplay(data.dateEnd)}`;
  const netIsPositive = data.netChange >= 0;
  const displayPeriod = dateMode === "custom" && isCustomValid
    ? periodLabel
    : `${getFYLabel(selectedFY)} \u00b7 ${periodLabel}`;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" data-testid="page-cash-flow-statement">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Cash Flow Statement</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-period-label">
            {displayPeriod}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateMode} onValueChange={(v) => setDateMode(v as "fy" | "custom")}>
            <SelectTrigger className="w-[120px]" data-testid="select-date-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy">By FY</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {dateMode === "fy" && (
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[150px]" data-testid="select-financial-year">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableFYs().map(fy => (
                  <SelectItem key={fy} value={fy} data-testid={`option-fy-${fy}`}>
                    {getFYLabel(fy)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {dateMode === "custom" && (
            <>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-[150px]"
                data-testid="input-custom-from"
              />
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-[150px]"
                data-testid="input-custom-to"
              />
            </>
          )}

          <Button variant="outline" size="sm" onClick={handleExcelDownload} data-testid="button-download-excel">
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Opening Cash</div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-opening-cash">
              {formatAmount(data.openingCash, tenantConfig)}
            </div>
          </CardContent>
        </Card>
        <Card className={netIsPositive ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Net Change</div>
              {netIsPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div
              className={`text-lg font-semibold mt-1 font-mono tabular-nums ${netIsPositive ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-400"}`}
              data-testid="text-net-change"
            >
              {formatAmount(data.netChange, tenantConfig)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Closing Cash</div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-closing-cash">
              {formatAmount(data.closingCash, tenantConfig)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <SectionBlock
          title="A. Operating Activities"
          icon={TrendingUp}
          section={data.operating}
          color="bg-blue-50/50 dark:bg-blue-950/20"
          expanded={!!expandedSections.operating}
          onToggle={() => toggleSection("operating")}
          testIdPrefix="operating"
        />
        <SectionBlock
          title="B. Investing Activities"
          icon={TrendingDown}
          section={data.investing}
          color="bg-amber-50/50 dark:bg-amber-950/20"
          expanded={!!expandedSections.investing}
          onToggle={() => toggleSection("investing")}
          testIdPrefix="investing"
        />
        <SectionBlock
          title="C. Financing Activities"
          icon={ArrowUp}
          section={data.financing}
          color="bg-purple-50/50 dark:bg-purple-950/20"
          expanded={!!expandedSections.financing}
          onToggle={() => toggleSection("financing")}
          testIdPrefix="financing"
        />
      </div>

      <Card data-testid="card-summary">
        <CardContent className="p-0">
          <table className="w-full text-sm" data-testid="table-summary">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide" colSpan={2}>
                  Summary
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" data-testid="row-summary-opening">
                <td className="px-4 py-2.5">Opening Cash Balance</td>
                <td className="text-right px-4 py-2.5 w-[160px]">
                  <AmountCell value={data.openingCash} testId="text-summary-opening" />
                </td>
              </tr>
              <tr className="border-b" data-testid="row-summary-operating">
                <td className="px-4 py-2.5 pl-6">Net from Operating Activities</td>
                <td className="text-right px-4 py-2.5">
                  <AmountCell value={data.operating.total} testId="text-summary-operating" />
                </td>
              </tr>
              <tr className="border-b" data-testid="row-summary-investing">
                <td className="px-4 py-2.5 pl-6">Net from Investing Activities</td>
                <td className="text-right px-4 py-2.5">
                  <AmountCell value={data.investing.total} testId="text-summary-investing" />
                </td>
              </tr>
              <tr className="border-b" data-testid="row-summary-financing">
                <td className="px-4 py-2.5 pl-6">Net from Financing Activities</td>
                <td className="text-right px-4 py-2.5">
                  <AmountCell value={data.financing.total} testId="text-summary-financing" />
                </td>
              </tr>
              <tr className="border-b bg-muted/20 font-semibold" data-testid="row-summary-net-change">
                <td className="px-4 py-2.5">Net Change in Cash</td>
                <td className="text-right px-4 py-2.5">
                  <AmountCell value={data.netChange} testId="text-summary-net-change" />
                </td>
              </tr>
              <tr className="bg-muted/30 font-semibold" data-testid="row-summary-closing">
                <td className="px-4 py-2.5">Closing Cash Balance</td>
                <td className="text-right px-4 py-2.5">
                  <AmountCell value={data.closingCash} testId="text-summary-closing" />
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.cashAccounts && data.cashAccounts.length > 0 && (
        <Card data-testid="card-cash-accounts">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Cash & Cash Equivalent Accounts
            </div>
            <div className="flex flex-wrap gap-2">
              {data.cashAccounts.map(acc => (
                <Badge key={acc.id} variant="outline" data-testid={`badge-cash-account-${acc.id}`}>
                  {acc.code} - {acc.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

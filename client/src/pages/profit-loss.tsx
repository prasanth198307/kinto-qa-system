import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Printer, TrendingUp, TrendingDown, ExternalLink, LayoutList, Columns2, Download } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  subType: string | null;
  subTypeLabel: string | null;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  periodMovement: number;
  currentBalance: number;
}

function getCurrentFY(): string {
  const now = new Date();
  return String(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
}

function getFYLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function getAvailableFYs(): string[] {
  const current = parseInt(getCurrentFY());
  return Array.from({ length: 4 }, (_, i) => String(current - i));
}

function getFYDates(fy: string): { start: string; end: string } {
  const y = parseInt(fy);
  return { start: `${y}-04-01`, end: `${y + 1}-03-31` };
}

function formatAmount(paise: number): string {
  if (paise === 0) return "-";
  const rupees = Math.abs(paise) / 100;
  const formatted = rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return paise < 0 ? `(${formatted})` : formatted;
}

function formatDateDisplay(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const REVENUE_SUB_ORDER = ["operating", "direct_income", "indirect_income", "other_income"];
const EXPENSE_SUB_ORDER = ["direct", "direct_expense", "manufacturing", "operating", "indirect_expense", "financial", "administrative", "adjustment", "other"];

const SUB_TYPE_LABELS: Record<string, string> = {
  operating: "Sales Accounts",
  direct_income: "Direct Income",
  indirect_income: "Indirect Income",
  other_income: "Other Income",
  direct: "Direct Expenses",
  direct_expense: "Direct Expenses",
  manufacturing: "Manufacturing Expenses",
  indirect_expense: "Indirect Expenses",
  financial: "Financial Expenses",
  administrative: "Administrative Expenses",
  adjustment: "Adjustment Entries",
  other: "Other Expenses",
};

export default function ProfitLossPage() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlMode = urlParams.get("mode");
  const urlFy = urlParams.get("fy");
  const urlFrom = urlParams.get("fromDate");
  const urlTo = urlParams.get("toDate");

  const [dateMode, setDateMode] = useState<"fy" | "custom">(urlMode === "custom" ? "custom" : "fy");
  const [selectedFY, setSelectedFY] = useState(urlFy || getCurrentFY());
  const [customFrom, setCustomFrom] = useState(urlFrom || "");
  const [customTo, setCustomTo] = useState(urlTo || "");
  const [viewMode, setViewMode] = useState<"vertical" | "tally">("vertical");
  const [, setLocation] = useLocation();

  const isCustomValid = dateMode === "custom" && customFrom && customTo && customFrom <= customTo;

  const apiQueryParams = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `fromDate=${customFrom}&toDate=${customTo}`;
    }
    return `fy=${selectedFY}`;
  })();

  const { data: accounts = [], isLoading } = useQuery<ChartAccount[]>({
    queryKey: [`/api/chart-of-accounts?${apiQueryParams}`],
  });

  const currentPeriodLabel = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `${formatDateDisplay(customFrom)} to ${formatDateDisplay(customTo)}`;
    }
    const fyStart = parseInt(selectedFY);
    return `Apr ${fyStart} \u2013 Mar ${fyStart + 1}`;
  })();

  const revenueAccounts = accounts
    .filter(a => a.accountType === "revenue")
    .filter(a => (Number(a.currentBalance) || 0) !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));

  const expenseAccounts = accounts
    .filter(a => a.accountType === "expense")
    .filter(a => (Number(a.currentBalance) || 0) !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));

  function getBalance(account: ChartAccount): number {
    return Number(account.currentBalance) || 0;
  }

  function groupBySubType(accs: ChartAccount[], order: string[]) {
    const grouped: { subType: string; label: string; accounts: ChartAccount[]; total: number }[] = [];
    const seen = new Set<string>();

    for (const st of order) {
      const matching = accs.filter(a => (a.subType || "other") === st);
      if (matching.length > 0) {
        seen.add(st);
        const total = matching.reduce((sum, a) => sum + getBalance(a), 0);
        const apiLabel = matching[0]?.subTypeLabel;
        grouped.push({ subType: st, label: apiLabel || SUB_TYPE_LABELS[st] || st.replace(/_/g, " "), accounts: matching, total });
      }
    }

    const remaining = accs.filter(a => !seen.has(a.subType || "other"));
    if (remaining.length > 0) {
      const total = remaining.reduce((sum, a) => sum + getBalance(a), 0);
      const apiLabel = remaining[0]?.subTypeLabel;
      grouped.push({ subType: "uncategorized", label: apiLabel || "Other", accounts: remaining, total });
    }

    return grouped;
  }

  const revenueGroups = groupBySubType(revenueAccounts, REVENUE_SUB_ORDER);
  const expenseGroups = groupBySubType(expenseAccounts, EXPENSE_SUB_ORDER);

  const totalRevenue = revenueAccounts.reduce((sum, a) => sum + getBalance(a), 0);
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + getBalance(a), 0);
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;

  const grossRevenue = revenueGroups.find(g => ["operating", "direct_income"].includes(g.subType))?.total || totalRevenue;
  const cogs = expenseGroups.find(g => g.subType === "direct")?.total || 0;
  const grossProfit = grossRevenue - cogs;

  function handleExcelDownload() {
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const data: (string | number | null)[][] = [
      ["KINTO Smart Ops - Profit & Loss Statement"],
      [currentPeriodLabel],
      [],
      ["Code", "Account Name", "Category", "Amount (Rs.)"],
      [],
      ["REVENUE", "", "", ""],
    ];

    for (const group of revenueGroups) {
      if (group.accounts.length > 1) {
        data.push(["", group.label, "", ""]);
      }
      for (const account of group.accounts) {
        const bal = getBalance(account);
        data.push([account.code, account.name, group.label, bal !== 0 ? fmtRupees(bal) : 0]);
      }
      if (group.accounts.length > 1) {
        data.push(["", `Subtotal - ${group.label}`, "", fmtRupees(group.total)]);
      }
    }
    data.push(["", "Total Revenue", "", fmtRupees(totalRevenue)]);
    data.push([]);
    data.push(["EXPENSES", "", "", ""]);

    for (const group of expenseGroups) {
      if (group.accounts.length > 1) {
        data.push(["", group.label, "", ""]);
      }
      for (const account of group.accounts) {
        const bal = getBalance(account);
        data.push([account.code, account.name, group.label, bal !== 0 ? fmtRupees(bal) : 0]);
      }
      if (group.accounts.length > 1) {
        data.push(["", `Subtotal - ${group.label}`, "", fmtRupees(group.total)]);
      }
    }
    data.push(["", "Total Expenses", "", fmtRupees(totalExpenses)]);

    if (grossProfit !== netProfit) {
      data.push([]);
      data.push(["", "Gross Profit", "", fmtRupees(grossProfit)]);
    }

    data.push([]);
    data.push(["", `Net ${isProfit ? "Profit" : "Loss"}`, "", fmtRupees(netProfit)]);

    exportToExcel({
      filename: `Profit_Loss_${currentPeriodLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Profit & Loss", data }],
    });
  }

  function handleAccountClick(account: ChartAccount) {
    const params = new URLSearchParams();
    params.set("accountId", account.id);
    if (dateMode === "custom" && isCustomValid) {
      params.set("dateFrom", customFrom);
      params.set("dateTo", customTo);
    } else {
      const fyDates = getFYDates(selectedFY);
      params.set("dateFrom", fyDates.start);
      params.set("dateTo", fyDates.end);
    }
    const plReturnParams = dateMode === "custom" && isCustomValid
      ? `mode=custom&fromDate=${customFrom}&toDate=${customTo}`
      : `mode=fy&fy=${selectedFY}`;
    params.set("tbReturn", plReturnParams);
    params.set("returnTo", "profit-loss");
    setLocation(`/journal-entries?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-profit-loss">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const printDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto" data-testid="page-profit-loss">
      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "12px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>KINTO Smart Ops</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Manufacturing Excellence</div>
          <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "10px" }}>Profit & Loss Statement</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
            {currentPeriodLabel}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Profit & Loss Statement</h1>
          <p className="text-sm text-muted-foreground">{currentPeriodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-md overflow-visible">
            <Button
              variant={viewMode === "vertical" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("vertical")}
              className="rounded-r-none no-default-hover-elevate"
              data-testid="button-view-vertical"
            >
              <LayoutList className="w-4 h-4 mr-1" /> Vertical
            </Button>
            <Button
              variant={viewMode === "tally" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tally")}
              className="rounded-l-none no-default-hover-elevate"
              data-testid="button-view-tally"
            >
              <Columns2 className="w-4 h-4 mr-1" /> T-Format
            </Button>
          </div>

          <Select value={dateMode} onValueChange={(v) => setDateMode(v as "fy" | "custom")}>
            <SelectTrigger className="w-[120px]" data-testid="select-date-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy">Financial Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateMode === "fy" && (
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[140px]" data-testid="select-financial-year">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableFYs().map(fy => (
                  <SelectItem key={fy} value={fy}>{getFYLabel(fy)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {dateMode === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-from"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-to"
              />
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleExcelDownload} data-testid="button-download-excel">
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-total-revenue">
              {"\u20B9"}{formatAmount(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-total-expenses">
              {"\u20B9"}{formatAmount(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card className={isProfit ? "border-green-200 dark:border-green-800" : "border-destructive"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Net {isProfit ? "Profit" : "Loss"}
              </div>
              {isProfit ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              )}
            </div>
            <div className={`text-lg font-semibold mt-1 font-mono tabular-nums ${isProfit ? "text-green-700 dark:text-green-300" : "text-destructive"}`} data-testid="text-net-profit">
              {"\u20B9"}{formatAmount(Math.abs(netProfit))}
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "tally" ? (
        <TallyView
          revenueGroups={revenueGroups}
          expenseGroups={expenseGroups}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          grossProfit={grossProfit}
          netProfit={netProfit}
          isProfit={isProfit}
          getBalance={getBalance}
          onAccountClick={handleAccountClick}
        />
      ) : (
        <VerticalView
          revenueGroups={revenueGroups}
          expenseGroups={expenseGroups}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          grossProfit={grossProfit}
          netProfit={netProfit}
          isProfit={isProfit}
          getBalance={getBalance}
          onAccountClick={handleAccountClick}
        />
      )}

      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666", marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          Printed on: {printDate} &middot; KINTO Smart Ops &middot; Net {isProfit ? "Profit" : "Loss"}: {"\u20B9"}{formatAmount(Math.abs(netProfit))}
        </div>
      </div>
    </div>
  );
}

interface ViewProps {
  revenueGroups: { subType: string; label: string; accounts: ChartAccount[]; total: number }[];
  expenseGroups: { subType: string; label: string; accounts: ChartAccount[]; total: number }[];
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  isProfit: boolean;
  getBalance: (a: ChartAccount) => number;
  onAccountClick: (a: ChartAccount) => void;
}

function VerticalView({ revenueGroups, expenseGroups, totalRevenue, totalExpenses, grossProfit, netProfit, isProfit, getBalance, onAccountClick }: ViewProps) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="table-profit-loss">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Particulars</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-[160px]">Amount ({"\u20B9"})</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-green-50/50 dark:bg-green-950/20">
              <td className="px-4 py-2.5 font-semibold uppercase text-xs tracking-wide" colSpan={2}>Revenue</td>
            </tr>

            {revenueGroups.map(group => (
              <SubTypeSection key={group.subType} group={group} getBalance={getBalance} onAccountClick={onAccountClick} />
            ))}

            <tr className="border-t-2 bg-muted/30 font-semibold">
              <td className="px-4 py-2.5">Total Revenue</td>
              <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-revenue">
                {formatAmount(totalRevenue)}
              </td>
            </tr>

            <tr className="h-2" />

            <tr className="bg-red-50/50 dark:bg-red-950/20">
              <td className="px-4 py-2.5 font-semibold uppercase text-xs tracking-wide" colSpan={2}>Expenses</td>
            </tr>

            {expenseGroups.map(group => (
              <SubTypeSection key={group.subType} group={group} getBalance={getBalance} onAccountClick={onAccountClick} />
            ))}

            <tr className="border-t-2 bg-muted/30 font-semibold">
              <td className="px-4 py-2.5">Total Expenses</td>
              <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-expenses">
                {formatAmount(totalExpenses)}
              </td>
            </tr>

            {grossProfit !== netProfit && (
              <>
                <tr className="h-2" />
                <tr className="border-t bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground">Gross Profit</td>
                  <td className="text-right px-4 py-2 font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatAmount(grossProfit)}
                  </td>
                </tr>
              </>
            )}

            <tr className="h-2" />

            <tr className={`border-t-2 font-bold text-base ${isProfit ? "bg-green-50/80 dark:bg-green-950/30" : "bg-red-50/80 dark:bg-red-950/30"}`}>
              <td className="px-4 py-3">
                Net {isProfit ? "Profit" : "Loss"}
              </td>
              <td className={`text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap ${isProfit ? "text-green-700 dark:text-green-300" : "text-destructive"}`} data-testid="row-net-profit">
                {formatAmount(Math.abs(netProfit))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TallyView({ revenueGroups, expenseGroups, totalRevenue, totalExpenses, grossProfit, netProfit, isProfit, getBalance, onAccountClick }: ViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="table-profit-loss-tally">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-green-50/50 dark:bg-green-950/20">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" colSpan={2}>
                  Revenue (Income)
                </th>
              </tr>
            </thead>
            <tbody>
              {revenueGroups.map(group => (
                <TallySubTypeSection key={group.subType} group={group} getBalance={getBalance} onAccountClick={onAccountClick} />
              ))}

              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">Total Revenue</td>
                <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="tally-total-revenue">
                  {formatAmount(totalRevenue)}
                </td>
              </tr>

              {grossProfit !== netProfit && (
                <tr className="border-t bg-muted/10">
                  <td className="px-4 py-2 text-muted-foreground text-xs">Gross Profit</td>
                  <td className="text-right px-4 py-2 font-mono tabular-nums text-muted-foreground text-xs whitespace-nowrap">
                    {formatAmount(grossProfit)}
                  </td>
                </tr>
              )}

              {!isProfit && (
                <tr className="bg-red-50/50 dark:bg-red-950/20">
                  <td className="px-4 py-2 font-medium">Net Loss (transferred)</td>
                  <td className="text-right px-4 py-2 font-mono tabular-nums text-destructive whitespace-nowrap">
                    {formatAmount(Math.abs(netProfit))}
                  </td>
                </tr>
              )}

              <tr className={`border-t-2 font-bold ${isProfit ? "bg-green-50/80 dark:bg-green-950/30" : "bg-muted/30"}`}>
                <td className="px-4 py-3">Grand Total</td>
                <td className={`text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap`}>
                  {formatAmount(isProfit ? totalRevenue : totalRevenue + Math.abs(netProfit))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-red-50/50 dark:bg-red-950/20">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" colSpan={2}>
                  Expenses
                </th>
              </tr>
            </thead>
            <tbody>
              {expenseGroups.map(group => (
                <TallySubTypeSection key={group.subType} group={group} getBalance={getBalance} onAccountClick={onAccountClick} />
              ))}

              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">Total Expenses</td>
                <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="tally-total-expenses">
                  {formatAmount(totalExpenses)}
                </td>
              </tr>

              {isProfit && (
                <tr className="bg-green-50/50 dark:bg-green-950/20">
                  <td className="px-4 py-2 font-medium">Net Profit (transferred)</td>
                  <td className="text-right px-4 py-2 font-mono tabular-nums text-green-700 dark:text-green-300 whitespace-nowrap">
                    {formatAmount(netProfit)}
                  </td>
                </tr>
              )}

              <tr className={`border-t-2 font-bold ${isProfit ? "bg-muted/30" : "bg-red-50/80 dark:bg-red-950/30"}`}>
                <td className="px-4 py-3">Grand Total</td>
                <td className={`text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap`}>
                  {formatAmount(isProfit ? totalExpenses + netProfit : totalExpenses)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SubTypeSection({ group, getBalance, onAccountClick }: {
  group: { subType: string; label: string; accounts: ChartAccount[]; total: number };
  getBalance: (a: ChartAccount) => number;
  onAccountClick: (a: ChartAccount) => void;
}) {
  return (
    <>
      {group.accounts.length > 1 && (
        <tr className="bg-muted/10">
          <td className="px-4 py-1.5 pl-6 text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.label}</td>
          <td></td>
        </tr>
      )}
      {group.accounts.map(account => {
        const bal = getBalance(account);
        return (
          <tr
            key={account.id}
            className="border-b hover-elevate cursor-pointer group"
            onClick={() => onAccountClick(account)}
            data-testid={`row-pl-${account.code}`}
          >
            <td className="px-4 py-2 pl-8">
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{account.code}</code>
                <span className="truncate group-hover:underline underline-offset-2">{account.name}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
              </div>
            </td>
            <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
              {bal !== 0 ? formatAmount(bal) : "-"}
            </td>
          </tr>
        );
      })}
      {group.accounts.length > 1 && (
        <tr className="border-b bg-muted/5">
          <td className="px-4 py-1.5 pl-8 text-xs text-muted-foreground">Subtotal - {group.label}</td>
          <td className="text-right px-4 py-1.5 font-mono tabular-nums text-xs text-muted-foreground whitespace-nowrap">
            {formatAmount(group.total)}
          </td>
        </tr>
      )}
    </>
  );
}

function TallySubTypeSection({ group, getBalance, onAccountClick }: {
  group: { subType: string; label: string; accounts: ChartAccount[]; total: number };
  getBalance: (a: ChartAccount) => number;
  onAccountClick: (a: ChartAccount) => void;
}) {
  return (
    <>
      {group.accounts.length > 1 && (
        <tr className="bg-muted/10">
          <td className="px-4 py-1.5 pl-5 text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.label}</td>
          <td></td>
        </tr>
      )}
      {group.accounts.map(account => {
        const bal = getBalance(account);
        return (
          <tr
            key={account.id}
            className="border-b hover-elevate cursor-pointer group"
            onClick={() => onAccountClick(account)}
            data-testid={`row-tally-${account.code}`}
          >
            <td className="px-4 py-1.5 pl-7">
              <span className="truncate group-hover:underline underline-offset-2 text-sm">{account.name}</span>
            </td>
            <td className="text-right px-4 py-1.5 font-mono tabular-nums whitespace-nowrap text-sm">
              {bal !== 0 ? formatAmount(bal) : "-"}
            </td>
          </tr>
        );
      })}
      {group.accounts.length > 1 && (
        <tr className="border-b bg-muted/5">
          <td className="px-4 py-1 pl-7 text-xs text-muted-foreground">Subtotal</td>
          <td className="text-right px-4 py-1 font-mono tabular-nums text-xs text-muted-foreground whitespace-nowrap">
            {formatAmount(group.total)}
          </td>
        </tr>
      )}
    </>
  );
}

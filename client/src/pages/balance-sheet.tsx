import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Printer, ExternalLink, Scale, Download } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  subType: string | null;
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

const ASSET_SUB_ORDER = ["current_asset", "trade_receivable", "inventory", "gst_input"];
const LIABILITY_SUB_ORDER = ["trade_payable", "advance_liability", "gst", "statutory", "loan"];
const EQUITY_SUB_ORDER = ["capital", "retained", "drawings"];

const SUB_TYPE_LABELS: Record<string, string> = {
  current_asset: "Cash & Bank",
  trade_receivable: "Trade Receivables",
  inventory: "Inventories",
  gst_input: "GST Input Credit",
  trade_payable: "Trade Payables",
  advance_liability: "Advance from Customers",
  gst: "GST Payable",
  statutory: "Statutory Liabilities",
  loan: "Loans",
  capital: "Capital",
  retained: "Retained Earnings",
  drawings: "Drawings",
};

export default function BalanceSheetPage() {
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
      return `As on ${formatDateDisplay(customTo)}`;
    }
    const fyStart = parseInt(selectedFY);
    return `As on 31 Mar ${fyStart + 1}`;
  })();

  const periodSubLabel = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `${formatDateDisplay(customFrom)} to ${formatDateDisplay(customTo)}`;
    }
    return getFYLabel(selectedFY);
  })();

  const revenueAccounts = accounts.filter(a => a.accountType === "revenue");
  const expenseAccounts = accounts.filter(a => a.accountType === "expense");
  const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  const netProfitLoss = totalRevenue - totalExpenses;

  const assetAccounts = accounts
    .filter(a => a.accountType === "asset")
    .sort((a, b) => a.code.localeCompare(b.code));

  const liabilityAccounts = accounts
    .filter(a => a.accountType === "liability")
    .sort((a, b) => a.code.localeCompare(b.code));

  const equityAccounts = accounts
    .filter(a => a.accountType === "equity")
    .sort((a, b) => a.code.localeCompare(b.code));

  function getBalance(account: ChartAccount): number {
    return Number(account.currentBalance) || 0;
  }

  function getNormalBalance(account: ChartAccount): number {
    return getBalance(account);
  }

  function groupBySubType(accs: ChartAccount[], order: string[]) {
    const grouped: { subType: string; label: string; accounts: ChartAccount[]; total: number }[] = [];
    const seen = new Set<string>();

    for (const st of order) {
      const matching = accs.filter(a => (a.subType || "other") === st);
      if (matching.length > 0) {
        seen.add(st);
        const total = matching.reduce((sum, a) => sum + getNormalBalance(a), 0);
        grouped.push({ subType: st, label: SUB_TYPE_LABELS[st] || st.replace(/_/g, " "), accounts: matching, total });
      }
    }

    const remaining = accs.filter(a => !seen.has(a.subType || "other"));
    if (remaining.length > 0) {
      const total = remaining.reduce((sum, a) => sum + getNormalBalance(a), 0);
      grouped.push({ subType: "other", label: "Other", accounts: remaining, total });
    }

    return grouped;
  }

  const assetGroups = groupBySubType(assetAccounts, ASSET_SUB_ORDER);
  const liabilityGroups = groupBySubType(liabilityAccounts, LIABILITY_SUB_ORDER);
  const equityGroups = groupBySubType(equityAccounts, EQUITY_SUB_ORDER);

  const totalAssets = assetAccounts.reduce((sum, a) => sum + getNormalBalance(a), 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + getNormalBalance(a), 0);
  const totalEquity = equityAccounts.reduce((sum, a) => sum + getNormalBalance(a), 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netProfitLoss;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

  function handleExcelDownload() {
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const data: (string | number | null)[][] = [
      ["KINTO Smart Ops - Balance Sheet"],
      [`${currentPeriodLabel} (${periodSubLabel})`],
      [],
      ["Code", "Account Name", "Category", "Amount (Rs.)"],
      [],
      ["ASSETS", "", "", ""],
    ];

    for (const group of assetGroups) {
      const visibleAccounts = group.accounts.filter(a => getNormalBalance(a) !== 0);
      if (visibleAccounts.length === 0) continue;
      data.push(["", group.label, "", ""]);
      for (const account of visibleAccounts) {
        data.push([account.code, account.name, group.label, fmtRupees(getNormalBalance(account))]);
      }
      data.push(["", `Subtotal - ${group.label}`, "", fmtRupees(group.total)]);
    }
    data.push(["", "Total Assets", "", fmtRupees(totalAssets)]);

    data.push([]);
    data.push(["LIABILITIES", "", "", ""]);
    for (const group of liabilityGroups) {
      const visibleAccounts = group.accounts.filter(a => getNormalBalance(a) !== 0);
      if (visibleAccounts.length === 0) continue;
      data.push(["", group.label, "", ""]);
      for (const account of visibleAccounts) {
        data.push([account.code, account.name, group.label, fmtRupees(getNormalBalance(account))]);
      }
      data.push(["", `Subtotal - ${group.label}`, "", fmtRupees(group.total)]);
    }
    data.push(["", "Total Liabilities", "", fmtRupees(totalLiabilities)]);

    data.push([]);
    data.push(["EQUITY", "", "", ""]);
    for (const group of equityGroups) {
      const visibleAccounts = group.accounts.filter(a => getNormalBalance(a) !== 0);
      if (visibleAccounts.length === 0) continue;
      data.push(["", group.label, "", ""]);
      for (const account of visibleAccounts) {
        data.push([account.code, account.name, group.label, fmtRupees(getNormalBalance(account))]);
      }
      data.push(["", `Subtotal - ${group.label}`, "", fmtRupees(group.total)]);
    }
    data.push(["", `Current Period Net ${netProfitLoss >= 0 ? "Profit" : "Loss"}`, "", fmtRupees(netProfitLoss)]);
    data.push(["", "Total Equity", "", fmtRupees(totalEquity + netProfitLoss)]);

    data.push([]);
    data.push(["", "Total Liabilities & Equity", "", fmtRupees(totalLiabilitiesAndEquity)]);

    exportToExcel({
      filename: `Balance_Sheet_${periodSubLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Balance Sheet", data }],
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
    const bsReturnParams = dateMode === "custom" && isCustomValid
      ? `mode=custom&fromDate=${customFrom}&toDate=${customTo}`
      : `mode=fy&fy=${selectedFY}`;
    params.set("tbReturn", bsReturnParams);
    params.set("returnTo", "balance-sheet");
    setLocation(`/journal-entries?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-balance-sheet">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const printDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto" data-testid="page-balance-sheet">
      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "12px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>KINTO Smart Ops</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Manufacturing Excellence</div>
          <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "10px" }}>Balance Sheet</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
            {currentPeriodLabel} ({periodSubLabel})
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">{currentPeriodLabel} &middot; {periodSubLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateMode} onValueChange={(v) => setDateMode(v as "fy" | "custom")}>
            <SelectTrigger className="w-[150px]" data-testid="select-date-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy">Financial Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
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
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Assets</div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-total-assets">
              {"\u20B9"}{formatAmount(totalAssets)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Liabilities</div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-total-liabilities">
              {"\u20B9"}{formatAmount(totalLiabilities)}
            </div>
          </CardContent>
        </Card>
        <Card className={isBalanced ? "border-green-200 dark:border-green-800" : "border-destructive"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Equity + Net P/L</div>
              <Scale className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-total-equity">
              {"\u20B9"}{formatAmount(totalEquity + netProfitLoss)}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isBalanced && (
        <Card className="border-destructive no-print">
          <CardContent className="p-3 text-sm text-destructive">
            Balance Sheet does not balance. Difference: {"\u20B9"}{formatAmount(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-assets">
              <colgroup>
                <col />
                <col className="w-[160px]" style={{ minWidth: "160px" }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-blue-50/50 dark:bg-blue-950/20">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" colSpan={2}>
                    Assets
                  </th>
                </tr>
              </thead>
              <tbody>
                {assetGroups.map(group => (
                  <AccountGroupSection key={group.subType} group={group} getNormalBalance={getNormalBalance} onAccountClick={handleAccountClick} />
                ))}

                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total Assets</td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-assets">
                    {formatAmount(totalAssets)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-liabilities-equity">
              <colgroup>
                <col />
                <col className="w-[160px]" style={{ minWidth: "160px" }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-amber-50/50 dark:bg-amber-950/20">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" colSpan={2}>
                    Liabilities
                  </th>
                </tr>
              </thead>
              <tbody>
                {liabilityGroups.map(group => (
                  <AccountGroupSection key={group.subType} group={group} getNormalBalance={getNormalBalance} onAccountClick={handleAccountClick} />
                ))}

                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total Liabilities</td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-liabilities">
                    {formatAmount(totalLiabilities)}
                  </td>
                </tr>

                <tr className="h-1" />

                <tr className="border-b bg-purple-50/50 dark:bg-purple-950/20">
                  <td className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" colSpan={2}>
                    Equity
                  </td>
                </tr>

                {equityGroups.map(group => (
                  <AccountGroupSection key={group.subType} group={group} getNormalBalance={getNormalBalance} onAccountClick={handleAccountClick} />
                ))}

                <tr className="border-t bg-muted/20">
                  <td className="px-4 py-2 pl-8 italic text-muted-foreground">
                    Current Period Net {netProfitLoss >= 0 ? "Profit" : "Loss"}
                  </td>
                  <td className={`text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap ${netProfitLoss >= 0 ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
                    {formatAmount(Math.abs(netProfitLoss))}
                  </td>
                </tr>

                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total Equity</td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-equity">
                    {formatAmount(totalEquity + netProfitLoss)}
                  </td>
                </tr>

                <tr className="h-1" />

                <tr className={`border-t-2 font-bold text-base ${isBalanced ? "bg-green-50/80 dark:bg-green-950/30" : "bg-red-50/80 dark:bg-red-950/30"}`}>
                  <td className="px-4 py-3">Total Liabilities & Equity</td>
                  <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-liabilities-equity">
                    {formatAmount(totalLiabilitiesAndEquity)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666", marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          Printed on: {printDate} &middot; KINTO Smart Ops &middot; {isBalanced ? "Balanced" : "Out of Balance"}
        </div>
      </div>
    </div>
  );
}

function AccountGroupSection({ group, getNormalBalance, onAccountClick }: {
  group: { subType: string; label: string; accounts: ChartAccount[]; total: number };
  getNormalBalance: (a: ChartAccount) => number;
  onAccountClick: (a: ChartAccount) => void;
}) {
  const visibleAccounts = group.accounts.filter(a => getNormalBalance(a) !== 0);
  if (visibleAccounts.length === 0) return null;

  return (
    <>
      <tr className="bg-muted/10">
        <td className="px-4 py-1.5 pl-6 text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.label}</td>
        <td className="text-right px-4 py-1.5 text-xs font-medium font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          {formatAmount(group.total)}
        </td>
      </tr>
      {visibleAccounts.map(account => {
        const bal = getNormalBalance(account);
        return (
          <tr
            key={account.id}
            className="border-b hover-elevate cursor-pointer group"
            onClick={() => onAccountClick(account)}
            data-testid={`row-bs-${account.code}`}
          >
            <td className="px-4 py-2 pl-8">
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{account.code}</code>
                <span className="truncate group-hover:underline underline-offset-2">{account.name}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
              </div>
            </td>
            <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
              {formatAmount(bal)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

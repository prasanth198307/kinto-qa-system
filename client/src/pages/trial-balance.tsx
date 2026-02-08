import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Printer, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

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

function formatAmount(paise: number): string {
  if (paise === 0) return "-";
  const rupees = Math.abs(paise) / 100;
  return rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function getFYDates(fy: string): { start: string; end: string } {
  const y = parseInt(fy);
  return { start: `${y}-04-01`, end: `${y + 1}-03-31` };
}

function formatDateDisplay(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"];
const TYPE_LABELS: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

export default function TrialBalancePage() {
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
  const [hideZero, setHideZero] = useState(false);
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

  const tbUrlParams = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `mode=custom&fromDate=${customFrom}&toDate=${customTo}`;
    }
    return `mode=fy&fy=${selectedFY}`;
  })();

  const rows = accounts
    .filter(a => !hideZero || a.periodDebit !== 0 || a.periodCredit !== 0 || a.currentBalance !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));

  const grouped = TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    accounts: rows.filter(a => a.accountType === type),
  })).filter(g => g.accounts.length > 0);

  const isDebitNormal = (type: string) => ["asset", "expense"].includes(type);

  function getDebitCredit(account: ChartAccount) {
    const bal = Number(account.currentBalance) || 0;
    if (bal === 0) return { debit: 0, credit: 0 };
    if (isDebitNormal(account.accountType)) {
      return bal >= 0 ? { debit: bal, credit: 0 } : { debit: 0, credit: Math.abs(bal) };
    }
    return bal >= 0 ? { debit: 0, credit: bal } : { debit: Math.abs(bal), credit: 0 };
  }

  let totalDebit = 0;
  let totalCredit = 0;
  rows.forEach(a => {
    const { debit, credit } = getDebitCredit(a);
    totalDebit += debit;
    totalCredit += credit;
  });

  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;
  const difference = totalDebit - totalCredit;

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
    params.set("tbReturn", tbUrlParams);
    setLocation(`/journal-entries?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-trial-balance">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const printDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" data-testid="page-trial-balance">
      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "12px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>KINTO Smart Ops</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Manufacturing Excellence</div>
          <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "10px" }}>Trial Balance</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
            {currentPeriodLabel}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Trial Balance</h1>
          <p className="text-sm text-muted-foreground">{currentPeriodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={hideZero ? "default" : "outline"}
            size="sm"
            onClick={() => setHideZero(!hideZero)}
            data-testid="button-hide-zero"
          >
            {hideZero ? "Show All" : "Hide Zero"}
          </Button>

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

          <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <Card className={`no-print ${isBalanced ? "border-green-200 dark:border-green-800" : "border-destructive"}`}>
        <CardContent className="p-3 flex items-center gap-3">
          {isBalanced ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          )}
          <div className="flex-1">
            <span className={`text-sm font-medium ${isBalanced ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
              {isBalanced ? "Books are balanced" : `Out of balance by \u20B9${formatAmount(Math.abs(difference))}`}
            </span>
          </div>
          <div className="text-right text-xs text-muted-foreground hidden sm:block">
            Total Debit: {"\u20B9"}{formatAmount(totalDebit)} &middot; Total Credit: {"\u20B9"}{formatAmount(totalCredit)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-trial-balance">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-[80px]">Code</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Account Name</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-[150px]">Debit ({"\u20B9"})</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-[150px]">Credit ({"\u20B9"})</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <GroupSection key={group.type} group={group} getDebitCredit={getDebitCredit} onAccountClick={handleAccountClick} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-semibold">
                <td className="px-4 py-3" colSpan={2}>Total</td>
                <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="total-debit">
                  {"\u20B9"}{formatAmount(totalDebit)}
                </td>
                <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="total-credit">
                  {"\u20B9"}{formatAmount(totalCredit)}
                </td>
              </tr>
              {!isBalanced && (
                <tr className="bg-destructive/5">
                  <td className="px-4 py-2 text-destructive text-xs" colSpan={2}>Difference</td>
                  <td className="text-right px-4 py-2 font-mono tabular-nums text-destructive text-xs whitespace-nowrap" colSpan={2}>
                    {"\u20B9"}{formatAmount(Math.abs(difference))}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666", marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          Printed on: {printDate} &middot; KINTO Smart Ops &middot; {isBalanced ? "Books Balanced" : `Out of balance by \u20B9${formatAmount(Math.abs(difference))}`}
        </div>
      </div>
    </div>
  );
}

function GroupSection({ group, getDebitCredit, onAccountClick }: {
  group: { type: string; label: string; accounts: ChartAccount[] };
  getDebitCredit: (a: ChartAccount) => { debit: number; credit: number };
  onAccountClick: (a: ChartAccount) => void;
}) {
  let groupDebit = 0;
  let groupCredit = 0;
  group.accounts.forEach(a => {
    const { debit, credit } = getDebitCredit(a);
    groupDebit += debit;
    groupCredit += credit;
  });

  return (
    <>
      <tr className="bg-muted/20">
        <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground" colSpan={2}>
          {group.label}
        </td>
        <td className="text-right px-4 py-2 text-xs font-semibold font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          {groupDebit > 0 ? `\u20B9${formatAmount(groupDebit)}` : ""}
        </td>
        <td className="text-right px-4 py-2 text-xs font-semibold font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          {groupCredit > 0 ? `\u20B9${formatAmount(groupCredit)}` : ""}
        </td>
      </tr>
      {group.accounts.map(account => {
        const { debit, credit } = getDebitCredit(account);
        return (
          <tr
            key={account.id}
            className="border-b hover-elevate cursor-pointer group"
            data-testid={`row-tb-${account.code}`}
            onClick={() => onAccountClick(account)}
          >
            <td className="px-4 py-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{account.code}</code>
            </td>
            <td className="px-3 py-2 truncate">
              <span className="underline-offset-2 group-hover:underline flex items-center gap-1" data-testid={`link-account-${account.code}`}>
                {account.name}
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
              </span>
            </td>
            <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
              {debit > 0 ? formatAmount(debit) : "-"}
            </td>
            <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
              {credit > 0 ? formatAmount(credit) : "-"}
            </td>
          </tr>
        );
      })}
    </>
  );
}

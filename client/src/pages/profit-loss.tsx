import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Printer, TrendingUp, TrendingDown } from "lucide-react";

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
  const formatted = rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return paise < 0 ? `(${formatted})` : formatted;
}

const REVENUE_SUB_ORDER = ["operating", "direct_income", "indirect_income", "other_income"];
const EXPENSE_SUB_ORDER = ["direct", "manufacturing", "operating", "financial", "administrative", "adjustment", "other"];

const SUB_TYPE_LABELS: Record<string, string> = {
  operating: "Operating Income",
  direct_income: "Direct Income",
  indirect_income: "Indirect Income",
  other_income: "Other Income",
  direct: "Cost of Goods / Direct Expenses",
  manufacturing: "Manufacturing Expenses",
  financial: "Financial Expenses",
  administrative: "Administrative Expenses",
  adjustment: "Adjustments",
  other: "Other Expenses",
};

export default function ProfitLossPage() {
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());

  const { data: accounts = [], isLoading } = useQuery<ChartAccount[]>({
    queryKey: [`/api/chart-of-accounts?fy=${selectedFY}`],
  });

  const fyStart = parseInt(selectedFY);

  const revenueAccounts = accounts
    .filter(a => a.accountType === "revenue")
    .sort((a, b) => a.code.localeCompare(b.code));

  const expenseAccounts = accounts
    .filter(a => a.accountType === "expense")
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
        grouped.push({ subType: st, label: SUB_TYPE_LABELS[st] || st.replace(/_/g, " "), accounts: matching, total });
      }
    }

    const remaining = accs.filter(a => !seen.has(a.subType || "other"));
    if (remaining.length > 0) {
      const total = remaining.reduce((sum, a) => sum + getBalance(a), 0);
      grouped.push({ subType: "uncategorized", label: "Other", accounts: remaining, total });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-profit-loss">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const printDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" data-testid="page-profit-loss">
      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "12px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>KINTO Smart Ops</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Manufacturing Excellence</div>
          <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "10px" }}>Profit & Loss Statement</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
            For the period Apr {fyStart} &ndash; Mar {fyStart + 1}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Profit & Loss Statement</h1>
          <p className="text-sm text-muted-foreground">For the period Apr {fyStart} &ndash; Mar {fyStart + 1}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedFY} onValueChange={setSelectedFY}>
            <SelectTrigger className="w-[160px]" data-testid="select-financial-year">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableFYs().map(fy => (
                <SelectItem key={fy} value={fy}>{getFYLabel(fy)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <SubTypeSection key={group.subType} group={group} getBalance={getBalance} />
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
                <SubTypeSection key={group.subType} group={group} getBalance={getBalance} />
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

      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666", marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          Printed on: {printDate} &middot; KINTO Smart Ops &middot; Net {isProfit ? "Profit" : "Loss"}: {"\u20B9"}{formatAmount(Math.abs(netProfit))}
        </div>
      </div>
    </div>
  );
}

function SubTypeSection({ group, getBalance }: {
  group: { subType: string; label: string; accounts: ChartAccount[]; total: number };
  getBalance: (a: ChartAccount) => number;
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
          <tr key={account.id} className="border-b hover-elevate" data-testid={`row-pl-${account.code}`}>
            <td className="px-4 py-2 pl-8">
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{account.code}</code>
                <span className="truncate">{account.name}</span>
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

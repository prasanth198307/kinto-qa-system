import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Printer, ExternalLink, Scale, Download, ChevronDown, ChevronRight, Expand, Shrink } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";
import { useTenantConfig, formatCurrency as fmtCur, type TenantConfig } from "@/hooks/use-tenant-config";

interface TreeNode {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nodeType: string;
  level: number;
  parentId: string | null;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
  children: TreeNode[];
}

interface GroupSummaryResponse {
  tree: TreeNode[];
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
  const { currency_symbol: sym } = useTenantConfig();
  const y = parseInt(fy);
  return { start: `${y}-04-01`, end: `${y + 1}-03-31` };
}

const DEFAULT_TENANT: TenantConfig = { currency_code: "INR", currency_symbol: sym, country_code: "IN", timezone: "Asia/Kolkata", tax_regime: "GST", tax_rate: 18, date_format: "DD/MM/YYYY", default_locale: "en", country: "India" };
function formatAmount(paise: number, config?: TenantConfig): string {
  if (paise === 0) return "-";
  const formatted = fmtCur(Math.abs(paise) / 100, config ?? DEFAULT_TENANT);
  return paise < 0 ? `(${formatted})` : formatted;
}

function formatDateDisplay(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function collectAllGroupIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.nodeType === 'group') {
      ids.push(node.id);
      ids.push(...collectAllGroupIds(node.children));
    }
  }
  return ids;
}

function filterTreeByType(tree: TreeNode[], accountType: string): TreeNode[] {
  return tree.filter(n => n.accountType === accountType);
}

function hasNonZeroBalance(node: TreeNode): boolean {
  if (node.nodeType === 'ledger') return node.closingBalance !== 0;
  return node.children.some(hasNonZeroBalance);
}

function pruneZeroNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .filter(hasNonZeroBalance)
    .map(n => n.nodeType === 'group' ? { ...n, children: pruneZeroNodes(n.children) } : n);
}

function sumLedgerBalances(nodes: TreeNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.nodeType === 'ledger') {
      total += node.closingBalance;
    } else {
      total += sumLedgerBalances(node.children);
    }
  }
  return total;
}

export default function BalanceSheetPage() {
  const tenantConfig = useTenantConfig();
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  const isCustomValid = dateMode === "custom" && customFrom && customTo && customFrom <= customTo;

  const { fromDate, toDate } = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return { fromDate: customFrom, toDate: customTo };
    }
    const dates = getFYDates(selectedFY);
    return { fromDate: dates.start, toDate: dates.end };
  })();

  const { data: summaryData, isLoading } = useQuery<GroupSummaryResponse>({
    queryKey: [`/api/group-summary?fromDate=${fromDate}&toDate=${toDate}`],
  });

  const { data: invoiceTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });
  const companyName = invoiceTemplate?.defaultSellerName || '';

  const tree = summaryData?.tree || [];

  const assetTree = useMemo(() => pruneZeroNodes(filterTreeByType(tree, 'Assets')), [tree]);
  const liabilityTree = useMemo(() => pruneZeroNodes(filterTreeByType(tree, 'Liabilities')), [tree]);
  const equityTree = useMemo(() => pruneZeroNodes(filterTreeByType(tree, 'Equity')), [tree]);
  const revenueTree = useMemo(() => filterTreeByType(tree, 'Income'), [tree]);
  const expenseTree = useMemo(() => filterTreeByType(tree, 'Expenses'), [tree]);

  const totalAssets = useMemo(() => sumLedgerBalances(assetTree), [assetTree]);
  const totalLiabilities = useMemo(() => sumLedgerBalances(liabilityTree), [liabilityTree]);
  const totalEquity = useMemo(() => sumLedgerBalances(equityTree), [equityTree]);
  const totalRevenue = useMemo(() => sumLedgerBalances(revenueTree), [revenueTree]);
  const totalExpenses = useMemo(() => sumLedgerBalances(expenseTree), [expenseTree]);
  const netProfitLoss = totalRevenue - totalExpenses;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netProfitLoss;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

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

  function toggleNode(id: string) {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const allIds = [
      ...collectAllGroupIds(assetTree),
      ...collectAllGroupIds(liabilityTree),
      ...collectAllGroupIds(equityTree),
    ];
    setExpandedNodes(new Set(allIds));
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  function handleAccountClick(node: TreeNode) {
    if (node.nodeType === 'group') return;
    const params = new URLSearchParams();
    params.set("accountId", node.id);
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

  function handleExcelDownload() {
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const data: (string | number | null)[][] = [
      [`${companyName} - Balance Sheet`],
      [`${currentPeriodLabel} (${periodSubLabel})`],
      [],
      ["Code", "Account Name", "Amount (Rs.)"],
      [],
      ["ASSETS", "", ""],
    ];

    function addTreeRows(nodes: TreeNode[], indent: number) {
      for (const node of nodes) {
        const prefix = "  ".repeat(indent);
        data.push([node.code, `${prefix}${node.name}`, fmtRupees(node.closingBalance)]);
        if (node.nodeType === 'group') {
          addTreeRows(node.children, indent + 1);
        }
      }
    }

    addTreeRows(assetTree, 1);
    data.push(["", "Total Assets", fmtRupees(totalAssets)]);

    data.push([]);
    data.push(["LIABILITIES", "", ""]);
    addTreeRows(liabilityTree, 1);
    data.push(["", "Total Liabilities", fmtRupees(totalLiabilities)]);

    data.push([]);
    data.push(["EQUITY", "", ""]);
    addTreeRows(equityTree, 1);
    data.push(["", `Current Period Net ${netProfitLoss >= 0 ? "Profit" : "Loss"}`, fmtRupees(netProfitLoss)]);
    data.push(["", "Total Equity", fmtRupees(totalEquity + netProfitLoss)]);

    data.push([]);
    data.push(["", "Total Liabilities & Equity", fmtRupees(totalLiabilitiesAndEquity)]);

    exportToExcel({
      filename: `Balance_Sheet_${periodSubLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Balance Sheet", data }],
    });
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
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>{companyName}</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Cleaner Business. Better Future.</div>
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
          <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
            <Expand className="w-4 h-4 mr-1" /> Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
            <Shrink className="w-4 h-4 mr-1" /> Collapse All
          </Button>

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
              {formatAmount(totalAssets, tenantConfig)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Liabilities</div>
            <div className="text-lg font-semibold mt-1 font-mono tabular-nums" data-testid="text-total-liabilities">
              {formatAmount(totalLiabilities, tenantConfig)}
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
              {formatAmount(totalEquity + netProfitLoss, tenantConfig)}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isBalanced && (
        <Card className="border-destructive no-print">
          <CardContent className="p-3 text-sm text-destructive">
            Balance Sheet does not balance. Difference: {formatAmount(Math.abs(totalAssets - totalLiabilitiesAndEquity), tenantConfig)}
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
                <BSTreeRows nodes={assetTree} depth={0} expandedNodes={expandedNodes} toggleNode={toggleNode} onAccountClick={handleAccountClick} />

                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total Assets</td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-assets">
                    {formatAmount(totalAssets, tenantConfig)}
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
                <BSTreeRows nodes={liabilityTree} depth={0} expandedNodes={expandedNodes} toggleNode={toggleNode} onAccountClick={handleAccountClick} />

                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total Liabilities</td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-liabilities">
                    {formatAmount(totalLiabilities, tenantConfig)}
                  </td>
                </tr>

                <tr className="h-1" />

                <tr className="border-b bg-purple-50/50 dark:bg-purple-950/20">
                  <td className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" colSpan={2}>
                    Equity
                  </td>
                </tr>

                <BSTreeRows nodes={equityTree} depth={0} expandedNodes={expandedNodes} toggleNode={toggleNode} onAccountClick={handleAccountClick} />

                <tr className="border-t bg-muted/20">
                  <td className="px-4 py-2 pl-8 italic text-muted-foreground">
                    Current Period Net {netProfitLoss >= 0 ? "Profit" : "Loss"}
                  </td>
                  <td className={`text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap ${netProfitLoss >= 0 ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
                    {formatAmount(Math.abs(netProfitLoss), tenantConfig)}
                  </td>
                </tr>

                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total Equity</td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-equity">
                    {formatAmount(totalEquity + netProfitLoss, tenantConfig)}
                  </td>
                </tr>

                <tr className="h-1" />

                <tr className={`border-t-2 font-bold text-base ${isBalanced ? "bg-green-50/80 dark:bg-green-950/30" : "bg-red-50/80 dark:bg-red-950/30"}`}>
                  <td className="px-4 py-3">Total Liabilities & Equity</td>
                  <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-liabilities-equity">
                    {formatAmount(totalLiabilitiesAndEquity, tenantConfig)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666", marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          Printed on: {printDate} &middot; {companyName} &middot; {isBalanced ? "Balanced" : "Out of Balance"}
        </div>
      </div>
    </div>
  );
}

function BSTreeRows({ nodes, depth, expandedNodes, toggleNode, onAccountClick }: {
  nodes: TreeNode[];
  depth: number;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  onAccountClick: (node: TreeNode) => void;
}) {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  return (
    <>
      {nodes.map(node => {
        const isGroup = node.nodeType === 'group';
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = isGroup && node.children.length > 0;
        const paddingLeft = 16 + depth * 20;

        return (
          <tr key={node.id} data-testid={`row-bs-${node.code}`}>
            <td colSpan={2}>
              <div
                className={`flex items-center justify-between px-4 py-1.5 ${
                  isGroup
                    ? 'font-medium cursor-pointer hover-elevate'
                    : 'cursor-pointer hover-elevate group'
                }`}
                style={{ paddingLeft: `${paddingLeft}px` }}
                onClick={() => isGroup ? (hasChildren && toggleNode(node.id)) : onAccountClick(node)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isGroup ? (
                    <>
                      {hasChildren && (isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs text-muted-foreground font-mono shrink-0">{node.code}</span>
                      <span className="truncate">{node.name}</span>
                      {hasChildren && (
                        <span className="text-xs text-muted-foreground">({node.children.length})</span>
                      )}
                    </>
                  ) : (
                    <>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{node.code}</code>
                      <span className="truncate group-hover:underline underline-offset-2">{node.name}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
                    </>
                  )}
                </div>
                <div className={`font-mono tabular-nums whitespace-nowrap text-right ${isGroup ? 'font-medium' : ''}`}>
                  {formatAmount(node.closingBalance, tenantConfig)}
                </div>
              </div>
              {isGroup && isExpanded && hasChildren && (
                <table className="w-full">
                  <tbody>
                    <BSTreeRows
                      nodes={node.children}
                      depth={depth + 1}
                      expandedNodes={expandedNodes}
                      toggleNode={toggleNode}
                      onAccountClick={onAccountClick}
                    />
                  </tbody>
                </table>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

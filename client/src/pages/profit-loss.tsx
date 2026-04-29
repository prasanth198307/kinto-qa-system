import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Printer, TrendingUp, TrendingDown, ExternalLink, LayoutList, Columns2, Download, ChevronDown, ChevronRight, Expand, Shrink } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";

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

  const tree = summaryData?.tree || [];

  const revenueTree = useMemo(() => pruneZeroNodes(filterTreeByType(tree, 'Income')), [tree]);
  const expenseTree = useMemo(() => pruneZeroNodes(filterTreeByType(tree, 'Expenses')), [tree]);

  const totalRevenue = useMemo(() => sumLedgerBalances(revenueTree), [revenueTree]);
  const totalExpenses = useMemo(() => sumLedgerBalances(expenseTree), [expenseTree]);
  const netProfit = totalRevenue - totalExpenses;
  const isProfit = netProfit >= 0;

  const currentPeriodLabel = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `${formatDateDisplay(customFrom)} to ${formatDateDisplay(customTo)}`;
    }
    const fyStart = parseInt(selectedFY);
    return `Apr ${fyStart} \u2013 Mar ${fyStart + 1}`;
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
      ...collectAllGroupIds(revenueTree),
      ...collectAllGroupIds(expenseTree),
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
    const plReturnParams = dateMode === "custom" && isCustomValid
      ? `mode=custom&fromDate=${customFrom}&toDate=${customTo}`
      : `mode=fy&fy=${selectedFY}`;
    params.set("tbReturn", plReturnParams);
    params.set("returnTo", "profit-loss");
    setLocation(`/journal-entries?${params.toString()}`);
  }

  function handleExcelDownload() {
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const data: (string | number | null)[][] = [
      ["SwachERP - Profit & Loss Statement"],
      [currentPeriodLabel],
      [],
      ["Code", "Account Name", "Amount (Rs.)"],
      [],
      ["REVENUE", "", ""],
    ];

    function addTreeRows(nodes: TreeNode[], indent: number) {
      for (const node of nodes) {
        const prefix = "  ".repeat(indent);
        if (node.nodeType === 'group') {
          data.push([node.code, `${prefix}${node.name}`, fmtRupees(node.closingBalance)]);
          addTreeRows(node.children, indent + 1);
        } else {
          data.push([node.code, `${prefix}${node.name}`, fmtRupees(node.closingBalance)]);
        }
      }
    }

    addTreeRows(revenueTree, 1);
    data.push(["", "Total Revenue", fmtRupees(totalRevenue)]);
    data.push([]);
    data.push(["EXPENSES", "", ""]);
    addTreeRows(expenseTree, 1);
    data.push(["", "Total Expenses", fmtRupees(totalExpenses)]);
    data.push([]);
    data.push(["", `Net ${isProfit ? "Profit" : "Loss"}`, fmtRupees(netProfit)]);

    exportToExcel({
      filename: `Profit_Loss_${currentPeriodLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Profit & Loss", data }],
    });
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
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>SwachERP</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Cleaner Business. Better Future.</div>
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

          <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
            <Expand className="w-4 h-4 mr-1" /> Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
            <Shrink className="w-4 h-4 mr-1" /> Collapse All
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
          revenueTree={revenueTree}
          expenseTree={expenseTree}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          netProfit={netProfit}
          isProfit={isProfit}
          expandedNodes={expandedNodes}
          toggleNode={toggleNode}
          onAccountClick={handleAccountClick}
        />
      ) : (
        <VerticalView
          revenueTree={revenueTree}
          expenseTree={expenseTree}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          netProfit={netProfit}
          isProfit={isProfit}
          expandedNodes={expandedNodes}
          toggleNode={toggleNode}
          onAccountClick={handleAccountClick}
        />
      )}

      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666", marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          Printed on: {printDate} &middot; SwachERP &middot; Net {isProfit ? "Profit" : "Loss"}: {"\u20B9"}{formatAmount(Math.abs(netProfit))}
        </div>
      </div>
    </div>
  );
}

interface ViewProps {
  revenueTree: TreeNode[];
  expenseTree: TreeNode[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  isProfit: boolean;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  onAccountClick: (node: TreeNode) => void;
}

function TreeRows({ nodes, depth, expandedNodes, toggleNode, onAccountClick }: {
  nodes: TreeNode[];
  depth: number;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  onAccountClick: (node: TreeNode) => void;
}) {
  return (
    <>
      {nodes.map(node => {
        const isGroup = node.nodeType === 'group';
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = isGroup && node.children.length > 0;
        const paddingLeft = 16 + depth * 20;

        return (
          <tr key={node.id} data-testid={`row-pl-${node.code}`}>
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
                  {formatAmount(node.closingBalance)}
                </div>
              </div>
              {isGroup && isExpanded && hasChildren && (
                <table className="w-full">
                  <tbody>
                    <TreeRows
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

function VerticalView({ revenueTree, expenseTree, totalRevenue, totalExpenses, netProfit, isProfit, expandedNodes, toggleNode, onAccountClick }: ViewProps) {
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

            <TreeRows nodes={revenueTree} depth={1} expandedNodes={expandedNodes} toggleNode={toggleNode} onAccountClick={onAccountClick} />

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

            <TreeRows nodes={expenseTree} depth={1} expandedNodes={expandedNodes} toggleNode={toggleNode} onAccountClick={onAccountClick} />

            <tr className="border-t-2 bg-muted/30 font-semibold">
              <td className="px-4 py-2.5">Total Expenses</td>
              <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="row-total-expenses">
                {formatAmount(totalExpenses)}
              </td>
            </tr>

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

function TallyView({ revenueTree, expenseTree, totalRevenue, totalExpenses, netProfit, isProfit, expandedNodes, toggleNode, onAccountClick }: ViewProps) {
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
              <TreeRows nodes={revenueTree} depth={0} expandedNodes={expandedNodes} toggleNode={toggleNode} onAccountClick={onAccountClick} />

              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">Total Revenue</td>
                <td className="text-right px-4 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid="tally-total-revenue">
                  {formatAmount(totalRevenue)}
                </td>
              </tr>

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
                <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap">
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
              <TreeRows nodes={expenseTree} depth={0} expandedNodes={expandedNodes} toggleNode={toggleNode} onAccountClick={onAccountClick} />

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
                <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap">
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

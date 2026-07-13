import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Printer, AlertTriangle, CheckCircle2, ExternalLink, Download, ChevronDown, ChevronRight } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";
import { useTenantConfig, formatCurrency as fmtCur, type TenantConfig } from "@/hooks/use-tenant-config";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nodeType?: string;
  level?: number;
  parentId?: string | null;
  subType: string | null;
  subTypeLabel: string | null;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  periodMovement: number;
  currentBalance: number;
}

interface TreeNode {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nodeType: string;
  level: number;
  parentId: string | null;
  currentBalance: number;
  debit: number;
  credit: number;
  children: TreeNode[];
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

const DEFAULT_TENANT: TenantConfig = { currency_code: "INR", currency_symbol: sym, country_code: "IN", timezone: "Asia/Kolkata", tax_regime: "GST", tax_rate: 18, date_format: "DD/MM/YYYY", default_locale: "en", country: "India" };
function formatAmount(paise: number, config?: TenantConfig): string {
  if (paise === 0) return "-";
  return fmtCur(Math.abs(paise) / 100, config ?? DEFAULT_TENANT);
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

function isDebitNormal(type: string) {
  return ["asset", "expense", "Assets", "Expenses"].includes(type);
}

function getDebitCredit(accountType: string, balance: number): { debit: number; credit: number } {
  if (balance === 0) return { debit: 0, credit: 0 };
  if (isDebitNormal(accountType)) {
    return balance >= 0 ? { debit: balance, credit: 0 } : { debit: 0, credit: Math.abs(balance) };
  }
  return balance >= 0 ? { debit: 0, credit: balance } : { debit: Math.abs(balance), credit: 0 };
}

export default function TrialBalancePage() {
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
  const [hideZero, setHideZero] = useState(true);
  const [viewMode, setViewMode] = useState<"flat" | "tree">("tree");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
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

  const { data: invoiceTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });
  const companyName = invoiceTemplate?.defaultSellerName || '';

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

  const { tree, flatRows, totalDebit, totalCredit } = useMemo(() => {
    const ledgerAccounts = accounts.filter(a => (a.nodeType || 'ledger') === 'ledger');
    const allAccounts = accounts;

    const rows = ledgerAccounts
      .filter(a => !hideZero || a.periodDebit !== 0 || a.periodCredit !== 0 || a.currentBalance !== 0)
      .sort((a, b) => a.code.localeCompare(b.code));

    let td = 0;
    let tc = 0;
    rows.forEach(a => {
      const { debit, credit } = getDebitCredit(a.accountType, Number(a.currentBalance) || 0);
      td += debit;
      tc += credit;
    });

    const nodeMap = new Map<string, TreeNode>();
    for (const account of allAccounts) {
      const bal = Number(account.currentBalance) || 0;
      const { debit, credit } = account.nodeType === 'ledger' || !account.nodeType
        ? getDebitCredit(account.accountType, bal)
        : { debit: 0, credit: 0 };

      nodeMap.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        nodeType: account.nodeType || 'ledger',
        level: account.level || 1,
        parentId: account.parentId || null,
        currentBalance: bal,
        debit,
        credit,
        children: [],
      });
    }

    const roots: TreeNode[] = [];
    for (const node of Array.from(nodeMap.values())) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else if (!node.parentId) {
        roots.push(node);
      } else {
        roots.push(node);
      }
    }

    function sortNodes(nodes: TreeNode[]) {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      nodes.forEach(n => sortNodes(n.children));
    }
    sortNodes(roots);

    function aggregateTree(node: TreeNode): void {
      if (node.nodeType === 'group') {
        node.debit = 0;
        node.credit = 0;
        node.currentBalance = 0;
        for (const child of node.children) {
          aggregateTree(child);
          node.debit += child.debit;
          node.credit += child.credit;
          node.currentBalance += child.currentBalance;
        }
      }
    }
    roots.forEach(aggregateTree);

    function filterZeroNodes(nodes: TreeNode[]): TreeNode[] {
      if (!hideZero) return nodes;
      return nodes
        .map(node => {
          if (node.nodeType === 'group') {
            const filteredChildren = filterZeroNodes(node.children);
            if (filteredChildren.length === 0) return null;
            return { ...node, children: filteredChildren };
          }
          if (node.debit === 0 && node.credit === 0 && node.currentBalance === 0) return null;
          return node;
        })
        .filter(Boolean) as TreeNode[];
    }

    return {
      tree: filterZeroNodes(roots),
      flatRows: rows,
      totalDebit: td,
      totalCredit: tc,
    };
  }, [accounts, hideZero]);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;
  const difference = totalDebit - totalCredit;

  function toggleNode(id: string) {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const allGroupIds = new Set<string>();
    function collectIds(nodes: TreeNode[]) {
      for (const n of nodes) {
        if (n.nodeType === 'group' && n.children.length > 0) {
          allGroupIds.add(n.id);
          collectIds(n.children);
        }
      }
    }
    collectIds(tree);
    setExpandedNodes(allGroupIds);
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  function handleAccountClick(account: { id: string; accountType?: string; nodeType?: string }) {
    if (account.nodeType === 'group') return;
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

  function handleExcelDownload() {
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const data: (string | number | null)[][] = [
      [`${companyName} - Trial Balance`],
      [currentPeriodLabel],
      [],
      ["Code", "Account Name", "Debit (Rs.)", "Credit (Rs.)"],
    ];

    const addTreeNode = (node: TreeNode, indent: number) => {
      const prefix = "  ".repeat(indent);
      const typeLabel = node.nodeType === 'group' ? '[G]' : '';
      data.push([
        node.code,
        `${prefix}${node.name} ${typeLabel}`,
        node.debit > 0 ? fmtRupees(node.debit) : 0,
        node.credit > 0 ? fmtRupees(node.credit) : 0,
      ]);
      for (const child of node.children) {
        addTreeNode(child, indent + 1);
      }
    };

    if (viewMode === "tree") {
      for (const root of tree) {
        addTreeNode(root, 0);
      }
    } else {
      for (const account of flatRows) {
        const { debit, credit } = getDebitCredit(account.accountType, Number(account.currentBalance) || 0);
        data.push([
          account.code,
          account.name,
          debit > 0 ? fmtRupees(debit) : 0,
          credit > 0 ? fmtRupees(credit) : 0,
        ]);
      }
    }

    data.push([]);
    data.push(["", "Total", fmtRupees(totalDebit), fmtRupees(totalCredit)]);
    if (!isBalanced) {
      data.push(["", "Difference", fmtRupees(Math.abs(difference)), ""]);
    }

    exportToExcel({
      filename: `Trial_Balance_${currentPeriodLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Trial Balance", data }],
    });
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
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>{companyName}</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Cleaner Business. Better Future.</div>
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
          <div className="flex items-center border rounded-md overflow-visible">
            <Button
              variant={viewMode === "flat" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("flat")}
              className="rounded-r-none no-default-hover-elevate"
              data-testid="button-view-flat"
            >
              Flat
            </Button>
            <Button
              variant={viewMode === "tree" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tree")}
              className="rounded-l-none no-default-hover-elevate"
              data-testid="button-view-tree"
            >
              Tree
            </Button>
          </div>

          {viewMode === "tree" && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
                Collapse All
              </Button>
            </>
          )}

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

          <Button variant="outline" size="sm" onClick={handleExcelDownload} data-testid="button-download-excel">
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
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
              {isBalanced ? "Books are balanced" : `Out of balance by ${formatAmount(Math.abs(difference), tenantConfig)}`}
            </span>
          </div>
          <div className="text-right text-xs text-muted-foreground hidden sm:block">
            Total Debit: {formatAmount(totalDebit, tenantConfig)} &middot; Total Credit: {formatAmount(totalCredit, tenantConfig)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-trial-balance">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  {viewMode === "tree" ? "Group / Account" : "Account"}
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-[150px]">Debit</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-[150px]">Credit</th>
              </tr>
            </thead>
            <tbody>
              {viewMode === "tree" ? (
                tree.map(root => (
                  <TBTreeRow
                    key={root.id}
                    node={root}
                    depth={0}
                    expandedNodes={expandedNodes}
                    onToggle={toggleNode}
                    onAccountClick={handleAccountClick}
                  />
                ))
              ) : (
                flatRows.map(account => {
                  const { debit, credit } = getDebitCredit(account.accountType, Number(account.currentBalance) || 0);
                  return (
                    <tr
                      key={account.id}
                      className="border-b hover-elevate cursor-pointer group"
                      data-testid={`row-tb-${account.code}`}
                      onClick={() => handleAccountClick(account)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{account.code}</code>
                          <span className="underline-offset-2 group-hover:underline flex items-center gap-1">
                            {account.name}
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
                        {debit > 0 ? formatAmount(debit, tenantConfig) : "-"}
                      </td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
                        {credit > 0 ? formatAmount(credit, tenantConfig) : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="total-debit">
                  {formatAmount(totalDebit, tenantConfig)}
                </td>
                <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="total-credit">
                  {formatAmount(totalCredit, tenantConfig)}
                </td>
              </tr>
              {!isBalanced && (
                <tr className="bg-destructive/5">
                  <td className="px-4 py-2 text-destructive text-xs">Difference</td>
                  <td className="text-right px-4 py-2 font-mono tabular-nums text-destructive text-xs whitespace-nowrap" colSpan={2}>
                    {formatAmount(Math.abs(difference), tenantConfig)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="hidden print-only" style={{ display: "none" }}>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666", marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          Printed on: {printDate} &middot; {companyName} &middot; {isBalanced ? "Books Balanced" : `Out of balance by ${formatAmount(Math.abs(difference), tenantConfig)}`}
        </div>
      </div>
    </div>
  );
}

function TBTreeRow({
  node,
  depth,
  expandedNodes,
  onToggle,
  onAccountClick,
}: {
  node: TreeNode;
  depth: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onAccountClick: (node: { id: string; nodeType?: string }) => void;
}) {
  const isGroup = node.nodeType === 'group';
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = isGroup && node.children.length > 0;
  const paddingLeft = 12 + depth * 20;

  const isTopLevel = depth === 0;
  const bgClass = isTopLevel
    ? "bg-muted/20 font-semibold"
    : isGroup
    ? "font-medium"
    : "";

  return (
    <>
      <tr
        className={`border-b ${bgClass} ${hasChildren ? "cursor-pointer" : ""} ${!isGroup ? "cursor-pointer hover-elevate group" : "hover-elevate"}`}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          else if (!isGroup) onAccountClick(node);
        }}
        data-testid={`row-tb-${node.code}`}
      >
        <td className="px-4 py-2" style={{ paddingLeft: `${paddingLeft}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{node.code}</code>
            <span className="truncate underline-offset-2 group-hover:underline">{node.name}</span>
            {isGroup && (
              <span className="text-xs text-muted-foreground shrink-0">({node.children.length})</span>
            )}
            {!isGroup && (
              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
            )}
          </div>
        </td>
        <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
          {node.debit > 0 ? formatAmount(node.debit, tenantConfig) : "-"}
        </td>
        <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">
          {node.credit > 0 ? formatAmount(node.credit, tenantConfig) : "-"}
        </td>
      </tr>

      {isExpanded && node.children.map(child => (
        <TBTreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedNodes={expandedNodes}
          onToggle={onToggle}
          onAccountClick={onAccountClick}
        />
      ))}
    </>
  );
}

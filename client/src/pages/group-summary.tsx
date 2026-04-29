import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
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
  return rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function formatDateDisplay(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function GroupSummaryPage() {
  const [, setLocation] = useLocation();
  const [dateMode, setDateMode] = useState<"fy" | "custom">("fy");
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hideZero, setHideZero] = useState(false);

  const isCustomValid = dateMode === "custom" && customFrom && customTo && customFrom <= customTo;

  const { fromDate, toDate } = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return { fromDate: customFrom, toDate: customTo };
    }
    const dates = getFYDates(selectedFY);
    return { fromDate: dates.start, toDate: dates.end };
  })();

  const { data: invoiceTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });
  const companyName = invoiceTemplate?.defaultSellerName || '';

  const { data, isLoading } = useQuery<GroupSummaryResponse>({
    queryKey: ['/api/group-summary', fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/group-summary?fromDate=${fromDate}&toDate=${toDate}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch group summary");
      return res.json();
    },
  });

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    if (!data) return;
    const allGroupIds = new Set<string>();
    function collectGroupIds(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.nodeType === 'group' && node.children.length > 0) {
          allGroupIds.add(node.id);
          collectGroupIds(node.children);
        }
      }
    }
    collectGroupIds(data.tree);
    setExpandedNodes(allGroupIds);
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  function handleAccountClick(node: TreeNode) {
    if (node.nodeType === 'ledger') {
      const params = new URLSearchParams();
      params.set("accountId", node.id);
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);
      setLocation(`/ledger-view?${params.toString()}`);
    }
  }

  const filteredTree = useMemo(() => {
    if (!data || !hideZero) return data?.tree || [];
    function filterNodes(nodes: TreeNode[]): TreeNode[] {
      return nodes
        .map(node => {
          if (node.nodeType === 'group') {
            const filteredChildren = filterNodes(node.children);
            if (filteredChildren.length === 0) return null;
            return { ...node, children: filteredChildren };
          }
          if (node.closingBalance === 0 && node.periodDebit === 0 && node.periodCredit === 0 && node.openingBalance === 0) {
            return null;
          }
          return node;
        })
        .filter(Boolean) as TreeNode[];
    }
    return filterNodes(data.tree);
  }, [data, hideZero]);

  function handleExcelDownload() {
    if (!data) return;
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const rows: (string | number | null)[][] = [
      [`${companyName} - Group Summary (Hierarchical)`],
      [currentPeriodLabel],
      [],
      ["Code", "Account / Group Name", "Type", "Opening Balance (Rs.)", "Period Debit (Rs.)", "Period Credit (Rs.)", "Closing Balance (Rs.)"],
    ];

    function addNodeToExcel(node: TreeNode, indent: number) {
      const prefix = "  ".repeat(indent);
      const typeLabel = node.nodeType === 'group' ? '[G]' : '';
      rows.push([
        node.code,
        `${prefix}${node.name} ${typeLabel}`,
        node.accountType,
        fmtRupees(node.openingBalance),
        fmtRupees(node.periodDebit),
        fmtRupees(node.periodCredit),
        fmtRupees(node.closingBalance),
      ]);
      for (const child of node.children) {
        addNodeToExcel(child, indent + 1);
      }
    }

    for (const root of filteredTree) {
      addNodeToExcel(root, 0);
      rows.push([]);
    }

    exportToExcel({
      filename: `Group_Summary_${currentPeriodLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Group Summary", data: rows }],
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-group-summary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto" data-testid="page-group-summary">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Group Summary</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-period-label">{currentPeriodLabel}</p>
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

          <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
            Collapse All
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
                onChange={e => setCustomFrom(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-from"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-to"
              />
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleExcelDownload} disabled={!data} data-testid="button-download-excel">
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-group-summary">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Group / Account</th>
                  <th className="text-right p-3 font-medium w-[120px]">Opening</th>
                  <th className="text-right p-3 font-medium w-[120px]">Debit</th>
                  <th className="text-right p-3 font-medium w-[120px]">Credit</th>
                  <th className="text-right p-3 font-medium w-[120px]">Closing</th>
                </tr>
              </thead>
              <tbody>
                {filteredTree.map(root => (
                  <TreeRow
                    key={root.id}
                    node={root}
                    depth={0}
                    expandedNodes={expandedNodes}
                    onToggle={toggleNode}
                    onAccountClick={handleAccountClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TreeRow({
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
  onAccountClick: (node: TreeNode) => void;
}) {
  const isGroup = node.nodeType === 'group';
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = isGroup && node.children.length > 0;
  const paddingLeft = 12 + depth * 20;

  const isTopLevel = depth === 0;
  const bgClass = isTopLevel
    ? "bg-muted/30 font-semibold"
    : isGroup
    ? "bg-muted/10 font-medium"
    : "";

  const textSize = isTopLevel ? "text-base" : depth === 1 ? "text-sm" : "text-sm";

  return (
    <>
      <tr
        className={`border-b ${bgClass} ${hasChildren ? "cursor-pointer" : ""} ${!isGroup ? "cursor-pointer hover-elevate group" : "hover-elevate"}`}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          else if (!isGroup) onAccountClick(node);
        }}
        data-testid={`row-${node.nodeType}-${node.code}`}
      >
        <td className={`p-2.5 ${textSize}`} style={{ paddingLeft: `${paddingLeft}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono shrink-0">{node.code}</code>
            <span className="truncate">{node.name}</span>
            {isGroup && (
              <span className="text-xs text-muted-foreground shrink-0">({node.children.length})</span>
            )}
            {!isGroup && (
              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
            )}
          </div>
        </td>
        <td className="text-right p-2.5 font-mono tabular-nums whitespace-nowrap">
          {formatAmount(node.openingBalance)}
        </td>
        <td className="text-right p-2.5 font-mono tabular-nums whitespace-nowrap">
          {formatAmount(node.periodDebit)}
        </td>
        <td className="text-right p-2.5 font-mono tabular-nums whitespace-nowrap">
          {formatAmount(node.periodCredit)}
        </td>
        <td className="text-right p-2.5 font-mono tabular-nums whitespace-nowrap">
          {formatAmount(node.closingBalance)}
        </td>
      </tr>

      {isExpanded && node.children.map(child => (
        <TreeRow
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

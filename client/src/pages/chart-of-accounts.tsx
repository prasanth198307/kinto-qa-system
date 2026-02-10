import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ChevronDown, ChevronRight, Edit, Trash2, Lock, Calendar, Download, FolderOpen, Folder, BookOpen } from "lucide-react";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nodeType: string;
  level: number;
  parentId: string | null;
  description: string | null;
  isActive: number;
  isSystemAccount: number;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  periodMovement: number;
  currentBalance: number;
}

interface TreeNode extends ChartAccount {
  children: TreeNode[];
  isExpanded: boolean;
}

const ACCOUNT_TYPES_FALLBACK = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return String(year);
}

function getFYLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function getAvailableFYs(): string[] {
  const currentFYStart = parseInt(getCurrentFY());
  const years: string[] = [];
  for (let y = currentFYStart; y >= currentFYStart - 3; y--) {
    years.push(String(y));
  }
  return years;
}

function formatAmount(paise: number | null | undefined): string {
  const val = Number(paise) || 0;
  if (val === 0) return "-";
  const abs = Math.abs(val);
  const formatted = (abs / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return val < 0 ? `(${formatted})` : formatted;
}

function formatAmountCompact(paise: number | null | undefined): string {
  const val = Number(paise) || 0;
  if (val === 0) return "-";
  const rupees = Math.abs(val) / 100;
  let formatted: string;
  if (rupees >= 10000000) {
    formatted = (rupees / 10000000).toFixed(2) + " Cr";
  } else if (rupees >= 100000) {
    formatted = (rupees / 100000).toFixed(2) + " L";
  } else {
    formatted = rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  }
  return val < 0 ? `(${formatted})` : formatted;
}

function isBalanceSheet(type: string): boolean {
  return ['asset', 'liability', 'equity'].includes(type);
}

function buildTree(accounts: ChartAccount[], expandedIds: Set<string>): TreeNode[] {
  const accountMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const a of accounts) {
    accountMap.set(a.id, { ...a, children: [], isExpanded: expandedIds.has(a.id) });
  }

  for (const node of accountMap.values()) {
    if (node.parentId && accountMap.has(node.parentId)) {
      accountMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

function computeGroupTotals(node: TreeNode): { opening: number; debit: number; credit: number; closing: number } {
  if (node.nodeType === 'ledger') {
    return {
      opening: Number(node.openingBalance) || 0,
      debit: Number(node.periodDebit) || 0,
      credit: Number(node.periodCredit) || 0,
      closing: Number(node.currentBalance) || 0,
    };
  }
  let opening = 0, debit = 0, credit = 0, closing = 0;
  for (const child of node.children) {
    const ct = computeGroupTotals(child);
    opening += ct.opening;
    debit += ct.debit;
    credit += ct.credit;
    closing += ct.closing;
  }
  return { opening, debit, credit, closing };
}

function flattenVisible(nodes: TreeNode[], expandedIds: Set<string>, depth: number = 0): { node: TreeNode; depth: number }[] {
  const result: { node: TreeNode; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.nodeType === 'group' && expandedIds.has(node.id)) {
      result.push(...flattenVisible(node.children, expandedIds, depth + 1));
    }
  }
  return result;
}

export default function ChartOfAccountsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<ChartAccount | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    accountType: "",
    nodeType: "ledger",
    parentId: "",
    description: "",
  });

  const { data: accounts = [], isLoading } = useQuery<ChartAccount[]>({
    queryKey: [`/api/chart-of-accounts?fy=${selectedFY}`],
  });

  interface AccountTypeEntry { id: string; name: string; label: string; isSystem: number; }
  const { data: accountTypesRaw = [] } = useQuery<AccountTypeEntry[]>({
    queryKey: ['/api/account-types'],
  });
  const ACCOUNT_TYPES = accountTypesRaw.length > 0
    ? accountTypesRaw.map(t => ({ value: t.name, label: t.label }))
    : ACCOUNT_TYPES_FALLBACK;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/chart-of-accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('/api/chart-of-accounts') });
      toast({ title: "Account created successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/chart-of-accounts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('/api/chart-of-accounts') });
      toast({ title: "Account updated successfully" });
      setDialogOpen(false);
      setEditAccount(null);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/chart-of-accounts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('/api/chart-of-accounts') });
      toast({ title: "Account deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData({ code: "", name: "", accountType: "", nodeType: "ledger", parentId: "", description: "" });
  }

  function openEditDialog(account: ChartAccount) {
    setEditAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      nodeType: account.nodeType || 'ledger',
      parentId: account.parentId || "",
      description: account.description || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const data: any = {
      ...formData,
      parentId: formData.parentId || null,
    };
    if (editAccount) {
      updateMutation.mutate({ id: editAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const groupIds = accounts.filter(a => (a.nodeType || 'ledger') === 'group').map(a => a.id);
    setExpandedIds(new Set(groupIds));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  async function downloadExcel() {
    const XLSX = await import('xlsx');
    const typeLabel = (t: string) => ACCOUNT_TYPES.find(at => at.value === t)?.label || t;
    const rows = accounts
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      .map(a => ({
        'Account Code': a.code,
        'Account Name': a.name,
        'Type': typeLabel(a.accountType),
        'Node Type': (a.nodeType || 'ledger') === 'group' ? 'Group' : 'Ledger',
        'Level': a.level || 1,
        'Opening Balance': (Number(a.openingBalance) || 0) / 100,
        'Period Debit': (Number(a.periodDebit) || 0) / 100,
        'Period Credit': (Number(a.periodCredit) || 0) / 100,
        'Current Balance': (Number(a.currentBalance) || 0) / 100,
      }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 6 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    XLSX.writeFile(wb, `Chart_of_Accounts_FY_${selectedFY}-${String(parseInt(selectedFY) + 1).slice(2)}.xlsx`);
    toast({ title: "Downloaded", description: "Chart of Accounts exported as Excel (.xlsx)" });
  }

  const filteredAccounts = useMemo(() => {
    let result = accounts.map(a => ({ ...a, nodeType: a.nodeType || 'ledger', level: a.level || 1 }));

    if (filterType !== "all") {
      result = result.filter(a => a.accountType === filterType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchingIds = new Set<string>();
      result.forEach(a => {
        if (a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) {
          matchingIds.add(a.id);
          let parentId = a.parentId;
          while (parentId) {
            matchingIds.add(parentId);
            const parent = result.find(x => x.id === parentId);
            parentId = parent?.parentId || null;
          }
        }
      });
      result = result.filter(a => matchingIds.has(a.id));
    }

    return result;
  }, [accounts, filterType, searchQuery]);

  const tree = useMemo(() => buildTree(filteredAccounts, expandedIds), [filteredAccounts, expandedIds]);
  const visibleRows = useMemo(() => flattenVisible(tree, expandedIds), [tree, expandedIds]);

  const groupAccounts = useMemo(() =>
    accounts.filter(a => (a.nodeType || 'ledger') === 'group').sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [accounts]
  );

  const typeTotals = useMemo(() => {
    return ACCOUNT_TYPES.map(type => {
      const accts = accounts.filter(a => a.accountType === type.value && (a.nodeType || 'ledger') === 'ledger');
      return {
        ...type,
        count: accts.length,
        groupCount: accounts.filter(a => a.accountType === type.value && (a.nodeType || 'ledger') === 'group').length,
        totalBalance: accts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0),
      };
    });
  }, [accounts, ACCOUNT_TYPES]);

  const fyStartYear = parseInt(selectedFY);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-coa">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="page-chart-of-accounts">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            {accounts.filter(a => (a.nodeType || 'ledger') === 'ledger').length} ledgers,{" "}
            {accounts.filter(a => (a.nodeType || 'ledger') === 'group').length} groups
            &middot; Apr {fyStartYear} &ndash; Mar {fyStartYear + 1}
          </p>
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
          <Button variant="outline" onClick={downloadExcel} data-testid="button-download-coa">
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditAccount(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-account">
                <Plus className="w-4 h-4 mr-1" /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editAccount ? "Edit Account" : "Add New Account"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Account Code</Label>
                    <Input
                      data-testid="input-account-code"
                      value={formData.code}
                      onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                      placeholder="e.g. 1004"
                      disabled={!!editAccount?.isSystemAccount}
                    />
                  </div>
                  <div>
                    <Label>Node Type</Label>
                    <Select
                      value={formData.nodeType}
                      onValueChange={v => setFormData(p => ({ ...p, nodeType: v }))}
                    >
                      <SelectTrigger data-testid="select-node-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">Group (non-postable)</SelectItem>
                        <SelectItem value="ledger">Ledger (postable)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Parent Group</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={v => {
                      const parent = groupAccounts.find(g => g.id === v);
                      setFormData(p => ({
                        ...p,
                        parentId: v,
                        accountType: parent ? parent.accountType : p.accountType,
                      }));
                    }}
                  >
                    <SelectTrigger data-testid="select-parent-account">
                      <SelectValue placeholder="Select parent group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupAccounts
                        .filter(g => !editAccount || g.id !== editAccount.id)
                        .map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {"  ".repeat((g.level || 1) - 1)}{g.code} - {g.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.parentId && formData.parentId !== "none" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: {ACCOUNT_TYPES.find(t => t.value === formData.accountType)?.label || formData.accountType} (inherited from parent)
                    </p>
                  )}
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input
                    data-testid="input-account-name"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Account name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    data-testid="input-description"
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditAccount(null); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  data-testid="button-save-account"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending || !formData.code || !formData.name || (!formData.parentId || formData.parentId === "none")}
                >
                  {editAccount ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACCOUNT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
          Collapse All
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {typeTotals.map(t => (
          <Card key={t.value} className="cursor-pointer hover-elevate" onClick={() => setFilterType(filterType === t.value ? "all" : t.value)}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{t.label}</div>
              <div className="text-sm font-semibold mt-0.5">{t.count} ledgers</div>
              <div className="text-xs text-muted-foreground">{t.groupCount} groups</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
                {t.totalBalance !== 0 ? `\u20B9${formatAmountCompact(t.totalBalance)}` : "-"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-coa-tree">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Account</th>
                <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[70px]">Type</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[120px]">Debit</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[120px]">Credit</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Closing</th>
                <th className="w-[60px] px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map(({ node, depth }) => {
                const isGroup = node.nodeType === 'group';
                const isExpanded = expandedIds.has(node.id);
                const isBs = isBalanceSheet(node.accountType);
                const totals = isGroup ? computeGroupTotals(node) : null;

                return (
                  <tr
                    key={node.id}
                    className={`hover-elevate ${isGroup ? 'bg-muted/20 font-medium' : ''}`}
                    data-testid={`row-account-${node.code}`}
                  >
                    <td className="px-4 py-2">
                      <div
                        className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                        style={{ paddingLeft: `${depth * 20}px` }}
                        onClick={() => isGroup && toggleExpand(node.id)}
                      >
                        {isGroup ? (
                          <button
                            className="flex-shrink-0 p-0.5 rounded hover-elevate"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                            data-testid={`toggle-${node.code}`}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="w-5 flex-shrink-0" />
                        )}
                        {isGroup ? (
                          isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" /> : <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono shrink-0">{node.code}</code>
                        <span className={`truncate ${isGroup ? 'text-sm' : 'text-sm'}`}>{node.name}</span>
                        {node.isSystemAccount === 1 && (
                          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="text-center px-2 py-2">
                      <Badge variant={isGroup ? "outline" : "secondary"} className="text-[10px] px-1.5">
                        {isGroup ? "GRP" : "LDG"}
                      </Badge>
                    </td>
                    <td className="text-right px-3 py-2 font-mono tabular-nums whitespace-nowrap" data-testid={`debit-${node.code}`}>
                      {isGroup ? formatAmount(totals?.debit) : formatAmount(node.periodDebit)}
                    </td>
                    <td className="text-right px-3 py-2 font-mono tabular-nums whitespace-nowrap" data-testid={`credit-${node.code}`}>
                      {isGroup ? formatAmount(totals?.credit) : formatAmount(node.periodCredit)}
                    </td>
                    <td className="text-right px-3 py-2 font-mono tabular-nums font-medium whitespace-nowrap" data-testid={`closing-${node.code}`}>
                      {isGroup ? formatAmount(totals?.closing) : formatAmount(node.currentBalance)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-0.5 justify-end" style={{ visibility: 'visible' }}>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(node); }}
                          data-testid={`button-edit-${node.code}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        {node.isSystemAccount !== 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this account?")) deleteMutation.mutate(node.id);
                            }}
                            data-testid={`button-delete-${node.code}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No accounts match your search" : "No accounts found. Click 'Add Account' to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

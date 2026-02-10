import { useState } from "react";
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
import { Plus, Search, ChevronDown, ChevronRight, Edit, Trash2, Lock, Calendar, Download } from "lucide-react";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  subType: string | null;
  subTypeId: string | null;
  subTypeLabel: string | null;
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

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

interface AccountSubtype {
  id: string;
  accountType: string;
  name: string;
  label: string;
  isSystem: number;
}

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return String(year);
}

function getFYLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function getFYShortLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `${y}-${String(y + 1).slice(2)}`;
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

export default function ChartOfAccountsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["asset", "liability", "equity", "revenue", "expense"]));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<ChartAccount | null>(null);
  const [addingNewSubtype, setAddingNewSubtype] = useState(false);
  const [newSubtypeName, setNewSubtypeName] = useState("");
  const [newSubtypeLabel, setNewSubtypeLabel] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    accountType: "",
    subType: "",
    description: "",
    openingBalance: "0",
  });

  const { data: accounts = [], isLoading } = useQuery<ChartAccount[]>({
    queryKey: [`/api/chart-of-accounts?fy=${selectedFY}`],
  });

  const { data: subtypes = [] } = useQuery<AccountSubtype[]>({
    queryKey: ['/api/account-subtypes'],
  });

  const filteredSubtypes = subtypes.filter(st => st.accountType === formData.accountType);

  const createSubtypeMutation = useMutation({
    mutationFn: async (data: { accountType: string; name: string; label: string }) => {
      const res = await apiRequest("POST", "/api/account-subtypes", data);
      return res.json();
    },
    onSuccess: (created: AccountSubtype) => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-subtypes'] });
      setFormData(p => ({ ...p, subType: created.id }));
      setAddingNewSubtype(false);
      setNewSubtypeName("");
      setNewSubtypeLabel("");
      toast({ title: "Sub-type created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteSubtypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/account-subtypes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-subtypes'] });
      toast({ title: "Sub-type deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
    setFormData({ code: "", name: "", accountType: "", subType: "", description: "", openingBalance: "0" });
    setAddingNewSubtype(false);
    setNewSubtypeName("");
    setNewSubtypeLabel("");
  }

  function openEditDialog(account: ChartAccount) {
    setEditAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      subType: account.subTypeId || "",
      description: account.description || "",
      openingBalance: String((Number(account.openingBalance) || 0) / 100),
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const data = {
      ...formData,
      openingBalance: Math.round(parseFloat(formData.openingBalance || "0") * 100),
    };
    if (editAccount) {
      updateMutation.mutate({ id: editAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function toggleType(type: string) {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function downloadExcel() {
    const XLSX = await import('xlsx');
    const typeLabel = (t: string) => ACCOUNT_TYPES.find(at => at.value === t)?.label || t;
    const rows = accounts
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => ({
        'Account Code': a.code,
        'Account Name': a.name,
        'Type': typeLabel(a.accountType),
        'Sub Type': a.subType || '',
        'Opening Balance': (Number(a.openingBalance) || 0) / 100,
        'Period Debit': (Number(a.periodDebit) || 0) / 100,
        'Period Credit': (Number(a.periodCredit) || 0) / 100,
        'Current Balance': (Number(a.currentBalance) || 0) / 100,
      }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 40 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    XLSX.writeFile(wb, `Chart_of_Accounts_FY_${selectedFY}-${String(parseInt(selectedFY) + 1).slice(2)}.xlsx`);
    toast({ title: "Downloaded", description: "Chart of Accounts exported as Excel (.xlsx)" });
  }

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = !searchQuery ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || a.accountType === filterType;
    return matchesSearch && matchesType;
  });

  const groupedAccounts = ACCOUNT_TYPES.reduce((groups, type) => {
    groups[type.value] = filteredAccounts
      .filter(a => a.accountType === type.value)
      .sort((a, b) => a.code.localeCompare(b.code));
    return groups;
  }, {} as Record<string, ChartAccount[]>);

  const typeTotals = ACCOUNT_TYPES.map(type => ({
    ...type,
    count: groupedAccounts[type.value]?.length || 0,
    totalBalance: (groupedAccounts[type.value] || []).reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-coa">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const fyStartYear = parseInt(selectedFY);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="page-chart-of-accounts">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">{accounts.length} accounts &middot; Apr {fyStartYear} &ndash; Mar {fyStartYear + 1}</p>
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
            <Download className="w-4 h-4 mr-1" /> Download Excel
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
                    <Label>Account Type</Label>
                    <Select
                      value={formData.accountType}
                      onValueChange={v => { setFormData(p => ({ ...p, accountType: v, subType: "" })); setAddingNewSubtype(false); }}
                    >
                      <SelectTrigger data-testid="select-account-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                {formData.accountType && (
                  <div>
                    <Label>Sub-Type</Label>
                    {!addingNewSubtype ? (
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Select
                            value={formData.subType}
                            onValueChange={v => {
                              if (v === "__add_new__") {
                                setAddingNewSubtype(true);
                              } else {
                                setFormData(p => ({ ...p, subType: v }));
                              }
                            }}
                          >
                            <SelectTrigger data-testid="select-sub-type">
                              <SelectValue placeholder="Select sub-type" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredSubtypes.map(st => (
                                <SelectItem key={st.id} value={st.id}>{st.label}</SelectItem>
                              ))}
                              <SelectItem value="__add_new__">+ Add New Sub-Type</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.subType && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormData(p => ({ ...p, subType: "" }))}
                            data-testid="button-clear-subtype"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 border rounded-md p-3">
                        <p className="text-xs font-medium">Create New Sub-Type</p>
                        <Input
                          data-testid="input-new-subtype-name"
                          value={newSubtypeName}
                          onChange={e => {
                            const val = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                            setNewSubtypeName(val);
                            if (!newSubtypeLabel || newSubtypeLabel === newSubtypeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) {
                              setNewSubtypeLabel(val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                            }
                          }}
                          placeholder="name_in_snake_case"
                        />
                        <Input
                          data-testid="input-new-subtype-label"
                          value={newSubtypeLabel}
                          onChange={e => setNewSubtypeLabel(e.target.value)}
                          placeholder="Display Label"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (newSubtypeName && newSubtypeLabel) {
                                createSubtypeMutation.mutate({
                                  accountType: formData.accountType,
                                  name: newSubtypeName,
                                  label: newSubtypeLabel,
                                });
                              }
                            }}
                            disabled={!newSubtypeName || !newSubtypeLabel || createSubtypeMutation.isPending}
                            data-testid="button-save-new-subtype"
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddingNewSubtype(false);
                              setNewSubtypeName("");
                              setNewSubtypeLabel("");
                            }}
                            data-testid="button-cancel-new-subtype"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  disabled={createMutation.isPending || updateMutation.isPending || !formData.code || !formData.name || !formData.accountType}
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {typeTotals.map(t => (
          <Card key={t.value} className="cursor-pointer hover-elevate" onClick={() => setFilterType(filterType === t.value ? "all" : t.value)}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{t.label}</div>
              <div className="text-sm font-semibold mt-0.5">{t.count} accounts</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
                {t.totalBalance !== 0 ? `\u20B9${formatAmountCompact(t.totalBalance)}` : "-"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {ACCOUNT_TYPES.filter(type => filterType === "all" || filterType === type.value).map(type => {
          const group = groupedAccounts[type.value] || [];
          if (group.length === 0) return null;
          const isExpanded = expandedTypes.has(type.value);
          const isBs = isBalanceSheet(type.value);
          const groupTotal = group.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

          return (
            <Card key={type.value}>
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover-elevate"
                onClick={() => toggleType(type.value)}
                data-testid={`toggle-type-${type.value}`}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-medium">{type.label}</span>
                  <Badge variant="secondary">{group.length}</Badge>
                </div>
                <span className="text-sm font-mono tabular-nums font-medium">{formatAmount(groupTotal)}</span>
              </div>
              {isExpanded && (
                <CardContent className="p-0 border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid={`table-${type.value}`}>
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Account</th>
                          {isBs && (
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Opening</th>
                          )}
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Debit</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Credit</th>
                          {!isBs && (
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Net Movement</th>
                          )}
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Closing</th>
                          <th className="w-[60px] px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {group.map(account => (
                          <tr
                            key={account.id}
                            className="hover-elevate"
                            data-testid={`row-account-${account.code}`}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{account.code}</code>
                                <span className="truncate">{account.name}</span>
                                {account.isSystemAccount === 1 && (
                                  <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                                )}
                                {account.subType && (
                                  <span className="text-xs text-muted-foreground hidden lg:inline shrink-0">
                                    {account.subTypeLabel || account.subType.replace(/_/g, " ")}
                                  </span>
                                )}
                              </div>
                            </td>
                            {isBs && (
                              <td className="text-right px-3 py-2.5 font-mono tabular-nums text-muted-foreground whitespace-nowrap" data-testid={`opening-${account.code}`}>
                                {formatAmount(account.openingBalance)}
                              </td>
                            )}
                            <td className="text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid={`debit-${account.code}`}>
                              {formatAmount(account.periodDebit)}
                            </td>
                            <td className="text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid={`credit-${account.code}`}>
                              {formatAmount(account.periodCredit)}
                            </td>
                            {!isBs && (
                              <td className="text-right px-3 py-2.5 font-mono tabular-nums whitespace-nowrap" data-testid={`movement-${account.code}`}>
                                {formatAmount(account.periodMovement)}
                              </td>
                            )}
                            <td className="text-right px-3 py-2.5 font-mono tabular-nums font-medium whitespace-nowrap" data-testid={`closing-${account.code}`}>
                              {formatAmount(account.currentBalance)}
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex items-center gap-0.5 justify-end">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); openEditDialog(account); }}
                                  data-testid={`button-edit-${account.code}`}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                {account.isSystemAccount !== 1 && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm("Delete this account?")) deleteMutation.mutate(account.id);
                                    }}
                                    data-testid={`button-delete-${account.code}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

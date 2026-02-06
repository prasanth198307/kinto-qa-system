import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, BookOpen, ChevronDown, ChevronRight, Edit, Trash2, Lock } from "lucide-react";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  subType: string | null;
  parentId: string | null;
  description: string | null;
  isActive: number;
  isSystemAccount: number;
  openingBalance: number;
  currentBalance: number;
}

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

const SUB_TYPES: Record<string, { value: string; label: string }[]> = {
  asset: [
    { value: "current_asset", label: "Current Asset" },
    { value: "fixed_asset", label: "Fixed Asset" },
    { value: "trade_receivable", label: "Trade Receivable" },
    { value: "inventory", label: "Inventory" },
    { value: "bank", label: "Bank" },
    { value: "cash", label: "Cash" },
  ],
  liability: [
    { value: "current_liability", label: "Current Liability" },
    { value: "long_term_liability", label: "Long Term Liability" },
    { value: "trade_payable", label: "Trade Payable" },
    { value: "tax_payable", label: "Tax Payable" },
    { value: "advance_received", label: "Advance Received" },
  ],
  equity: [
    { value: "capital", label: "Capital" },
    { value: "reserves", label: "Reserves" },
    { value: "drawings", label: "Drawings" },
  ],
  revenue: [
    { value: "direct_income", label: "Direct Income" },
    { value: "indirect_income", label: "Indirect Income" },
  ],
  expense: [
    { value: "direct_expense", label: "Direct Expense" },
    { value: "indirect_expense", label: "Indirect Expense" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "administrative", label: "Administrative" },
  ],
};

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  liability: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  equity: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  revenue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function formatAmount(paise: number | null | undefined): string {
  const val = Number(paise) || 0;
  return `₹${(val / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function ChartOfAccountsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["asset", "liability", "equity", "revenue", "expense"]));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<ChartAccount | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    accountType: "",
    subType: "",
    description: "",
    openingBalance: "0",
  });

  const { data: accounts = [], isLoading } = useQuery<ChartAccount[]>({
    queryKey: ["/api/chart-of-accounts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/chart-of-accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chart-of-accounts"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/chart-of-accounts"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/chart-of-accounts"] });
      toast({ title: "Account deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData({ code: "", name: "", accountType: "", subType: "", description: "", openingBalance: "0" });
  }

  function openEditDialog(account: ChartAccount) {
    setEditAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      subType: account.subType || "",
      description: account.description || "",
      openingBalance: String(account.openingBalance / 100),
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

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="page-chart-of-accounts">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">{accounts.length} accounts configured</p>
        </div>
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
                    onValueChange={v => setFormData(p => ({ ...p, accountType: v, subType: "" }))}
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
              {formData.accountType && SUB_TYPES[formData.accountType]?.length > 0 && (
                <div>
                  <Label>Sub-Type</Label>
                  <Select value={formData.subType} onValueChange={v => setFormData(p => ({ ...p, subType: v }))}>
                    <SelectTrigger data-testid="select-sub-type">
                      <SelectValue placeholder="Select sub-type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_TYPES[formData.accountType].map(st => (
                        <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Opening Balance (₹)</Label>
                <Input
                  data-testid="input-opening-balance"
                  type="number"
                  value={formData.openingBalance}
                  onChange={e => setFormData(p => ({ ...p, openingBalance: e.target.value }))}
                  step="0.01"
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
                disabled={createMutation.isPending || updateMutation.isPending || !formData.code || !formData.name || !formData.accountType}
              >
                {editAccount ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              <div className="text-xs text-muted-foreground uppercase">{t.label}</div>
              <div className="text-lg font-semibold">{t.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {ACCOUNT_TYPES.filter(type => filterType === "all" || filterType === type.value).map(type => {
          const group = groupedAccounts[type.value] || [];
          if (group.length === 0) return null;
          const isExpanded = expandedTypes.has(type.value);

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
                  <Badge variant="secondary" className={TYPE_COLORS[type.value]}>{group.length}</Badge>
                </div>
              </div>
              {isExpanded && (
                <CardContent className="p-0 border-t">
                  <div className="divide-y">
                    {group.map(account => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between px-4 py-2 hover-elevate"
                        data-testid={`row-account-${account.code}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{account.code}</code>
                          <span className="text-sm truncate">{account.name}</span>
                          {account.isSystemAccount === 1 && (
                            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          {account.subType && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {account.subType.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-mono tabular-nums">
                            {formatAmount(account.currentBalance)}
                          </span>
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
                      </div>
                    ))}
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

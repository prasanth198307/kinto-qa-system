import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportToExcel } from "@/lib/excel-export";
import { Plus, Pencil, Trash2, Download, ChevronDown, ChevronRight, Scale } from "lucide-react";

interface BudgetRecord {
  id: string;
  name: string;
  financialYear: string;
  periodType: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface BudgetItem {
  id?: string;
  budgetId?: string;
  accountId: string;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  jan: number;
  feb: number;
  mar: number;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface VarianceItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  subType: string | null;
  subTypeLabel: string | null;
  monthly: { month: string; budgeted: number; actual: number; variance: number }[];
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  variancePercent: number;
}

interface VarianceResponse {
  budget: BudgetRecord;
  items: VarianceItem[];
  summary: { totalBudgeted: number; totalActual: number; totalVariance: number };
}

const MONTHS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];
const MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

function getCurrentFY(): string {
  const now = new Date();
  return String(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
}

function getAvailableFYs(): string[] {
  const current = parseInt(getCurrentFY());
  return Array.from({ length: 5 }, (_, i) => String(current - i));
}

function getFYLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function formatAmount(paise: number): string {
  if (paise === 0) return "-";
  const rupees = Math.abs(paise) / 100;
  return (paise < 0 ? "-" : "") + rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function isFavorable(variance: number, accountType: string): boolean {
  if (['expense', 'asset'].includes(accountType)) {
    return variance <= 0;
  }
  return variance >= 0;
}

export default function BudgetVariancePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("budgets");
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formFY, setFormFY] = useState(getCurrentFY());
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<BudgetItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [varianceBudgetId, setVarianceBudgetId] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: budgetsList = [], isLoading: budgetsLoading } = useQuery<BudgetRecord[]>({
    queryKey: ['/api/budgets'],
    queryFn: async () => {
      const res = await fetch('/api/budgets', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch budgets');
      return res.json();
    },
  });

  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ['/api/chart-of-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/chart-of-accounts', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch accounts');
      return res.json();
    },
  });

  const { data: varianceData, isLoading: varianceLoading } = useQuery<VarianceResponse>({
    queryKey: ['/api/budget-variance', varianceBudgetId],
    queryFn: async () => {
      const res = await fetch(`/api/budget-variance?budgetId=${varianceBudgetId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch variance');
      return res.json();
    },
    enabled: !!varianceBudgetId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/budgets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({ title: "Budget created successfully" });
      closeForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest('PUT', `/api/budgets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({ title: "Budget updated successfully" });
      closeForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({ title: "Budget deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function closeForm() {
    setShowForm(false);
    setEditingBudget(null);
    setFormName("");
    setFormFY(getCurrentFY());
    setFormNotes("");
    setFormItems([]);
    setSelectedAccountId("");
  }

  function openCreateForm() {
    closeForm();
    setShowForm(true);
  }

  async function openEditForm(budget: BudgetRecord) {
    try {
      const res = await fetch(`/api/budgets/${budget.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch budget details');
      const data = await res.json();
      setEditingBudget(budget);
      setFormName(data.name);
      setFormFY(data.financialYear);
      setFormNotes(data.notes || "");
      setFormItems(data.items || []);
      setShowForm(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function addAccount() {
    if (!selectedAccountId) return;
    if (formItems.some(i => i.accountId === selectedAccountId)) {
      toast({ title: "Account already added", variant: "destructive" });
      return;
    }
    const acct = accounts.find(a => a.id === selectedAccountId);
    if (!acct) return;
    setFormItems(prev => [...prev, {
      accountId: acct.id,
      accountCode: acct.code,
      accountName: acct.name,
      accountType: acct.accountType,
      apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0,
      oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0,
    }]);
    setSelectedAccountId("");
  }

  function removeItem(accountId: string) {
    setFormItems(prev => prev.filter(i => i.accountId !== accountId));
  }

  function updateItemMonth(accountId: string, month: string, valueRupees: string) {
    const rupees = parseFloat(valueRupees) || 0;
    const paise = Math.round(rupees * 100);
    setFormItems(prev => prev.map(i =>
      i.accountId === accountId ? { ...i, [month]: paise } : i
    ));
  }

  function handleSave() {
    if (!formName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: formName.trim(),
      financialYear: formFY,
      notes: formNotes.trim() || null,
      items: formItems.map(i => ({
        accountId: i.accountId,
        apr: i.apr, may: i.may, jun: i.jun, jul: i.jul,
        aug: i.aug, sep: i.sep, oct: i.oct, nov: i.nov,
        dec: i.dec, jan: i.jan, feb: i.feb, mar: i.mar,
      })),
    };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExportVariance() {
    if (!varianceData) return;
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const data: (string | number | null)[][] = [
      ["Budget Variance Report"],
      [`Budget: ${varianceData.budget.name} | ${getFYLabel(varianceData.budget.financialYear)}`],
      [],
      ["Account Code", "Account Name", "Type", "Total Budget (Rs.)", "Total Actual (Rs.)", "Variance (Rs.)", "Variance %"],
    ];

    for (const item of varianceData.items) {
      data.push([
        item.accountCode,
        item.accountName,
        item.accountType,
        fmtRupees(item.totalBudgeted),
        fmtRupees(item.totalActual),
        fmtRupees(item.totalVariance),
        Number(item.variancePercent.toFixed(1)),
      ]);
      for (const m of item.monthly) {
        data.push([
          "",
          `  ${m.month.charAt(0).toUpperCase() + m.month.slice(1)}`,
          "",
          fmtRupees(m.budgeted),
          fmtRupees(m.actual),
          fmtRupees(m.variance),
          null,
        ]);
      }
    }

    data.push([]);
    data.push([
      "", "TOTAL", "",
      fmtRupees(varianceData.summary.totalBudgeted),
      fmtRupees(varianceData.summary.totalActual),
      fmtRupees(varianceData.summary.totalVariance),
      null,
    ]);

    exportToExcel({
      filename: `Budget_Variance_${varianceData.budget.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Variance Report", data }],
    });
  }

  const availableAccounts = useMemo(() => {
    const usedIds = new Set(formItems.map(i => i.accountId));
    return accounts.filter(a => !usedIds.has(a.id)).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, formItems]);

  if (budgetsLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-budget-variance">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="page-budget-variance">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Scale className="w-5 h-5" />
            Budget & Variance
          </h1>
          <p className="text-sm text-muted-foreground">Manage budgets and compare against actuals</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="budgets" data-testid="tab-budgets">Budgets</TabsTrigger>
          <TabsTrigger value="variance" data-testid="tab-variance">Variance Report</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateForm} data-testid="button-create-budget">
              <Plus className="w-4 h-4 mr-1" /> Create Budget
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Financial Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8" data-testid="text-no-budgets">
                        No budgets found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgetsList.map(b => (
                      <TableRow key={b.id} data-testid={`row-budget-${b.id}`}>
                        <TableCell className="font-medium" data-testid={`text-budget-name-${b.id}`}>{b.name}</TableCell>
                        <TableCell data-testid={`text-budget-fy-${b.id}`}>{getFYLabel(b.financialYear)}</TableCell>
                        <TableCell>
                          <Badge variant={b.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-status-${b.id}`}>
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditForm(b)} data-testid={`button-edit-budget-${b.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)} data-testid={`button-delete-budget-${b.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variance" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={varianceBudgetId} onValueChange={setVarianceBudgetId}>
              <SelectTrigger className="w-[300px]" data-testid="select-variance-budget">
                <SelectValue placeholder="Select a budget..." />
              </SelectTrigger>
              <SelectContent>
                {budgetsList.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({getFYLabel(b.financialYear)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {varianceData && (
              <Button variant="outline" onClick={handleExportVariance} data-testid="button-export-variance">
                <Download className="w-4 h-4 mr-1" /> Export Excel
              </Button>
            )}
          </div>

          {varianceLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {varianceData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Budget</div>
                    <div className="text-lg font-semibold mt-0.5" data-testid="text-total-budget">
                      {formatAmount(varianceData.summary.totalBudgeted)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Actual</div>
                    <div className="text-lg font-semibold mt-0.5" data-testid="text-total-actual">
                      {formatAmount(varianceData.summary.totalActual)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Variance</div>
                    <div className="text-lg font-semibold mt-0.5" data-testid="text-total-variance">
                      {formatAmount(varianceData.summary.totalVariance)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Budget</TableHead>
                        <TableHead className="text-right">Total Actual</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">Variance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceData.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No budget items found for this budget.
                          </TableCell>
                        </TableRow>
                      ) : (
                        varianceData.items.map(item => {
                          const isExpanded = expandedRows.has(item.accountId);
                          const favorable = isFavorable(item.totalVariance, item.accountType);
                          return (
                            <>
                              <TableRow
                                key={item.accountId}
                                className="cursor-pointer"
                                onClick={() => toggleRow(item.accountId)}
                                data-testid={`row-variance-${item.accountId}`}
                              >
                                <TableCell>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground mr-2">{item.accountCode}</span>
                                  <span className="font-medium">{item.accountName}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">{item.accountType}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono" data-testid={`text-budget-${item.accountId}`}>
                                  {formatAmount(item.totalBudgeted)}
                                </TableCell>
                                <TableCell className="text-right font-mono" data-testid={`text-actual-${item.accountId}`}>
                                  {formatAmount(item.totalActual)}
                                </TableCell>
                                <TableCell
                                  className={`text-right font-mono font-medium ${favorable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                  data-testid={`text-variance-${item.accountId}`}
                                >
                                  {formatAmount(item.totalVariance)}
                                </TableCell>
                                <TableCell
                                  className={`text-right font-mono ${favorable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                  data-testid={`text-variance-pct-${item.accountId}`}
                                >
                                  {item.variancePercent !== 0 ? `${item.variancePercent.toFixed(1)}%` : "-"}
                                </TableCell>
                              </TableRow>
                              {isExpanded && item.monthly.map(m => (
                                <TableRow key={`${item.accountId}-${m.month}`} className="bg-muted/30">
                                  <TableCell></TableCell>
                                  <TableCell className="pl-10 text-sm text-muted-foreground">
                                    {m.month.charAt(0).toUpperCase() + m.month.slice(1)}
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatAmount(m.budgeted)}</TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatAmount(m.actual)}</TableCell>
                                  <TableCell className={`text-right font-mono text-sm ${isFavorable(m.variance, item.accountType) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {formatAmount(m.variance)}
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {!varianceBudgetId && !varianceLoading && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-select-budget-prompt">
                Select a budget from the dropdown above to view the variance report.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-form-title">
              {editingBudget ? "Edit Budget" : "Create Budget"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Budget Name</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Annual Budget 2025-26"
                  data-testid="input-budget-name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Financial Year</label>
                <Select value={formFY} onValueChange={setFormFY}>
                  <SelectTrigger data-testid="select-budget-fy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFYs().map(fy => (
                      <SelectItem key={fy} value={fy}>{getFYLabel(fy)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                data-testid="input-budget-notes"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Add Account</label>
              <div className="flex items-center gap-2">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="flex-1" data-testid="select-add-account">
                    <SelectValue placeholder="Select account to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addAccount} disabled={!selectedAccountId} data-testid="button-add-account">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            {formItems.length > 0 && (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Account</TableHead>
                      {MONTH_LABELS.map(m => (
                        <TableHead key={m} className="text-center min-w-[80px]">{m}</TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formItems.map(item => (
                      <TableRow key={item.accountId} data-testid={`row-form-item-${item.accountId}`}>
                        <TableCell className="text-sm">
                          <span className="text-muted-foreground mr-1">{item.accountCode}</span>
                          {item.accountName}
                        </TableCell>
                        {MONTHS.map(m => (
                          <TableCell key={m} className="p-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="text-right text-sm h-8 w-20"
                              value={((item as any)[m] || 0) / 100 || ""}
                              onChange={e => updateItemMonth(item.accountId, m, e.target.value)}
                              placeholder="0"
                              data-testid={`input-${m}-${item.accountId}`}
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.accountId)} data-testid={`button-remove-${item.accountId}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm} data-testid="button-cancel">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-budget"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this budget? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

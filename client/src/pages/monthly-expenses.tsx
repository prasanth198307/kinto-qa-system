import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowRight,
  IndianRupee,
  Loader2,
  MinusCircle,
} from "lucide-react";
import { format } from "date-fns";

type MonthlyExpense = {
  id: string;
  name: string;
  category: string | null;
  amount: number;
  paidAmount: number;
  expenseMonth: string;
  dueDate: string | null;
  status: string;
  paymentDate: string | null;
  paymentMode: string | null;
  referenceNumber: string | null;
  carryToNextMonth: number;
  notes: string | null;
  createdAt: string | null;
};

const PAYMENT_MODES = ["Cash", "NEFT", "RTGS", "UPI", "Cheque", "Bank Transfer", "Other"];

const CATEGORIES = [
  "Rent",
  "Electricity",
  "Water",
  "Salaries",
  "Internet",
  "Phone",
  "Insurance",
  "Maintenance",
  "Raw Materials",
  "Transport",
  "Marketing",
  "Office Supplies",
  "Professional Fees",
  "Bank Charges",
  "Miscellaneous",
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(ym: string) {
  const [year, month] = ym.split('-').map(Number);
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

function prevMonth(ym: string) {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(ym: string) {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtCurrency(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Derive status automatically from paid amount vs total */
function deriveStatus(totalPaise: number, paidPaise: number): 'pending' | 'partial' | 'paid' {
  if (paidPaise <= 0) return 'pending';
  if (paidPaise >= totalPaise) return 'paid';
  return 'partial';
}

const emptyForm = {
  name: '',
  category: '',
  amount: '',
  paidAmount: '',
  dueDate: '',
  paymentDate: '',
  paymentMode: '',
  referenceNumber: '',
  carryToNextMonth: false,
  notes: '',
};

type FormState = typeof emptyForm;

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </Badge>
    );
  }
  if (status === 'partial') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 gap-1">
        <MinusCircle className="w-3 h-3" /> Partial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700 gap-1">
      <Clock className="w-3 h-3" /> Pending
    </Badge>
  );
}

export default function MonthlyExpensesPage() {
  const { toast } = useToast();
  const [activeMonth, setActiveMonth] = useState(getCurrentMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [carryDialogOpen, setCarryDialogOpen] = useState(false);

  const queryKey = ['/api/monthly-expenses', { month: activeMonth }];

  const { data: expenses = [], isLoading } = useQuery<MonthlyExpense[]>({ queryKey });

  // Derived form values for live preview
  const formTotalPaise = Math.round(parseFloat(form.amount || '0') * 100) || 0;
  const formPaidPaise = Math.round(parseFloat(form.paidAmount || '0') * 100) || 0;
  const formBalance = Math.max(0, formTotalPaise - formPaidPaise);
  const formDerivedStatus = deriveStatus(formTotalPaise, formPaidPaise);
  const formHasPayment = formPaidPaise > 0;

  const summary = useMemo(() => {
    const totalBudget = expenses.reduce((s, e) => s + e.amount, 0);
    const totalPaid = expenses.reduce((s, e) => s + (e.paidAmount || 0), 0);
    const balance = totalBudget - totalPaid;
    const carryCount = expenses.filter(
      e => (e.status === 'pending' || e.status === 'partial') && e.carryToNextMonth === 1
    ).length;
    return { totalBudget, totalPaid, balance, carryCount };
  }, [expenses]);

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest('POST', '/api/monthly-expenses', body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
      toast({ title: 'Expense added' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const res = await apiRequest('PATCH', `/api/monthly-expenses/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: 'Expense updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/monthly-expenses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteId(null);
      toast({ title: 'Expense deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const carryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/monthly-expenses/carry-forward', { month: activeMonth });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey });
      setCarryDialogOpen(false);
      toast({ title: `${data.count} expense(s) carried to ${formatMonth(nextMonth(activeMonth))}` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (expense: MonthlyExpense) => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await apiRequest('PATCH', `/api/monthly-expenses/${expense.id}`, {
        status: 'paid',
        paidAmount: expense.amount,
        paymentDate: today,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Marked as fully paid' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, dueDate: `${activeMonth}-01` });
    setDialogOpen(true);
  }

  function openEdit(e: MonthlyExpense) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      category: e.category || '',
      amount: ((e.amount || 0) / 100).toString(),
      paidAmount: ((e.paidAmount || 0) / 100 > 0) ? ((e.paidAmount || 0) / 100).toString() : '',
      dueDate: e.dueDate || '',
      paymentDate: e.paymentDate || '',
      paymentMode: e.paymentMode || '',
      referenceNumber: e.referenceNumber || '',
      carryToNextMonth: e.carryToNextMonth === 1,
      notes: e.notes || '',
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: 'Expense name is required', variant: 'destructive' });
      return;
    }
    if (formTotalPaise <= 0) {
      toast({ title: 'Enter a valid total amount', variant: 'destructive' });
      return;
    }
    if (formPaidPaise > formTotalPaise) {
      toast({ title: 'Paid amount cannot exceed total amount', variant: 'destructive' });
      return;
    }

    const body = {
      name: form.name.trim(),
      category: form.category || null,
      amount: formTotalPaise,
      paidAmount: formPaidPaise,
      expenseMonth: activeMonth,
      dueDate: form.dueDate || null,
      status: formDerivedStatus,
      paymentDate: formHasPayment ? (form.paymentDate || null) : null,
      paymentMode: formHasPayment ? (form.paymentMode || null) : null,
      referenceNumber: formHasPayment ? (form.referenceNumber || null) : null,
      carryToNextMonth: form.carryToNextMonth ? 1 : 0,
      notes: form.notes || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Monthly Expenses</h1>
          <p className="text-sm text-muted-foreground">Track your monthly bills and payments</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-expense">
          <Plus className="w-4 h-4 mr-1.5" /> Add Expense
        </Button>
      </div>

      {/* Month Navigator */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveMonth(prevMonth(activeMonth))} data-testid="button-prev-month">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatMonth(activeMonth)}</div>
              <div className="text-xs text-muted-foreground">{activeMonth}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setActiveMonth(nextMonth(activeMonth))} data-testid="button-next-month">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <IndianRupee className="w-3 h-3" /> Total Budget
            </div>
            <div className="text-lg font-bold">{fmtCurrency(summary.totalBudget)}</div>
            <div className="text-xs text-muted-foreground">{expenses.length} item(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Total Paid
            </div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{fmtCurrency(summary.totalPaid)}</div>
            <div className="text-xs text-muted-foreground">{expenses.filter(e => e.status !== 'pending').length} item(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Balance Due
            </div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{fmtCurrency(summary.balance)}</div>
            <div className="text-xs text-muted-foreground">
              {expenses.filter(e => e.status === 'pending').length} pending · {expenses.filter(e => e.status === 'partial').length} partial
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" /> Carry Forward
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.carryCount}</div>
            <div className="text-xs text-muted-foreground">to carry next month</div>
          </CardContent>
        </Card>
      </div>

      {/* Carry Forward Banner */}
      {summary.carryCount > 0 && (
        <div className="flex items-center justify-between rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5">
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">{summary.carryCount}</span> item(s) marked to carry to{' '}
            <span className="font-medium">{formatMonth(nextMonth(activeMonth))}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCarryDialogOpen(true)} data-testid="button-carry-forward">
            <ArrowRight className="w-3.5 h-3.5 mr-1" /> Carry Forward
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No expenses for {formatMonth(activeMonth)}.</p>
              <p className="text-xs mt-1">Click "Add Expense" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total Amt</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-center">Carry?</TableHead>
                    <TableHead className="w-[90px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const paid = expense.paidAmount || 0;
                    const balance = Math.max(0, expense.amount - paid);
                    return (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell>
                          <div className="font-medium">{expense.name}</div>
                          {expense.notes && (
                            <div className="text-xs text-muted-foreground truncate max-w-[160px]">{expense.notes}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {expense.category
                            ? <Badge variant="outline" className="text-xs font-normal">{expense.category}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmtCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-700 dark:text-green-400">
                          {paid > 0 ? fmtCurrency(paid) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {balance > 0
                            ? <span className="text-orange-600 dark:text-orange-400 font-semibold">{fmtCurrency(balance)}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={expense.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {expense.dueDate
                            ? format(new Date(expense.dueDate + 'T00:00:00'), 'dd MMM')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {(expense.status === 'pending' || expense.status === 'partial') && expense.carryToNextMonth === 1
                            ? <span className="text-blue-600 dark:text-blue-400 font-semibold">✓</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {expense.status !== 'paid' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => markPaidMutation.mutate(expense)}
                                    disabled={markPaidMutation.isPending}
                                    data-testid={`button-mark-paid-${expense.id}`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark as Fully Paid</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => openEdit(expense)}
                                  data-testid={`button-edit-expense-${expense.id}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setDeleteId(expense.id)}
                                  data-testid={`button-delete-expense-${expense.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Expense' : 'Add Monthly Expense'}</DialogTitle>
            <DialogDescription>{formatMonth(activeMonth)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Expense Name *</Label>
              <Input
                placeholder="e.g. Office Rent, Electricity Bill"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-expense-name"
              />
            </div>

            {/* Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  data-testid="input-due-date"
                />
              </div>
            </div>

            {/* Amount row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Amount (₹) *</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  data-testid="input-expense-amount"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount Paid (₹)</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.paidAmount}
                  onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))}
                  data-testid="input-paid-amount"
                />
              </div>
            </div>

            {/* Live status preview */}
            {formTotalPaise > 0 && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/40 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={formDerivedStatus} />
                </div>
                {formBalance > 0 && (
                  <div className="text-muted-foreground">
                    Balance: <span className="font-semibold text-orange-600 dark:text-orange-400">{fmtCurrency(formBalance)}</span>
                  </div>
                )}
                {formBalance === 0 && formTotalPaise > 0 && (
                  <div className="text-green-600 dark:text-green-400 font-medium text-xs">Fully paid</div>
                )}
              </div>
            )}

            {/* Payment details — shown when any amount is paid */}
            {formHasPayment && (
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={form.paymentDate}
                      onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                      data-testid="input-payment-date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Mode</Label>
                    <Select value={form.paymentMode} onValueChange={v => setForm(f => ({ ...f, paymentMode: v }))}>
                      <SelectTrigger data-testid="select-payment-mode">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reference / UTR No.</Label>
                  <Input
                    placeholder="Optional"
                    value={form.referenceNumber}
                    onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                    data-testid="input-reference"
                  />
                </div>
              </div>
            )}

            {/* Carry forward */}
            {formDerivedStatus !== 'paid' && (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2.5">
                <Checkbox
                  id="carry-forward"
                  checked={form.carryToNextMonth}
                  onCheckedChange={v => setForm(f => ({ ...f, carryToNextMonth: !!v }))}
                  data-testid="checkbox-carry-forward"
                />
                <label htmlFor="carry-forward" className="text-sm cursor-pointer leading-tight">
                  Carry to next month if still unpaid
                  <span className="block text-xs text-muted-foreground">
                    Will appear in {formatMonth(nextMonth(activeMonth))} when you use Carry Forward
                  </span>
                </label>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional remarks…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="resize-none h-16 text-sm"
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-expense">
              {isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingId ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Carry Forward Confirm */}
      <AlertDialog open={carryDialogOpen} onOpenChange={setCarryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carry Forward {summary.carryCount} Expense(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will copy all pending/partial carry-flagged expenses from{' '}
              <strong>{formatMonth(activeMonth)}</strong> into{' '}
              <strong>{formatMonth(nextMonth(activeMonth))}</strong>.
              The original entries will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => carryMutation.mutate()} disabled={carryMutation.isPending}>
              {carryMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Carry Forward
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";

type MonthlyExpense = {
  id: string;
  name: string;
  category: string | null;
  amount: number;
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
  const d = new Date(year, month - 1, 1);
  return format(d, 'MMMM yyyy');
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

const emptyForm = {
  name: '',
  category: '',
  amount: '',
  dueDate: '',
  status: 'pending',
  paymentDate: '',
  paymentMode: '',
  referenceNumber: '',
  carryToNextMonth: false,
  notes: '',
};

type FormState = typeof emptyForm;

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

  const summary = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const paid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
    const pending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
    const carryCount = expenses.filter(e => e.status === 'pending' && e.carryToNextMonth === 1).length;
    return { total, paid, pending, carryCount };
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
    mutationFn: async (id: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await apiRequest('PATCH', `/api/monthly-expenses/${id}`, {
        status: 'paid',
        paymentDate: today,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Marked as paid' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function openAdd() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      dueDate: `${activeMonth}-01`,
    });
    setDialogOpen(true);
  }

  function openEdit(e: MonthlyExpense) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      category: e.category || '',
      amount: ((e.amount || 0) / 100).toString(),
      dueDate: e.dueDate || '',
      status: e.status,
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
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const amountPaise = Math.round(parseFloat(form.amount || '0') * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    const body = {
      name: form.name.trim(),
      category: form.category || null,
      amount: amountPaise,
      expenseMonth: activeMonth,
      dueDate: form.dueDate || null,
      status: form.status,
      paymentDate: form.status === 'paid' ? (form.paymentDate || null) : null,
      paymentMode: form.paymentMode || null,
      referenceNumber: form.referenceNumber || null,
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveMonth(prevMonth(activeMonth))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatMonth(activeMonth)}</div>
              <div className="text-xs text-muted-foreground">{activeMonth}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveMonth(nextMonth(activeMonth))}
              data-testid="button-next-month"
            >
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
              <IndianRupee className="w-3 h-3" /> Total
            </div>
            <div className="text-lg font-bold">{fmtCurrency(summary.total)}</div>
            <div className="text-xs text-muted-foreground">{expenses.length} item(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Paid
            </div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{fmtCurrency(summary.paid)}</div>
            <div className="text-xs text-muted-foreground">{expenses.filter(e => e.status === 'paid').length} item(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending
            </div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{fmtCurrency(summary.pending)}</div>
            <div className="text-xs text-muted-foreground">{expenses.filter(e => e.status === 'pending').length} item(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" /> Carry Forward
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.carryCount}</div>
            <div className="text-xs text-muted-foreground">pending to carry</div>
          </CardContent>
        </Card>
      </div>

      {/* Carry Forward Action */}
      {summary.carryCount > 0 && (
        <div className="flex items-center justify-between rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5">
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">{summary.carryCount}</span> pending expense(s) marked to carry forward to{' '}
            <span className="font-medium">{formatMonth(nextMonth(activeMonth))}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCarryDialogOpen(true)}
            data-testid="button-carry-forward"
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1" /> Carry Forward
          </Button>
        </div>
      )}

      {/* Expense Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading expenses…
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
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-center">Carry?</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                      <TableCell>
                        <div className="font-medium">{expense.name}</div>
                        {expense.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{expense.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.category ? (
                          <Badge variant="outline" className="text-xs font-normal">
                            {expense.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono">
                        {fmtCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.dueDate
                          ? format(new Date(expense.dueDate + 'T00:00:00'), 'dd MMM')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {expense.status === 'paid' ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.paymentDate
                          ? format(new Date(expense.paymentDate + 'T00:00:00'), 'dd MMM yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {expense.status === 'pending' ? (
                          <span className={expense.carryToNextMonth === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}>
                            {expense.carryToNextMonth === 1 ? '✓' : '—'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {expense.status === 'pending' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => markPaidMutation.mutate(expense.id)}
                                  disabled={markPaidMutation.isPending}
                                  data-testid={`button-mark-paid-${expense.id}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as Paid</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
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
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
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
                  ))}
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
            <DialogDescription>
              {formatMonth(activeMonth)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Expense Name *</Label>
              <Input
                placeholder="e.g. Office Rent, Electricity Bill"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-expense-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  data-testid="input-expense-amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  data-testid="input-due-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.status === 'paid' && (
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
                      {PAYMENT_MODES.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.status === 'paid' && (
              <div className="space-y-1.5">
                <Label>Reference / UTR No.</Label>
                <Input
                  placeholder="Optional"
                  value={form.referenceNumber}
                  onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  data-testid="input-reference"
                />
              </div>
            )}

            {form.status === 'pending' && (
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
              This will copy all pending, carry-flagged expenses from{' '}
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

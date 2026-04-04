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
import { Separator } from "@/components/ui/separator";
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
  History,
  Building2,
  User,
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

type ExpensePayment = {
  id: string;
  expenseId: string;
  amount: number;
  paymentDate: string;
  paymentMode: string | null;
  paidBy: string | null;
  paymentSource: string;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string | null;
};

const PAYMENT_MODES = ["Cash", "NEFT", "RTGS", "UPI", "Cheque", "Bank Transfer", "Other"];
const PAYMENT_SOURCES = [
  { value: 'company', label: 'Company Account', icon: Building2 },
  { value: 'personal', label: 'Personal (Reimbursable)', icon: User },
  { value: 'personal_nonreimb', label: 'Personal (Non-Reimbursable)', icon: User },
  { value: 'other', label: 'Other', icon: User },
];

const CATEGORIES = [
  "Rent", "Electricity", "Water", "Salaries", "Internet", "Phone",
  "Insurance", "Maintenance", "Raw Materials", "Transport", "Marketing",
  "Office Supplies", "Professional Fees", "Bank Charges", "Miscellaneous",
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
function deriveStatus(totalPaise: number, paidPaise: number): 'pending' | 'partial' | 'paid' {
  if (paidPaise <= 0) return 'pending';
  if (paidPaise >= totalPaise) return 'paid';
  return 'partial';
}

const emptyExpenseForm = {
  name: '', category: '', amount: '', paidAmount: '',
  dueDate: '', paymentDate: '', paymentMode: '', referenceNumber: '',
  carryToNextMonth: false, notes: '',
};

const emptyPaymentForm = {
  amount: '', paymentDate: new Date().toISOString().slice(0, 10),
  paymentMode: '', paidBy: '', paymentSource: 'company', referenceNumber: '', notes: '',
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Paid
    </Badge>
  );
  if (status === 'partial') return (
    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 gap-1">
      <MinusCircle className="w-3 h-3" /> Partial
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700 gap-1">
      <Clock className="w-3 h-3" /> Pending
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  if (source === 'company') return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
      <Building2 className="w-3 h-3" /> Company
    </span>
  );
  if (source === 'personal') return (
    <span className="inline-flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-1.5 py-0.5">
      <User className="w-3 h-3" /> Personal (Reimb.)
    </span>
  );
  if (source === 'personal_nonreimb') return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
      <User className="w-3 h-3" /> Personal
    </span>
  );
  return <span className="text-xs text-muted-foreground">{source}</span>;
}

export default function MonthlyExpensesPage() {
  const { toast } = useToast();
  const [activeMonth, setActiveMonth] = useState(getCurrentMonth());

  // Expense dialog
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState(emptyExpenseForm);

  // Payment history dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<MonthlyExpense | null>(null);
  const [payForm, setPayForm] = useState(emptyPaymentForm);

  // Delete dialogs
  const [deleteExpId, setDeleteExpId] = useState<string | null>(null);
  const [deletePayId, setDeletePayId] = useState<string | null>(null);

  const [carryDialogOpen, setCarryDialogOpen] = useState(false);

  const queryKey = ['/api/monthly-expenses', { month: activeMonth }];
  const { data: expenses = [], isLoading } = useQuery<MonthlyExpense[]>({ queryKey });

  // Payments for selected expense
  const payQueryKey = selectedExpense ? ['/api/monthly-expenses', selectedExpense.id, 'payments'] : null;
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<ExpensePayment[]>({
    queryKey: payQueryKey!,
    enabled: !!selectedExpense,
  });

  // Live form values
  const formTotal = Math.round(parseFloat(expForm.amount || '0') * 100) || 0;
  const formPaid = Math.round(parseFloat(expForm.paidAmount || '0') * 100) || 0;
  const formBalance = Math.max(0, formTotal - formPaid);
  const formStatus = deriveStatus(formTotal, formPaid);
  const formHasPayment = formPaid > 0;

  const payAmountPaise = Math.round(parseFloat(payForm.amount || '0') * 100) || 0;

  const summary = useMemo(() => {
    const totalBudget = expenses.reduce((s, e) => s + e.amount, 0);
    const totalPaid = expenses.reduce((s, e) => s + (e.paidAmount || 0), 0);
    const balance = totalBudget - totalPaid;
    const carryCount = expenses.filter(
      e => (e.status === 'pending' || e.status === 'partial') && e.carryToNextMonth === 1
    ).length;
    return { totalBudget, totalPaid, balance, carryCount };
  }, [expenses]);

  // ── mutations ──────────────────────────────────────────────────────
  const createExpMutation = useMutation({
    mutationFn: async (body: any) => (await apiRequest('POST', '/api/monthly-expenses', body)).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); setExpDialogOpen(false); toast({ title: 'Expense added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateExpMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) =>
      (await apiRequest('PATCH', `/api/monthly-expenses/${id}`, body)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setExpDialogOpen(false); setEditingId(null);
      toast({ title: 'Expense updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteExpMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest('DELETE', `/api/monthly-expenses/${id}`)).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); setDeleteExpId(null); toast({ title: 'Deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (expense: MonthlyExpense) => {
      // Add a full-amount payment transaction (uses the payment transaction flow)
      const res = await apiRequest('POST', `/api/monthly-expenses/${expense.id}/payments`, {
        amount: expense.amount - (expense.paidAmount || 0),
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentSource: 'company',
        paidBy: 'Company',
      });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); toast({ title: 'Marked as fully paid' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const carryMutation = useMutation({
    mutationFn: async () => (await apiRequest('POST', '/api/monthly-expenses/carry-forward', { month: activeMonth })).json(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey }); setCarryDialogOpen(false);
      toast({ title: `${data.count} expense(s) carried to ${formatMonth(nextMonth(activeMonth))}` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addPaymentMutation = useMutation({
    mutationFn: async ({ expenseId, body }: { expenseId: string; body: any }) =>
      (await apiRequest('POST', `/api/monthly-expenses/${expenseId}/payments`, body)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: payQueryKey! });
      // Refresh selected expense data
      if (selectedExpense) {
        const updated = expenses.find(e => e.id === selectedExpense.id);
        if (updated) setSelectedExpense(updated);
      }
      setPayForm(emptyPaymentForm);
      toast({ title: 'Payment recorded' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) =>
      (await apiRequest('DELETE', `/api/monthly-expense-payments/${paymentId}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: payQueryKey! });
      setDeletePayId(null);
      toast({ title: 'Payment entry removed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── helpers ────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setExpForm({ ...emptyExpenseForm, dueDate: `${activeMonth}-01` });
    setExpDialogOpen(true);
  }
  function openEdit(e: MonthlyExpense) {
    setEditingId(e.id);
    setExpForm({
      name: e.name, category: e.category || '',
      amount: ((e.amount || 0) / 100).toString(),
      paidAmount: ((e.paidAmount || 0) / 100 > 0) ? ((e.paidAmount || 0) / 100).toString() : '',
      dueDate: e.dueDate || '', paymentDate: e.paymentDate || '',
      paymentMode: e.paymentMode || '', referenceNumber: e.referenceNumber || '',
      carryToNextMonth: e.carryToNextMonth === 1, notes: e.notes || '',
    });
    setExpDialogOpen(true);
  }
  function openPayments(e: MonthlyExpense) {
    setSelectedExpense(e);
    setPayForm(emptyPaymentForm);
    setPayDialogOpen(true);
  }

  function handleExpSubmit() {
    if (!expForm.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (formTotal <= 0) { toast({ title: 'Enter a valid total amount', variant: 'destructive' }); return; }
    if (formPaid > formTotal) { toast({ title: 'Paid amount cannot exceed total', variant: 'destructive' }); return; }
    const body = {
      name: expForm.name.trim(), category: expForm.category || null,
      amount: formTotal, paidAmount: formPaid, expenseMonth: activeMonth,
      dueDate: expForm.dueDate || null, status: formStatus,
      paymentDate: formHasPayment ? (expForm.paymentDate || null) : null,
      paymentMode: formHasPayment ? (expForm.paymentMode || null) : null,
      referenceNumber: formHasPayment ? (expForm.referenceNumber || null) : null,
      carryToNextMonth: expForm.carryToNextMonth ? 1 : 0,
      notes: expForm.notes || null,
    };
    editingId ? updateExpMutation.mutate({ id: editingId, body }) : createExpMutation.mutate(body);
  }

  function handleAddPayment() {
    if (!selectedExpense) return;
    if (payAmountPaise <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    if (!payForm.paymentDate) { toast({ title: 'Payment date is required', variant: 'destructive' }); return; }
    const remaining = selectedExpense.amount - (selectedExpense.paidAmount || 0);
    if (payAmountPaise > remaining) {
      toast({ title: `Amount cannot exceed balance of ${fmtCurrency(remaining)}`, variant: 'destructive' });
      return;
    }
    addPaymentMutation.mutate({
      expenseId: selectedExpense.id,
      body: {
        amount: payAmountPaise,
        paymentDate: payForm.paymentDate,
        paymentMode: payForm.paymentMode || null,
        paidBy: payForm.paidBy || null,
        paymentSource: payForm.paymentSource,
        referenceNumber: payForm.referenceNumber || null,
        notes: payForm.notes || null,
      },
    });
  }

  // Keep selectedExpense in sync after list refreshes
  const refreshedSelected = selectedExpense ? expenses.find(e => e.id === selectedExpense.id) : null;
  const displayExpense = refreshedSelected ?? selectedExpense;
  const remainingBalance = displayExpense ? Math.max(0, displayExpense.amount - (displayExpense.paidAmount || 0)) : 0;

  const expIsPending = createExpMutation.isPending || updateExpMutation.isPending;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Monthly Expenses</h1>
          <p className="text-sm text-muted-foreground">Track monthly bills and payment transactions</p>
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
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Total Budget</div>
          <div className="text-lg font-bold">{fmtCurrency(summary.totalBudget)}</div>
          <div className="text-xs text-muted-foreground">{expenses.length} item(s)</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Total Paid</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{fmtCurrency(summary.totalPaid)}</div>
          <div className="text-xs text-muted-foreground">{expenses.filter(e => e.status !== 'pending').length} item(s)</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Balance Due</div>
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{fmtCurrency(summary.balance)}</div>
          <div className="text-xs text-muted-foreground">
            {expenses.filter(e => e.status === 'pending').length} pending · {expenses.filter(e => e.status === 'partial').length} partial
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Carry Forward</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.carryCount}</div>
          <div className="text-xs text-muted-foreground">to carry next month</div>
        </CardContent></Card>
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

      {/* Expense Table */}
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
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-center">Carry?</TableHead>
                    <TableHead className="w-[110px]"></TableHead>
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
                        <TableCell className="text-right font-mono text-sm">{fmtCurrency(expense.amount)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-700 dark:text-green-400">
                          {paid > 0 ? fmtCurrency(paid) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {balance > 0
                            ? <span className="font-semibold text-orange-600 dark:text-orange-400">{fmtCurrency(balance)}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell><StatusBadge status={expense.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {expense.dueDate ? format(new Date(expense.dueDate + 'T00:00:00'), 'dd MMM') : '—'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {(expense.status === 'pending' || expense.status === 'partial') && expense.carryToNextMonth === 1
                            ? <span className="text-blue-600 dark:text-blue-400 font-semibold">✓</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => openPayments(expense)}
                                  data-testid={`button-payments-${expense.id}`}
                                >
                                  <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Payment History / Add Payment</TooltipContent>
                            </Tooltip>
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
                                <TooltipContent>Mark as Fully Paid (Company Account)</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(expense)} data-testid={`button-edit-expense-${expense.id}`}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteExpId(expense.id)} data-testid={`button-delete-expense-${expense.id}`}>
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

      {/* ── Payment History Dialog ── */}
      <Dialog open={payDialogOpen} onOpenChange={o => { if (!o) { setPayDialogOpen(false); setSelectedExpense(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Payment History
            </DialogTitle>
            <DialogDescription>
              {displayExpense?.name} — {displayExpense ? formatMonth(displayExpense.expenseMonth) : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Expense summary bar */}
          {displayExpense && (
            <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Total Bill</div>
                <div className="font-semibold font-mono">{fmtCurrency(displayExpense.amount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Total Paid</div>
                <div className="font-semibold font-mono text-green-600 dark:text-green-400">{fmtCurrency(displayExpense.paidAmount || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Balance Due</div>
                <div className="font-semibold font-mono text-orange-600 dark:text-orange-400">{fmtCurrency(remainingBalance)}</div>
              </div>
            </div>
          )}

          {/* Payment list */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Entries</div>
            {paymentsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
                No payment entries yet. Add one below.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid By</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(pay => (
                      <TableRow key={pay.id} data-testid={`row-payment-${pay.id}`}>
                        <TableCell className="text-sm">
                          {format(new Date(pay.paymentDate + 'T00:00:00'), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-green-700 dark:text-green-400 text-sm">
                          {fmtCurrency(pay.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {pay.paidBy || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell><SourceBadge source={pay.paymentSource} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{pay.paymentMode || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{pay.referenceNumber || '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setDeletePayId(pay.id)}
                            data-testid={`button-delete-payment-${pay.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Add payment form — only if balance remains */}
          {displayExpense && remainingBalance > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Record New Payment <span className="text-orange-600 dark:text-orange-400">(Balance: {fmtCurrency(remainingBalance)})</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Amount (₹) *</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      placeholder={`Max ${fmtCurrency(remainingBalance)}`}
                      value={payForm.amount}
                      onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                      data-testid="input-payment-amount"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Date *</Label>
                    <Input
                      type="date"
                      value={payForm.paymentDate}
                      onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
                      data-testid="input-payment-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Paid By (Person / Company)</Label>
                    <Input
                      placeholder="e.g. Ramesh, Company"
                      value={payForm.paidBy}
                      onChange={e => setPayForm(f => ({ ...f, paidBy: e.target.value }))}
                      data-testid="input-paid-by"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Source *</Label>
                    <Select value={payForm.paymentSource} onValueChange={v => setPayForm(f => ({ ...f, paymentSource: v }))}>
                      <SelectTrigger data-testid="select-payment-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_SOURCES.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-1.5">
                              <s.icon className="w-3.5 h-3.5" />
                              {s.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Mode</Label>
                    <Select value={payForm.paymentMode} onValueChange={v => setPayForm(f => ({ ...f, paymentMode: v }))}>
                      <SelectTrigger data-testid="select-payment-mode">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reference / UTR No.</Label>
                    <Input
                      placeholder="Optional"
                      value={payForm.referenceNumber}
                      onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))}
                      data-testid="input-payment-reference"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Optional"
                    value={payForm.notes}
                    onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                    data-testid="input-payment-notes"
                  />
                </div>

                <Button
                  onClick={handleAddPayment}
                  disabled={addPaymentMutation.isPending}
                  className="w-full"
                  data-testid="button-add-payment"
                >
                  {addPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  <Plus className="w-4 h-4 mr-1.5" /> Record Payment
                </Button>
              </div>
            </>
          )}

          {displayExpense && remainingBalance === 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 py-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 h-4" /> Fully paid — no balance remaining
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Expense Dialog ── */}
      <Dialog open={expDialogOpen} onOpenChange={o => { if (!o) { setExpDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Expense' : 'Add Monthly Expense'}</DialogTitle>
            <DialogDescription>{formatMonth(activeMonth)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Expense Name *</Label>
              <Input
                placeholder="e.g. Office Rent, Electricity Bill"
                value={expForm.name}
                onChange={e => setExpForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-expense-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={expForm.category} onValueChange={v => setExpForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={expForm.dueDate} onChange={e => setExpForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-due-date" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Amount (₹) *</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={expForm.amount}
                  onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-expense-amount" />
              </div>
              <div className="space-y-1.5">
                <Label>Amount Paid (₹)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={expForm.paidAmount}
                  onChange={e => setExpForm(f => ({ ...f, paidAmount: e.target.value }))} data-testid="input-paid-amount" />
                <p className="text-xs text-muted-foreground">Use "Payment History" for multiple payments</p>
              </div>
            </div>

            {formTotal > 0 && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/40 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={formStatus} />
                </div>
                {formBalance > 0 && <div className="text-muted-foreground">Balance: <span className="font-semibold text-orange-600 dark:text-orange-400">{fmtCurrency(formBalance)}</span></div>}
              </div>
            )}

            {formStatus !== 'paid' && (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2.5">
                <Checkbox id="carry-forward" checked={expForm.carryToNextMonth}
                  onCheckedChange={v => setExpForm(f => ({ ...f, carryToNextMonth: !!v }))} data-testid="checkbox-carry-forward" />
                <label htmlFor="carry-forward" className="text-sm cursor-pointer leading-tight">
                  Carry to next month if still unpaid
                  <span className="block text-xs text-muted-foreground">Will appear in {formatMonth(nextMonth(activeMonth))}</span>
                </label>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional remarks…" value={expForm.notes}
                onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))}
                className="resize-none h-16 text-sm" data-testid="input-notes" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExpSubmit} disabled={expIsPending} data-testid="button-save-expense">
              {expIsPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingId ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense */}
      <AlertDialog open={!!deleteExpId} onOpenChange={o => { if (!o) setDeleteExpId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the expense and all its payment records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteExpId && deleteExpMutation.mutate(deleteExpId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment */}
      <AlertDialog open={!!deletePayId} onOpenChange={o => { if (!o) setDeletePayId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this payment entry?</AlertDialogTitle>
            <AlertDialogDescription>The paid amount on the expense will be recalculated automatically.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePayId && deletePaymentMutation.mutate(deletePayId)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Carry Forward */}
      <AlertDialog open={carryDialogOpen} onOpenChange={setCarryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carry Forward {summary.carryCount} Expense(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Pending/partial carry-flagged expenses from <strong>{formatMonth(activeMonth)}</strong> will be copied to{' '}
              <strong>{formatMonth(nextMonth(activeMonth))}</strong>. Only the remaining balance is carried — already-paid amounts stay here.
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

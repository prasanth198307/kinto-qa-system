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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  FileDown,
  RefreshCw,
  Pin,
  Check,
  ChevronsUpDown,
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
  expenseType: string; // 'fixed' | 'recurring'
  baseAmount: number | null;
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
  expenseType: 'fixed' as 'fixed' | 'recurring',
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

function TypeBadge({ type }: { type: string }) {
  if (type === 'recurring') return (
    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800 gap-1 text-xs">
      <RefreshCw className="w-3 h-3" /> Recurring
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-600 gap-1 text-xs">
      <Pin className="w-3 h-3" /> Fixed
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

  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState(emptyExpenseForm);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<MonthlyExpense | null>(null);
  const [payForm, setPayForm] = useState(emptyPaymentForm);

  const [deleteExpId, setDeleteExpId] = useState<string | null>(null);
  const [deletePayId, setDeletePayId] = useState<string | null>(null);

  const [carryDialogOpen, setCarryDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/monthly-expenses/export?month=${activeMonth}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly_expenses_${activeMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Export failed', description: 'Could not download the Excel file.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const queryKey = ['/api/monthly-expenses', { month: activeMonth }];
  const { data: expenses = [], isLoading } = useQuery<MonthlyExpense[]>({ queryKey });

  const { data: expenseCategories = [], refetch: refetchCategories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/expense-categories'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const [catOpen, setCatOpen] = useState(false);

  const payQueryKey = selectedExpense ? ['/api/monthly-expenses', selectedExpense.id, 'payments'] : null;
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<ExpensePayment[]>({
    queryKey: payQueryKey!,
    enabled: !!selectedExpense,
  });

  const formTotal = Math.round(parseFloat(expForm.amount || '0') * 100) || 0;
  const formPaid = Math.round(parseFloat(expForm.paidAmount || '0') * 100) || 0;
  const formBalance = Math.max(0, formTotal - formPaid);
  const formStatus = deriveStatus(formTotal, formPaid);
  const formHasPayment = formPaid > 0;
  const isRecurring = expForm.expenseType === 'recurring';

  const payAmountPaise = Math.round(parseFloat(payForm.amount || '0') * 100) || 0;

  const summary = useMemo(() => {
    const totalBudget = expenses.reduce((s, e) => s + e.amount, 0);
    const totalPaid = expenses.reduce((s, e) => s + (e.paidAmount || 0), 0);
    const balance = totalBudget - totalPaid;
    const recurringExpenses = expenses.filter(e => e.expenseType === 'recurring');
    const fixedExpenses = expenses.filter(e => e.expenseType !== 'recurring');
    const recurringCount = recurringExpenses.length;
    const fixedCount = fixedExpenses.length;
    const recurringAmount = recurringExpenses.reduce((s, e) => s + e.amount, 0);
    const fixedAmount = fixedExpenses.reduce((s, e) => s + e.amount, 0);
    const unpaidFixedCount = fixedExpenses.filter(e => e.status === 'pending' || e.status === 'partial').length;
    const carryCount = recurringCount + unpaidFixedCount; // recurring always + unpaid fixed
    return { totalBudget, totalPaid, balance, recurringCount, fixedCount, recurringAmount, fixedAmount, carryCount, unpaidFixedCount };
  }, [expenses]);

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
      const parts: string[] = [];
      if (data.recurringCount > 0) parts.push(`${data.recurringCount} recurring`);
      if (data.fixedCount > 0) parts.push(`${data.fixedCount} fixed carry`);
      toast({ title: `${data.count} expense(s) generated for ${formatMonth(nextMonth(activeMonth))}`, description: parts.join(', ') });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addPaymentMutation = useMutation({
    mutationFn: async ({ expenseId, body }: { expenseId: string; body: any }) =>
      (await apiRequest('POST', `/api/monthly-expenses/${expenseId}/payments`, body)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: payQueryKey! });
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
      carryToNextMonth: e.carryToNextMonth === 1,
      notes: e.notes || '',
      expenseType: (e.expenseType as 'fixed' | 'recurring') || 'fixed',
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
      carryToNextMonth: isRecurring ? 1 : (expForm.carryToNextMonth ? 1 : 0),
      expenseType: expForm.expenseType,
      baseAmount: isRecurring ? formTotal : null,
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={downloading} data-testid="button-download-excel">
            {downloading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileDown className="w-4 h-4 mr-1.5" />}
            Download Excel
          </Button>
          <Button onClick={openAdd} data-testid="button-add-expense">
            <Plus className="w-4 h-4 mr-1.5" /> Add Expense
          </Button>
        </div>
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
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Pin className="w-3 h-3" /> By Type</div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Recurring ({summary.recurringCount})
              </span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{fmtCurrency(summary.recurringAmount)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MinusCircle className="w-2.5 h-2.5" /> Fixed ({summary.fixedCount})
              </span>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{fmtCurrency(summary.fixedAmount)}</span>
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* Carry Forward Banner */}
      {summary.carryCount > 0 && (
        <div className="flex items-center justify-between rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-4 py-2.5">
          <div className="text-sm text-purple-800 dark:text-purple-300">
            <span className="font-medium">{summary.carryCount}</span> item(s) will be generated for{' '}
            <span className="font-medium">{formatMonth(nextMonth(activeMonth))}</span>
            <span className="text-xs ml-2 text-purple-600 dark:text-purple-400">
              ({summary.recurringCount} recurring{summary.unpaidFixedCount > 0 ? ` + ${summary.unpaidFixedCount} unpaid fixed` : ''})
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCarryDialogOpen(true)} data-testid="button-carry-forward">
            <ArrowRight className="w-3.5 h-3.5 mr-1" /> Generate Next Month
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
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="w-[110px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const paid = expense.paidAmount || 0;
                    const balance = Math.max(0, expense.amount - paid);
                    const baseAmt = expense.baseAmount;
                    const carriedBalance = baseAmt && expense.amount > baseAmt ? expense.amount - baseAmt : 0;
                    return (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell>
                          <div className="font-medium">{expense.name}</div>
                          {expense.category && (
                            <Badge variant="outline" className="text-xs font-normal mt-0.5">{expense.category}</Badge>
                          )}
                          {carriedBalance > 0 && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                              + {fmtCurrency(carriedBalance)} unpaid from prev. month
                            </div>
                          )}
                          {expense.notes && !expense.notes.startsWith('Recurring') && !expense.notes.startsWith('Carried') && (
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">{expense.notes}</div>
                          )}
                        </TableCell>
                        <TableCell><TypeBadge type={expense.expenseType || 'fixed'} /></TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <div>{fmtCurrency(expense.amount)}</div>
                          {baseAmt && expense.amount !== baseAmt && (
                            <div className="text-xs text-muted-foreground">Base: {fmtCurrency(baseAmt)}</div>
                          )}
                        </TableCell>
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

          {displayExpense && (
            <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Total Bill</div>
                <div className="font-semibold font-mono">{fmtCurrency(displayExpense.amount)}</div>
                {displayExpense.baseAmount && displayExpense.amount !== displayExpense.baseAmount && (
                  <div className="text-xs text-muted-foreground">Base: {fmtCurrency(displayExpense.baseAmount)}</div>
                )}
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

          {displayExpense && remainingBalance > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Record New Payment <span className="text-orange-600 dark:text-orange-400">(Balance: {fmtCurrency(remainingBalance)})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Expense Type Toggle */}
            <div className="space-y-2">
              <Label>Expense Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExpForm(f => ({ ...f, expenseType: 'fixed' }))}
                  data-testid="button-type-fixed"
                  className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                    expForm.expenseType === 'fixed'
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  <Pin className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-inherit">Fixed</div>
                    <div className="text-xs opacity-70">One-time or manual carry</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExpForm(f => ({ ...f, expenseType: 'recurring', carryToNextMonth: true }))}
                  data-testid="button-type-recurring"
                  className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                    expForm.expenseType === 'recurring'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-inherit">Recurring</div>
                    <div className="text-xs opacity-70">Auto-creates next month</div>
                  </div>
                </button>
              </div>
              {isRecurring && (
                <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-2.5 py-1.5">
                  This expense will automatically carry to next month. If partially unpaid, the unpaid balance will be added to next month's total.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Expense Name *</Label>
              <Input
                placeholder="e.g. Office Rent, Electricity Bill"
                value={expForm.name}
                onChange={e => setExpForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-expense-name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Label>Category</Label>
                  <a
                    href="/expense-categories"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Manage categories
                  </a>
                </div>
                <Popover open={catOpen} onOpenChange={setCatOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      data-testid="select-category"
                      className="w-full justify-between font-normal"
                      onClick={() => { refetchCategories(); setCatOpen(o => !o); }}
                    >
                      <span className={expForm.category ? '' : 'text-muted-foreground'}>
                        {expForm.category || 'Select category…'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search categories…" />
                      <CommandList>
                        <CommandEmpty>
                          No match.{' '}
                          <a href="/expense-categories" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                            Add category
                          </a>
                        </CommandEmpty>
                        <CommandGroup>
                          {expenseCategories.map(c => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setExpForm(f => ({ ...f, category: c.name }));
                                setCatOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${expForm.category === c.name ? 'opacity-100' : 'opacity-0'}`} />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={expForm.dueDate} onChange={e => setExpForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-due-date" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRecurring ? 'Monthly Amount (₹) *' : 'Total Amount (₹) *'}</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={expForm.amount}
                  onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-expense-amount" />
                {isRecurring && <p className="text-xs text-muted-foreground">Standard monthly bill amount</p>}
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

            {/* Auto-carry notice for fixed expenses */}
            {!isRecurring && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5">
                If this expense is still unpaid at month end, it will automatically carry forward to {formatMonth(nextMonth(activeMonth))}.
              </p>
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

      {/* Generate Next Month Dialog */}
      <AlertDialog open={carryDialogOpen} onOpenChange={setCarryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate {formatMonth(nextMonth(activeMonth))} Expenses?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  The following will be created in <strong>{formatMonth(nextMonth(activeMonth))}</strong>:
                </p>
                <ul className="text-sm space-y-1 ml-3 list-disc">
                  {summary.recurringCount > 0 && (
                    <li>
                      <strong>{summary.recurringCount} recurring</strong> expense(s) — generated every month at their standard amount; any unpaid balance from this month is added on top
                    </li>
                  )}
                  {summary.unpaidFixedCount > 0 && (
                    <li>
                      <strong>{summary.unpaidFixedCount} fixed</strong> expense(s) still unpaid — only the outstanding balance is carried forward
                    </li>
                  )}
                </ul>
                <p className="text-xs text-muted-foreground">Already-paid amounts stay in {formatMonth(activeMonth)}. Duplicates are skipped automatically.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => carryMutation.mutate()} disabled={carryMutation.isPending}>
              {carryMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Generate Next Month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

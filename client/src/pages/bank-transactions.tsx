import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Upload, Search, Check, X, Edit2, ArrowUpDown, FileSpreadsheet, CheckSquare, RefreshCw, Building2, ArrowRight, Filter, Users, ChevronDown, ChevronUp, Link as LinkIcon, Unlink, ChevronsUpDown } from "lucide-react";
import { groupAccountsByParent } from "@/lib/account-hierarchy";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BankTransaction {
  id: string;
  importId: string;
  bankAccountId: string;
  txnDate: string;
  valueDate: string;
  description: string;
  reference: string | null;
  branchCode: string | null;
  debit: string;
  credit: string;
  balance: string;
  category: string | null;
  matchedAccountId: string | null;
  matchedAccountName: string | null;
  memo: string | null;
  status: string;
  journalEntryId: string | null;
  reconciledWith: string | null;
  reconciledSourceId: string | null;
  reconciledDetails: string | null;
  createdAt: string;
}

interface BankImport {
  id: string;
  fileName: string;
  bankAccountId: string;
  bankName: string | null;
  accountNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  totalRows: number;
  duplicateCount: number;
  createdAt: string;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  subType: string;
  nodeType?: string;
  parentId?: string | null;
  level?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  upi_receipt: "UPI Receipt",
  neft_receipt: "NEFT Receipt",
  imps_receipt: "IMPS Receipt",
  imps_transfer: "IMPS Transfer",
  imps_payment: "IMPS Payment",
  inb_transfer: "Net Banking Transfer",
  inb_receipt: "Net Banking Receipt",
  rtgs_transfer: "RTGS Transfer",
  rtgs_receipt: "RTGS Receipt",
  bank_transfer_in: "Bank Transfer In",
  bank_transfer_out: "Bank Transfer Out",
  internal_transfer: "Internal Transfer",
  cash_deposit: "Cash Deposit",
  atm_withdrawal: "ATM Withdrawal",
  withdrawal: "Withdrawal",
  emi_debit: "EMI / Loan Debit",
  loan_interest: "Loan Interest",
  loan_interest_payment: "Interest Payment",
  loan_repayment: "Loan Repayment",
  penal_charges: "Penal Charges",
  interest_adjustment: "Interest Adjustment",
  interest_reversal: "Interest Reversal",
  salary_payment: "Salary Payment",
  rent_payment: "Rent Payment",
  gst_payment: "GST Payment",
  tax_payment: "Tax Payment",
  advertising: "Advertising",
  telephone: "Telephone",
  travel: "Travel",
  card_expense: "Card Expense",
  cheque_deposit: "Cheque Deposit",
  cheque_return: "Cheque Return",
  bank_charges: "Bank Charges",
  electricity: "Electricity",
  imps_reversal: "IMPS Reversal",
  bulk_posting: "Bulk Posting",
  director_loan: "Director / Promoter Loan",
  payment_received: "Payment Received",
  advance_received: "Advance Received",
  spare_part_purchase: "Spare Part Purchase",
  raw_material_purchase: "Raw Material Purchase",
};

const ACCOUNT_BADGE_STYLES: Record<string, { label: string; className: string }> = {
  '1002': { label: 'Current A/c', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  '1003': { label: 'Savings A/c', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  '1004': { label: 'Cash Credit', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  '2401': { label: 'Term Loan', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
};

const STATUS_COLORS: Record<string, string> = {
  needs_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  unmatched: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  posted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reconciled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  ignored: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export default function BankTransactionsPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editTxn, setEditTxn] = useState<BankTransaction | null>(null);
  const [editAccountId, setEditAccountId] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [uploadBankAccountId, setUploadBankAccountId] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [importResult, setImportResult] = useState<{ totalRows: number; duplicateCount: number; message: string } | null>(null);
  const [showDirectorLoans, setShowDirectorLoans] = useState(false);
  const [showManualReconcile, setShowManualReconcile] = useState<BankTransaction | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const { data: imports = [] } = useQuery<BankImport[]>({
    queryKey: ['/api/bank-statement-imports'],
  });

  const { data: transactions = [], isLoading } = useQuery<BankTransaction[]>({
    queryKey: ['/api/bank-transactions', selectedImportId, statusFilter, accountFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedImportId !== "all") params.set("importId", selectedImportId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (accountFilter !== "all") params.set("bankAccountId", accountFilter);
      const res = await fetch(`/api/bank-transactions?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ['/api/chart-of-accounts-list'],
  });

  const bankAccounts = accounts.filter(a => 
    a.code === '1002' || a.code === '1003' || a.code === '1004' || a.code === '2401' ||
    a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('loan')
  );

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/bank-transactions/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/bank-statement-imports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      toast({ title: "Import Complete", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PATCH', `/api/bank-transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      setEditTxn(null);
      toast({ title: "Updated" });
    },
  });

  const postMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest('POST', '/api/bank-transactions/post-to-journal', { transactionIds: ids });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      setSelectedIds(new Set());
      toast({ title: "Posted to Journal", description: `${data.posted} entries created${data.errors > 0 ? `, ${data.errors} errors` : ''}` });
    },
    onError: (err: any) => {
      toast({ title: "Post Failed", description: err.message, variant: "destructive" });
    },
  });

  const recategorizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/bank-transactions/recategorize');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      toast({ title: "Re-categorized", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async (bankAccountId?: string) => {
      const res = await apiRequest('POST', '/api/bank-transactions/reconcile', { bankAccountId: bankAccountId || undefined });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      toast({ title: "Auto-Reconcile Complete", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Reconcile Failed", description: err.message, variant: "destructive" });
    },
  });

  const manualReconcileMutation = useMutation({
    mutationFn: async ({ txnId, sourceType, sourceId }: { txnId: string; sourceType: string; sourceId: string }) => {
      const res = await apiRequest('POST', `/api/bank-transactions/${txnId}/reconcile-manual`, { sourceType, sourceId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      setShowManualReconcile(null);
      setSelectedPaymentId("");
      toast({ title: "Reconciled", description: data.details });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const unreconcileMutation = useMutation({
    mutationFn: async (txnId: string) => {
      const res = await apiRequest('POST', `/api/bank-transactions/${txnId}/unreconcile`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions/unreconciled-payments'] });
      toast({ title: "Un-reconciled", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: unreconciledPayments } = useQuery<{ payments: any[]; advances: any[]; spareParts: any[]; rawMaterials: any[] }>({
    queryKey: ['/api/bank-transactions/unreconciled-payments'],
    enabled: !!showManualReconcile,
  });

  const handleUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast({ title: "No file selected", variant: "destructive" });
    if (!uploadBankAccountId) return toast({ title: "Select a bank account", variant: "destructive" });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bankAccountId', uploadBankAccountId);
    uploadMutation.mutate(formData);
  };

  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, string>();
    for (const t of transactions) {
      if (t.txnDate) {
        const parts = t.txnDate.split('-');
        if (parts.length >= 2) {
          const key = `${parts[0]}-${parts[1]}`;
          if (!monthSet.has(key)) {
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
            const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
            monthSet.set(key, label);
          }
        }
      }
    }
    return Array.from(monthSet.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, label]) => ({ value, label }));
  }, [transactions]);

  const filtered = transactions.filter(t => {
    if (monthFilter !== "all" && t.txnDate) {
      const parts = t.txnDate.split('-');
      const txnMonth = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '';
      if (txnMonth !== monthFilter) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return t.description.toLowerCase().includes(term) || 
             (t.reference || '').toLowerCase().includes(term) ||
             (t.matchedAccountName || '').toLowerCase().includes(term);
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const selectable = filtered.filter(t => t.status !== 'posted' && t.status !== 'ignored' && t.status !== 'reconciled');
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map(t => t.id)));
    }
  };

  const approveSelected = () => {
    selectedIds.forEach(id => {
      updateMutation.mutate({ id, data: { status: 'approved' } });
    });
    setSelectedIds(new Set());
  };

  const postSelected = () => {
    const ids = Array.from(selectedIds).filter(id => {
      const txn = transactions.find(t => t.id === id);
      return txn && txn.matchedAccountId && txn.status !== 'posted';
    });
    if (ids.length === 0) return toast({ title: "No valid transactions to post", description: "Ensure selected items have matched accounts and are not already posted.", variant: "destructive" });
    postMutation.mutate(ids);
  };

  const openEdit = (txn: BankTransaction) => {
    setEditTxn(txn);
    setEditAccountId(txn.matchedAccountId || '');
    setEditMemo(txn.memo || '');
    setEditCategory(txn.category || '');
  };

  const saveEdit = () => {
    if (!editTxn) return;
    const selectedAccount = accounts.find(a => a.id === editAccountId);
    updateMutation.mutate({
      id: editTxn.id,
      data: {
        matchedAccountId: editAccountId || null,
        matchedAccountName: selectedAccount?.name || null,
        memo: editMemo || null,
        category: editCategory || null,
        status: editAccountId ? 'needs_review' : 'unmatched',
      },
    });
  };

  const formatAmount = (val: string) => {
    const num = parseFloat(val || '0');
    return num > 0 ? num.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '';
  };

  const summaryStats = {
    total: filtered.length,
    needsReview: filtered.filter(t => t.status === 'needs_review').length,
    unmatched: filtered.filter(t => t.status === 'unmatched').length,
    approved: filtered.filter(t => t.status === 'approved').length,
    posted: filtered.filter(t => t.status === 'posted').length,
    reconciled: filtered.filter(t => t.status === 'reconciled').length,
  };

  const directorLoanSummary = transactions
    .filter(t => t.category === 'director_loan' && t.matchedAccountName)
    .reduce((acc, t) => {
      const name = t.matchedAccountName!;
      if (!acc[name]) acc[name] = { name, totalAmount: 0, count: 0 };
      acc[name].totalAmount += parseFloat(t.credit || '0');
      acc[name].count += 1;
      return acc;
    }, {} as Record<string, { name: string; totalAmount: number; count: number }>);

  const directorLoanEntries = Object.values(directorLoanSummary).sort((a, b) => b.totalAmount - a.totalAmount);
  const totalDirectorLoans = directorLoanEntries.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div className="p-3 space-y-3 max-w-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Bank Statement Import</h1>
          <p className="text-xs text-muted-foreground">Upload bank statements, review & categorize transactions, then post to journal</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => reconcileMutation.mutate(accountFilter !== 'all' ? accountFilter : undefined)} disabled={reconcileMutation.isPending} data-testid="button-auto-reconcile">
            {reconcileMutation.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-1" />}
            Auto-Reconcile
          </Button>
          <Button variant="outline" size="sm" onClick={() => recategorizeMutation.mutate()} disabled={recategorizeMutation.isPending} data-testid="button-recategorize">
            {recategorizeMutation.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Re-categorize
          </Button>
          <Button onClick={() => { setShowUploadDialog(true); setImportResult(null); }} data-testid="button-upload-statement">
            <Upload className="w-4 h-4 mr-1" /> Import Statement
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs">
          <Badge variant="secondary">{summaryStats.total} Total</Badge>
          {summaryStats.needsReview > 0 && <Badge className={STATUS_COLORS.needs_review}>{summaryStats.needsReview} Review</Badge>}
          {summaryStats.unmatched > 0 && <Badge className={STATUS_COLORS.unmatched}>{summaryStats.unmatched} Unmatched</Badge>}
          {summaryStats.approved > 0 && <Badge className={STATUS_COLORS.approved}>{summaryStats.approved} Approved</Badge>}
          {summaryStats.reconciled > 0 && <Badge className={STATUS_COLORS.reconciled}>{summaryStats.reconciled} Reconciled</Badge>}
          {summaryStats.posted > 0 && <Badge className={STATUS_COLORS.posted}>{summaryStats.posted} Posted</Badge>}
        </div>
      </div>

      {directorLoanEntries.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-0 cursor-pointer" onClick={() => setShowDirectorLoans(!showDirectorLoans)}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium" data-testid="text-director-loans-title">Director / Promoter Loans</CardTitle>
              <Badge variant="secondary" className="text-xs">{directorLoanEntries.length} directors</Badge>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400" data-testid="text-director-loans-total">
                Total: {totalDirectorLoans.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </span>
            </div>
            <Button size="icon" variant="ghost" data-testid="button-toggle-director-loans">
              {showDirectorLoans ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {showDirectorLoans && (
            <CardContent className="p-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {directorLoanEntries.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between p-2 rounded-md bg-muted/50" data-testid={`card-director-${entry.name}`}>
                    <div>
                      <p className="text-xs font-medium">{entry.name.replace('Loan - ', '')}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.count} transaction{entry.count > 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {entry.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search description, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[220px]" data-testid="select-account-filter">
            <Building2 className="w-4 h-4 mr-1" />
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {bankAccounts.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {ACCOUNT_BADGE_STYLES[a.code]?.label || a.name} ({a.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedImportId} onValueChange={setSelectedImportId}>
          <SelectTrigger className="w-[200px]" data-testid="select-import">
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            <SelectValue placeholder="All Imports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Imports</SelectItem>
            {imports.map(imp => (
              <SelectItem key={imp.id} value={imp.id}>
                {imp.accountNumber ? `...${imp.accountNumber.slice(-6)}` : imp.fileName.substring(0, 20)} ({imp.totalRows})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-month-filter">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={approveSelected} data-testid="button-approve-selected">
            <Check className="w-3 h-3 mr-1" /> Approve
          </Button>
          <Button size="sm" onClick={postSelected} disabled={postMutation.isPending} data-testid="button-post-selected">
            {postMutation.isPending ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <ArrowRight className="w-3 h-3 mr-1" />}
            Post to Journal
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
            selectedIds.forEach(id => updateMutation.mutate({ id, data: { status: 'ignored' } }));
            setSelectedIds(new Set());
          }} data-testid="button-ignore-selected">
            <X className="w-3 h-3 mr-1" /> Ignore
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No transactions found. Import a bank statement to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 w-8">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === filtered.filter(t => t.status !== 'posted' && t.status !== 'ignored' && t.status !== 'reconciled').length}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="p-2 text-left font-medium">Date</th>
                    <th className="p-2 text-left font-medium">Account</th>
                    <th className="p-2 text-left font-medium min-w-[300px]">Description</th>
                    <th className="p-2 text-right font-medium">Debit</th>
                    <th className="p-2 text-right font-medium">Credit</th>
                    <th className="p-2 text-right font-medium">Balance</th>
                    <th className="p-2 text-left font-medium">Category</th>
                    <th className="p-2 text-left font-medium">Mapped Account</th>
                    <th className="p-2 text-center font-medium">Status</th>
                    <th className="p-2 text-center font-medium w-12">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((txn) => (
                    <tr key={txn.id} className="border-b hover-elevate" data-testid={`row-txn-${txn.id}`}>
                      <td className="p-2">
                        {txn.status !== 'posted' && txn.status !== 'ignored' && txn.status !== 'reconciled' && (
                          <Checkbox
                            checked={selectedIds.has(txn.id)}
                            onCheckedChange={() => toggleSelect(txn.id)}
                            data-testid={`checkbox-txn-${txn.id}`}
                          />
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap">{txn.txnDate}</td>
                      <td className="p-2">
                        {(() => {
                          const acct = accounts.find(a => a.id === txn.bankAccountId);
                          const style = acct ? ACCOUNT_BADGE_STYLES[acct.code] : null;
                          return style ? (
                            <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${style.className}`} data-testid={`badge-account-${txn.id}`}>
                              {style.label}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{acct?.name || '—'}</span>
                          );
                        })()}
                      </td>
                      <td className="p-2">
                        <div className="max-w-[350px] truncate" title={txn.description}>{txn.description}</div>
                        {txn.reference && <div className="text-[10px] text-muted-foreground truncate max-w-[350px]">{txn.reference}</div>}
                        {txn.memo && <div className="text-[10px] text-blue-600 dark:text-blue-400 italic">{txn.memo}</div>}
                      </td>
                      <td className="p-2 text-right font-mono text-red-600 dark:text-red-400">{formatAmount(txn.debit)}</td>
                      <td className="p-2 text-right font-mono text-green-600 dark:text-green-400">{formatAmount(txn.credit)}</td>
                      <td className="p-2 text-right font-mono">{formatAmount(txn.balance)}</td>
                      <td className="p-2">
                        {txn.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_LABELS[txn.category] || txn.category}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        {txn.matchedAccountName ? (
                          <span className="text-[11px]">{txn.matchedAccountName}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Not mapped</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <Badge className={`text-[10px] ${STATUS_COLORS[txn.status] || ''}`}>
                          {txn.status === 'needs_review' ? 'Review' : txn.status}
                        </Badge>
                        {txn.status === 'reconciled' && txn.reconciledWith && (
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5" data-testid={`text-reconciled-${txn.id}`}>
                            {({
                              invoice_payment: 'Invoice Payment',
                              customer_advance: 'Customer Advance',
                              spare_part_purchase: 'Spare Part',
                              raw_material_receipt: 'Raw Material',
                            } as Record<string, string>)[txn.reconciledWith] || txn.reconciledWith}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {txn.status !== 'posted' && txn.status !== 'reconciled' && (
                          <Button size="icon" variant="ghost" onClick={() => openEdit(txn)} data-testid={`button-edit-${txn.id}`}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                        {txn.status !== 'posted' && txn.status !== 'reconciled' && (parseFloat(txn.credit || '0') > 0 || parseFloat(txn.debit || '0') > 0) && (
                          <Button size="icon" variant="ghost" onClick={() => { setShowManualReconcile(txn); setSelectedPaymentId(""); }} data-testid={`button-manual-reconcile-${txn.id}`} title="Manual Reconcile">
                            <LinkIcon className="w-3 h-3" />
                          </Button>
                        )}
                        {txn.status === 'reconciled' && (
                          <Button size="icon" variant="ghost" onClick={() => unreconcileMutation.mutate(txn.id)} disabled={unreconcileMutation.isPending} data-testid={`button-unreconcile-${txn.id}`} title="Remove reconciliation">
                            <Unlink className="w-3 h-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Bank Statement</DialogTitle>
            <DialogDescription>Upload an XLS bank statement file (tab-separated format like SBI statements)</DialogDescription>
          </DialogHeader>
          {importResult ? (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">{importResult.message}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <Badge variant="secondary">{importResult.totalRows} imported</Badge>
                  {importResult.duplicateCount > 0 && <Badge variant="outline">{importResult.duplicateCount} duplicates</Badge>}
                </div>
              </div>
              <Button className="w-full" onClick={() => { setShowUploadDialog(false); setImportResult(null); }} data-testid="button-close-import">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Bank Account</Label>
                <Select value={uploadBankAccountId} onValueChange={setUploadBankAccountId}>
                  <SelectTrigger data-testid="select-bank-account">
                    <Building2 className="w-4 h-4 mr-1" />
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.length > 0 ? bankAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                    )) : accounts.filter(a => a.nodeType !== 'group' && a.accountType === 'asset').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Statement File</Label>
                <Input type="file" ref={fileRef} accept=".xls,.xlsx,.csv,.tsv,.txt" data-testid="input-file" />
                <p className="text-[10px] text-muted-foreground">Supports SBI-format XLS (tab-separated) statements</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)} data-testid="button-cancel-upload">Cancel</Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending} data-testid="button-confirm-upload">
                  {uploadMutation.isPending ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4 mr-1" /> Import</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTxn} onOpenChange={(open) => { if (!open) setEditTxn(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              {editTxn && (
                <span className="block mt-1 text-xs">{editTxn.txnDate} - {parseFloat(editTxn.debit) > 0 ? `Debit: ${formatAmount(editTxn.debit)}` : `Credit: ${formatAmount(editTxn.credit)}`}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {editTxn && (
            <div className="space-y-3">
              <div className="p-2 rounded-md bg-muted text-xs max-h-[80px] overflow-y-auto">
                {editTxn.description}
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={categoryOpen} className="w-full justify-between font-normal" data-testid="select-edit-category">
                      {editCategory && editCategory !== 'none' ? CATEGORY_LABELS[editCategory] || editCategory : "Select category"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search category..." data-testid="input-search-category" />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="none" onSelect={() => { setEditCategory("none"); setCategoryOpen(false); }}>
                            <Check className={`mr-2 h-4 w-4 ${editCategory === 'none' || !editCategory ? 'opacity-100' : 'opacity-0'}`} />
                            -- No category --
                          </CommandItem>
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <CommandItem key={key} value={label} onSelect={() => { setEditCategory(key); setCategoryOpen(false); }}>
                              <Check className={`mr-2 h-4 w-4 ${editCategory === key ? 'opacity-100' : 'opacity-0'}`} />
                              {label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {editCategory === 'director_loan' && (() => {
                const directorAccounts = accounts.filter(a => a.code.startsWith('2402') && a.code !== '2402');
                return directorAccounts.length > 0 ? (
                  <div className="space-y-1">
                    <Label>Assign to Director</Label>
                    <div className="grid grid-cols-2 gap-1">
                      {directorAccounts.map(da => (
                        <Button
                          key={da.id}
                          size="sm"
                          variant={editAccountId === da.id ? "default" : "outline"}
                          className="text-xs justify-start"
                          onClick={() => setEditAccountId(da.id)}
                          data-testid={`button-director-${da.code}`}
                        >
                          <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                          {da.name.replace('Loan - ', '')}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="space-y-1">
                <Label>Map to Account</Label>
                <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={accountOpen} className="w-full justify-between font-normal" data-testid="select-edit-account">
                      {editAccountId && editAccountId !== 'none'
                        ? (() => { const a = accounts.find(a => a.id === editAccountId); return a ? `${a.code} - ${a.name}` : "Select account"; })()
                        : "Select account"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search account..." data-testid="input-search-account" />
                      <CommandList>
                        <CommandEmpty>No account found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="not-mapped" onSelect={() => { setEditAccountId("none"); setAccountOpen(false); }}>
                            <Check className={`mr-2 h-4 w-4 ${editAccountId === 'none' || !editAccountId ? 'opacity-100' : 'opacity-0'}`} />
                            -- Not mapped --
                          </CommandItem>
                        </CommandGroup>
                        {groupAccountsByParent(accounts).map(group => (
                          <CommandGroup key={group.label} heading={group.label}>
                            {group.accounts.map(a => (
                              <CommandItem key={a.id} value={`${a.code} ${a.name}`} onSelect={() => { setEditAccountId(a.id); setAccountOpen(false); }}>
                                <Check className={`mr-2 h-4 w-4 ${editAccountId === a.id ? 'opacity-100' : 'opacity-0'}`} />
                                {a.code} - {a.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Memo / Notes</Label>
                <Textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  placeholder="Add a note for this transaction..."
                  className="text-xs"
                  data-testid="textarea-edit-memo"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditTxn(null)} data-testid="button-cancel-edit">Cancel</Button>
                <Button onClick={saveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
                  {updateMutation.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showManualReconcile} onOpenChange={(open) => { if (!open) { setShowManualReconcile(null); setSelectedPaymentId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Reconcile</DialogTitle>
            <DialogDescription>
              Match this bank transaction to an existing payment recorded in the system.
            </DialogDescription>
          </DialogHeader>
          {showManualReconcile && (() => {
            const isDebit = parseFloat(showManualReconcile.debit || '0') > 0;
            const isCredit = parseFloat(showManualReconcile.credit || '0') > 0;
            return (
            <div className="space-y-3">
              <div className="p-2 rounded-md bg-muted text-xs space-y-1">
                <p><strong>Date:</strong> {showManualReconcile.txnDate}</p>
                <p><strong>Amount:</strong> {isDebit ? formatAmount(showManualReconcile.debit) + ' (Debit)' : formatAmount(showManualReconcile.credit) + ' (Credit)'}</p>
                <p className="truncate"><strong>Description:</strong> {showManualReconcile.description}</p>
              </div>

              {unreconciledPayments && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {isCredit && unreconciledPayments.payments.length > 0 && (
                    <>
                      <Label className="text-xs text-muted-foreground">Invoice Payments (Credits)</Label>
                      {unreconciledPayments.payments.map((p: any) => (
                        <div
                          key={`invoice_payment:${p.id}`}
                          className={`p-2 rounded-md border text-xs cursor-pointer ${selectedPaymentId === `invoice_payment:${p.id}` ? 'border-primary bg-primary/5' : 'hover-elevate'}`}
                          onClick={() => setSelectedPaymentId(`invoice_payment:${p.id}`)}
                          data-testid={`option-payment-${p.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{p.customerName || 'Unknown'}</span>
                            <span className="font-mono text-green-600 dark:text-green-400">
                              {(p.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            {p.paymentDate?.slice(0, 10)} {p.paymentMethod && `| ${p.paymentMethod}`} {p.referenceNumber && `| Ref: ${p.referenceNumber}`}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {isCredit && unreconciledPayments.advances.length > 0 && (
                    <>
                      <Label className="text-xs text-muted-foreground">Customer Advances (Credits)</Label>
                      {unreconciledPayments.advances.map((a: any) => (
                        <div
                          key={`customer_advance:${a.id}`}
                          className={`p-2 rounded-md border text-xs cursor-pointer ${selectedPaymentId === `customer_advance:${a.id}` ? 'border-primary bg-primary/5' : 'hover-elevate'}`}
                          onClick={() => setSelectedPaymentId(`customer_advance:${a.id}`)}
                          data-testid={`option-advance-${a.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{a.customerName || 'Unknown'}</span>
                            <span className="font-mono text-green-600 dark:text-green-400">
                              {(a.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            {a.receiptDate?.slice(0, 10)} {a.paymentMethod && `| ${a.paymentMethod}`} {a.referenceNumber && `| Ref: ${a.referenceNumber}`}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {isDebit && unreconciledPayments.spareParts && unreconciledPayments.spareParts.length > 0 && (
                    <>
                      <Label className="text-xs text-muted-foreground">Spare Part Purchases (Debits)</Label>
                      {unreconciledPayments.spareParts.map((spe: any) => (
                        <div
                          key={`spare_part_purchase:${spe.id}`}
                          className={`p-2 rounded-md border text-xs cursor-pointer ${selectedPaymentId === `spare_part_purchase:${spe.id}` ? 'border-primary bg-primary/5' : 'hover-elevate'}`}
                          onClick={() => setSelectedPaymentId(`spare_part_purchase:${spe.id}`)}
                          data-testid={`option-spare-${spe.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{spe.partName}</span>
                            <span className="font-mono text-red-600 dark:text-red-400">
                              {(spe.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            {spe.purchaseDate?.slice(0, 10)} {spe.vendorName && `| ${spe.vendorName}`}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {isDebit && unreconciledPayments.rawMaterials && unreconciledPayments.rawMaterials.length > 0 && (
                    <>
                      <Label className="text-xs text-muted-foreground">Raw Material Receipts (Debits)</Label>
                      {unreconciledPayments.rawMaterials.map((mat: any) => (
                        <div
                          key={`raw_material_receipt:${mat.id}`}
                          className={`p-2 rounded-md border text-xs cursor-pointer ${selectedPaymentId === `raw_material_receipt:${mat.id}` ? 'border-primary bg-primary/5' : 'hover-elevate'}`}
                          onClick={() => setSelectedPaymentId(`raw_material_receipt:${mat.id}`)}
                          data-testid={`option-rawmat-${mat.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{mat.materialName} ({mat.materialCode})</span>
                            <span className="font-mono text-red-600 dark:text-red-400">
                              {(mat.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            {mat.openingDate} {mat.supplier && `| ${mat.supplier}`}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {(() => {
                    const hasCredits = isCredit && ((unreconciledPayments.payments?.length || 0) > 0 || (unreconciledPayments.advances?.length || 0) > 0);
                    const hasDebits = isDebit && ((unreconciledPayments.spareParts?.length || 0) > 0 || (unreconciledPayments.rawMaterials?.length || 0) > 0);
                    if (!hasCredits && !hasDebits) return <p className="text-xs text-muted-foreground text-center p-4">No matching unreconciled records found.</p>;
                    return null;
                  })()}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowManualReconcile(null); setSelectedPaymentId(""); }} data-testid="button-cancel-reconcile">Cancel</Button>
                <Button
                  onClick={() => {
                    if (!selectedPaymentId || !showManualReconcile) return;
                    const colonIdx = selectedPaymentId.indexOf(':');
                    const sourceType = selectedPaymentId.substring(0, colonIdx);
                    const sourceId = selectedPaymentId.substring(colonIdx + 1);
                    manualReconcileMutation.mutate({ txnId: showManualReconcile.id, sourceType, sourceId });
                  }}
                  disabled={!selectedPaymentId || manualReconcileMutation.isPending}
                  data-testid="button-confirm-reconcile"
                >
                  {manualReconcileMutation.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-1" />}
                  Reconcile
                </Button>
              </DialogFooter>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

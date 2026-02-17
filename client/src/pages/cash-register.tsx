import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  Plus, Upload, Search, Eye, Check, X, Receipt, Calendar, User, 
  Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet,
  AlertCircle, TrendingUp, TrendingDown, DollarSign, CheckCircle2, Lock,
  AlertTriangle, Edit, Save, Trash2, PiggyBank, ArrowLeft, ChevronRight,
  Paperclip, FileText, CreditCard, Banknote, Printer
} from "lucide-react";
import type { CashRegisterDay, CashRegisterTransaction, CashRegisterExpenseItem, PaginationMeta } from "@shared/schema";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

interface DayWithTransactions extends CashRegisterDay {
  transactions?: (CashRegisterTransaction & { items?: CashRegisterExpenseItem[] })[];
}

interface Discrepancy {
  date: string;
  type: 'cb_mismatch' | 'ob_mismatch';
  description: string;
  expected: number;
  actual: number;
  difference: number;
}

interface ImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  uniqueSalespersons: string[];
  unmappedSalespersons: string[];
  dateRange: { start: string; end: string } | null;
  rows: ParsedRow[];
  errors: string[];
  discrepancies: Discrepancy[];
}

interface ParsedRow {
  rowNumber: number;
  date: string;
  salespersonName: string;
  openingBalance: number;
  depositAmount: number;
  receivedCash: number;
  expenses: number;
  itemDetails: string;
  parsedItems: { label: string; amount: number; rawText: string }[];
  balanceAmount: number;
  sentToTulasi: number;
  calculatedBalance: number;
  hasVariance: boolean;
  variance: number;
  errors: string[];
  warnings: string[];
}

function formatCurrency(rupees: number): string {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(rupees);
}

export default function CashRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('cash_register', 'create');
  const canEdit = hasPermission('cash_register', 'edit');
  const canDelete = hasPermission('cash_register', 'delete');
  // Use delete permission as indicator for admin-level access
  const hasAdminAccess = canDelete;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<DayWithTransactions | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // New transaction form states
  const [newCashReceived, setNewCashReceived] = useState({ amount: '', reference: '', description: '', sourceType: 'sale_cash', partyName: '' });
  // Support multiple expense line items - each will create its own voucher
  const [expenseItems, setExpenseItems] = useState([{ amount: '', reference: '', description: '', partyName: '' }]);
  const [newTransfer, setNewTransfer] = useState({ amount: '', transferTo: '', description: '' });
  const [isAddingCash, setIsAddingCash] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [isSavingExpenses, setIsSavingExpenses] = useState(false);
  
  // Document upload states
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null); // transaction ID being uploaded to
  
  // Reconciliation dialog states
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [actualBalance, setActualBalance] = useState('');
  const [varianceNotes, setVarianceNotes] = useState('');

  const { data: days = [], isLoading: daysLoading, refetch: refetchDays } = useQuery<CashRegisterDay[]>({
    queryKey: ['/api/cash-register/days'],
  });

  // New Day dialog states
  const [newDayDate, setNewDayDate] = useState('');
  const [newDayIsHoliday, setNewDayIsHoliday] = useState(false);

  // Get active days (matching backend logic)
  const activeDays = days.filter(d => d.recordStatus === 1);

  // Get last day info for validation and auto-fill
  const getLastDay = () => {
    if (activeDays.length === 0) return null;
    const sortedDays = [...activeDays].sort((a, b) => 
      new Date(b.registerDate).getTime() - new Date(a.registerDate).getTime()
    );
    return sortedDays[0];
  };

  const getNextAvailableDate = () => {
    const lastDay = getLastDay();
    if (!lastDay) return format(new Date(), 'yyyy-MM-dd');
    const lastDate = new Date(lastDay.registerDate);
    lastDate.setDate(lastDate.getDate() + 1);
    return format(lastDate, 'yyyy-MM-dd');
  };

  const getOpeningBalance = () => {
    const lastDay = getLastDay();
    return lastDay ? lastDay.closingBalance : 0;
  };

  const canCreateNewDay = () => {
    const lastDay = getLastDay();
    if (!lastDay) return { allowed: true, reason: '' };
    if (lastDay.status === 'open') {
      return { allowed: false, reason: `Previous day (${lastDay.registerDate}) must be closed first` };
    }
    return { allowed: true, reason: '' };
  };

  // Create new day mutation
  const createDayMutation = useMutation({
    mutationFn: async (data: { registerDate: string; openingBalance: number; isHoliday: number }) => {
      const response = await apiRequest('POST', '/api/cash-register/days', {
        ...data,
        salespersonName: 'BUSINESS',
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      toast({ title: "Success", description: data.isHoliday === 1 ? "Holiday day created and auto-closed" : "New day created" });
      setIsCreateOpen(false);
      setNewDayDate('');
      setNewDayIsHoliday(false);
      if (data.isHoliday !== 1) {
        viewDayDetails(data.id);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: async (data: { dayId: string; transactionType: string; amount: number; reference?: string; description?: string; transferTo?: string; sourceType?: string }) => {
      const response = await apiRequest('POST', `/api/cash-register/days/${data.dayId}/transactions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      if (selectedDay) {
        viewDayDetails(selectedDay.id);
      }
      toast({ title: "Success", description: "Transaction added" });
      // Reset forms
      setNewCashReceived({ amount: '', reference: '', description: '', sourceType: 'sale_cash' });
      setExpenseItems([{ amount: '', reference: '', description: '' }]);
      setNewTransfer({ amount: '', transferTo: '', description: '' });
      setIsAddingCash(false);
      setIsAddingExpense(false);
      setIsAddingTransfer(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ transactionId, file }: { transactionId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/cash-register/transactions/${transactionId}/document`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      if (selectedDay) {
        viewDayDetails(selectedDay.id);
      }
      toast({ title: "Success", description: "Document uploaded" });
      setUploadingDoc(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUploadingDoc(null);
    },
  });

  // Close day mutation
  const closeDayMutation = useMutation({
    mutationFn: async ({ dayId, actualClosingBalance, varianceNotes }: { dayId: string; actualClosingBalance: number; varianceNotes: string }) => {
      const response = await apiRequest('POST', `/api/cash-register/days/${dayId}/close`, {
        actualClosingBalance,
        varianceNotes,
      });
      return response.json();
    },
    onSuccess: (data: { closedDay: any; nextDay: any; fixedDays?: any[] }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      let description = "Day closed successfully.";
      if (data.nextDay) {
        description = "Day closed. Next day created with opening balance carried forward.";
      }
      if (data.fixedDays && data.fixedDays.length > 0) {
        description = `Day closed. Opening balances auto-fixed for ${data.fixedDays.length} day(s) to maintain continuity.`;
      }
      toast({ title: "Day Closed", description });
      setSelectedDay(null);
      setIsReconcileOpen(false);
      setActualBalance('');
      setVarianceNotes('');
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest('DELETE', `/api/cash-register/transactions/${transactionId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      if (selectedDay) {
        viewDayDetails(selectedDay.id);
      }
      toast({ title: "Success", description: "Transaction deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async (data: { id: string; amount?: number; reference?: string; description?: string; transferTo?: string; sourceType?: string }) => {
      const response = await apiRequest('PUT', `/api/cash-register/transactions/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      if (selectedDay) {
        viewDayDetails(selectedDay.id);
      }
      toast({ title: "Success", description: "Transaction updated" });
      setEditingTransaction(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Clear discrepancy mutation
  const clearDiscrepancyMutation = useMutation({
    mutationFn: async (dayId: string) => {
      const response = await apiRequest('POST', `/api/cash-register/days/${dayId}/clear-discrepancy`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      if (selectedDay) {
        viewDayDetails(selectedDay.id);
      }
      toast({ title: "Success", description: "Discrepancy remarks cleared" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Edit transaction state
  const [editingTransaction, setEditingTransaction] = useState<{ id: string; type: string; amount: string; reference: string; description: string; transferTo: string; sourceType: string; partyName: string } | null>(null);

  const startEditTransaction = (txn: CashRegisterTransaction & { items?: CashRegisterExpenseItem[] }) => {
    setEditingTransaction({
      id: txn.id,
      type: txn.transactionType,
      amount: (txn.amount || 0).toString(),
      reference: txn.reference || '',
      description: txn.description || '',
      transferTo: txn.transferTo || '',
      sourceType: txn.sourceType || 'sale_cash',
      partyName: txn.partyName || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingTransaction) return;
    updateTransactionMutation.mutate({
      id: editingTransaction.id,
      amount: Math.round(parseFloat(editingTransaction.amount || '0')),
      reference: editingTransaction.reference,
      description: editingTransaction.description,
      transferTo: editingTransaction.transferTo,
      sourceType: editingTransaction.sourceType,
      partyName: editingTransaction.partyName || undefined,
    });
  };

  const handleOpenNewDayDialog = () => {
    const createCheck = canCreateNewDay();
    if (!createCheck.allowed) {
      toast({ title: "Cannot create new day", description: createCheck.reason, variant: "destructive" });
      return;
    }
    setNewDayDate(getNextAvailableDate());
    setNewDayIsHoliday(false);
    setIsCreateOpen(true);
  };

  const handleCreateNewDay = () => {
    if (!newDayDate) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    const lastDay = getLastDay();
    if (lastDay) {
      const lastDate = new Date(lastDay.registerDate);
      const selectedDate = new Date(newDayDate);
      if (selectedDate <= lastDate) {
        toast({ title: "Error", description: `Date must be after ${lastDay.registerDate}`, variant: "destructive" });
        return;
      }
    }
    createDayMutation.mutate({
      registerDate: newDayDate,
      openingBalance: getOpeningBalance(),
      isHoliday: newDayIsHoliday ? 1 : 0,
    });
  };

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      const response = await apiRequest('POST', '/api/cash-register/clear-data', {});
      const result = await response.json();
      
      if (result.success) {
        toast({ title: "Data Cleared", description: result.message });
        queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
        setIsClearDialogOpen(false);
      } else {
        throw new Error(result.message || 'Failed to clear data');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsClearing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsImporting(true);
      const response = await fetch('/api/cash-register/import/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to parse file');
      }

      const preview = await response.json();
      setImportPreview(preview);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview) return;

    try {
      setIsImporting(true);
      const response = await apiRequest('POST', '/api/cash-register/import/commit', {
        rows: importPreview.rows.filter(r => r.errors.length === 0),
        fileName: importPreview.fileName,
        discrepancies: importPreview.discrepancies || [],
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({ 
          title: "Import Complete", 
          description: `Imported ${result.daysCreated} days, ${result.transactionsCreated} transactions` 
        });
        queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
        setIsImportOpen(false);
        setImportPreview(null);
      } else {
        toast({ title: "Import Failed", description: result.errors.join(', '), variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const viewDayDetails = async (dayId: string) => {
    try {
      const response = await fetch(`/api/cash-register/days/${dayId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load day details');
      const data = await response.json();
      setSelectedDay(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddCashReceived = () => {
    if (!selectedDay || !newCashReceived.amount) return;
    addTransactionMutation.mutate({
      dayId: selectedDay.id,
      transactionType: 'cash_received',
      amount: Math.round(parseFloat(newCashReceived.amount)),
      reference: newCashReceived.reference,
      description: newCashReceived.description,
      sourceType: newCashReceived.sourceType,
      partyName: newCashReceived.partyName || undefined,
    });
  };

  const handleDocumentUpload = (transactionId: string, file: File) => {
    setUploadingDoc(transactionId);
    uploadDocumentMutation.mutate({ transactionId, file });
  };

  const getSourceTypeLabel = (sourceType: string | null | undefined) => {
    switch (sourceType) {
      case 'sale_cash': return 'Sale Cash';
      case 'secondary_sale': return 'Secondary Sale';
      case 'upi': return 'UPI';
      case 'bank_transfer': return 'Bank Transfer';
      case 'other': return 'Other';
      default: return sourceType || '';
    }
  };

  // Handle adding multiple expense items - each creates its own voucher
  const handleAddExpenses = async () => {
    if (!selectedDay) return;
    
    // Filter out empty items
    const validItems = expenseItems.filter(item => item.amount && parseFloat(item.amount) > 0);
    
    if (validItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one expense item", variant: "destructive" });
      return;
    }
    
    setIsSavingExpenses(true);
    
    try {
      // Create each expense item as a separate transaction with its own voucher
      for (const item of validItems) {
        await apiRequest('POST', `/api/cash-register/days/${selectedDay.id}/transactions`, {
          dayId: selectedDay.id,
          transactionType: 'expense',
          amount: Math.round(parseFloat(item.amount)),
          reference: item.reference,
          description: item.description,
          partyName: item.partyName || undefined,
        });
      }
      
      // Success - refresh and reset
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      viewDayDetails(selectedDay.id);
      toast({ 
        title: "Success", 
        description: `${validItems.length} expense${validItems.length > 1 ? 's' : ''} added with individual vouchers` 
      });
      setExpenseItems([{ amount: '', reference: '', description: '', partyName: '' }]);
      setIsAddingExpense(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add expenses", variant: "destructive" });
    } finally {
      setIsSavingExpenses(false);
    }
  };
  
  // Add new expense line item
  const addExpenseLineItem = () => {
    setExpenseItems(prev => [...prev, { amount: '', reference: '', description: '', partyName: '' }]);
  };
  
  // Remove expense line item
  const removeExpenseLineItem = (index: number) => {
    if (expenseItems.length === 1) return; // Keep at least one
    setExpenseItems(prev => prev.filter((_, i) => i !== index));
  };
  
  // Update expense line item
  const updateExpenseLineItem = (index: number, field: string, value: string) => {
    setExpenseItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleAddTransfer = () => {
    if (!selectedDay || !newTransfer.amount) return;
    addTransactionMutation.mutate({
      dayId: selectedDay.id,
      transactionType: 'transfer',
      amount: Math.round(parseFloat(newTransfer.amount)),
      transferTo: newTransfer.transferTo,
      description: newTransfer.description,
    });
  };

  // Filter and sort days by date (newest first)
  const filteredDays = [...(days as DayWithTransactions[])]
    .filter(day => {
      const matchesSearch = searchQuery === "" || 
        day.registerDate.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || day.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.registerDate).getTime() - new Date(a.registerDate).getTime());

  // Pagination
  const totalPages = Math.ceil(filteredDays.length / pageSize);
  const paginatedDays = filteredDays.slice((page - 1) * pageSize, page * pageSize);

  const calculateTotals = () => {
    const sortedDays = [...filteredDays].sort((a, b) => 
      new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime()
    );
    
    const startingBalance = sortedDays.length > 0 ? sortedDays[0].openingBalance : 0;
    const currentBalance = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].closingBalance : 0;
    const firstDate = sortedDays.length > 0 ? sortedDays[0].registerDate : null;
    const lastDate = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].registerDate : null;
    
    let totalCashReceived = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    filteredDays.forEach(day => {
      totalCashReceived += day.totalCashReceived;
      totalExpenses += day.totalExpenses;
      totalTransfers += day.totalTransfers;
    });

    return { startingBalance, currentBalance, firstDate, lastDate, totalCashReceived, totalExpenses, totalTransfers };
  };

  const totals = calculateTotals();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary" data-testid="badge-status-open">Open</Badge>;
      case 'closed':
        return <Badge variant="default" className="bg-green-600" data-testid="badge-status-closed"><Lock className="w-3 h-3 mr-1" />Closed</Badge>;
      case 'locked':
        return <Badge variant="outline" data-testid="badge-status-locked"><Lock className="w-3 h-3 mr-1" />Locked</Badge>;
      default:
        return <Badge data-testid="badge-status-unknown">{status}</Badge>;
    }
  };

  if (daysLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Day Detail View
  if (selectedDay) {
    const transactions = selectedDay.transactions || [];
    const cashReceivedTxns = transactions.filter(t => t.transactionType === 'cash_received');
    const expenseTxns = transactions.filter(t => t.transactionType === 'expense');
    const transferTxns = transactions.filter(t => t.transactionType === 'transfer');
    
    const calculatedClosing = selectedDay.openingBalance + 
      selectedDay.totalCashReceived - 
      selectedDay.totalExpenses - 
      selectedDay.totalTransfers;
    
    const isDayOpen = selectedDay.status === 'open';

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-day-date">
              {format(new Date(selectedDay.registerDate), 'EEEE, MMMM d, yyyy')}
            </h1>
            <div className="flex items-center gap-2">
              {getStatusBadge(selectedDay.status)}
              {selectedDay.salespersonName !== 'BUSINESS' && (
                <span className="text-muted-foreground text-sm">({selectedDay.salespersonName})</span>
              )}
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Opening Balance</div>
              <div className="text-xl font-bold" data-testid="text-opening">{formatCurrency(selectedDay.openingBalance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" /> Cash Received
              </div>
              <div className="text-xl font-bold text-green-600" data-testid="text-cash-in">+{formatCurrency(selectedDay.totalCashReceived)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1 text-sm text-red-600">
                <TrendingDown className="w-4 h-4" /> Expenses
              </div>
              <div className="text-xl font-bold text-red-600" data-testid="text-expenses">-{formatCurrency(selectedDay.totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <ArrowUpRight className="w-4 h-4" /> Transfers
              </div>
              <div className="text-xl font-bold text-blue-600" data-testid="text-transfers">-{formatCurrency(selectedDay.totalTransfers)}</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5">
            <CardContent className="pt-4">
              <div className="text-sm font-medium">Closing Balance</div>
              <div className="text-xl font-bold" data-testid="text-closing">{formatCurrency(calculatedClosing)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Discrepancy Alert */}
        {(selectedDay as any).hasDiscrepancy === 1 && (selectedDay as any).discrepancyDetails && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Import Discrepancy Detected
                </CardTitle>
                {hasAdminAccess && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => clearDiscrepancyMutation.mutate(selectedDay.id)}
                    disabled={clearDiscrepancyMutation.isPending}
                    data-testid="button-clear-discrepancy"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {clearDiscrepancyMutation.isPending ? 'Clearing...' : 'Mark as Resolved'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-2">
                {((selectedDay as any).discrepancyDetails as { items?: { type: string; description: string; expected: number; actual: number; difference: number }[] })?.items?.map((item: any, idx: number) => (
                  <div key={idx} className="p-2 bg-white/50 dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === 'cb_mismatch' ? 'destructive' : 'outline'} className="text-xs">
                        {item.type === 'cb_mismatch' ? 'Closing Balance Mismatch' : 'Opening Balance Mismatch'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    <div className="flex gap-4 mt-1 text-xs">
                      <span>Expected: <strong>{formatCurrency(item.expected)}</strong></span>
                      <span>Actual: <strong>{formatCurrency(item.actual)}</strong></span>
                      <span className={item.difference > 0 ? 'text-green-600' : 'text-red-600'}>
                        Diff: <strong>{item.difference > 0 ? '+' : ''}{formatCurrency(item.difference)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Resolve this discrepancy by reviewing the data and clicking "Mark as Resolved" to enable closing this day.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cash Received */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Cash Received
                </CardTitle>
                {isDayOpen && canCreate && (
                  <Button size="sm" variant="outline" onClick={() => setIsAddingCash(!isAddingCash)} data-testid="button-add-cash">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isAddingCash && (
                <div className="mb-4 p-3 border rounded-lg bg-muted/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newCashReceived.amount}
                      onChange={(e) => setNewCashReceived(prev => ({ ...prev, amount: e.target.value }))}
                      data-testid="input-cash-amount"
                    />
                    <Select 
                      value={newCashReceived.sourceType} 
                      onValueChange={(v) => setNewCashReceived(prev => ({ ...prev, sourceType: v }))}
                    >
                      <SelectTrigger data-testid="select-cash-source">
                        <SelectValue placeholder="Source Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale_cash">
                          <span className="flex items-center gap-2"><Banknote className="w-3 h-3" /> Sale Cash</span>
                        </SelectItem>
                        <SelectItem value="secondary_sale">
                          <span className="flex items-center gap-2"><Receipt className="w-3 h-3" /> Secondary Sale</span>
                        </SelectItem>
                        <SelectItem value="upi">
                          <span className="flex items-center gap-2"><CreditCard className="w-3 h-3" /> UPI</span>
                        </SelectItem>
                        <SelectItem value="bank_transfer">
                          <span className="flex items-center gap-2"><ArrowDownRight className="w-3 h-3" /> Bank Transfer</span>
                        </SelectItem>
                        <SelectItem value="other">
                          <span className="flex items-center gap-2"><DollarSign className="w-3 h-3" /> Other</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Received From (e.g., Customer Name)"
                    value={newCashReceived.partyName}
                    onChange={(e) => setNewCashReceived(prev => ({ ...prev, partyName: e.target.value }))}
                    data-testid="input-cash-party"
                  />
                  <Input
                    placeholder="Reference (optional)"
                    value={newCashReceived.reference}
                    onChange={(e) => setNewCashReceived(prev => ({ ...prev, reference: e.target.value }))}
                    data-testid="input-cash-reference"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newCashReceived.description}
                    onChange={(e) => setNewCashReceived(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-cash-description"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCashReceived} disabled={addTransactionMutation.isPending} data-testid="button-save-cash">
                      <Check className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAddingCash(false)} data-testid="button-cancel-cash">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <ScrollArea className="h-48">
                {cashReceivedTxns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No cash received today</p>
                ) : (
                  <div className="space-y-2">
                    {cashReceivedTxns.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-2 border rounded-md hover-elevate" data-testid={`txn-cash-${txn.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-green-600">{formatCurrency(txn.amount)}</span>
                            {txn.sourceType && (
                              <Badge variant="outline" className="text-xs">
                                {getSourceTypeLabel(txn.sourceType)}
                              </Badge>
                            )}
                          </div>
                          {txn.partyName && <div className="text-xs font-medium">From: {txn.partyName}</div>}
                          {txn.reference && <div className="text-xs text-muted-foreground">{txn.reference}</div>}
                          {txn.description && <div className="text-xs text-muted-foreground">{txn.description}</div>}
                          {txn.documentName && (
                            <a href={txn.documentPath || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              <Paperclip className="w-3 h-3" /> {txn.documentName}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isDayOpen && !txn.documentPath && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocumentUpload(txn.id, file);
                                }}
                              />
                              <Button size="icon" variant="ghost" asChild data-testid={`button-upload-doc-${txn.id}`}>
                                <span><Paperclip className="w-4 h-4 text-muted-foreground" /></span>
                              </Button>
                            </label>
                          )}
                          {isDayOpen && canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => startEditTransaction(txn)} data-testid={`button-edit-cash-${txn.id}`}>
                              <Edit className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {isDayOpen && canDelete && (
                            <Button size="icon" variant="ghost" onClick={() => deleteTransactionMutation.mutate(txn.id)} data-testid={`button-delete-cash-${txn.id}`}>
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  Expenses
                </CardTitle>
                {isDayOpen && canCreate && (
                  <Button size="sm" variant="outline" onClick={() => setIsAddingExpense(!isAddingExpense)} data-testid="button-add-expense">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs">Each line item creates its own voucher</CardDescription>
            </CardHeader>
            <CardContent>
              {isAddingExpense && (
                <div className="mb-4 p-3 border rounded-lg bg-muted/30 space-y-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Add multiple expense items - each will get its own voucher
                  </div>
                  
                  {expenseItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start p-2 bg-background rounded border" data-testid={`expense-item-${index}`}>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={item.amount}
                            onChange={(e) => updateExpenseLineItem(index, 'amount', e.target.value)}
                            className="w-28"
                            data-testid={`input-expense-amount-${index}`}
                          />
                          <Input
                            placeholder="Item (e.g., Diesel, Tea, Lunch)"
                            value={item.reference}
                            onChange={(e) => updateExpenseLineItem(index, 'reference', e.target.value)}
                            className="flex-1"
                            data-testid={`input-expense-reference-${index}`}
                          />
                        </div>
                        <Input
                          placeholder="Paid To (e.g., Vendor Name, Shop Name)"
                          value={item.partyName}
                          onChange={(e) => updateExpenseLineItem(index, 'partyName', e.target.value)}
                          data-testid={`input-expense-party-${index}`}
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={item.description}
                          onChange={(e) => updateExpenseLineItem(index, 'description', e.target.value)}
                          className="text-xs"
                          data-testid={`input-expense-description-${index}`}
                        />
                      </div>
                      {expenseItems.length > 1 && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => removeExpenseLineItem(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          data-testid={`button-remove-expense-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={addExpenseLineItem}
                    className="w-full"
                    data-testid="button-add-expense-item"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Another Item
                  </Button>
                  
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      onClick={handleAddExpenses} 
                      disabled={isSavingExpenses} 
                      data-testid="button-save-expenses"
                    >
                      <Receipt className="w-4 h-4 mr-1" /> 
                      {isSavingExpenses ? 'Saving...' : `Save ${expenseItems.filter(i => i.amount).length} Item${expenseItems.filter(i => i.amount).length !== 1 ? 's' : ''} & Create Vouchers`}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setIsAddingExpense(false);
                        setExpenseItems([{ amount: '', reference: '', description: '' }]);
                      }} 
                      data-testid="button-cancel-expense"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <ScrollArea className="h-48">
                {expenseTxns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No expenses today</p>
                ) : (
                  <div className="space-y-2">
                    {expenseTxns.map((txn) => {
                      // Calculate expense total from items if available, otherwise use transaction amount
                      const expenseTotal = (txn as any).items?.length > 0 
                        ? (txn as any).items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
                        : txn.amount;
                      return (
                      <div key={txn.id} className="flex items-center justify-between p-2 border rounded-md hover-elevate" data-testid={`txn-expense-${txn.id}`}>
                        <div className="flex-1">
                          <div className="font-medium text-red-600">{formatCurrency(expenseTotal)}</div>
                          {txn.partyName && <div className="text-xs font-medium">Paid To: {txn.partyName}</div>}
                          {txn.reference && <div className="text-xs text-muted-foreground">{txn.reference}</div>}
                          {txn.description && <div className="text-xs text-muted-foreground">{txn.description}</div>}
                          <div className="flex items-center gap-2 mt-1">
                            {txn.convertedToVoucherId && (
                              <Badge variant="outline" className="text-xs">
                                <Receipt className="w-3 h-3 mr-1" /> Voucher
                              </Badge>
                            )}
                            {txn.documentName && (
                              <a href={txn.documentPath || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" /> {txn.documentName}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {txn.convertedToVoucherId && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => window.open(`/cash-register/vouchers/print?id=${txn.convertedToVoucherId}&mode=single`, '_blank')}
                              title="Print Voucher"
                              data-testid={`button-print-voucher-${txn.id}`}
                            >
                              <Printer className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {isDayOpen && !txn.documentPath && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocumentUpload(txn.id, file);
                                }}
                              />
                              <Button size="icon" variant="ghost" asChild data-testid={`button-upload-doc-exp-${txn.id}`}>
                                <span><Paperclip className="w-4 h-4 text-muted-foreground" /></span>
                              </Button>
                            </label>
                          )}
                          {isDayOpen && canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => startEditTransaction(txn)} data-testid={`button-edit-expense-${txn.id}`}>
                              <Edit className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {isDayOpen && canDelete && (
                            <Button size="icon" variant="ghost" onClick={() => deleteTransactionMutation.mutate(txn.id)} data-testid={`button-delete-expense-${txn.id}`}>
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Transfers */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-blue-600" />
                  Transfers
                </CardTitle>
                {isDayOpen && canCreate && (
                  <Button size="sm" variant="outline" onClick={() => setIsAddingTransfer(!isAddingTransfer)} data-testid="button-add-transfer">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs">Cash sent to owner/bank</CardDescription>
            </CardHeader>
            <CardContent>
              {isAddingTransfer && (
                <div className="mb-4 p-3 border rounded-lg bg-muted/30 space-y-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newTransfer.amount}
                    onChange={(e) => setNewTransfer(prev => ({ ...prev, amount: e.target.value }))}
                    data-testid="input-transfer-amount"
                  />
                  <Input
                    placeholder="Transfer To (e.g., TULASI, Bank)"
                    value={newTransfer.transferTo}
                    onChange={(e) => setNewTransfer(prev => ({ ...prev, transferTo: e.target.value }))}
                    data-testid="input-transfer-to"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newTransfer.description}
                    onChange={(e) => setNewTransfer(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-transfer-description"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddTransfer} disabled={addTransactionMutation.isPending} data-testid="button-save-transfer">
                      <Check className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAddingTransfer(false)} data-testid="button-cancel-transfer">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <ScrollArea className="h-48">
                {transferTxns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No transfers today</p>
                ) : (
                  <div className="space-y-2">
                    {transferTxns.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-2 border rounded-md hover-elevate" data-testid={`txn-transfer-${txn.id}`}>
                        <div className="flex-1">
                          <div className="font-medium text-blue-600">{formatCurrency(txn.amount)}</div>
                          {txn.transferTo && <div className="text-xs font-medium">Paid To: {txn.transferTo}</div>}
                          {txn.description && <div className="text-xs text-muted-foreground">{txn.description}</div>}
                          {txn.documentName && (
                            <a href={txn.documentPath || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              <Paperclip className="w-3 h-3" /> {txn.documentName}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isDayOpen && !txn.documentPath && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocumentUpload(txn.id, file);
                                }}
                              />
                              <Button size="icon" variant="ghost" asChild data-testid={`button-upload-doc-trans-${txn.id}`}>
                                <span><Paperclip className="w-4 h-4 text-muted-foreground" /></span>
                              </Button>
                            </label>
                          )}
                          {isDayOpen && canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => startEditTransaction(txn)} data-testid={`button-edit-transfer-${txn.id}`}>
                              <Edit className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {isDayOpen && canDelete && (
                            <Button size="icon" variant="ghost" onClick={() => deleteTransactionMutation.mutate(txn.id)} data-testid={`button-delete-transfer-${txn.id}`}>
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Close Day Button */}
        {isDayOpen && (
          <Card className="bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-medium">Close This Day</h3>
                  <p className="text-sm text-muted-foreground">
                    {transactions.length === 0 
                      ? `No transactions today. Closing balance will be ${formatCurrency(selectedDay.openingBalance)}.`
                      : `Expected closing balance: ${formatCurrency(calculatedClosing)}. Reconcile and close to carry forward.`
                    }
                  </p>
                  {(selectedDay as any).hasDiscrepancy === 1 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Resolve import discrepancy first to close this day.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {transactions.length === 0 && (
                    <Button
                      variant="secondary"
                      data-testid="button-close-no-txn"
                      disabled={(selectedDay as any).hasDiscrepancy === 1 || closeDayMutation.isPending}
                      onClick={() => {
                        closeDayMutation.mutate({
                          dayId: selectedDay.id.toString(),
                          actualClosingBalance: selectedDay.openingBalance,
                          varianceNotes: 'No transactions - day closed with opening balance',
                        });
                      }}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {closeDayMutation.isPending ? 'Closing...' : 'Close (No Transactions)'}
                    </Button>
                  )}
                <Dialog open={isReconcileOpen} onOpenChange={(open) => {
                  setIsReconcileOpen(open);
                  if (open) {
                    setActualBalance(calculatedClosing.toString());
                    setVarianceNotes('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      data-testid="button-close-day"
                      disabled={(selectedDay as any).hasDiscrepancy === 1}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {transactions.length === 0 ? 'Reconcile & Close' : 'Close Day'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reconcile & Close Day</DialogTitle>
                      <DialogDescription>
                        Enter the actual cash on hand to reconcile before closing {format(new Date(selectedDay.registerDate), 'MMMM d, yyyy')}.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Opening Balance:</span>
                          <span className="font-medium">{formatCurrency(selectedDay.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>+ Cash Received:</span>
                          <span>{formatCurrency(selectedDay.totalCashReceived)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>- Expenses:</span>
                          <span>{formatCurrency(selectedDay.totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>- Transfers:</span>
                          <span>{formatCurrency(selectedDay.totalTransfers)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Expected Closing:</span>
                          <span>{formatCurrency(calculatedClosing)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="actual-balance">Actual Cash on Hand (₹)</Label>
                        <Input
                          id="actual-balance"
                          type="number"
                          step="0.01"
                          placeholder="Enter actual cash count"
                          value={actualBalance}
                          onChange={(e) => setActualBalance(e.target.value)}
                          data-testid="input-actual-balance"
                        />
                      </div>
                      
                      {actualBalance && Math.round(parseFloat(actualBalance)) !== calculatedClosing && (
                        <div className="p-3 border border-amber-500/50 bg-amber-500/10 rounded-lg space-y-3">
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium">Variance Detected - Record Adjustment</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Variance Amount:</span>
                            <span className={Math.round(parseFloat(actualBalance)) > calculatedClosing ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {formatCurrency(Math.abs(Math.round(parseFloat(actualBalance)) - calculatedClosing))}
                              {Math.round(parseFloat(actualBalance)) > calculatedClosing ? ' (Surplus)' : ' (Shortage)'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {Math.round(parseFloat(actualBalance)) < calculatedClosing 
                              ? 'You have less cash than expected. Record this as an Expense to balance the books.'
                              : 'You have more cash than expected. Record this as Cash Received to balance the books.'}
                          </p>
                          <div className="flex gap-2">
                            {Math.round(parseFloat(actualBalance)) < calculatedClosing ? (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  const shortage = calculatedClosing - Math.round(parseFloat(actualBalance));
                                  setExpenseItems([{ 
                                    amount: shortage.toString(), 
                                    reference: 'Reconciliation Adjustment', 
                                    description: 'Cash shortage during reconciliation' 
                                  }]);
                                  setIsAddingExpense(true);
                                  setIsReconcileOpen(false);
                                  toast({ title: "Add Expense", description: "Record the shortage as an expense, then close the day" });
                                }}
                                data-testid="button-add-shortage-expense"
                              >
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Record as Expense ({formatCurrency(Math.abs(Math.round(parseFloat(actualBalance)) - calculatedClosing))})
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  const surplus = Math.round(parseFloat(actualBalance)) - calculatedClosing;
                                  setNewCashReceived({ 
                                    amount: surplus.toString(), 
                                    reference: 'Reconciliation Adjustment', 
                                    description: 'Unaccounted cash found during reconciliation',
                                    sourceType: 'other'
                                  });
                                  setIsAddingCash(true);
                                  setIsReconcileOpen(false);
                                  toast({ title: "Add Cash Received", description: "Record the surplus as cash received, then close the day" });
                                }}
                                data-testid="button-add-surplus-cash"
                              >
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Record as Cash Received ({formatCurrency(Math.abs(Math.round(parseFloat(actualBalance)) - calculatedClosing))})
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsReconcileOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          if (!actualBalance) {
                            toast({ title: "Error", description: "Please enter actual cash on hand", variant: "destructive" });
                            return;
                          }
                          const actualRupees = Math.round(parseFloat(actualBalance));
                          closeDayMutation.mutate({
                            dayId: selectedDay.id,
                            actualClosingBalance: actualRupees,
                            varianceNotes: '',
                          });
                        }}
                        disabled={closeDayMutation.isPending || !actualBalance || Math.round(parseFloat(actualBalance || '0')) !== calculatedClosing}
                        data-testid="button-confirm-close"
                      >
                        {closeDayMutation.isPending ? 'Closing...' : 
                          Math.round(parseFloat(actualBalance || '0')) !== calculatedClosing 
                            ? 'Record Adjustment First' 
                            : 'Reconcile & Close'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Transaction Dialog */}
        <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update the {editingTransaction?.type === 'cash_received' ? 'cash received' : editingTransaction?.type === 'expense' ? 'expense' : 'transfer'} transaction.
              </DialogDescription>
            </DialogHeader>
            
            {editingTransaction && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount (₹)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, amount: e.target.value } : null)}
                    data-testid="input-edit-amount"
                  />
                </div>
                
                {editingTransaction.type === 'cash_received' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-source-type">Source Type</Label>
                    <Select 
                      value={editingTransaction.sourceType} 
                      onValueChange={(value) => setEditingTransaction(prev => prev ? { ...prev, sourceType: value } : null)}
                    >
                      <SelectTrigger id="edit-source-type" data-testid="select-edit-source-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale_cash">Sale Cash</SelectItem>
                        <SelectItem value="secondary_sale">Secondary Sale</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {editingTransaction.type === 'transfer' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-transfer-to">Transfer To</Label>
                    <Input
                      id="edit-transfer-to"
                      value={editingTransaction.transferTo}
                      onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, transferTo: e.target.value } : null)}
                      placeholder="e.g., TULASI, Bank"
                      data-testid="input-edit-transfer-to"
                    />
                  </div>
                )}
                
                {(editingTransaction.type === 'cash_received' || editingTransaction.type === 'expense') && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-party-name">
                      {editingTransaction.type === 'cash_received' ? 'Received From' : 'Paid To'}
                    </Label>
                    <Input
                      id="edit-party-name"
                      value={editingTransaction.partyName}
                      onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, partyName: e.target.value } : null)}
                      placeholder={editingTransaction.type === 'cash_received' ? 'e.g., Customer Name' : 'e.g., Vendor Name, Shop Name'}
                      data-testid="input-edit-party-name"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="edit-reference">Reference</Label>
                  <Input
                    id="edit-reference"
                    value={editingTransaction.reference}
                    onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, reference: e.target.value } : null)}
                    placeholder="Optional reference"
                    data-testid="input-edit-reference"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editingTransaction.description}
                    onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Optional description"
                    data-testid="input-edit-description"
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTransaction(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={updateTransactionMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateTransactionMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main List View
  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/?tab=overview')}
            data-testid="button-back-main"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Daily Cash Register</h1>
            <p className="text-muted-foreground">Track daily cash flow - receipts, expenses, and transfers</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasAdminAccess && days.length > 0 && (
            <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-clear-data">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Cash Register Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {days.length} cash register days and all related transactions. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-clear"
                  >
                    {isClearing ? "Clearing..." : "Clear All Data"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {hasAdminAccess && (
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-import">
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Import Cash Register Data</DialogTitle>
                <DialogDescription>
                  Upload an Excel file with daily cash data
                </DialogDescription>
              </DialogHeader>
              
              {!importPreview ? (
                <div className="py-8 text-center">
                  <Input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    data-testid="input-file-upload"
                  />
                  {isImporting && <p className="mt-2 text-muted-foreground">Parsing file...</p>}
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{importPreview.totalRows}</div>
                          <div className="text-sm text-muted-foreground">Total Rows</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-green-600">{importPreview.validRows}</div>
                          <div className="text-sm text-muted-foreground">Valid Rows</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-red-600">{importPreview.errorRows}</div>
                          <div className="text-sm text-muted-foreground">Error Rows</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{importPreview.uniqueSalespersons?.length || 0}</div>
                          <div className="text-sm text-muted-foreground">Sources</div>
                        </CardContent>
                      </Card>
                    </div>

                    {importPreview.dateRange && (
                      <div className="text-sm text-muted-foreground">
                        Date range: {importPreview.dateRange.start} to {importPreview.dateRange.end}
                      </div>
                    )}

                    {/* Discrepancies Section */}
                    {importPreview.discrepancies && importPreview.discrepancies.length > 0 && (
                      <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            {importPreview.discrepancies.length} Discrepancies Found
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <ScrollArea className="max-h-48">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Issue</TableHead>
                                  <TableHead className="text-right">Expected</TableHead>
                                  <TableHead className="text-right">Actual</TableHead>
                                  <TableHead className="text-right">Diff</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importPreview.discrepancies.map((d, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{d.date}</TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={d.type === 'cb_mismatch' ? 'destructive' : 'outline'}
                                        className="text-xs"
                                      >
                                        {d.type === 'cb_mismatch' ? 'CB Mismatch' : 'OB Mismatch'}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground mt-1">{d.description}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(d.expected)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(d.actual)}</TableCell>
                                    <TableCell className={`text-right font-medium ${d.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {d.difference > 0 ? '+' : ''}{formatCurrency(d.difference)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    <div className="border rounded-md overflow-auto max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Opening</TableHead>
                            <TableHead className="text-right">Cash In</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right">Transfers</TableHead>
                            <TableHead className="text-right">Closing</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.rows.slice(0, 50).map((row) => (
                            <TableRow key={row.rowNumber} className={row.errors.length > 0 ? 'bg-destructive/10' : ''}>
                              <TableCell>{row.rowNumber}</TableCell>
                              <TableCell>{row.date}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.openingBalance)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.receivedCash)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.sentToTulasi)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.balanceAmount)}</TableCell>
                              <TableCell>
                                {row.errors.length > 0 ? (
                                  <Badge variant="destructive" className="text-xs">Error</Badge>
                                ) : (
                                  <Badge variant="default" className="text-xs bg-green-600">OK</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </ScrollArea>
              )}

              <DialogFooter className="gap-2">
                {importPreview && (
                  <>
                    <Button variant="outline" onClick={() => setImportPreview(null)}>Clear</Button>
                    <Button 
                      onClick={handleCommitImport} 
                      disabled={isImporting || importPreview.validRows === 0}
                    >
                      {isImporting ? 'Importing...' : `Import ${importPreview.validRows} Rows`}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}

          <Button onClick={handleOpenNewDayDialog} disabled={createDayMutation.isPending} data-testid="button-new-day">
            <Plus className="w-4 h-4 mr-2" />
            New Day
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Day</DialogTitle>
                <DialogDescription>
                  {days.length === 0
                    ? "This will be the first entry in your cash register."
                    : `Last entry: ${getLastDay()?.registerDate} (${getLastDay()?.status})`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-day-date">Date</Label>
                  <Input
                    id="new-day-date"
                    type="date"
                    value={newDayDate}
                    min={getLastDay() ? (() => { const d = new Date(getLastDay()!.registerDate); d.setDate(d.getDate() + 1); return format(d, 'yyyy-MM-dd'); })() : undefined}
                    onChange={(e) => setNewDayDate(e.target.value)}
                    data-testid="input-new-day-date"
                  />
                  {newDayDate && getLastDay() && (() => {
                    const lastDate = new Date(getLastDay()!.registerDate);
                    const selected = new Date(newDayDate);
                    const diffDays = Math.round((selected.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 1) {
                      return (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          Gap of {diffDays - 1} day(s) from last entry. Create holiday entries for skipped days to maintain continuity.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="space-y-2">
                  <Label>Opening Balance</Label>
                  <div className="text-lg font-semibold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(getOpeningBalance())}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {days.length === 0 ? "Starting balance (no previous day)" : "Auto-filled from previous day's closing balance"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="new-day-holiday"
                    checked={newDayIsHoliday}
                    onChange={(e) => setNewDayIsHoliday(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                    data-testid="checkbox-holiday"
                  />
                  <div>
                    <Label htmlFor="new-day-holiday" className="cursor-pointer">Mark as Holiday / Sunday</Label>
                    <p className="text-xs text-muted-foreground">
                      Opening and closing balance will be the same. Day will be auto-closed.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateNewDay}
                  disabled={createDayMutation.isPending || !newDayDate}
                  data-testid="button-confirm-new-day"
                >
                  {createDayMutation.isPending ? 'Creating...' : newDayIsHoliday ? 'Create Holiday' : 'Create Day'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Starting Balance</span>
            </div>
            <div className="text-xl font-bold mt-1" data-testid="text-starting-balance">{formatCurrency(totals.startingBalance)}</div>
            {totals.firstDate && <div className="text-xs text-muted-foreground">{format(new Date(totals.firstDate), 'MMM d, yyyy')}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Cash In</span>
            </div>
            <div className="text-xl font-bold mt-1 text-green-600" data-testid="text-total-cash-in">{formatCurrency(totals.totalCashReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm text-muted-foreground">Total Expenses</span>
            </div>
            <div className="text-xl font-bold mt-1 text-red-600" data-testid="text-total-expenses">{formatCurrency(totals.totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Total Transfers</span>
            </div>
            <div className="text-xl font-bold mt-1 text-blue-600" data-testid="text-total-transfers">{formatCurrency(totals.totalTransfers)}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Current Balance</span>
            </div>
            <div className="text-xl font-bold mt-1" data-testid="text-current-balance">{formatCurrency(totals.currentBalance)}</div>
            {totals.lastDate && <div className="text-xs text-muted-foreground">{format(new Date(totals.lastDate), 'MMM d, yyyy')}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Days List */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Days ({filteredDays.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search date..."
                  className="pl-8 w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetchDays()} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Cash In</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Transfers</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No cash register entries yet. Click "New Day" to start tracking.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDays.map((day) => {
                    const expectedClosing = day.openingBalance + day.totalCashReceived - day.totalExpenses - day.totalTransfers;
                    const hasIssues = (day as any).hasDiscrepancy === 1;
                    const discrepancyInfo = (day as any).discrepancyDetails as { items?: { type: string; description: string }[] } | null;
                    return (
                      <TableRow 
                        key={day.id} 
                        className={`cursor-pointer hover-elevate ${hasIssues ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}
                        onClick={() => viewDayDetails(day.id)}
                        data-testid={`row-day-${day.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{format(new Date(day.registerDate), 'EEE, MMM d, yyyy')}</span>
                            {day.isHoliday === 1 && <Badge variant="secondary" className="text-xs">Holiday</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(day.openingBalance)}</TableCell>
                        <TableCell className="text-right text-green-600">+{formatCurrency(day.totalCashReceived)}</TableCell>
                        <TableCell className="text-right text-red-600">-{formatCurrency(day.totalExpenses)}</TableCell>
                        <TableCell className="text-right text-blue-600">-{formatCurrency(day.totalTransfers)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(expectedClosing)}</TableCell>
                        <TableCell>{getStatusBadge(day.status)}</TableCell>
                        <TableCell>
                          {hasIssues && discrepancyInfo?.items && discrepancyInfo.items.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span className="text-xs text-amber-700 dark:text-amber-400">
                                {discrepancyInfo.items.map(i => i.type === 'cb_mismatch' ? 'CB' : 'OB').join(', ')} Issue
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" data-testid={`button-view-${day.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredDays.length > pageSize && (
            <div className="mt-4">
              <DataTablePagination
                meta={{
                  page,
                  pageSize,
                  totalItems: filteredDays.length,
                  totalPages,
                  hasNextPage: page < totalPages,
                  hasPreviousPage: page > 1,
                }}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

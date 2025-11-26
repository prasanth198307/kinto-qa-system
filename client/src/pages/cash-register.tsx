import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { 
  Plus, Upload, Search, Eye, Check, X, Receipt, Calendar, User, 
  Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet,
  AlertCircle, TrendingUp, TrendingDown, DollarSign, CheckCircle2, Lock,
  AlertTriangle, Edit, Save, Trash2, PiggyBank
} from "lucide-react";
import type { CashRegisterDay, CashRegisterTransaction, CashRegisterExpenseItem, PaginationMeta } from "@shared/schema";
import { DataTablePagination } from "@/components/DataTablePagination";

interface DiscrepancyDetails {
  balance_mismatch: boolean;
  items_mismatch: boolean;
  expected_closing: number;
  actual_closing: number;
  closing_difference: number;
  total_expenses: number;
  items_total: number;
  items_difference: number;
}

interface DayWithTransactions extends Omit<CashRegisterDay, 'hasDiscrepancy' | 'discrepancyDetails'> {
  transactions?: (CashRegisterTransaction & { items?: CashRegisterExpenseItem[] })[];
  hasDiscrepancy?: number;
  discrepancyDetails?: DiscrepancyDetails;
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

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(paise / 100);
}

export default function CashRegisterPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [salespersonFilter, setSalespersonFilter] = useState<string>("all");
  const [discrepancyFilter, setDiscrepancyFilter] = useState<string>("all");
  const [editingItems, setEditingItems] = useState<{id: string, amount: string}[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayWithTransactions | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [newDayData, setNewDayData] = useState({
    registerDate: format(new Date(), 'yyyy-MM-dd'),
    salespersonName: '',
    openingBalance: '',
    notes: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: days = [], isLoading: daysLoading, refetch: refetchDays } = useQuery<CashRegisterDay[]>({
    queryKey: ['/api/cash-register/days'],
  });

  const { data: salespersons = [] } = useQuery<string[]>({
    queryKey: ['/api/cash-register/salespersons'],
  });

  const createDayMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/cash-register/days', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/salespersons'] });
      toast({ title: "Success", description: "Cash register day created" });
      setIsCreateOpen(false);
      setNewDayData({
        registerDate: format(new Date(), 'yyyy-MM-dd'),
        salespersonName: '',
        openingBalance: '',
        notes: '',
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async ({ id, varianceAmount, notes }: { id: string; varianceAmount?: number; notes?: string }) => {
      const response = await apiRequest('POST', `/api/cash-register/days/${id}/reconcile`, { varianceAmount, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      toast({ title: "Success", description: "Day reconciled successfully" });
      setSelectedDay(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateDay = () => {
    if (!newDayData.registerDate || !newDayData.salespersonName) {
      toast({ title: "Validation Error", description: "Date and Salesperson are required", variant: "destructive" });
      return;
    }

    createDayMutation.mutate({
      registerDate: newDayData.registerDate,
      salespersonName: newDayData.salespersonName.toUpperCase(),
      openingBalance: Math.round((parseFloat(newDayData.openingBalance) || 0) * 100),
      notes: newDayData.notes,
    });
  };

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      const response = await apiRequest('POST', '/api/cash-register/clear-data', {});
      const result = await response.json();
      
      if (result.success) {
        toast({ 
          title: "Data Cleared", 
          description: result.message 
        });
        queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
        queryClient.invalidateQueries({ queryKey: ['/api/cash-register/salespersons'] });
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
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({ 
          title: "Import Complete", 
          description: `Imported ${result.daysCreated} days, ${result.transactionsCreated} transactions, ${result.expenseItemsCreated} expense items` 
        });
        queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
        queryClient.invalidateQueries({ queryKey: ['/api/cash-register/salespersons'] });
        setIsImportOpen(false);
        setImportPreview(null);
      } else {
        toast({ 
          title: "Import Failed", 
          description: result.errors.join(', '), 
          variant: "destructive" 
        });
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

  // Add mutation to update expense items
  const updateExpenseItemMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const response = await apiRequest('PATCH', `/api/cash-register/expense-items/${id}`, { amount });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      if (selectedDay) {
        viewDayDetails(selectedDay.id);
      }
      toast({ title: "Success", description: "Expense item updated" });
      setEditingItems([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add mutation to add adjustment item
  const addAdjustmentMutation = useMutation({
    mutationFn: async ({ transactionId, amount, label }: { transactionId: string; amount: number; label: string }) => {
      const response = await apiRequest('POST', `/api/cash-register/expense-items`, { 
        transactionId, 
        amount, 
        itemLabel: label 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/days'] });
      if (selectedDay) {
        viewDayDetails(selectedDay.id);
      }
      toast({ title: "Success", description: "Adjustment item added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredDays = (days as DayWithTransactions[]).filter(day => {
    const matchesSearch = searchQuery === "" || 
      day.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      day.registerDate.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || day.status === statusFilter;
    const matchesSalesperson = salespersonFilter === "all" || day.salespersonName === salespersonFilter;
    
    // Calculate variance for this day
    const expectedClosing = day.openingBalance + day.totalCashReceived - day.totalExpenses - day.totalTransfers;
    const hasVariance = Math.abs(day.closingBalance - expectedClosing) > 100;
    
    const matchesFilter = discrepancyFilter === "all" || 
      (discrepancyFilter === "variance" && hasVariance) ||
      (discrepancyFilter === "discrepancy" && day.hasDiscrepancy === 1) ||
      (discrepancyFilter === "ok" && day.hasDiscrepancy !== 1 && !hasVariance);
    return matchesSearch && matchesStatus && matchesSalesperson && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDays.length / pageSize);
  const paginatedDays = filteredDays.slice((page - 1) * pageSize, page * pageSize);
  const paginationMeta: PaginationMeta = {
    page,
    pageSize,
    totalItems: filteredDays.length,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  const discrepancyCount = (days as DayWithTransactions[]).filter(d => d.hasDiscrepancy === 1).length;
  
  // Calculate variance count (rows where actual closing doesn't match formula)
  const varianceCount = (days as CashRegisterDay[]).filter(d => {
    const expectedClosing = d.openingBalance + d.totalCashReceived - d.totalExpenses - d.totalTransfers;
    return Math.abs(d.closingBalance - expectedClosing) > 100;
  }).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary" data-testid="badge-status-open">Open</Badge>;
      case 'reconciled':
        return <Badge variant="default" className="bg-green-600" data-testid="badge-status-reconciled"><CheckCircle2 className="w-3 h-3 mr-1" />Reconciled</Badge>;
      case 'locked':
        return <Badge variant="outline" data-testid="badge-status-locked"><Lock className="w-3 h-3 mr-1" />Locked</Badge>;
      default:
        return <Badge data-testid="badge-status-unknown">{status}</Badge>;
    }
  };

  const calculateTotals = () => {
    // Sort days by date to find first and last
    const sortedDays = [...filteredDays].sort((a, b) => 
      new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime()
    );
    
    // Get first day's opening balance and last day's closing balance
    const startingBalance = sortedDays.length > 0 ? sortedDays[0].openingBalance : 0;
    const currentBalance = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].closingBalance : 0;
    const firstDate = sortedDays.length > 0 ? sortedDays[0].registerDate : null;
    const lastDate = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].registerDate : null;
    
    // Sum up totals for cash flow metrics
    let totalDeposits = 0;
    let totalCashReceived = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    filteredDays.forEach(day => {
      totalDeposits += day.totalDeposits;
      totalCashReceived += day.totalCashReceived;
      totalExpenses += day.totalExpenses;
      totalTransfers += day.totalTransfers;
    });

    return { 
      startingBalance, 
      currentBalance, 
      firstDate,
      lastDate,
      totalDeposits, 
      totalCashReceived, 
      totalExpenses, 
      totalTransfers 
    };
  };

  const totals = calculateTotals();

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

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Daily Cash Register</h1>
          <p className="text-muted-foreground">Track daily cash flow per salesperson</p>
        </div>
        <div className="flex gap-2">
          {days.length > 0 && (
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
                    This will permanently delete all {days.length} cash register days, including all transactions, expense items, and related vouchers. This action cannot be undone. 
                    <br/><br/>
                    Use this if you want to re-import the data from Excel with updated parsing logic.
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
                  Upload an Excel file with daily expense data. The file should have columns: Date, SO, Opening Balance, Deposit Amount, Received Cash, Expenses, Item Details, Balance Amount, Sent To Tulasi
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
                          <div className="text-2xl font-bold" data-testid="text-total-rows">{importPreview.totalRows}</div>
                          <div className="text-sm text-muted-foreground">Total Rows</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-green-600" data-testid="text-valid-rows">{importPreview.validRows}</div>
                          <div className="text-sm text-muted-foreground">Valid Rows</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-red-600" data-testid="text-error-rows">{importPreview.errorRows}</div>
                          <div className="text-sm text-muted-foreground">Error Rows</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold" data-testid="text-salespersons-count">{importPreview.uniqueSalespersons.length}</div>
                          <div className="text-sm text-muted-foreground">Salespersons</div>
                        </CardContent>
                      </Card>
                    </div>

                    {importPreview.dateRange && (
                      <div className="text-sm text-muted-foreground">
                        Date range: {importPreview.dateRange.start} to {importPreview.dateRange.end}
                      </div>
                    )}

                    {importPreview.errors.length > 0 && (
                      <div className="p-3 bg-destructive/10 rounded-md">
                        <p className="font-medium text-destructive">Errors:</p>
                        <ul className="list-disc list-inside text-sm">
                          {importPreview.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}

                    {importPreview.unmappedSalespersons.length > 0 && (
                      <div className="p-3 bg-yellow-500/10 rounded-md">
                        <p className="font-medium text-yellow-700">Unmapped Salespersons:</p>
                        <p className="text-sm">{importPreview.unmappedSalespersons.join(', ')}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Preview Data ({importPreview.rows.length} rows)</h4>
                      <div className="border rounded-md overflow-auto max-h-64">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Salesperson</TableHead>
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
                                <TableCell>{row.salespersonName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.openingBalance)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.receivedCash)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.sentToTulasi)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.balanceAmount)}</TableCell>
                                <TableCell>
                                  {row.errors.length > 0 ? (
                                    <Badge variant="destructive" className="text-xs">Error</Badge>
                                  ) : row.warnings.length > 0 ? (
                                    <Badge variant="secondary" className="text-xs">Warning</Badge>
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
                  </div>
                </ScrollArea>
              )}

              <DialogFooter className="gap-2">
                {importPreview && (
                  <>
                    <Button variant="outline" onClick={() => setImportPreview(null)} data-testid="button-clear-preview">
                      Clear
                    </Button>
                    <Button 
                      onClick={handleCommitImport} 
                      disabled={isImporting || importPreview.validRows === 0}
                      data-testid="button-commit-import"
                    >
                      {isImporting ? 'Importing...' : `Import ${importPreview.validRows} Rows`}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-day">
                <Plus className="w-4 h-4 mr-2" />
                New Day
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Cash Register Day</DialogTitle>
                <DialogDescription>Start tracking cash for a salesperson on a specific date</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={newDayData.registerDate}
                    onChange={(e) => setNewDayData(prev => ({ ...prev, registerDate: e.target.value }))}
                    data-testid="input-register-date"
                  />
                </div>
                <div>
                  <Label>Salesperson</Label>
                  <Input 
                    placeholder="e.g., TARAK, SAI"
                    value={newDayData.salespersonName}
                    onChange={(e) => setNewDayData(prev => ({ ...prev, salespersonName: e.target.value.toUpperCase() }))}
                    data-testid="input-salesperson"
                  />
                </div>
                <div>
                  <Label>Opening Balance</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={newDayData.openingBalance}
                    onChange={(e) => setNewDayData(prev => ({ ...prev, openingBalance: e.target.value }))}
                    data-testid="input-opening-balance"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    placeholder="Optional notes..."
                    value={newDayData.notes}
                    onChange={(e) => setNewDayData(prev => ({ ...prev, notes: e.target.value }))}
                    data-testid="input-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">Cancel</Button>
                <Button onClick={handleCreateDay} disabled={createDayMutation.isPending} data-testid="button-create-day">
                  {createDayMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
              <span className="text-sm text-muted-foreground">Cash Received</span>
            </div>
            <div className="text-xl font-bold mt-1 text-green-600" data-testid="text-total-cash-received">{formatCurrency(totals.totalCashReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-muted-foreground">Bank Deposits</span>
            </div>
            <div className="text-xl font-bold mt-1 text-purple-600" data-testid="text-total-deposits">{formatCurrency(totals.totalDeposits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm text-muted-foreground">Expenses</span>
            </div>
            <div className="text-xl font-bold mt-1 text-red-600" data-testid="text-total-expenses">{formatCurrency(totals.totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Transfers</span>
            </div>
            <div className="text-xl font-bold mt-1 text-blue-600" data-testid="text-total-transfers">{formatCurrency(totals.totalTransfers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-700" />
              <span className="text-sm text-muted-foreground">Current Balance</span>
            </div>
            <div className="text-xl font-bold mt-1 text-green-700" data-testid="text-current-balance">{formatCurrency(totals.currentBalance)}</div>
            {totals.lastDate && <div className="text-xs text-muted-foreground">{format(new Date(totals.lastDate), 'MMM d, yyyy')}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Days</span>
            </div>
            <div className="text-xl font-bold mt-1" data-testid="text-total-days">{filteredDays.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Cash Register Days</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
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
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
                <SelectTrigger className="w-36" data-testid="select-salesperson-filter">
                  <SelectValue placeholder="Salesperson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salespersons</SelectItem>
                  {salespersons.map(sp => (
                    <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={discrepancyFilter} onValueChange={setDiscrepancyFilter}>
                <SelectTrigger className="w-44" data-testid="select-discrepancy-filter">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="variance">With Variance ({varianceCount})</SelectItem>
                  <SelectItem value="discrepancy">With Issues ({discrepancyCount})</SelectItem>
                  <SelectItem value="ok">No Issues</SelectItem>
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
                  <TableHead>Salesperson</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Cash In</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Transfers</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No cash register days found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDays.map((day) => (
                    <TableRow 
                      key={day.id} 
                      data-testid={`row-day-${day.id}`}
                      className={day.hasDiscrepancy === 1 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {day.hasDiscrepancy === 1 && (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" data-testid={`icon-discrepancy-${day.id}`} />
                          )}
                          {day.registerDate}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-salesperson-${day.id}`}>{day.salespersonName}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(day.openingBalance)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(day.totalCashReceived)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(day.totalExpenses)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(day.totalTransfers)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(day.closingBalance)}</TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const expectedClosing = day.openingBalance + day.totalCashReceived - day.totalExpenses - day.totalTransfers;
                          const variance = day.closingBalance - expectedClosing;
                          if (Math.abs(variance) <= 100) {
                            return <span className="text-muted-foreground">-</span>;
                          }
                          return (
                            <span className={variance > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(day.status)}
                          {day.hasDiscrepancy === 1 && (
                            <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs" data-testid={`badge-discrepancy-${day.id}`}>
                              Issue
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => viewDayDetails(day.id)}
                          data-testid={`button-view-${day.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredDays.length > 0 && (
            <DataTablePagination
              meta={paginationMeta}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {selectedDay.registerDate} - {selectedDay.salespersonName}
                </DialogTitle>
                <DialogDescription>
                  View cash register details and transactions
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                <div className="text-center p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">Opening</div>
                  <div className="text-lg font-bold">{formatCurrency(selectedDay.openingBalance)}</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-md">
                  <div className="text-sm text-muted-foreground">Cash In</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(selectedDay.totalCashReceived)}</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-md">
                  <div className="text-sm text-muted-foreground">Expenses</div>
                  <div className="text-lg font-bold text-red-600">{formatCurrency(selectedDay.totalExpenses)}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">Closing</div>
                  <div className="text-lg font-bold">{formatCurrency(selectedDay.closingBalance)}</div>
                </div>
              </div>

              {/* Discrepancy Alert */}
              {selectedDay.hasDiscrepancy === 1 && selectedDay.discrepancyDetails && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md mb-4" data-testid="discrepancy-alert">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Discrepancy Found</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedDay.discrepancyDetails.items_mismatch && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Expense Items Total:</p>
                        <p className="font-mono">
                          <span className="text-red-600">Items: {formatCurrency(selectedDay.discrepancyDetails.items_total * 100)}</span>
                          <span className="mx-2">vs</span>
                          <span>Total: {formatCurrency(selectedDay.discrepancyDetails.total_expenses * 100)}</span>
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                          Difference: {formatCurrency(Math.abs(selectedDay.discrepancyDetails.items_difference) * 100)}
                          {selectedDay.discrepancyDetails.items_difference > 0 ? ' (missing items)' : ' (extra items)'}
                        </p>
                      </div>
                    )}
                    {selectedDay.discrepancyDetails.balance_mismatch && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Balance Calculation:</p>
                        <p className="font-mono">
                          <span className="text-red-600">Actual: {formatCurrency(selectedDay.discrepancyDetails.actual_closing * 100)}</span>
                          <span className="mx-2">vs</span>
                          <span>Expected: {formatCurrency(selectedDay.discrepancyDetails.expected_closing * 100)}</span>
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                          Difference: {formatCurrency(Math.abs(selectedDay.discrepancyDetails.closing_difference) * 100)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedDay.transactions && selectedDay.transactions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Transactions</h4>
                  <div className="rounded-md border overflow-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Converted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDay.transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <Badge variant={
                                tx.transactionType === 'expense' ? 'destructive' :
                                tx.transactionType === 'cash_received' ? 'default' :
                                tx.transactionType === 'transfer' ? 'secondary' : 'outline'
                              }>
                                {tx.transactionType.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {tx.description || tx.reference || '-'}
                              {tx.items && tx.items.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {tx.items.map(item => item.itemLabel).join(', ')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell>
                              {tx.convertedToVoucherId ? (
                                <Badge variant="outline" className="text-xs" data-testid={`badge-voucher-${tx.id}`}>
                                  <Receipt className="w-3 h-3 mr-1" />
                                  Voucher
                                </Badge>
                              ) : tx.transactionType === 'expense' ? (
                                <Button variant="ghost" size="sm" className="text-xs h-6" data-testid={`button-convert-${tx.id}`}>
                                  Convert
                                </Button>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Expense Items Section with Edit Capability */}
              {selectedDay.transactions?.some(tx => tx.transactionType === 'expense' && tx.items && tx.items.length > 0) && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Expense Items (Edit to Fix Discrepancy)</h4>
                    {selectedDay.hasDiscrepancy === 1 && selectedDay.discrepancyDetails?.items_mismatch && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const expenseTx = selectedDay.transactions?.find(tx => tx.transactionType === 'expense');
                          if (expenseTx && selectedDay.discrepancyDetails) {
                            const diff = selectedDay.discrepancyDetails.items_difference * 100;
                            if (diff > 0) {
                              addAdjustmentMutation.mutate({
                                transactionId: expenseTx.id,
                                amount: Math.round(diff),
                                label: 'OTHER/ADJUSTMENT'
                              });
                            }
                          }
                        }}
                        disabled={addAdjustmentMutation.isPending}
                        data-testid="button-add-adjustment"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Adjustment Item
                      </Button>
                    )}
                  </div>
                  <div className="rounded-md border overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDay.transactions
                          .filter(tx => tx.transactionType === 'expense' && tx.items)
                          .flatMap(tx => tx.items || [])
                          .map((item) => {
                            const isEditing = editingItems.some(e => e.id === item.id);
                            const editValue = editingItems.find(e => e.id === item.id)?.amount || '';
                            
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.itemLabel}</TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      className="w-24 h-8 text-right"
                                      value={editValue}
                                      onChange={(e) => setEditingItems(prev => 
                                        prev.map(ei => ei.id === item.id ? { ...ei, amount: e.target.value } : ei)
                                      )}
                                      placeholder={(item.amount / 100).toString()}
                                      data-testid={`input-edit-amount-${item.id}`}
                                    />
                                  ) : (
                                    <span className="font-mono">{formatCurrency(item.amount)}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <div className="flex gap-1">
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-7 w-7"
                                        onClick={() => {
                                          const newAmount = parseFloat(editValue) * 100;
                                          if (!isNaN(newAmount) && newAmount >= 0) {
                                            updateExpenseItemMutation.mutate({ id: item.id, amount: Math.round(newAmount) });
                                          }
                                        }}
                                        disabled={updateExpenseItemMutation.isPending}
                                        data-testid={`button-save-${item.id}`}
                                      >
                                        <Save className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-7 w-7"
                                        onClick={() => setEditingItems(prev => prev.filter(e => e.id !== item.id))}
                                        data-testid={`button-cancel-edit-${item.id}`}
                                      >
                                        <X className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-7 w-7"
                                      onClick={() => setEditingItems(prev => [...prev, { id: item.id, amount: (item.amount / 100).toString() }])}
                                      data-testid={`button-edit-${item.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {selectedDay.notes && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Notes: </span>
                  <span>{selectedDay.notes}</span>
                </div>
              )}

              <DialogFooter className="gap-2 mt-4">
                {selectedDay.status === 'open' && (
                  <Button 
                    onClick={() => reconcileMutation.mutate({ id: selectedDay.id })}
                    disabled={reconcileMutation.isPending}
                    data-testid="button-reconcile"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {reconcileMutation.isPending ? 'Reconciling...' : 'Reconcile Day'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedDay(null)} data-testid="button-close-detail">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

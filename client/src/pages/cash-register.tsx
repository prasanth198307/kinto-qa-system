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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { 
  Plus, Upload, Search, Eye, Check, X, Receipt, Calendar, User, 
  Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet,
  AlertCircle, TrendingUp, TrendingDown, DollarSign, CheckCircle2, Lock
} from "lucide-react";
import type { CashRegisterDay, CashRegisterTransaction, CashRegisterExpenseItem } from "@shared/schema";

interface DayWithTransactions extends CashRegisterDay {
  transactions?: (CashRegisterTransaction & { items?: CashRegisterExpenseItem[] })[];
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
  const [selectedDay, setSelectedDay] = useState<DayWithTransactions | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [newDayData, setNewDayData] = useState({
    registerDate: format(new Date(), 'yyyy-MM-dd'),
    salespersonName: '',
    openingBalance: '',
    notes: '',
  });

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

  const filteredDays = days.filter(day => {
    const matchesSearch = searchQuery === "" || 
      day.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      day.registerDate.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || day.status === statusFilter;
    const matchesSalesperson = salespersonFilter === "all" || day.salespersonName === salespersonFilter;
    return matchesSearch && matchesStatus && matchesSalesperson;
  });

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
    let totalOpening = 0;
    let totalClosing = 0;
    let totalDeposits = 0;
    let totalCashReceived = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    filteredDays.forEach(day => {
      totalOpening += day.openingBalance;
      totalClosing += day.closingBalance;
      totalDeposits += day.totalDeposits;
      totalCashReceived += day.totalCashReceived;
      totalExpenses += day.totalExpenses;
      totalTransfers += day.totalTransfers;
    });

    return { totalOpening, totalClosing, totalDeposits, totalCashReceived, totalExpenses, totalTransfers };
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
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDay} disabled={createDayMutation.isPending} data-testid="button-create-day">
                  {createDayMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Opening</span>
            </div>
            <div className="text-xl font-bold mt-1" data-testid="text-total-opening">{formatCurrency(totals.totalOpening)}</div>
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
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Closing</span>
            </div>
            <div className="text-xl font-bold mt-1" data-testid="text-total-closing">{formatCurrency(totals.totalClosing)}</div>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No cash register days found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDays.map((day) => (
                    <TableRow key={day.id} data-testid={`row-day-${day.id}`}>
                      <TableCell className="font-medium">{day.registerDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-salesperson-${day.id}`}>{day.salespersonName}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(day.openingBalance)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(day.totalCashReceived)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(day.totalExpenses)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(day.totalTransfers)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(day.closingBalance)}</TableCell>
                      <TableCell>{getStatusBadge(day.status)}</TableCell>
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
                                <Badge variant="outline" className="text-xs">
                                  <Receipt className="w-3 h-3 mr-1" />
                                  Voucher
                                </Badge>
                              ) : tx.transactionType === 'expense' ? (
                                <Button variant="ghost" size="sm" className="text-xs h-6">
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
                <Button variant="outline" onClick={() => setSelectedDay(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

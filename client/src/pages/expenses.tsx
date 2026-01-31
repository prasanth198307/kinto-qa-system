import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, FileText, Trash2, Search, Eye, Check, X, Receipt, Send, IndianRupee, Calendar, User, Building2, Printer, ArrowLeft } from "lucide-react";
import PrintableExpenseVoucher from "@/components/PrintableExpenseVoucher";
import type { ExpenseCategory, ExpenseVoucher, ExpenseItem, PaginationMeta } from "@shared/schema";
import { DataTablePagination } from "@/components/DataTablePagination";

interface ExpenseItemForm {
  description: string;
  categoryId: string;
  amount: string;
  gstAmount: string;
  notes: string;
}

interface VoucherWithDetails extends ExpenseVoucher {
  items?: ExpenseItem[];
  attachments?: any[];
  rejectionReason?: string;
}

export default function ExpensesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('expenses', 'create');
  const canDelete = hasPermission('expenses', 'delete');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherWithDetails | null>(null);
  const [voucherData, setVoucherData] = useState({
    voucherDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMode: 'cash',
    payeeName: '',
    payeeType: 'other',
    purpose: '',
    remarks: '',
  });
  const [lineItems, setLineItems] = useState<ExpenseItemForm[]>([
    { description: '', categoryId: '', amount: '', gstAmount: '0', notes: '' }
  ]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ['/api/expense-categories'],
  });

  const { data: vouchers = [], isLoading: vouchersLoading } = useQuery<ExpenseVoucher[]>({
    queryKey: ['/api/expense-vouchers'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/expense-vouchers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-vouchers'] });
      toast({ title: "Success", description: "Expense voucher created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/expense-vouchers/${id}/submit`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-vouchers'] });
      toast({ title: "Success", description: "Voucher submitted for approval" });
      setSelectedVoucher(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/expense-vouchers/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-vouchers'] });
      toast({ title: "Success", description: "Voucher approved" });
      setSelectedVoucher(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/expense-vouchers/${id}/reject`, { rejectionReason: reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-vouchers'] });
      toast({ title: "Success", description: "Voucher rejected" });
      setSelectedVoucher(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expense-vouchers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-vouchers'] });
      toast({ title: "Success", description: "Voucher deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setVoucherData({
      voucherDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMode: 'cash',
      payeeName: '',
      payeeType: 'other',
      purpose: '',
      remarks: '',
    });
    setLineItems([{ description: '', categoryId: '', amount: '', gstAmount: '0', notes: '' }]);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', categoryId: '', amount: '', gstAmount: '0', notes: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof ExpenseItemForm, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      const gst = parseFloat(item.gstAmount) || 0;
      return sum + amount + gst;
    }, 0);
  };

  const handleCreate = () => {
    const validItems = lineItems.filter(item => item.description && item.amount);
    if (validItems.length === 0) {
      toast({ title: "Error", description: "Add at least one expense item", variant: "destructive" });
      return;
    }

    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const gstTotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.gstAmount) || 0), 0);
    const totalAmount = subtotal + gstTotal;
    
    createMutation.mutate({
      ...voucherData,
      subtotal: Math.round(subtotal * 100), // Convert to paise
      gstAmount: Math.round(gstTotal * 100),
      totalAmount: Math.round(totalAmount * 100),
      items: validItems.map(item => ({
        description: item.description,
        categoryId: item.categoryId || null,
        unitPrice: Math.round(parseFloat(item.amount) * 100), // Store in paise
        quantity: 1,
        gstRate: 0,
        gstAmount: Math.round((parseFloat(item.gstAmount) || 0) * 100),
        netAmount: Math.round((parseFloat(item.amount) + parseFloat(item.gstAmount || '0')) * 100),
        remarks: item.notes || null,
      })),
    });
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = v.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.payeeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVouchers.length / pageSize);
  const paginatedVouchers = filteredVouchers.slice((page - 1) * pageSize, page * pageSize);
  const paginationMeta: PaginationMeta = {
    page,
    pageSize,
    totalItems: filteredVouchers.length,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending':
      case 'submitted':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const formatAmount = (amountInPaise: number | null | undefined) => {
    if (amountInPaise === null || amountInPaise === undefined) return '0.00';
    return (amountInPaise / 100).toFixed(2);
  };

  const fetchVoucherDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/expense-vouchers/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSelectedVoucher(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load voucher details", variant: "destructive" });
    }
  };

  if (categoriesLoading || vouchersLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/?tab=overview')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Expense Tracking</h1>
            <p className="text-muted-foreground text-sm">Record and manage daily expenses with voucher issuance</p>
          </div>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          {canCreate && (
            <DialogTrigger asChild>
              <Button data-testid="button-create-voucher">
                <Plus className="h-4 w-4 mr-2" />
                New Expense Voucher
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Expense Voucher</DialogTitle>
              <DialogDescription>Record a new expense with line items</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voucherDate">Voucher Date</Label>
                  <Input
                    id="voucherDate"
                    type="date"
                    value={voucherData.voucherDate}
                    onChange={(e) => setVoucherData(prev => ({ ...prev, voucherDate: e.target.value }))}
                    data-testid="input-voucher-date"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select
                    value={voucherData.paymentMode}
                    onValueChange={(value) => setVoucherData(prev => ({ ...prev, paymentMode: value }))}
                  >
                    <SelectTrigger data-testid="select-payment-mode">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payeeName">Payee Name</Label>
                  <Input
                    id="payeeName"
                    value={voucherData.payeeName}
                    onChange={(e) => setVoucherData(prev => ({ ...prev, payeeName: e.target.value }))}
                    placeholder="Recipient name"
                    data-testid="input-payee-name"
                  />
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    value={voucherData.purpose}
                    onChange={(e) => setVoucherData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Brief purpose"
                    data-testid="input-purpose"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Expense Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <Card key={index} className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                            data-testid={`input-item-description-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={item.categoryId}
                            onValueChange={(value) => updateLineItem(index, 'categoryId', value)}
                          >
                            <SelectTrigger data-testid={`select-item-category-${index}`}>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            data-testid={`input-item-amount-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">GST</Label>
                          <Input
                            type="number"
                            value={item.gstAmount}
                            onChange={(e) => updateLineItem(index, 'gstAmount', e.target.value)}
                            placeholder="0.00"
                            data-testid={`input-item-gst-${index}`}
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          {lineItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                              data-testid={`button-remove-item-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={voucherData.remarks}
                  onChange={(e) => setVoucherData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Additional notes"
                  className="resize-none"
                  data-testid="input-remarks"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-semibold">
                  Total: <IndianRupee className="h-4 w-4 inline" />{calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-voucher">
                {createMutation.isPending ? 'Creating...' : 'Create Voucher'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vouchers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No expense vouchers found</h3>
              <p className="text-muted-foreground text-sm">Create your first expense voucher to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVouchers.map(voucher => (
                    <TableRow key={voucher.id} data-testid={`row-voucher-${voucher.id}`}>
                      <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                      <TableCell>
                        {voucher.voucherDate ? format(new Date(voucher.voucherDate), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>{voucher.payeeName || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{voucher.purpose || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        <IndianRupee className="h-3 w-3 inline" />{formatAmount(voucher.totalAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fetchVoucherDetails(voucher.id)}
                            data-testid={`button-view-${voucher.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <PrintableExpenseVoucher voucher={voucher} />
                          {voucher.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => submitMutation.mutate(voucher.id)}
                                title="Submit for approval"
                                data-testid={`button-submit-${voucher.id}`}
                              >
                                <Send className="h-4 w-4 text-blue-500" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this voucher?')) {
                                      deleteMutation.mutate(voucher.id);
                                    }
                                  }}
                                  data-testid={`button-delete-${voucher.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredVouchers.length > 0 && (
            <DataTablePagination
              meta={paginationMeta}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Voucher: {selectedVoucher?.voucherNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {selectedVoucher.voucherDate ? format(new Date(selectedVoucher.voucherDate), 'dd MMM yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Payee:</span>
                  <span className="font-medium">{selectedVoucher.payeeName || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <Badge variant="outline">{selectedVoucher.paymentMode}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedVoucher.status)}
                </div>
              </div>

              {selectedVoucher.purpose && (
                <div>
                  <span className="text-sm text-muted-foreground">Purpose:</span>
                  <p className="mt-1">{selectedVoucher.purpose}</p>
                </div>
              )}

              {selectedVoucher.items && selectedVoucher.items.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Line Items:</span>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedVoucher.items.map((item: ExpenseItem, idx: number) => (
                        <TableRow key={item.id || idx}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{getCategoryName(item.categoryId)}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.gstAmount)}</TableCell>
                          <TableCell className="text-right font-medium">{formatAmount(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-semibold">
                  Total: <IndianRupee className="h-4 w-4 inline" />{formatAmount(selectedVoucher.totalAmount)}
                </div>
                <div className="flex gap-2">
                  {(selectedVoucher.status === 'pending' || selectedVoucher.status === 'submitted') && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) {
                            rejectMutation.mutate({ id: selectedVoucher.id, reason });
                          }
                        }}
                        disabled={rejectMutation.isPending}
                        data-testid="button-reject"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => approveMutation.mutate(selectedVoucher.id)}
                        disabled={approveMutation.isPending}
                        data-testid="button-approve"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </>
                  )}
                  {selectedVoucher.status === 'draft' && (
                    <Button
                      onClick={() => submitMutation.mutate(selectedVoucher.id)}
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-for-approval"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit for Approval
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
                    Close
                  </Button>
                </div>
              </div>

              {selectedVoucher.status === 'rejected' && selectedVoucher.rejectionReason && (
                <div className="p-3 bg-destructive/10 rounded-md">
                  <span className="text-sm font-medium text-destructive">Rejection Reason:</span>
                  <p className="text-sm mt-1">{selectedVoucher.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

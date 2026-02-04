import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, Search, IndianRupee, Calendar, User, FileText, 
  CheckCircle, XCircle, ArrowRightLeft, Eye, ChevronsUpDown, Check, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vendor, CustomerAdvance } from "@shared/schema";

interface AdvanceWithBalance extends CustomerAdvance {
  vendorName: string | null;
  availableBalance: number;
}

export default function CustomerAdvancesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('customer_advances', 'create');
  const canEdit = hasPermission('customer_advances', 'edit');
  const canDelete = hasPermission('customer_advances', 'delete');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceWithBalance | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  // Form state for creating new advance
  const [formData, setFormData] = useState({
    vendorId: "",
    receiptDate: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    paymentMethod: "Cash",
    referenceNumber: "",
    bankName: "",
    purpose: "",
    remarks: "",
  });

  // Apply advance form state
  const [applyData, setApplyData] = useState({
    invoiceId: "",
    amount: "",
    remarks: "",
  });

  // Fetch customer advances
  const { data: advances = [], isLoading } = useQuery<AdvanceWithBalance[]>({
    queryKey: ['/api/customer-advances', statusFilter, vendorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (vendorFilter !== "all") params.append("vendorId", vendorFilter);
      const res = await fetch(`/api/customer-advances?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch advances");
      return res.json();
    },
  });

  // Fetch vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/vendors?limit=1000');
      if (!res.ok) throw new Error("Failed to fetch vendors");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.vendors || []);
    }
  });

  // Fetch invoices for apply dialog
  const { data: vendorInvoices = [] } = useQuery({
    queryKey: ['/api/invoices', 'vendor', selectedAdvance?.vendorId],
    enabled: !!selectedAdvance?.vendorId && showApplyDialog,
    queryFn: async () => {
      const res = await fetch(`/api/invoices?vendorId=${selectedAdvance?.vendorId}&paymentStatus=pending`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });

  // Filter only customer vendors (buyers)
  const buyerVendors = vendors.filter(v => 
    v.vendorType === 'Customer' || 
    v.vendorType === 'customer' || 
    v.vendorType === 'Both' || 
    v.vendorType === 'both'
  );

  // Create advance mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/customer-advances', {
        ...data,
        amount: Math.round(parseFloat(data.amount) * 100), // Convert to paise
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Advance payment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Cancel advance mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks: string }) => {
      const response = await apiRequest('POST', `/api/customer-advances/${id}/cancel`, { remarks });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Advance cancelled successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      setShowDetailDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Apply advance mutation
  const applyMutation = useMutation({
    mutationFn: async (data: { advanceId: string; invoiceId: string; amount: number; remarks: string }) => {
      const response = await apiRequest('POST', `/api/customer-advances/${data.advanceId}/apply`, {
        invoiceId: data.invoiceId,
        amount: data.amount,
        remarks: data.remarks,
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Advance applied to invoice successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setShowApplyDialog(false);
      setApplyData({ invoiceId: "", amount: "", remarks: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      vendorId: "",
      receiptDate: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      paymentMethod: "Cash",
      referenceNumber: "",
      bankName: "",
      purpose: "",
      remarks: "",
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorId || !formData.amount) {
      toast({ title: "Error", description: "Customer and amount are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance || !applyData.invoiceId || !applyData.amount) {
      toast({ title: "Error", description: "Invoice and amount are required", variant: "destructive" });
      return;
    }
    applyMutation.mutate({
      advanceId: selectedAdvance.id,
      invoiceId: applyData.invoiceId,
      amount: Math.round(parseFloat(applyData.amount) * 100),
      remarks: applyData.remarks,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600" data-testid="status-active">Active</Badge>;
      case 'fully_used':
        return <Badge className="bg-blue-600" data-testid="status-fully-used">Fully Used</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" data-testid="status-cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amountInPaise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amountInPaise / 100);
  };

  // Filter advances by search term
  const filteredAdvances = advances.filter(adv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      adv.advanceNumber.toLowerCase().includes(search) ||
      (adv.vendorName && adv.vendorName.toLowerCase().includes(search)) ||
      (adv.referenceNumber && adv.referenceNumber.toLowerCase().includes(search))
    );
  });

  // Calculate totals
  const totalAdvance = filteredAdvances.reduce((sum, adv) => sum + adv.amount, 0);
  const totalUsed = filteredAdvances.reduce((sum, adv) => sum + adv.usedAmount, 0);
  const totalAvailable = filteredAdvances.reduce((sum, adv) => sum + adv.availableBalance, 0);

  return (
    <div className="space-y-4 p-4" data-testid="customer-advances-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/?tab=invoices')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold" data-testid="page-title">Customer Advances</h1>
            <p className="text-sm text-muted-foreground">
              Track advance payments received from customers before invoicing
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-record-advance">
            <Plus className="h-4 w-4 mr-1" />
            Record Advance
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Received</p>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-received">
              {formatCurrency(totalAdvance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Applied to Invoices</p>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-used">
              {formatCurrency(totalUsed)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Available Balance</p>
            </div>
            <p className="text-xl font-bold text-green-600" data-testid="text-total-available">
              {formatCurrency(totalAvailable)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by advance number, customer, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-vendor-filter">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {buyerVendors.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="fully_used">Fully Used</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Advances Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IndianRupee className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No advance payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advance #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvances.map(advance => (
                    <TableRow key={advance.id} data-testid={`row-advance-${advance.id}`}>
                      <TableCell className="font-medium" data-testid={`text-advance-number-${advance.id}`}>
                        {advance.advanceNumber}
                      </TableCell>
                      <TableCell data-testid={`text-vendor-name-${advance.id}`}>
                        {advance.vendorName || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(advance.receiptDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(advance.amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(advance.availableBalance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{advance.paymentMethod}</span>
                          {advance.referenceNumber && (
                            <span className="text-xs text-muted-foreground">{advance.referenceNumber}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(advance.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedAdvance(advance);
                              setShowDetailDialog(true);
                            }}
                            data-testid={`button-view-${advance.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {advance.status === 'active' && advance.availableBalance > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAdvance(advance);
                                setApplyData({
                                  ...applyData,
                                  amount: (advance.availableBalance / 100).toFixed(2),
                                });
                                setShowApplyDialog(true);
                              }}
                              data-testid={`button-apply-${advance.id}`}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Create Advance Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Advance Payment</DialogTitle>
            <DialogDescription>
              Record an advance payment received from a customer
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between font-normal"
                    data-testid="select-vendor"
                  >
                    {formData.vendorId
                      ? buyerVendors.find(v => v.id === formData.vendorId)?.vendorName
                      : "Search customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Type to search customer..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {buyerVendors.map(v => (
                          <CommandItem
                            key={v.id}
                            value={v.vendorName}
                            onSelect={() => {
                              setFormData({ ...formData, vendorId: v.id });
                              setCustomerSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.vendorId === v.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {v.vendorName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Receipt Date *</Label>
                <Input
                  type="date"
                  value={formData.receiptDate}
                  onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                  data-testid="input-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                >
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="Transaction ID / Cheque No."
                  data-testid="input-reference"
                />
              </div>
            </div>

            {(formData.paymentMethod === 'Cheque' || 
              formData.paymentMethod === 'NEFT' || 
              formData.paymentMethod === 'RTGS') && (
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Enter bank name"
                  data-testid="input-bank"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Order booking, Advance for bulk order"
                data-testid="input-purpose"
              />
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
                data-testid="input-remarks"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit-advance"
              >
                {createMutation.isPending ? "Saving..." : "Record Advance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Advance Details</DialogTitle>
          </DialogHeader>
          {selectedAdvance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Advance Number</Label>
                  <p className="font-medium">{selectedAdvance.advanceNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAdvance.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedAdvance.vendorName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Receipt Date</Label>
                  <p>{format(new Date(selectedAdvance.receiptDate), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount Received</Label>
                  <p className="font-bold">{formatCurrency(selectedAdvance.amount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount Used</Label>
                  <p>{formatCurrency(selectedAdvance.usedAmount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Available Balance</Label>
                  <p className="font-bold text-green-600">
                    {formatCurrency(selectedAdvance.availableBalance)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p>
                    {selectedAdvance.paymentMethod}
                    {selectedAdvance.referenceNumber && ` - ${selectedAdvance.referenceNumber}`}
                  </p>
                </div>
              </div>

              {selectedAdvance.purpose && (
                <div>
                  <Label className="text-muted-foreground">Purpose</Label>
                  <p>{selectedAdvance.purpose}</p>
                </div>
              )}

              {selectedAdvance.remarks && (
                <div>
                  <Label className="text-muted-foreground">Remarks</Label>
                  <p>{selectedAdvance.remarks}</p>
                </div>
              )}

              <DialogFooter>
                {selectedAdvance.status === 'active' && selectedAdvance.usedAmount === 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const remarks = window.prompt("Enter cancellation reason:");
                      if (remarks !== null) {
                        cancelMutation.mutate({ id: selectedAdvance.id, remarks });
                      }
                    }}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-advance"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel Advance
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply to Invoice Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Advance to Invoice</DialogTitle>
            <DialogDescription>
              Apply {selectedAdvance && formatCurrency(selectedAdvance.availableBalance)} available 
              from {selectedAdvance?.advanceNumber} to an invoice
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApplySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Invoice *</Label>
              <Select
                value={applyData.invoiceId}
                onValueChange={(v) => setApplyData({ ...applyData, invoiceId: v })}
              >
                <SelectTrigger data-testid="select-invoice">
                  <SelectValue placeholder="Select invoice to apply" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(vendorInvoices) && vendorInvoices.map((inv: any) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {formatCurrency(inv.invoiceTotal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount to Apply (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedAdvance ? selectedAdvance.availableBalance / 100 : undefined}
                value={applyData.amount}
                onChange={(e) => setApplyData({ ...applyData, amount: e.target.value })}
                data-testid="input-apply-amount"
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {selectedAdvance && formatCurrency(selectedAdvance.availableBalance)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={applyData.remarks}
                onChange={(e) => setApplyData({ ...applyData, remarks: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
                data-testid="input-apply-remarks"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowApplyDialog(false);
                  setApplyData({ invoiceId: "", amount: "", remarks: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={applyMutation.isPending}
                data-testid="button-apply-submit"
              >
                {applyMutation.isPending ? "Applying..." : "Apply Advance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

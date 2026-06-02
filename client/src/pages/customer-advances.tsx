import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, Search, IndianRupee, Calendar, User, FileText, 
  CheckCircle, XCircle, ArrowRightLeft, Eye, ChevronsUpDown, Check, ArrowLeft, Loader2
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

  // Apply advance form state - multi-invoice checkbox approach
  interface SelectedInvoice {
    id: string;
    amount: number;
    maxAmount: number;
    label: string;
    buyerName: string;
  }
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, SelectedInvoice>>({});
  const [applyRemarks, setApplyRemarks] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  // Fetch customer advances
  const { data: advances = [], isLoading } = useQuery<AdvanceWithBalance[]>({
    queryKey: ['/api/customer-advances', statusFilter, vendorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (vendorFilter !== "all") params.append("vendorId", vendorFilter);
      params.append("advanceType", "security_deposit"); // Customer Advances page = security deposits only
      const res = await fetch(`/api/customer-advances?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch advances");
      return res.json();
    },
  });

  // Filter vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors', 'all-for-advances'],
    queryFn: async () => {
      const res = await fetch('/api/vendors?limit=5000');
      if (!res.ok) throw new Error("Failed to fetch vendors");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.vendors || []);
    }
  });

  // Get all child vendor IDs for the selected parent vendor
  const childVendorIds = useMemo(() => {
    if (!selectedAdvance?.vendorId) return [];
    return vendors
      .filter(v => v.parentVendorId === selectedAdvance.vendorId)
      .map(v => v.id);
  }, [vendors, selectedAdvance?.vendorId]);

  // Fetch invoices for apply dialog (parent + all child vendors)
  const { data: vendorInvoices = [] } = useQuery({
    queryKey: ['/api/invoices', 'vendor-family', selectedAdvance?.vendorId, childVendorIds],
    enabled: !!selectedAdvance?.vendorId && showApplyDialog,
    queryFn: async () => {
      // Fetch invoices for parent vendor
      const parentRes = await fetch(`/api/invoices?vendorId=${selectedAdvance?.vendorId}&paymentStatus=pending`, { credentials: 'include' });
      if (!parentRes.ok) throw new Error("Failed to fetch invoices");
      const parentInvoices = await parentRes.json();
      
      // Fetch invoices for all child vendors
      const childInvoicesPromises = childVendorIds.map(async (childId) => {
        const res = await fetch(`/api/invoices?vendorId=${childId}&paymentStatus=pending`, { credentials: 'include' });
        if (!res.ok) return [];
        return res.json();
      });
      
      const childInvoicesArrays = await Promise.all(childInvoicesPromises);
      const allChildInvoices = childInvoicesArrays.flat();
      
      // Combine parent and child invoices and map to consistent format with outstanding balance
      const allInvoices = [...parentInvoices, ...allChildInvoices].map((inv: any) => ({
        ...inv,
        invoiceTotal: inv.totalAmount,
        outstanding: inv.totalAmount - (inv.amountReceived || 0),
      }));
      
      return allInvoices;
    },
  });

  // Filter only parent/main customer accounts (not child/linked accounts)
  // Show vendors that either have no parent OR are themselves parent accounts
  const buyerVendors = vendors.filter(v => {
    const type = (v.vendorType || '').toLowerCase();
    const isCustomerType = type.includes('customer') || 
                          type.includes('both') || 
                          type.includes('buyer') ||
                          type === '' || 
                          !v.vendorType;
    // Only show vendors that are NOT linked to a parent (main accounts only)
    const isParentOrStandalone = !v.parentVendorId;
    return isCustomerType && isParentOrStandalone;
  });

  // Create advance mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/customer-advances', {
        ...data,
        amount: Math.round(parseFloat(data.amount) * 100), // Convert to paise
        advanceType: 'security_deposit', // Customer Advances page always creates security deposits
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
      queryClient.invalidateQueries({ queryKey: ['/api/external/customer-outstanding'] });
      setShowDetailDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Multi-invoice advance application helpers
  const availableBalance = selectedAdvance ? selectedAdvance.availableBalance : 0;
  const totalSelectedAmount = Object.values(selectedInvoices).reduce((sum, inv) => sum + inv.amount, 0);
  const remainingToAllocate = availableBalance - totalSelectedAmount;

  const handleToggleInvoice = (id: string, maxAmount: number, label: string, buyerName: string) => {
    setSelectedInvoices(prev => {
      if (prev[id]) {
        const { [id]: removed, ...rest } = prev;
        return rest;
      } else {
        const currentTotal = Object.values(prev).reduce((sum, inv) => sum + inv.amount, 0);
        const remaining = availableBalance - currentTotal;
        const autoAmount = Math.min(maxAmount, remaining);
        return {
          ...prev,
          [id]: { id, amount: autoAmount > 0 ? autoAmount : 0, maxAmount, label, buyerName }
        };
      }
    });
  };

  const handleInvoiceAmountChange = (id: string, value: number) => {
    setSelectedInvoices(prev => {
      if (!prev[id]) return prev;
      const item = prev[id];
      const clampedValue = Math.min(Math.max(0, value), item.maxAmount);
      return {
        ...prev,
        [id]: { ...item, amount: clampedValue }
      };
    });
  };

  const handleApplyMultiple = async () => {
    const items = Object.values(selectedInvoices).filter(item => item.amount > 0);
    if (items.length === 0 || !selectedAdvance) return;
    
    if (totalSelectedAmount > availableBalance) {
      toast({ title: "Error", description: "Total exceeds available balance", variant: "destructive" });
      return;
    }

    setIsApplying(true);
    try {
      for (const item of items) {
        await apiRequest('POST', `/api/customer-advances/${selectedAdvance.id}/apply`, {
          invoiceId: item.id,
          amount: item.amount,
          remarks: applyRemarks || `Applied from advance ${selectedAdvance.advanceNumber}`,
        });
      }
      toast({ 
        title: "Success", 
        description: `Advance applied to ${items.length} invoice(s) totaling ${formatCurrency(totalSelectedAmount)}` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setShowApplyDialog(false);
      setSelectedInvoices({});
      setApplyRemarks("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to apply advance", variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

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

  const handleOpenApplyDialog = (advance: AdvanceWithBalance) => {
    setSelectedAdvance(advance);
    setSelectedInvoices({});
    setApplyRemarks("");
    setShowApplyDialog(true);
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
        <div className="flex flex-wrap items-center gap-3">
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
                              onClick={() => handleOpenApplyDialog(advance)}
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
                        <div className="max-h-[300px] overflow-y-auto">
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
                        </div>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Apply to Invoice Dialog - Multi-select with checkboxes */}
      <Dialog open={showApplyDialog} onOpenChange={(open) => {
        setShowApplyDialog(open);
        if (!open) {
          setSelectedInvoices({});
          setApplyRemarks("");
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Apply Advance to Invoices
            </DialogTitle>
            <DialogDescription>
              Apply advance <span className="font-semibold">{selectedAdvance?.advanceNumber}</span> to pending invoices. 
              Select one or more invoices and amounts will be auto-allocated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Advance Amount</p>
                <p className="text-lg font-semibold">{selectedAdvance && formatCurrency(selectedAdvance.amount)}</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <p className="text-sm text-muted-foreground">Already Used</p>
                <p className="text-lg font-semibold">{selectedAdvance && formatCurrency(selectedAdvance.usedAmount)}</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-lg font-semibold text-primary">{selectedAdvance && formatCurrency(availableBalance)}</p>
              </div>
            </div>

            {Object.keys(selectedInvoices).length > 0 && (
              <div className={`p-3 border rounded-lg ${
                totalSelectedAmount === availableBalance 
                  ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
                  : totalSelectedAmount > availableBalance 
                    ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                    : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`text-sm font-medium ${
                      totalSelectedAmount === availableBalance 
                        ? "text-green-800 dark:text-green-200" 
                        : totalSelectedAmount > availableBalance 
                          ? "text-red-800 dark:text-red-200"
                          : "text-yellow-800 dark:text-yellow-200"
                    }`}>
                      Allocating to {Object.keys(selectedInvoices).length} invoice(s)
                    </p>
                    <p className={`text-xs ${
                      totalSelectedAmount === availableBalance 
                        ? "text-green-600 dark:text-green-400" 
                        : totalSelectedAmount > availableBalance 
                          ? "text-red-600 dark:text-red-400"
                          : "text-yellow-600 dark:text-yellow-400"
                    }`}>
                      Total: {formatCurrency(totalSelectedAmount)} | Remaining: {formatCurrency(remainingToAllocate)}
                    </p>
                  </div>
                  {totalSelectedAmount > availableBalance && (
                    <Badge variant="destructive">Exceeds Balance!</Badge>
                  )}
                  {totalSelectedAmount < availableBalance && totalSelectedAmount > 0 && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                      Partial Application
                    </Badge>
                  )}
                  {totalSelectedAmount === availableBalance && (
                    <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                      Fully Allocated
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <ScrollArea className="h-[320px] border rounded-md p-2">
              {!vendorInvoices || vendorInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <FileText className="h-8 w-8 mb-2" />
                  <p>No pending invoices found for this customer</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vendorInvoices.filter((inv: any) => inv.outstanding > 0).map((inv: any) => {
                    const isSelected = !!selectedInvoices[inv.id];
                    const selectedItem = selectedInvoices[inv.id];
                    const isChildVendor = inv.vendorId !== selectedAdvance?.vendorId;
                    return (
                      <Card 
                        key={inv.id} 
                        className={`transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}
                        data-testid={`invoice-option-${inv.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleInvoice(inv.id, inv.outstanding, inv.invoiceNumber, inv.buyerName || inv.vendorName || '')}
                              data-testid={`checkbox-invoice-${inv.id}`}
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">
                                    {inv.invoiceNumber}
                                    {isChildVendor && (
                                      <Badge variant="outline" className="ml-2 text-xs">{inv.buyerName || inv.vendorName || ''}</Badge>
                                    )}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd MMM yyyy") : "N/A"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(inv.outstanding)}</p>
                                  <p className="text-xs text-muted-foreground">outstanding</p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Label className="text-xs whitespace-nowrap">Apply Amount:</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 w-32"
                                    value={((selectedItem?.amount || 0) / 100).toFixed(2)}
                                    onChange={(e) => handleInvoiceAmountChange(inv.id, Math.round(parseFloat(e.target.value || "0") * 100))}
                                    data-testid={`input-amount-${inv.id}`}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    max: {formatCurrency(inv.outstanding)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {Object.keys(selectedInvoices).length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="apply-remarks">Remarks (Optional)</Label>
                <Textarea
                  id="apply-remarks"
                  value={applyRemarks}
                  onChange={(e) => setApplyRemarks(e.target.value)}
                  placeholder="Add any notes about this application..."
                  className="resize-none"
                  data-testid="input-apply-remarks"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)} data-testid="button-cancel-apply">
              Cancel
            </Button>
            <Button 
              onClick={handleApplyMultiple} 
              disabled={Object.keys(selectedInvoices).length === 0 || totalSelectedAmount <= 0 || totalSelectedAmount > availableBalance || isApplying}
              data-testid="button-apply-submit"
            >
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Apply to {Object.keys(selectedInvoices).length} Invoice(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

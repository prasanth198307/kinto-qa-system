import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GlobalHeader } from "@/components/GlobalHeader";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Package, FileText, Search, X, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RawMaterialIssuanceForm from "@/components/RawMaterialIssuanceForm";
import GatepassForm from "@/components/GatepassForm";
import InvoiceForm from "@/components/InvoiceForm";
import PaymentForm from "@/components/PaymentForm";
import PaymentHistory from "@/components/PaymentHistory";
import FIFOPaymentAllocation from "@/components/FIFOPaymentAllocation";
import RawMaterialIssuanceTable from "@/components/RawMaterialIssuanceTable";
import GatepassTable from "@/components/GatepassTable";
import InvoiceTable from "@/components/InvoiceTable";
import type { RawMaterialIssuance, Gatepass, Invoice, Vendor } from "@shared/schema";
import { format, parse, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface ProductionManagementProps {
  activeTab?: string;
}

export default function ProductionManagement({ activeTab: externalActiveTab }: ProductionManagementProps = {}) {
  const [activeTab, setActiveTab] = useState(externalActiveTab || "raw-material-issuance");
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [showGatepassForm, setShowGatepassForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showFIFODialog, setShowFIFODialog] = useState(false);
  const [editingIssuance, setEditingIssuance] = useState<RawMaterialIssuance | null>(null);
  const [editingGatepass, setEditingGatepass] = useState<Gatepass | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedGatepassForInvoice, setSelectedGatepassForInvoice] = useState<Gatepass | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  
  // Invoice filters
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
  const { toast } = useToast();
  const { logoutMutation } = useAuth();

  // Update activeTab when externalActiveTab changes
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  const { data: issuances = [], isLoading: isLoadingIssuances } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: gatepasses = [], isLoading: isLoadingGatepasses } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  // Get unique buyer names from invoices for filter
  const uniqueBuyerNames = useMemo(() => {
    const names = new Set(invoices.map(inv => inv.buyerName));
    return Array.from(names).sort();
  }, [invoices]);

  // Filtered invoices based on search and filters
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Search by invoice number or buyer name
    if (invoiceSearchQuery.trim()) {
      const query = invoiceSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.buyerName.toLowerCase().includes(query)
      );
    }

    // Filter by vendor (buyer name)
    if (selectedVendor !== "all") {
      filtered = filtered.filter((inv) => inv.buyerName === selectedVendor);
    }

    // Filter by date
    if (dateFilterType === "range" && dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return isWithinInterval(invDate, { start: fromDate, end: toDate });
      });
    } else if (dateFilterType === "month" && selectedMonth) {
      const [year, month] = selectedMonth.split("-");
      const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const monthEnd = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return isWithinInterval(invDate, { start: monthStart, end: monthEnd });
      });
    } else if (dateFilterType === "year" && selectedYear) {
      const yearStart = startOfYear(new Date(parseInt(selectedYear), 0));
      const yearEnd = endOfYear(new Date(parseInt(selectedYear), 0));
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return isWithinInterval(invDate, { start: yearStart, end: yearEnd });
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [invoices, invoiceSearchQuery, selectedVendor, dateFilterType, dateFrom, dateTo, selectedMonth, selectedYear]);

  const deleteIssuanceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/raw-material-issuances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-material-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      toast({
        title: "Success",
        description: "Issuance deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete issuance",
        variant: "destructive",
      });
    },
  });

  const deleteGatepassMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/gatepasses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({
        title: "Success",
        description: "Gatepass deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete gatepass",
        variant: "destructive",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleEditIssuance = (issuance: RawMaterialIssuance) => {
    setEditingIssuance(issuance);
    setShowIssuanceForm(true);
  };

  const handleEditGatepass = (gatepass: Gatepass) => {
    setEditingGatepass(gatepass);
    setShowGatepassForm(true);
  };

  const handleDeleteIssuance = (id: string) => {
    if (confirm("Are you sure you want to delete this issuance?")) {
      deleteIssuanceMutation.mutate(id);
    }
  };

  const handleDeleteGatepass = (id: string) => {
    if (confirm("Are you sure you want to delete this gatepass?")) {
      deleteGatepassMutation.mutate(id);
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  const handleIssuanceFormClose = () => {
    setShowIssuanceForm(false);
    setEditingIssuance(null);
  };

  const handleGatepassFormClose = () => {
    setShowGatepassForm(false);
    setEditingGatepass(null);
  };

  const handleInvoiceFormClose = () => {
    setShowInvoiceForm(false);
    setEditingInvoice(null);
    setSelectedGatepassForInvoice(null);
  };

  const handleGenerateInvoice = (gatepass: Gatepass) => {
    setSelectedGatepassForInvoice(gatepass);
    setShowInvoiceForm(true);
  };

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentDialog(true);
  };

  const handlePaymentDialogClose = () => {
    setShowPaymentDialog(false);
    setSelectedInvoiceForPayment(null);
  };

  const clearFilters = () => {
    setInvoiceSearchQuery("");
    setSelectedVendor("all");
    setDateFilterType("all");
    setDateFrom("");
    setDateTo("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  const hasActiveFilters = invoiceSearchQuery || selectedVendor !== "all" || dateFilterType !== "all";

  const renderContent = () => {
    switch (activeTab) {
      case 'raw-material-issuance':
        return (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Raw Material Issuance</h2>
              <Button 
                onClick={() => setShowIssuanceForm(true)} 
                size="sm"
                data-testid="button-add-issuance"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue Material
              </Button>
            </div>

            {showIssuanceForm && (
              <div className="mb-4">
                <RawMaterialIssuanceForm
                  issuance={editingIssuance}
                  onClose={handleIssuanceFormClose}
                />
              </div>
            )}

            <RawMaterialIssuanceTable
              issuances={issuances}
              isLoading={isLoadingIssuances}
              onEdit={handleEditIssuance}
              onDelete={handleDeleteIssuance}
            />
          </Card>
        );
      case 'gatepasses':
        return (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Gatepasses</h2>
              <Button 
                onClick={() => setShowGatepassForm(true)} 
                size="sm"
                data-testid="button-add-gatepass"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue Gatepass
              </Button>
            </div>

            {showGatepassForm && (
              <div className="mb-4">
                <GatepassForm
                  gatepass={editingGatepass}
                  onClose={handleGatepassFormClose}
                />
              </div>
            )}

            {showInvoiceForm && (
              <div className="mb-4">
                <InvoiceForm
                  gatepass={selectedGatepassForInvoice || undefined}
                  invoice={editingInvoice || undefined}
                  onClose={handleInvoiceFormClose}
                />
              </div>
            )}

            <GatepassTable
              gatepasses={gatepasses}
              isLoading={isLoadingGatepasses}
              onEdit={handleEditGatepass}
              onDelete={handleDeleteGatepass}
              onGenerateInvoice={handleGenerateInvoice}
            />
          </Card>
        );
      case 'invoices':
        return (
          <div className="space-y-4">
            {/* Header */}
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Sales Invoices</h2>
                  <p className="text-sm text-muted-foreground">
                    {filteredInvoices.length} of {invoices.length} invoices
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowInvoiceForm(true)} 
                    size="sm"
                    data-testid="button-create-invoice"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                  <Button 
                    onClick={() => setShowFIFODialog(true)} 
                    size="sm"
                    variant="outline"
                    data-testid="button-fifo-allocation"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    FIFO Allocation
                  </Button>
                </div>
              </div>
            </Card>

            {/* Filters */}
            <Card className="p-4">
              <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="invoice-search" className="text-sm font-medium mb-1.5 block">
                      Search Invoice
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="invoice-search"
                        placeholder="Search by invoice number or buyer name..."
                        value={invoiceSearchQuery}
                        onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-invoice-search"
                      />
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Vendor Filter */}
                  <div>
                    <Label htmlFor="vendor-filter" className="text-sm font-medium mb-1.5 block">
                      Vendor/Buyer
                    </Label>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger id="vendor-filter" data-testid="select-vendor-filter">
                        <SelectValue placeholder="All Vendors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Buyers</SelectItem>
                        {uniqueBuyerNames.map((buyerName) => (
                          <SelectItem key={buyerName} value={buyerName}>
                            {buyerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Filter Type */}
                  <div>
                    <Label htmlFor="date-filter-type" className="text-sm font-medium mb-1.5 block">
                      Date Filter
                    </Label>
                    <Select value={dateFilterType} onValueChange={(val) => {
                      setDateFilterType(val);
                      if (val === "all") {
                        setDateFrom("");
                        setDateTo("");
                        setSelectedMonth("");
                        setSelectedYear("");
                      }
                    }}>
                      <SelectTrigger id="date-filter-type" data-testid="select-date-filter-type">
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="range">Date Range</SelectItem>
                        <SelectItem value="month">By Month</SelectItem>
                        <SelectItem value="year">By Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional Date Inputs */}
                  {dateFilterType === "range" && (
                    <>
                      <div>
                        <Label htmlFor="date-from" className="text-sm font-medium mb-1.5 block">
                          From Date
                        </Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          data-testid="input-date-from"
                        />
                      </div>
                      <div>
                        <Label htmlFor="date-to" className="text-sm font-medium mb-1.5 block">
                          To Date
                        </Label>
                        <Input
                          id="date-to"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          data-testid="input-date-to"
                        />
                      </div>
                    </>
                  )}

                  {dateFilterType === "month" && (
                    <div>
                      <Label htmlFor="month-filter" className="text-sm font-medium mb-1.5 block">
                        Select Month
                      </Label>
                      <Input
                        id="month-filter"
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        data-testid="input-month-filter"
                      />
                    </div>
                  )}

                  {dateFilterType === "year" && (
                    <div>
                      <Label htmlFor="year-filter" className="text-sm font-medium mb-1.5 block">
                        Select Year
                      </Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger id="year-filter" data-testid="select-year-filter">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Invoice Form */}
            {showInvoiceForm && (
              <Card className="p-4">
                <InvoiceForm
                  gatepass={selectedGatepassForInvoice || undefined}
                  invoice={editingInvoice || undefined}
                  onClose={handleInvoiceFormClose}
                />
              </Card>
            )}

            {/* Invoice Table */}
            <Card className="p-4">
              <InvoiceTable
                invoices={filteredInvoices}
                isLoading={isLoadingInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onPayment={handlePayment}
              />
            </Card>
          </div>
        );
      default:
        return (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Raw Material Issuance</h2>
              <Button 
                onClick={() => setShowIssuanceForm(true)} 
                size="sm"
                data-testid="button-add-issuance"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue Material
              </Button>
            </div>

            {showIssuanceForm && (
              <div className="mb-4">
                <RawMaterialIssuanceForm
                  issuance={editingIssuance}
                  onClose={handleIssuanceFormClose}
                />
              </div>
            )}

            <RawMaterialIssuanceTable
              issuances={issuances}
              isLoading={isLoadingIssuances}
              onEdit={handleEditIssuance}
              onDelete={handleDeleteIssuance}
            />
          </Card>
        );
    }
  };

  return (
    <>
      <div className="bg-background">
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">Production Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage raw material issuance and gatepasses</p>
          </div>
        </div>

        <div className="p-4 pb-20">
          {renderContent()}
        </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Tracking - {selectedInvoiceForPayment?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selectedInvoiceForPayment && (
            <Tabs defaultValue="record" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="record">Record Payment</TabsTrigger>
                <TabsTrigger value="history">Payment History</TabsTrigger>
              </TabsList>
              <TabsContent value="record" className="mt-4">
                <PaymentForm
                  invoice={selectedInvoiceForPayment}
                  onSuccess={handlePaymentDialogClose}
                  onCancel={handlePaymentDialogClose}
                />
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <PaymentHistory invoice={selectedInvoiceForPayment} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* FIFO Payment Allocation Dialog */}
      <Dialog open={showFIFODialog} onOpenChange={setShowFIFODialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FIFO Payment Allocation</DialogTitle>
          </DialogHeader>
          <FIFOPaymentAllocation
            onSuccess={() => setShowFIFODialog(false)}
            onCancel={() => setShowFIFODialog(false)}
          />
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}

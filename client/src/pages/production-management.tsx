import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { DataTablePagination } from "@/components/DataTablePagination";
import type { RawMaterialIssuance, Gatepass, Invoice, Vendor, PaginationMeta } from "@shared/schema";
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
  
  const [location, navigate] = useLocation();
  
  // Invoice filters
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
  // Invoice pagination
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(25);
  
  // Gatepass filters - URL-based state for pagination
  const gatepassParams = new URLSearchParams(location.split('?')[1] || '');
  const gatepassPage = parseInt(gatepassParams.get('gatepassPage') || '1');
  const gatepassPageSize = parseInt(gatepassParams.get('gatepassPageSize') || '25');
  const gatepassSearchQuery = gatepassParams.get('gatepassSearch') || '';
  const gatepassStatusFilter = gatepassParams.get('gatepassStatus') || 'all';
  const gatepassDateFilterType = gatepassParams.get('gatepassDateType') || 'all';
  const gatepassDateFrom = gatepassParams.get('gatepassFrom') || '';
  const gatepassDateTo = gatepassParams.get('gatepassTo') || '';
  const gatepassSelectedMonth = gatepassParams.get('gatepassMonth') || '';
  const gatepassSelectedYear = gatepassParams.get('gatepassYear') || '';
  
  // Raw Material Issuance filters
  const [issuanceSearchQuery, setIssuanceSearchQuery] = useState("");
  const [issuanceDateFilterType, setIssuanceDateFilterType] = useState<string>("all");
  const [issuanceDateFrom, setIssuanceDateFrom] = useState("");
  const [issuanceDateTo, setIssuanceDateTo] = useState("");
  const [issuanceSelectedMonth, setIssuanceSelectedMonth] = useState("");
  const [issuanceSelectedYear, setIssuanceSelectedYear] = useState("");
  
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  
  // Helper to derive date range from complex date filters (month/year/range)
  const deriveGatepassDateRange = (dateType: string, dateFrom: string, dateTo: string, month: string, year: string): { from: string; to: string } => {
    if (dateType === 'range' && dateFrom && dateTo) {
      return { from: dateFrom, to: dateTo };
    } else if (dateType === 'month' && month) {
      const [y, m] = month.split("-");
      const monthStart = startOfMonth(new Date(parseInt(y), parseInt(m) - 1));
      const monthEnd = endOfMonth(new Date(parseInt(y), parseInt(m) - 1));
      return { 
        from: format(monthStart, 'yyyy-MM-dd'),
        to: format(monthEnd, 'yyyy-MM-dd')
      };
    } else if (dateType === 'year' && year) {
      const yearStart = startOfYear(new Date(parseInt(year), 0));
      const yearEnd = endOfYear(new Date(parseInt(year), 0));
      return { 
        from: format(yearStart, 'yyyy-MM-dd'),
        to: format(yearEnd, 'yyyy-MM-dd')
      };
    }
    return { from: '', to: '' };
  };
  
  // Helper to update gatepass URL parameters
  const updateGatepassUrlParams = (updates: Record<string, string | number>) => {
    const pathname = location.split('?')[0];
    const params = new URLSearchParams(location.split('?')[1] || '');
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === 'all' || value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    navigate(`${pathname}${queryString ? `?${queryString}` : ''}`, { replace: true });
  };
  
  // Helper to clear gatepass filters
  const clearGatepassFilters = () => {
    updateGatepassUrlParams({
      gatepassSearch: '',
      gatepassStatus: 'all',
      gatepassDateType: 'all',
      gatepassFrom: '',
      gatepassTo: '',
      gatepassMonth: '',
      gatepassYear: '',
      gatepassPage: 1
    });
  };

  // Update activeTab when externalActiveTab changes
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // State to track reissue mode
  const [isReissueMode, setIsReissueMode] = useState(false);

  // Handle reissue parameter - pre-fill invoice form with cancelled invoice data
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const isReissue = params.get('reissue') === 'true';
    const tab = params.get('tab');
    
    // Check for reissue from URL params OR from sessionStorage directly when on invoices tab
    const storedData = sessionStorage.getItem('reissue-invoice-data');
    const storedIsReissue = sessionStorage.getItem('is-reissue') === 'true';
    
    // Handle reissue if URL has reissue param, or if we're on invoices tab and sessionStorage has data
    const shouldHandleReissue = (isReissue && tab === 'invoices') || 
      (activeTab === 'invoices' && storedData && storedIsReissue);
    
    if (shouldHandleReissue && storedData) {
      try {
        const invoiceData = JSON.parse(storedData);
        
        // Note: Backend already strips all IDs (invoice.id, invoiceNumber, item IDs, etc.)
        // So this data is safe to use directly for creating a new invoice
        
        // Set the invoice tab as active
        setActiveTab('invoices');
        
        // Set reissue mode flag
        setIsReissueMode(true);
        
        // Pre-fill the form with the cancelled invoice data
        // Without ID, it will be treated as a new invoice
        setEditingInvoice(invoiceData);
        setShowInvoiceForm(true);
        
        // Clear the stored data
        sessionStorage.removeItem('reissue-invoice-data');
        sessionStorage.removeItem('is-reissue');
        
        // Clean up the URL (remove reissue parameter)
        if (isReissue) {
          params.delete('reissue');
          const cleanUrl = params.toString() 
            ? `${location.split('?')[0]}?${params.toString()}`
            : location.split('?')[0];
          navigate(cleanUrl, { replace: true });
        }
        
        toast({
          title: "Invoice Data Loaded",
          description: "Previous invoice data has been pre-filled. Please update amounts and save.",
        });
      } catch (error) {
        console.error('Failed to parse reissue invoice data:', error);
        sessionStorage.removeItem('reissue-invoice-data');
        sessionStorage.removeItem('is-reissue');
      }
    }
  }, [location, navigate, toast, activeTab]);

  const { data: issuances = [], isLoading: isLoadingIssuances } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  // Derive date range for backend API from complex date filters
  const gatepassDateRange = useMemo(() => {
    return deriveGatepassDateRange(gatepassDateFilterType, gatepassDateFrom, gatepassDateTo, gatepassSelectedMonth, gatepassSelectedYear);
  }, [gatepassDateFilterType, gatepassDateFrom, gatepassDateTo, gatepassSelectedMonth, gatepassSelectedYear]);

  // Fetch gatepasses with pagination
  const gatepassQueryKey = [
    '/api/gatepasses',
    gatepassPage,
    gatepassPageSize,
    gatepassSearchQuery,
    gatepassStatusFilter,
    gatepassDateRange.from,
    gatepassDateRange.to
  ];

  const { data: gatepassResponse, isLoading: isLoadingGatepasses } = useQuery({
    queryKey: gatepassQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: gatepassPage.toString(),
        pageSize: gatepassPageSize.toString()
      });
      if (gatepassSearchQuery) params.set('searchQuery', gatepassSearchQuery);
      if (gatepassStatusFilter && gatepassStatusFilter !== 'all') params.set('status', gatepassStatusFilter);
      if (gatepassDateRange.from) params.set('dateFrom', gatepassDateRange.from);
      if (gatepassDateRange.to) params.set('dateTo', gatepassDateRange.to);
      
      const response = await fetch(`/api/gatepasses?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch gatepasses');
      const data = await response.json();
      
      // Enforce structured response with metadata
      if (!data.meta || !data.data) {
        throw new Error('Invalid gatepass response: missing pagination metadata');
      }
      
      return data;
    }
  });

  // Extract data and metadata from structured response
  const gatepasses = gatepassResponse?.data || [];
  const gatepassMeta: PaginationMeta | undefined = gatepassResponse?.meta;

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
  
  // Reset invoice page to 1 when filters change
  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceSearchQuery, selectedVendor, dateFilterType, dateFrom, dateTo, selectedMonth, selectedYear]);
  
  // Calculate paginated invoices
  const paginatedInvoicesData = useMemo(() => {
    const totalItems = filteredInvoices.length;
    const totalPages = Math.ceil(totalItems / invoicePageSize);
    
    // Normalize page synchronously: 0 for empty, clamp to [1,totalPages] for data
    const currentPage = totalPages === 0 ? 0 : Math.max(1, Math.min(invoicePage, totalPages));
    
    // For empty results, return empty data
    if (totalItems === 0) {
      return {
        paginatedInvoices: [],
        meta: {
          page: 0,
          pageSize: invoicePageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        currentPage,
      };
    }
    
    // Calculate slice using synchronized currentPage
    const startIndex = (currentPage - 1) * invoicePageSize;
    const endIndex = startIndex + invoicePageSize;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
    
    // Build metadata using synchronized currentPage
    const meta = {
      page: currentPage,
      pageSize: invoicePageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
    
    return { paginatedInvoices, meta, currentPage };
  }, [filteredInvoices, invoicePage, invoicePageSize]);
  
  // Persist normalized page back to state for next render
  useEffect(() => {
    if (paginatedInvoicesData.currentPage !== invoicePage) {
      setInvoicePage(paginatedInvoicesData.currentPage);
    }
  }, [paginatedInvoicesData.currentPage, invoicePage]);

  // Gatepasses are now filtered and paginated on the backend

  // Filtered raw material issuances based on search and filters
  const filteredIssuances = useMemo(() => {
    let filtered = [...issuances];

    // Search by issuance number, product, or issued to
    if (issuanceSearchQuery.trim()) {
      const query = issuanceSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (iss) =>
          iss.issuanceNumber.toLowerCase().includes(query) ||
          (iss.issuedTo && iss.issuedTo.toLowerCase().includes(query)) ||
          (iss.remarks && iss.remarks.toLowerCase().includes(query))
      );
    }

    // Filter by date
    if (issuanceDateFilterType === "range" && issuanceDateFrom && issuanceDateTo) {
      const fromDate = new Date(issuanceDateFrom);
      const toDate = new Date(issuanceDateTo);
      filtered = filtered.filter((iss) => {
        const issDate = new Date(iss.issuanceDate);
        return isWithinInterval(issDate, { start: fromDate, end: toDate });
      });
    } else if (issuanceDateFilterType === "month" && issuanceSelectedMonth) {
      const [year, month] = issuanceSelectedMonth.split("-");
      const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const monthEnd = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      filtered = filtered.filter((iss) => {
        const issDate = new Date(iss.issuanceDate);
        return isWithinInterval(issDate, { start: monthStart, end: monthEnd });
      });
    } else if (issuanceDateFilterType === "year" && issuanceSelectedYear) {
      const yearStart = startOfYear(new Date(parseInt(issuanceSelectedYear), 0));
      const yearEnd = endOfYear(new Date(parseInt(issuanceSelectedYear), 0));
      filtered = filtered.filter((iss) => {
        const issDate = new Date(iss.issuanceDate);
        return isWithinInterval(issDate, { start: yearStart, end: yearEnd });
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.issuanceDate).getTime() - new Date(a.issuanceDate).getTime());
  }, [issuances, issuanceSearchQuery, issuanceDateFilterType, issuanceDateFrom, issuanceDateTo, issuanceSelectedMonth, issuanceSelectedYear]);

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
    setIsReissueMode(false); // Reset reissue mode flag
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

  const clearInvoiceFilters = () => {
    setInvoiceSearchQuery("");
    setSelectedVendor("all");
    setDateFilterType("all");
    setDateFrom("");
    setDateTo("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  const clearIssuanceFilters = () => {
    setIssuanceSearchQuery("");
    setIssuanceDateFilterType("all");
    setIssuanceDateFrom("");
    setIssuanceDateTo("");
    setIssuanceSelectedMonth("");
    setIssuanceSelectedYear("");
  };

  const hasActiveInvoiceFilters = invoiceSearchQuery || selectedVendor !== "all" || dateFilterType !== "all";
  const hasActiveGatepassFilters = gatepassSearchQuery || gatepassStatusFilter !== "all" || gatepassDateFilterType !== "all";
  const hasActiveIssuanceFilters = issuanceSearchQuery || issuanceDateFilterType !== "all";

  const renderContent = () => {
    switch (activeTab) {
      case 'raw-material-issuance':
        return (
          <div className="space-y-4">
            {/* Header */}
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Raw Material Issuance</h2>
                  <p className="text-sm text-muted-foreground">
                    {filteredIssuances.length} of {issuances.length} issuances
                  </p>
                </div>
                <Button 
                  onClick={() => setShowIssuanceForm(true)} 
                  size="sm"
                  data-testid="button-add-issuance"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Issue Material
                </Button>
              </div>
            </Card>

            {/* Filters */}
            <Card className="p-4">
              <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="issuance-search" className="text-sm font-medium mb-1.5 block">
                      Search Issuance
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="issuance-search"
                        placeholder="Search by issuance number, issued to, or remarks..."
                        value={issuanceSearchQuery}
                        onChange={(e) => setIssuanceSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-issuance-search"
                      />
                    </div>
                  </div>
                  {hasActiveIssuanceFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearIssuanceFilters}
                      data-testid="button-clear-issuance-filters"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Date Filter Type */}
                  <div>
                    <Label htmlFor="issuance-date-filter-type" className="text-sm font-medium mb-1.5 block">
                      Date Filter
                    </Label>
                    <Select value={issuanceDateFilterType} onValueChange={(val) => {
                      setIssuanceDateFilterType(val);
                      if (val === "all") {
                        setIssuanceDateFrom("");
                        setIssuanceDateTo("");
                        setIssuanceSelectedMonth("");
                        setIssuanceSelectedYear("");
                      }
                    }}>
                      <SelectTrigger id="issuance-date-filter-type" data-testid="select-issuance-date-filter-type">
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
                  {issuanceDateFilterType === "range" && (
                    <>
                      <div>
                        <Label htmlFor="issuance-date-from" className="text-sm font-medium mb-1.5 block">
                          From Date
                        </Label>
                        <Input
                          id="issuance-date-from"
                          type="date"
                          value={issuanceDateFrom}
                          onChange={(e) => setIssuanceDateFrom(e.target.value)}
                          data-testid="input-issuance-date-from"
                        />
                      </div>
                      <div>
                        <Label htmlFor="issuance-date-to" className="text-sm font-medium mb-1.5 block">
                          To Date
                        </Label>
                        <Input
                          id="issuance-date-to"
                          type="date"
                          value={issuanceDateTo}
                          onChange={(e) => setIssuanceDateTo(e.target.value)}
                          data-testid="input-issuance-date-to"
                        />
                      </div>
                    </>
                  )}

                  {issuanceDateFilterType === "month" && (
                    <div>
                      <Label htmlFor="issuance-month-filter" className="text-sm font-medium mb-1.5 block">
                        Select Month
                      </Label>
                      <Input
                        id="issuance-month-filter"
                        type="month"
                        value={issuanceSelectedMonth}
                        onChange={(e) => setIssuanceSelectedMonth(e.target.value)}
                        data-testid="input-issuance-month-filter"
                      />
                    </div>
                  )}

                  {issuanceDateFilterType === "year" && (
                    <div>
                      <Label htmlFor="issuance-year-filter" className="text-sm font-medium mb-1.5 block">
                        Select Year
                      </Label>
                      <Select value={issuanceSelectedYear} onValueChange={setIssuanceSelectedYear}>
                        <SelectTrigger id="issuance-year-filter" data-testid="select-issuance-year-filter">
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

            {/* Issuance Form */}
            {showIssuanceForm && (
              <Card className="p-4">
                <RawMaterialIssuanceForm
                  issuance={editingIssuance}
                  onClose={handleIssuanceFormClose}
                />
              </Card>
            )}

            {/* Issuance Table */}
            <Card className="p-4">
              <RawMaterialIssuanceTable
                issuances={filteredIssuances}
                isLoading={isLoadingIssuances}
                onEdit={handleEditIssuance}
                onDelete={handleDeleteIssuance}
              />
            </Card>
          </div>
        );
      case 'gatepasses':
        return (
          <div className="space-y-4">
            {/* Header */}
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Gatepasses</h2>
                  <p className="text-sm text-muted-foreground">
                    {gatepassMeta ? `${gatepassMeta.totalItems} total gatepasses` : `${gatepasses.length} gatepasses`}
                  </p>
                </div>
                <Button 
                  onClick={() => setShowGatepassForm(true)} 
                  size="sm"
                  data-testid="button-add-gatepass"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Issue Gatepass
                </Button>
              </div>
            </Card>

            {/* Filters */}
            <Card className="p-4">
              <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="gatepass-search" className="text-sm font-medium mb-1.5 block">
                      Search Gatepass
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="gatepass-search"
                        placeholder="Search by GP number, vehicle, driver, or customer..."
                        value={gatepassSearchQuery}
                        onChange={(e) => updateGatepassUrlParams({ gatepassSearch: e.target.value, gatepassPage: 1 })}
                        className="pl-9"
                        data-testid="input-gatepass-search"
                      />
                    </div>
                  </div>
                  {hasActiveGatepassFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearGatepassFilters}
                      data-testid="button-clear-gatepass-filters"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <Label htmlFor="gatepass-status-filter" className="text-sm font-medium mb-1.5 block">
                      Status
                    </Label>
                    <Select value={gatepassStatusFilter} onValueChange={(val) => updateGatepassUrlParams({ gatepassStatus: val, gatepassPage: 1 })}>
                      <SelectTrigger id="gatepass-status-filter" data-testid="select-gatepass-status-filter">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="generated">Generated</SelectItem>
                        <SelectItem value="vehicle_out">Vehicle Out</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Filter Type */}
                  <div>
                    <Label htmlFor="gatepass-date-filter-type" className="text-sm font-medium mb-1.5 block">
                      Date Filter
                    </Label>
                    <Select value={gatepassDateFilterType} onValueChange={(val) => {
                      if (val === "all") {
                        updateGatepassUrlParams({ 
                          gatepassDateType: val, 
                          gatepassFrom: '', 
                          gatepassTo: '', 
                          gatepassMonth: '', 
                          gatepassYear: '',
                          gatepassPage: 1
                        });
                      } else {
                        updateGatepassUrlParams({ gatepassDateType: val, gatepassPage: 1 });
                      }
                    }}>
                      <SelectTrigger id="gatepass-date-filter-type" data-testid="select-gatepass-date-filter-type">
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
                  {gatepassDateFilterType === "range" && (
                    <>
                      <div>
                        <Label htmlFor="gatepass-date-from" className="text-sm font-medium mb-1.5 block">
                          From Date
                        </Label>
                        <Input
                          id="gatepass-date-from"
                          type="date"
                          value={gatepassDateFrom}
                          onChange={(e) => updateGatepassUrlParams({ gatepassFrom: e.target.value, gatepassPage: 1 })}
                          data-testid="input-gatepass-date-from"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gatepass-date-to" className="text-sm font-medium mb-1.5 block">
                          To Date
                        </Label>
                        <Input
                          id="gatepass-date-to"
                          type="date"
                          value={gatepassDateTo}
                          onChange={(e) => updateGatepassUrlParams({ gatepassTo: e.target.value, gatepassPage: 1 })}
                          data-testid="input-gatepass-date-to"
                        />
                      </div>
                    </>
                  )}

                  {gatepassDateFilterType === "month" && (
                    <div>
                      <Label htmlFor="gatepass-month-filter" className="text-sm font-medium mb-1.5 block">
                        Select Month
                      </Label>
                      <Input
                        id="gatepass-month-filter"
                        type="month"
                        value={gatepassSelectedMonth}
                        onChange={(e) => updateGatepassUrlParams({ gatepassMonth: e.target.value, gatepassPage: 1 })}
                        data-testid="input-gatepass-month-filter"
                      />
                    </div>
                  )}

                  {gatepassDateFilterType === "year" && (
                    <div>
                      <Label htmlFor="gatepass-year-filter" className="text-sm font-medium mb-1.5 block">
                        Select Year
                      </Label>
                      <Select value={gatepassSelectedYear} onValueChange={(val) => updateGatepassUrlParams({ gatepassYear: val, gatepassPage: 1 })}>
                        <SelectTrigger id="gatepass-year-filter" data-testid="select-gatepass-year-filter">
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

            {/* Gatepass Table */}
            <Card className="p-4">
              <GatepassTable
                gatepasses={gatepasses}
                isLoading={isLoadingGatepasses}
                onEdit={handleEditGatepass}
                onDelete={handleDeleteGatepass}
                onGenerateInvoice={handleGenerateInvoice}
              />
              {gatepassMeta && (
                <div className="mt-4">
                  <DataTablePagination
                    meta={gatepassMeta}
                    onPageChange={(newPage) => updateGatepassUrlParams({ gatepassPage: newPage })}
                    onPageSizeChange={(newSize) => updateGatepassUrlParams({ gatepassPageSize: newSize, gatepassPage: 1 })}
                  />
                </div>
              )}
            </Card>

            {/* Gatepass Form Dialog */}
            <Dialog open={showGatepassForm} onOpenChange={(open) => {
              if (!open) {
                handleGatepassFormClose();
              }
            }}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingGatepass ? 'Edit Gatepass' : 'Create Gatepass'}</DialogTitle>
                </DialogHeader>
                <GatepassForm
                  gatepass={editingGatepass}
                  onClose={handleGatepassFormClose}
                />
              </DialogContent>
            </Dialog>

            {/* Invoice Form Dialog (from Gatepass) */}
            <Dialog open={showInvoiceForm} onOpenChange={(open) => {
              if (!open) {
                handleInvoiceFormClose();
              }
            }}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Generate Invoice from Gatepass</DialogTitle>
                </DialogHeader>
                <InvoiceForm
                  gatepass={selectedGatepassForInvoice || undefined}
                  invoice={editingInvoice || undefined}
                  isReissueMode={isReissueMode}
                  onClose={handleInvoiceFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
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
                  {hasActiveInvoiceFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearInvoiceFilters}
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

            {/* Invoice Table */}
            <Card className="p-4">
              <InvoiceTable
                invoices={paginatedInvoicesData.paginatedInvoices}
                isLoading={isLoadingInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onPayment={handlePayment}
              />
              
              {/* Pagination Controls - only show when there are results */}
              {paginatedInvoicesData.meta.totalItems > 0 && (
                <div className="mt-4">
                  <DataTablePagination
                    meta={paginatedInvoicesData.meta}
                    onPageChange={setInvoicePage}
                    onPageSizeChange={(newSize) => {
                      setInvoicePageSize(newSize);
                      setInvoicePage(1); // Reset to first page
                    }}
                  />
                </div>
              )}
            </Card>

            {/* Invoice Form Dialog */}
            <Dialog open={showInvoiceForm} onOpenChange={(open) => {
              if (!open) {
                handleInvoiceFormClose();
              }
            }}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
                </DialogHeader>
                <InvoiceForm
                  gatepass={selectedGatepassForInvoice || undefined}
                  invoice={editingInvoice || undefined}
                  isReissueMode={isReissueMode}
                  onClose={handleInvoiceFormClose}
                />
              </DialogContent>
            </Dialog>
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

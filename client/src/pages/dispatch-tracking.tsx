import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Package, Truck, CheckCircle, Clock, Search, X, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Invoice, Gatepass, PaginatedResponse } from "@shared/schema";
import PrintableInvoice from "@/components/PrintableInvoice";
import PrintableGatepass from "@/components/PrintableGatepass";
import ProofOfDelivery from "@/components/ProofOfDelivery";
import GatepassForm from "@/components/GatepassForm";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const statusConfig = {
  // Invoice statuses
  draft: { label: "Draft", color: "bg-gray-500", icon: FileText },
  ready_for_gatepass: { label: "Ready for Gate Pass", color: "bg-blue-500", icon: Package },
  dispatched: { label: "Dispatched", color: "bg-orange-500", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-500", icon: CheckCircle },
  
  // Gatepass statuses
  generated: { label: "Generated", color: "bg-blue-500", icon: Package },
  vehicle_out: { label: "Vehicle Out", color: "bg-orange-500", icon: Truck },
};

interface DispatchTrackingProps {
  showHeader?: boolean;
}

export default function DispatchTracking({ showHeader = true }: DispatchTrackingProps = {}) {
  const { hasPermission } = usePermissions();
  const canCreateGatepass = hasPermission('gatepasses', 'create');
  const canEditGatepass = hasPermission('gatepasses', 'edit');
  const canEditDispatch = hasPermission('dispatch_tracking', 'edit');
  
  const urlSearch = useSearch();
  const [, setLocation] = useLocation();
  const { logoutMutation } = useAuth();
  const { toast } = useToast();
  const [showGatepassForm, setShowGatepassForm] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Gatepass-specific search
  const [gatepassSearchQuery, setGatepassSearchQuery] = useState("");
  const [debouncedGatepassSearch, setDebouncedGatepassSearch] = useState("");
  
  // Vehicle exit mutation
  const vehicleExitMutation = useMutation({
    mutationFn: async (gatepassId: string) => {
      return await apiRequest('PATCH', `/api/gatepasses/${gatepassId}/vehicle-exit`, {
        outTime: new Date().toISOString(),
        verifiedBy: 'System'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Vehicle Exit Recorded",
        description: "Gatepass status updated to Vehicle Out. Invoice is now dispatched.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record vehicle exit",
      });
    },
  });
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Debounce gatepass search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGatepassSearch(gatepassSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [gatepassSearchQuery]);
  
  // Parse pagination params from URL
  const params = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);
  const currentPage = parseInt(params.get('page') || '1');
  const currentPageSize = parseInt(params.get('pageSize') || '25');
  
  // Gatepass pagination params
  const gatepassPage = parseInt(params.get('gpPage') || '1');
  const gatepassPageSize = parseInt(params.get('gpPageSize') || '25');
  const gatepassStatusFilter = params.get('gpStatus') || 'all';
  
  // Reset to page 1 when search changes
  useEffect(() => {
    if (debouncedSearch && currentPage !== 1) {
      const newParams = new URLSearchParams(urlSearch);
      newParams.set('page', '1');
      setLocation(`?${newParams.toString()}`);
    }
  }, [debouncedSearch]);
  
  const { data: invoiceData, isLoading: invoicesLoading } = useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['/api/invoices', { 
      page: currentPage, 
      pageSize: currentPageSize, 
      sortBy: 'invoiceDate', 
      sortOrder: 'desc', 
      ...(debouncedSearch ? { search: debouncedSearch } : {})
    }],
  });

  const { data: gatepassData, isLoading: gatepassesLoading } = useQuery<PaginatedResponse<Gatepass>>({
    queryKey: ['/api/gatepasses', { 
      page: gatepassPage, 
      pageSize: gatepassPageSize,
      ...(debouncedGatepassSearch ? { searchQuery: debouncedGatepassSearch } : {}),
      ...(gatepassStatusFilter !== 'all' ? { status: gatepassStatusFilter } : {})
    }],
  });
  
  const invoices = Array.isArray(invoiceData?.data) ? invoiceData.data : [];
  const gatepasses = Array.isArray(gatepassData?.data) ? gatepassData.data : [];
  const paginationMeta = invoiceData?.meta;
  const gatepassPaginationMeta = gatepassData?.meta;

  // Detect invoice parameter in URL and auto-open gatepass form
  useEffect(() => {
    const params = new URLSearchParams(urlSearch);
    const invoiceId = params.get('invoice');
    if (invoiceId) {
      setSelectedInvoiceId(invoiceId);
      setShowGatepassForm(true);
    }
  }, [urlSearch]);
  
  // Pagination handlers - preserve existing query params
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(urlSearch);
    newParams.set('page', newPage.toString());
    // Preserve pageSize if it exists
    if (!newParams.has('pageSize')) {
      newParams.set('pageSize', currentPageSize.toString());
    }
    setLocation(`?${newParams.toString()}`);
  };
  
  const handlePageSizeChange = (newPageSize: number) => {
    const newParams = new URLSearchParams(urlSearch);
    newParams.set('page', '1'); // Reset to page 1 when changing page size
    newParams.set('pageSize', newPageSize.toString());
    // All other params like 'invoice' are automatically preserved by URLSearchParams
    setLocation(`?${newParams.toString()}`);
  };

  // Gatepass pagination handlers
  const handleGatepassPageChange = (newPage: number) => {
    const newParams = new URLSearchParams(urlSearch);
    newParams.set('gpPage', newPage.toString());
    if (!newParams.has('gpPageSize')) {
      newParams.set('gpPageSize', gatepassPageSize.toString());
    }
    setLocation(`?${newParams.toString()}`);
  };
  
  const handleGatepassPageSizeChange = (newPageSize: number) => {
    const newParams = new URLSearchParams(urlSearch);
    newParams.set('gpPage', '1');
    newParams.set('gpPageSize', newPageSize.toString());
    setLocation(`?${newParams.toString()}`);
  };
  
  const handleGatepassStatusChange = (status: string) => {
    const newParams = new URLSearchParams(urlSearch);
    if (status === 'all') {
      newParams.delete('gpStatus');
    } else {
      newParams.set('gpStatus', status);
    }
    newParams.set('gpPage', '1'); // Reset to page 1 when changing filter
    setLocation(`?${newParams.toString()}`);
  };
  
  const clearGatepassFilters = () => {
    const newParams = new URLSearchParams(urlSearch);
    newParams.delete('gpStatus');
    newParams.set('gpPage', '1');
    setGatepassSearchQuery('');
    setLocation(`?${newParams.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={config.color} data-testid={`badge-status-${status}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStageProgress = (status: string, type: 'invoice' | 'gatepass') => {
    if (type === 'invoice') {
      const stages = ['draft', 'ready_for_gatepass', 'dispatched', 'delivered'];
      const currentIndex = stages.indexOf(status);
      return ((currentIndex + 1) / stages.length) * 100;
    } else {
      const stages = ['generated', 'vehicle_out', 'delivered'];
      const currentIndex = stages.indexOf(status);
      return ((currentIndex + 1) / stages.length) * 100;
    }
  };

  // Statistics (use aggregate stats from API for accurate totals across all pages)
  
  const invoiceStats = {
    total: paginationMeta?.totalItems || invoices.length,
    draft: (paginationMeta as any)?.aggregateStats?.draft || invoices.filter(i => i.status === 'draft').length,
    readyForGatepass: (paginationMeta as any)?.aggregateStats?.ready_for_gatepass || invoices.filter(i => i.status === 'ready_for_gatepass').length,
    dispatched: (paginationMeta as any)?.aggregateStats?.dispatched || invoices.filter(i => i.status === 'dispatched').length,
    delivered: (paginationMeta as any)?.aggregateStats?.delivered || invoices.filter(i => i.status === 'delivered').length,
  };

  const gatepassStats = {
    total: gatepassPaginationMeta?.totalItems || gatepasses.length,
    generated: gatepasses.filter(g => g.status === 'generated').length,
    vehicleOut: gatepasses.filter(g => g.status === 'vehicle_out').length,
    delivered: gatepasses.filter(g => g.status === 'delivered').length,
  };
  
  const hasActiveGatepassFilters = gatepassSearchQuery || gatepassStatusFilter !== 'all';

  if (invoicesLoading || gatepassesLoading) {
    return (
      <>
        {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
        <div className={showHeader ? "p-4 sm:p-6 mt-16" : "p-4 sm:p-6"}>
          <div className="text-center">Loading dispatch tracking data...</div>
        </div>
      </>
    );
  }

  return (
    <>
      {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
      <div className={showHeader ? "p-4 sm:p-6 mt-16 space-y-4 sm:space-y-6" : "p-4 sm:p-6 space-y-4 sm:space-y-6"}>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/?tab=invoices')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">Dispatch Tracking Dashboard</h2>
            <p className="text-muted-foreground">Monitor the complete dispatch workflow from invoice to delivery</p>
          </div>
        </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-total-invoices">{invoiceStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft / Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground" data-testid="stat-draft">{invoiceStats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready for Gate Pass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600" data-testid="stat-ready-gatepass">{invoiceStats.readyForGatepass}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dispatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="stat-dispatched">{invoiceStats.dispatched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="stat-delivered">{invoiceStats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tracking Tables */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 gap-2">
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices ({invoiceStats.total})</TabsTrigger>
          <TabsTrigger value="gatepasses" data-testid="tab-gatepasses">Gate Passes ({gatepassStats.total})</TabsTrigger>
          <TabsTrigger value="pod" data-testid="tab-pod">Proof of Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Invoice Dispatch Status</CardTitle>
                  <CardDescription>Track invoices through the dispatch lifecycle</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoice number or buyer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                    data-testid="input-search-invoice"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery("")}
                      data-testid="button-clear-search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Invoice No.</th>
                      <th className="text-left p-3 font-semibold">Buyer</th>
                      <th className="text-left p-3 font-semibold">Amount</th>
                      <th className="text-left p-3 font-semibold">Invoice Date</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-left p-3 font-semibold">Progress</th>
                      <th className="text-left p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-6 text-muted-foreground">
                          No invoices found
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover-elevate" data-testid={`row-invoice-${invoice.id}`}>
                          <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                          <td className="p-3">{invoice.buyerName}</td>
                          <td className="p-3">₹{(invoice.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3">{format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}</td>
                          <td className="p-3">{getStatusBadge(invoice.status)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                                  style={{ width: `${getStageProgress(invoice.status, 'invoice')}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {Math.round(getStageProgress(invoice.status, 'invoice'))}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <PrintableInvoice invoice={invoice} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {paginationMeta && (
                <DataTablePagination
                  meta={paginationMeta}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gatepasses" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Gate Pass Status</CardTitle>
                  <CardDescription>Track gate passes through exit and delivery stages</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search GP#, vehicle, driver..."
                      value={gatepassSearchQuery}
                      onChange={(e) => setGatepassSearchQuery(e.target.value)}
                      className="pl-9 pr-9"
                      data-testid="input-search-gatepass"
                    />
                    {gatepassSearchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                        onClick={() => setGatepassSearchQuery("")}
                        data-testid="button-clear-gatepass-search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={gatepassStatusFilter} onValueChange={handleGatepassStatusChange}>
                    <SelectTrigger className="w-[140px]" data-testid="select-gatepass-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="generated">Generated</SelectItem>
                      <SelectItem value="vehicle_out">Vehicle Out</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveGatepassFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearGatepassFilters}
                      data-testid="button-clear-gatepass-filters"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">GP No.</th>
                      <th className="text-left p-3 font-semibold">Vehicle</th>
                      <th className="text-left p-3 font-semibold">Driver</th>
                      <th className="text-left p-3 font-semibold">GP Date</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-left p-3 font-semibold">Progress</th>
                      <th className="text-left p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gatepasses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-6 text-muted-foreground">
                          No gate passes found
                        </td>
                      </tr>
                    ) : (
                      gatepasses.map((gatepass) => (
                        <tr key={gatepass.id} className="border-b hover-elevate" data-testid={`row-gatepass-${gatepass.id}`}>
                          <td className="p-3 font-medium">{gatepass.gatepassNumber}</td>
                          <td className="p-3">{gatepass.vehicleNumber}</td>
                          <td className="p-3">{gatepass.driverName}</td>
                          <td className="p-3">{format(new Date(gatepass.gatepassDate), 'dd MMM yyyy')}</td>
                          <td className="p-3">{getStatusBadge(gatepass.status)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                                  style={{ width: `${getStageProgress(gatepass.status, 'gatepass')}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {Math.round(getStageProgress(gatepass.status, 'gatepass'))}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {gatepass.status === 'generated' && (
                                <Button
                                  size="sm"
                                  onClick={() => vehicleExitMutation.mutate(gatepass.id)}
                                  disabled={vehicleExitMutation.isPending}
                                  className="bg-orange-600 hover:bg-orange-700"
                                  data-testid={`button-vehicle-exit-${gatepass.id}`}
                                >
                                  <LogOut className="w-4 h-4 mr-1" />
                                  {vehicleExitMutation.isPending ? "Recording..." : "Record Exit"}
                                </Button>
                              )}
                              <PrintableGatepass gatepass={gatepass} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {gatepassPaginationMeta && (
                <div className="mt-4">
                  <DataTablePagination
                    meta={gatepassPaginationMeta}
                    onPageChange={handleGatepassPageChange}
                    onPageSizeChange={handleGatepassPageSizeChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pod" className="space-y-4 mt-4">
          <ProofOfDelivery />
        </TabsContent>
      </Tabs>

      {/* Workflow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Workflow</CardTitle>
          <CardDescription>Complete 5-stage dispatch lifecycle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="font-semibold">1. Invoice Created</div>
              <div className="text-sm text-muted-foreground">Ready for Gate Pass</div>
            </div>
            <div className="hidden md:block text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div className="font-semibold">2. Gate Pass Generated</div>
              <div className="text-sm text-muted-foreground">Items ready to dispatch</div>
            </div>
            <div className="hidden md:block text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <div className="font-semibold">3. Vehicle Exit</div>
              <div className="text-sm text-muted-foreground">Vehicle leaves plant</div>
            </div>
            <div className="hidden md:block text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <div className="font-semibold">4. Invoice Dispatched</div>
              <div className="text-sm text-muted-foreground">On the way</div>
            </div>
            <div className="hidden md:block text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="font-semibold">5. POD Captured</div>
              <div className="text-sm text-muted-foreground">Delivered & confirmed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gatepass Creation Dialog */}
      {showGatepassForm && (
        <Dialog open={showGatepassForm} onOpenChange={(open) => {
          setShowGatepassForm(open);
          if (!open) {
            // Clear selected invoice when dialog closes
            setSelectedInvoiceId(null);
            // Remove invoice parameter from URL
            window.history.replaceState({}, '', '/dispatch-tracking');
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Gate Pass from Invoice</DialogTitle>
            </DialogHeader>
            <GatepassForm 
              gatepass={null} 
              onClose={() => {
                setShowGatepassForm(false);
                setSelectedInvoiceId(null);
                window.history.replaceState({}, '', '/dispatch-tracking');
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      </div>
    </>
  );
}

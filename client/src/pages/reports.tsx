import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package, Receipt, ShoppingCart, Wrench, Filter, FileCheck2, Download, Wallet, Banknote } from "lucide-react";
import { format } from "date-fns";
import type { Gatepass, Invoice, RawMaterialIssuance, PurchaseOrder, PMExecution } from "@shared/schema";
import { DataTablePagination } from "@/components/DataTablePagination";
import PrintableGatepass from "@/components/PrintableGatepass";
import PrintableInvoice from "@/components/PrintableInvoice";
import PrintableRawMaterialIssuance from "@/components/PrintableRawMaterialIssuance";
import PrintablePurchaseOrder from "@/components/PrintablePurchaseOrder";
import PrintablePMExecution from "@/components/PrintablePMExecution";
import {
  generateGSTR1,
  generateGSTR3B,
  exportGSTReportAsJSON,
  exportGSTR1AsExcel,
  exportGSTR3BAsExcel,
  filterInvoicesByPeriod,
  getPeriodString,
  fetchGSTReportData,
  type GSTReportType,
  type PeriodType,
} from "@/lib/gst-reports";
import {
  fetchExpenseReport,
  fetchCashRegisterReport,
  exportExpenseReportAsExcel,
  exportCashRegisterReportAsExcel,
  type ExpenseReportData,
  type CashRegisterReportData,
} from "@/lib/expense-cash-reports";

interface ReportsProps {
  showHeader?: boolean;
}

export default function Reports({ showHeader = true }: ReportsProps = {}) {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("gatepasses");
  
  // Pagination states for invoice tab
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(25);
  
  // GST Report States
  const [gstReportType, setGstReportType] = useState<GSTReportType>("GSTR1");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const companyGSTIN = "37AAHCI5047B1ZR"; // Inmoisture Pvt Ltd GSTIN
  
  // Expense Report States
  const [expenseReportData, setExpenseReportData] = useState<ExpenseReportData | null>(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(false);
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [expensePayeeFilter, setExpensePayeeFilter] = useState("all");
  
  // Cash Register Report States
  const [cashRegisterReportData, setCashRegisterReportData] = useState<CashRegisterReportData | null>(null);
  const [cashRegisterReportLoading, setCashRegisterReportLoading] = useState(false);
  const [cashRegisterSalespersonFilter, setCashRegisterSalespersonFilter] = useState("all");
  const [cashRegisterStatusFilter, setCashRegisterStatusFilter] = useState("all");

  const { data: gatepasses = [], isLoading: gatepassesLoading } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: issuances = [], isLoading: issuancesLoading } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: purchaseOrders = [], isLoading: purchaseOrdersLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: pmExecutions = [], isLoading: pmExecutionsLoading } = useQuery<PMExecution[]>({
    queryKey: ['/api/pm-executions'],
  });

  const isLoading = gatepassesLoading || invoicesLoading || issuancesLoading || purchaseOrdersLoading || pmExecutionsLoading;

  // Extract unique customers from gatepasses and invoices - use Array.isArray for safety
  const uniqueCustomers = Array.from(new Set([
    ...(Array.isArray(gatepasses) ? gatepasses.map(g => g.customerName).filter(Boolean) : []),
    ...(Array.isArray(invoices) ? invoices.map(i => i.buyerName).filter(Boolean) : [])
  ])).sort();

  // Filter logic with Array.isArray safety guards
  const filteredGatepasses = Array.isArray(gatepasses) ? gatepasses.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.gatepassDate);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    // Customer filter
    if (selectedCustomer && selectedCustomer !== 'all') {
      if (item.customerName !== selectedCustomer) return false;
    }
    return true;
  }) : [];

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.invoiceDate);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    // Customer filter
    if (selectedCustomer && selectedCustomer !== 'all') {
      if (item.buyerName !== selectedCustomer) return false;
    }
    return true;
  }) : [];

  const filteredIssuances = Array.isArray(issuances) ? issuances.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.issuanceDate);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  }) : [];

  const filteredPurchaseOrders = Array.isArray(purchaseOrders) ? purchaseOrders.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      if (!item.createdAt) return false;
      const date = new Date(item.createdAt);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  }) : [];

  const filteredPMExecutions = Array.isArray(pmExecutions) ? pmExecutions.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.completedAt);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  }) : [];

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCustomer("all");
  };
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setInvoicePage(1);
  }, [dateFrom, dateTo, selectedCustomer]);
  
  // Calculate paginated invoices with synchronous clamping
  const paginatedInvoicesData = useMemo(() => {
    const totalItems = filteredInvoices.length;
    const totalPages = Math.ceil(totalItems / invoicePageSize);
    
    // Normalize page synchronously: 0 for empty, clamp to [1,totalPages] for data
    const currentPage = totalPages === 0 ? 0 : Math.max(1, Math.min(invoicePage, totalPages));
    
    // For empty results, return empty data with page=0
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

  return (
    <>
      {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
      <div className={showHeader ? "p-4 mt-16 space-y-6" : "p-4 space-y-6"}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Access all your print reports and analytics</p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter reports by date range
            {(activeTab === 'gatepasses' || activeTab === 'invoices') && ' and customer'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 ${(activeTab === 'gatepasses' || activeTab === 'invoices') ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            {(activeTab === 'gatepasses' || activeTab === 'invoices') && (
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger id="customer" data-testid="select-customer">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {uniqueCustomers.map((customer) => (
                      <SelectItem key={customer} value={customer || ''}>
                        {customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="gatepasses" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="gatepasses" data-testid="tab-gatepasses">
            <FileText className="w-4 h-4 mr-2" />
            Gatepasses
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="issuances" data-testid="tab-issuances">
            <Package className="w-4 h-4 mr-2" />
            Issuances
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" data-testid="tab-purchase-orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">
            <Wrench className="w-4 h-4 mr-2" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">
            <Banknote className="w-4 h-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="cash-register" data-testid="tab-cash-register">
            <Wallet className="w-4 h-4 mr-2" />
            Cash Register
          </TabsTrigger>
          <TabsTrigger value="gst-reports" data-testid="tab-gst-reports">
            <FileCheck2 className="w-4 h-4 mr-2" />
            GST Reports
          </TabsTrigger>
        </TabsList>

        {/* Gatepasses Tab */}
        <TabsContent value="gatepasses">
          <Card>
            <CardHeader>
              <CardTitle>Gatepass Reports</CardTitle>
              <CardDescription>
                {filteredGatepasses.length} gatepass{filteredGatepasses.length !== 1 ? 'es' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredGatepasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gatepasses found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>GP Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer/Vendor</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGatepasses.map((gatepass) => (
                        <TableRow key={gatepass.id}>
                          <TableCell className="font-medium">{gatepass.gatepassNumber}</TableCell>
                          <TableCell>{format(new Date(gatepass.gatepassDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{gatepass.customerName || '-'}</TableCell>
                          <TableCell>{gatepass.vehicleNumber}</TableCell>
                          <TableCell>
                            <PrintableGatepass gatepass={gatepass} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Reports</CardTitle>
              <CardDescription>
                {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices found. Try adjusting your filters.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Buyer Name</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoicesData.paginatedInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{invoice.buyerName}</TableCell>
                            <TableCell className="font-semibold">
                              ₹{(invoice.totalAmount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <PrintableInvoice invoice={invoice} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
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
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Material Issuances Tab */}
        <TabsContent value="issuances">
          <Card>
            <CardHeader>
              <CardTitle>Raw Material Issuance Reports</CardTitle>
              <CardDescription>
                {filteredIssuances.length} issuance{filteredIssuances.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredIssuances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No issuances found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issuance #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Issued To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssuances.map((issuance) => (
                        <TableRow key={issuance.id}>
                          <TableCell className="font-medium">{issuance.issuanceNumber}</TableCell>
                          <TableCell>{format(new Date(issuance.issuanceDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{issuance.issuedTo || '-'}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Issued
                            </span>
                          </TableCell>
                          <TableCell>
                            <PrintableRawMaterialIssuance issuance={issuance} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Reports</CardTitle>
              <CardDescription>
                {filteredPurchaseOrders.length} purchase order{filteredPurchaseOrders.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPurchaseOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No purchase orders found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchaseOrders.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">{po.poNumber}</TableCell>
                          <TableCell>
                            {po.createdAt ? format(new Date(po.createdAt), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell>{po.supplier || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            {po.estimatedCost ? `₹${(po.estimatedCost / 100).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <PrintablePurchaseOrder po={po} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Execution Reports</CardTitle>
              <CardDescription>
                {filteredPMExecutions.length} execution log{filteredPMExecutions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPMExecutions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No maintenance logs found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Execution Date</TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPMExecutions.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.completedAt), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{log.machineId || '-'}</TableCell>
                          <TableCell>{log.maintenancePlanId || '-'}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Completed
                            </span>
                          </TableCell>
                          <TableCell>
                            <PrintablePMExecution execution={log} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Report Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Expense Vouchers Report</CardTitle>
                  <CardDescription>
                    View and export expense vouchers with detailed line items
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setExpenseReportLoading(true);
                      try {
                        const data = await fetchExpenseReport(
                          dateFrom || undefined,
                          dateTo || undefined,
                          expenseStatusFilter !== 'all' ? expenseStatusFilter : undefined,
                          expensePayeeFilter !== 'all' ? expensePayeeFilter : undefined
                        );
                        setExpenseReportData(data);
                        toast({
                          title: "Report Generated",
                          description: `Found ${data.vouchers.length} vouchers`,
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to generate expense report",
                          variant: "destructive",
                        });
                      } finally {
                        setExpenseReportLoading(false);
                      }
                    }}
                    disabled={expenseReportLoading}
                    data-testid="button-generate-expense-report"
                  >
                    {expenseReportLoading ? 'Loading...' : 'Generate Report'}
                  </Button>
                  {expenseReportData && (
                    <Button
                      onClick={async () => {
                        try {
                          await exportExpenseReportAsExcel(expenseReportData);
                          toast({
                            title: "Export Complete",
                            description: "Excel file downloaded successfully",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to export Excel file",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-export-expense-excel"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={expenseStatusFilter} onValueChange={setExpenseStatusFilter}>
                    <SelectTrigger data-testid="select-expense-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payee Type</Label>
                  <Select value={expensePayeeFilter} onValueChange={setExpensePayeeFilter}>
                    <SelectTrigger data-testid="select-expense-payee">
                      <SelectValue placeholder="All Payees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payees</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Summary */}
              {expenseReportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Vouchers</div>
                      <div className="text-2xl font-bold">{expenseReportData.summary.totalVouchers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                      <div className="text-2xl font-bold">₹{(expenseReportData.summary.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total GST</div>
                      <div className="text-2xl font-bold">₹{(expenseReportData.summary.totalGST / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Approved</div>
                      <div className="text-2xl font-bold">{expenseReportData.summary.byStatus.approved || 0}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Vouchers Table */}
              {expenseReportData && expenseReportData.vouchers.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voucher No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payee</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead className="text-right">Amount (₹)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseReportData.vouchers.slice(0, 50).map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                          <TableCell>{format(new Date(voucher.voucherDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{voucher.payeeName}</TableCell>
                          <TableCell>{voucher.paymentMode}</TableCell>
                          <TableCell className="text-right">{(voucher.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              voucher.status === 'approved' ? 'bg-green-100 text-green-800' :
                              voucher.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                              voucher.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {voucher.status}
                            </span>
                          </TableCell>
                          <TableCell>{voucher.items?.length || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {expenseReportData.vouchers.length > 50 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Showing 50 of {expenseReportData.vouchers.length} vouchers. Download Excel for full report.
                    </div>
                  )}
                </div>
              )}
              
              {!expenseReportData && (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Generate Report" to view expense vouchers. Use date filters above for specific periods.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Register Report Tab */}
        <TabsContent value="cash-register">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Cash Register Report</CardTitle>
                  <CardDescription>
                    View daily cash flow, transactions, and expense details
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setCashRegisterReportLoading(true);
                      try {
                        const data = await fetchCashRegisterReport(
                          dateFrom || undefined,
                          dateTo || undefined,
                          cashRegisterSalespersonFilter !== 'all' ? cashRegisterSalespersonFilter : undefined,
                          cashRegisterStatusFilter !== 'all' ? cashRegisterStatusFilter : undefined
                        );
                        setCashRegisterReportData(data);
                        toast({
                          title: "Report Generated",
                          description: `Found ${data.days.length} days of data`,
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to generate cash register report",
                          variant: "destructive",
                        });
                      } finally {
                        setCashRegisterReportLoading(false);
                      }
                    }}
                    disabled={cashRegisterReportLoading}
                    data-testid="button-generate-cash-register-report"
                  >
                    {cashRegisterReportLoading ? 'Loading...' : 'Generate Report'}
                  </Button>
                  {cashRegisterReportData && (
                    <Button
                      onClick={async () => {
                        try {
                          await exportCashRegisterReportAsExcel(cashRegisterReportData);
                          toast({
                            title: "Export Complete",
                            description: "Excel file downloaded successfully",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to export Excel file",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-export-cash-register-excel"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={cashRegisterStatusFilter} onValueChange={setCashRegisterStatusFilter}>
                    <SelectTrigger data-testid="select-cash-register-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="reconciled">Reconciled</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Salesperson</Label>
                  <Select value={cashRegisterSalespersonFilter} onValueChange={setCashRegisterSalespersonFilter}>
                    <SelectTrigger data-testid="select-cash-register-salesperson">
                      <SelectValue placeholder="All Salespersons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Salespersons</SelectItem>
                      {cashRegisterReportData?.summary?.bySalesperson && 
                        Object.keys(cashRegisterReportData.summary.bySalesperson).map(sp => (
                          <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Summary */}
              {cashRegisterReportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Starting Balance</div>
                      <div className="text-xl font-bold">₹{(cashRegisterReportData.summary.startingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Cash Received</div>
                      <div className="text-xl font-bold text-green-600">₹{(cashRegisterReportData.summary.totalCashReceived / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Expenses</div>
                      <div className="text-xl font-bold text-red-600">₹{(cashRegisterReportData.summary.totalExpenses / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Transfers</div>
                      <div className="text-xl font-bold text-blue-600">₹{(cashRegisterReportData.summary.totalTransfers / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Ending Balance</div>
                      <div className="text-xl font-bold">₹{(cashRegisterReportData.summary.endingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Days</div>
                      <div className="text-xl font-bold">{cashRegisterReportData.summary.totalDays}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Days Table */}
              {cashRegisterReportData && cashRegisterReportData.days.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Salesperson</TableHead>
                        <TableHead className="text-right">Opening (₹)</TableHead>
                        <TableHead className="text-right">Cash Received (₹)</TableHead>
                        <TableHead className="text-right">Expenses (₹)</TableHead>
                        <TableHead className="text-right">Transfers (₹)</TableHead>
                        <TableHead className="text-right">Closing (₹)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashRegisterReportData.days.slice(0, 50).map((day) => (
                        <TableRow key={day.id}>
                          <TableCell className="font-medium">{format(new Date(day.registerDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{day.salespersonName}</TableCell>
                          <TableCell className="text-right">{(day.openingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-green-600">{(day.totalCashReceived / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-red-600">{(day.totalExpenses / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-blue-600">{(day.totalTransfers / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{(day.closingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              day.status === 'reconciled' ? 'bg-green-100 text-green-800' :
                              day.status === 'locked' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {day.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {cashRegisterReportData.days.length > 50 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Showing 50 of {cashRegisterReportData.days.length} days. Download Excel for full report.
                    </div>
                  )}
                </div>
              )}
              
              {!cashRegisterReportData && (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Generate Report" to view cash register data. Use date filters above for specific periods.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Reports Tab */}
        <TabsContent value="gst-reports">
          <Card>
            <CardHeader>
              <CardTitle>GST Reports for Filing</CardTitle>
              <CardDescription>
                Generate GST-compliant reports in JSON and Excel formats for upload to GST portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="gst-report-type">Report Type</Label>
                  <Select value={gstReportType} onValueChange={(value) => setGstReportType(value as GSTReportType)}>
                    <SelectTrigger id="gst-report-type" data-testid="select-gst-report-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GSTR1">GSTR-1 (Outward Supplies)</SelectItem>
                      <SelectItem value="GSTR3B">GSTR-3B (Summary Return)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="period-type">Filing Period</Label>
                  <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                    <SelectTrigger id="period-type" data-testid="select-period-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gst-month">Month/Quarter</Label>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    disabled={periodType === 'annual'}
                  >
                    <SelectTrigger id="gst-month" data-testid="select-gst-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodType === 'monthly' ? (
                        <>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </>
                      ) : periodType === 'quarterly' ? (
                        <>
                          <SelectItem value="3">Q1 (Apr-Jun)</SelectItem>
                          <SelectItem value="6">Q2 (Jul-Sep)</SelectItem>
                          <SelectItem value="9">Q3 (Oct-Dec)</SelectItem>
                          <SelectItem value="12">Q4 (Jan-Mar)</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="12">Full Year</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gst-year">Financial Year</Label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger id="gst-year" data-testid="select-gst-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}-{(year + 1).toString().slice(-2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Report Information */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      {gstReportType === 'GSTR1' && 'GSTR-1: Outward Supplies'}
                      {gstReportType === 'GSTR3B' && 'GSTR-3B: Summary Return'}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {gstReportType === 'GSTR1' && 'Details of all outward supplies (sales), including B2B, B2CL (Large), B2CS (Small), and Exports classifications'}
                      {gstReportType === 'GSTR3B' && 'Monthly/Quarterly summary of outward taxable supplies with tax liability breakdown (CGST, SGST, IGST, Cess)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Notice for GSTR-1 */}
              {gstReportType === 'GSTR1' && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1">
                      <h5 className="font-semibold text-green-900 dark:text-green-100">Complete HSN Summary Included</h5>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        This report includes complete HSN-wise summaries with product-level details from invoice line items.
                        All HSN codes, quantities, UOM, taxable values, and tax breakdowns are aggregated from the invoice_items table.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={async () => {
                    try {
                      const period = getPeriodString(selectedMonth, selectedYear);
                      const reportData = await fetchGSTReportData(periodType, selectedMonth, selectedYear);
                      const invoicesFromReport = reportData.invoices.map(item => item.invoice);
                      
                      if (gstReportType === 'GSTR1') {
                        const report = generateGSTR1(
                          invoicesFromReport, 
                          period, 
                          companyGSTIN, 
                          reportData.hsnSummary,
                          reportData.creditNotes,
                          reportData.debitNotes
                        );
                        exportGSTReportAsJSON(report, 'GSTR1', period);
                      } else if (gstReportType === 'GSTR3B') {
                        const report = generateGSTR3B(invoicesFromReport, [], period, companyGSTIN);
                        exportGSTReportAsJSON(report, 'GSTR3B', period);
                      }
                    } catch (error) {
                      console.error('Failed to generate GST report:', error);
                      toast({
                        title: "Error",
                        description: "Failed to generate GST report. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex items-center gap-2"
                  data-testid="button-download-json"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const period = getPeriodString(selectedMonth, selectedYear);
                      const reportData = await fetchGSTReportData(periodType, selectedMonth, selectedYear);
                      const invoicesFromReport = reportData.invoices.map(item => item.invoice);
                      
                      if (gstReportType === 'GSTR1') {
                        const report = generateGSTR1(
                          invoicesFromReport, 
                          period, 
                          companyGSTIN, 
                          reportData.hsnSummary,
                          reportData.creditNotes,
                          reportData.debitNotes
                        );
                        await exportGSTR1AsExcel(report, period);
                      } else if (gstReportType === 'GSTR3B') {
                        const report = generateGSTR3B(invoicesFromReport, [], period, companyGSTIN);
                        await exportGSTR3BAsExcel(report, period);
                      }
                    } catch (error) {
                      console.error('Failed to generate GST report:', error);
                      toast({
                        title: "Error",
                        description: "Failed to generate GST report. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-download-excel"
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </Button>
              </div>

              {/* Report Preview */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-semibold mb-3">Report Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">GSTIN:</span>
                    <span className="ml-2 font-mono">{companyGSTIN}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <span className="ml-2">{getPeriodString(selectedMonth, selectedYear)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Invoices in Period:</span>
                    <span className="ml-2 font-semibold">
                      {filterInvoicesByPeriod(invoices, selectedMonth, selectedYear, periodType).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Filing Period:</span>
                    <span className="ml-2 capitalize">{periodType}</span>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h5 className="font-semibold">Included in Reports:</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ B2B Invoices (with GSTIN)</li>
                    <li>✓ B2CL - B2C Large (above ₹2.5L)</li>
                    <li>✓ B2CS - B2C Small (below ₹2.5L)</li>
                    <li>✓ EXP - Export Invoices</li>
                    <li className="text-green-600">✓ HSN Summary (with line item details)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h5 className="font-semibold">Tax Calculations:</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ CGST + SGST (Intra-state)</li>
                    <li>✓ IGST (Inter-state)</li>
                    <li>✓ Taxable Value computation</li>
                    <li>✓ Auto-classification by state</li>
                    <li className="text-green-600">✓ HSN-wise aggregation with UOM</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}

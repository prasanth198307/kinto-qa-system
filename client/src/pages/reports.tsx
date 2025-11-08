import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { FileText, Package, Receipt, ShoppingCart, Wrench, Filter, FileCheck2, Download } from "lucide-react";
import { format } from "date-fns";
import type { Gatepass, Invoice, RawMaterialIssuance, PurchaseOrder, PMExecution } from "@shared/schema";
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
  type GSTReportType,
  type PeriodType,
} from "@/lib/gst-reports";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("gatepasses");
  
  // GST Report States
  const [gstReportType, setGstReportType] = useState<GSTReportType>("GSTR1");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const companyGSTIN = "29AABCU9603R1ZV"; // Default KINTO GSTIN

  const { data: gatepasses = [] } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: issuances = [] } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: pmExecutions = [] } = useQuery<PMExecution[]>({
    queryKey: ['/api/pm-executions'],
  });

  // Extract unique customers from gatepasses and invoices
  const uniqueCustomers = Array.from(new Set([
    ...gatepasses.map(g => g.customerName).filter(Boolean),
    ...invoices.map(i => i.buyerName).filter(Boolean)
  ])).sort();

  // Filter logic
  const filteredGatepasses = gatepasses.filter(item => {
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
  });

  const filteredInvoices = invoices.filter(item => {
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
  });

  const filteredIssuances = issuances.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.issuanceDate);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  });

  const filteredPurchaseOrders = purchaseOrders.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      if (!item.createdAt) return false;
      const date = new Date(item.createdAt);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  });

  const filteredPMExecutions = pmExecutions.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.completedAt);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCustomer("all");
  };

  return (
    <div className="p-4 space-y-6">
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
        <TabsList className="grid w-full grid-cols-6">
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
                      {filteredInvoices.map((invoice) => (
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

              {/* Limitation Notice for GSTR-1 */}
              {gstReportType === 'GSTR1' && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1">
                      <h5 className="font-semibold text-yellow-900 dark:text-yellow-100">Note: HSN Summary Not Included</h5>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        This version provides B2B, B2CL, B2CS, and Export classifications with aggregate tax data. 
                        Complete HSN-wise summaries require integration with invoice line items (invoice_items table) 
                        which contain product-level HSN codes, quantities, and UOM details.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    const filteredInvs = filterInvoicesByPeriod(invoices, selectedMonth, selectedYear, periodType);
                    const period = getPeriodString(selectedMonth, selectedYear);
                    
                    if (gstReportType === 'GSTR1') {
                      const report = generateGSTR1(filteredInvs, period, companyGSTIN);
                      exportGSTReportAsJSON(report, 'GSTR1', period);
                    } else if (gstReportType === 'GSTR3B') {
                      const report = generateGSTR3B(filteredInvs, [], period, companyGSTIN);
                      exportGSTReportAsJSON(report, 'GSTR3B', period);
                    }
                  }}
                  className="flex items-center gap-2"
                  data-testid="button-download-json"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </Button>

                <Button
                  onClick={() => {
                    const filteredInvs = filterInvoicesByPeriod(invoices, selectedMonth, selectedYear, periodType);
                    const period = getPeriodString(selectedMonth, selectedYear);
                    
                    if (gstReportType === 'GSTR1') {
                      const report = generateGSTR1(filteredInvs, period, companyGSTIN);
                      exportGSTR1AsExcel(report, period);
                    } else if (gstReportType === 'GSTR3B') {
                      const report = generateGSTR3B(filteredInvs, [], period, companyGSTIN);
                      exportGSTR3BAsExcel(report, period);
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
                    <li className="text-yellow-600">⚠ HSN Summary (requires line item data)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h5 className="font-semibold">Tax Calculations:</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ CGST + SGST (Intra-state)</li>
                    <li>✓ IGST (Inter-state)</li>
                    <li>✓ Taxable Value computation</li>
                    <li>✓ Auto-classification by state</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

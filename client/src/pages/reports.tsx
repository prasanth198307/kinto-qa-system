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
import { FileText, Package, Receipt, ShoppingCart, Wrench, Filter } from "lucide-react";
import { format } from "date-fns";
import type { Gatepass, Invoice, RawMaterialIssuance, PurchaseOrder, PMExecution } from "@shared/schema";
import PrintableGatepass from "@/components/PrintableGatepass";
import PrintableInvoice from "@/components/PrintableInvoice";
import PrintableRawMaterialIssuance from "@/components/PrintableRawMaterialIssuance";
import PrintablePurchaseOrder from "@/components/PrintablePurchaseOrder";
import PrintablePMExecution from "@/components/PrintablePMExecution";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("gatepasses");

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
        <TabsList className="grid w-full grid-cols-5">
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
      </Tabs>
    </div>
  );
}

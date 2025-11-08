import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Invoice, Gatepass } from "@shared/schema";
import PrintableInvoice from "@/components/PrintableInvoice";
import PrintableGatepass from "@/components/PrintableGatepass";

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

export default function DispatchTracking() {
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: gatepasses = [], isLoading: gatepassesLoading } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

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

  // Statistics
  const invoiceStats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    readyForGatepass: invoices.filter(i => i.status === 'ready_for_gatepass').length,
    dispatched: invoices.filter(i => i.status === 'dispatched').length,
    delivered: invoices.filter(i => i.status === 'delivered').length,
  };

  const gatepassStats = {
    total: gatepasses.length,
    generated: gatepasses.filter(g => g.status === 'generated').length,
    vehicleOut: gatepasses.filter(g => g.status === 'vehicle_out').length,
    delivered: gatepasses.filter(g => g.status === 'delivered').length,
  };

  if (invoicesLoading || gatepassesLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading dispatch tracking data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dispatch Tracking Dashboard</h2>
        <p className="text-muted-foreground">Monitor the complete dispatch workflow from invoice to delivery</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 gap-2">
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices ({invoiceStats.total})</TabsTrigger>
          <TabsTrigger value="gatepasses" data-testid="tab-gatepasses">Gate Passes ({gatepassStats.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Dispatch Status</CardTitle>
              <CardDescription>Track invoices through the dispatch lifecycle</CardDescription>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gatepasses" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gate Pass Status</CardTitle>
              <CardDescription>Track gate passes through exit and delivery stages</CardDescription>
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
                            <PrintableGatepass gatepass={gatepass} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}

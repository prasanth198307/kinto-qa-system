import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Package, FileText, Receipt, Box } from "lucide-react";
import type { Invoice, FinishedGood } from "@shared/schema";

interface TodayStats {
  rawMaterialIssuancesCount: number;
  gatepassesCount: number;
}

export default function TodayProductionStats() {
  const { data: stats, isLoading } = useQuery<TodayStats>({
    queryKey: ['/api/stats/today'],
  });

  // Fetch invoices to show count
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  // Fetch finished goods for current stock
  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  // Calculate total stock
  const totalStock = finishedGoods
    .filter(fg => fg.recordStatus === 1)
    .reduce((sum, fg) => sum + fg.quantity, 0);

  // Count today's invoices
  const today = new Date().toDateString();
  const todaysInvoices = invoices.filter(inv => 
    new Date(inv.invoiceDate).toDateString() === today && inv.recordStatus === 1
  ).length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/4"></div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/4"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Today's Production Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Raw Material Issued</p>
              <p className="text-2xl font-bold" data-testid="stat-raw-material-issuances">
                {stats?.rawMaterialIssuancesCount || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gatepasses Issued</p>
              <p className="text-2xl font-bold" data-testid="stat-gatepasses">
                {stats?.gatepassesCount || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Receipt className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoices Created</p>
              <p className="text-2xl font-bold" data-testid="stat-invoices">
                {todaysInvoices}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Box className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold" data-testid="stat-current-stock">
                {totalStock}
              </p>
              <p className="text-xs text-muted-foreground">units</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

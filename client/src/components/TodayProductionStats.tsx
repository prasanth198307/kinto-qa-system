import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Package, FileText } from "lucide-react";

interface TodayStats {
  rawMaterialIssuancesCount: number;
  gatepassesCount: number;
}

export default function TodayProductionStats() {
  const { data: stats, isLoading } = useQuery<TodayStats>({
    queryKey: ['/api/stats/today'],
  });

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, TrendingUp, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type RawMaterial = {
  id: string;
  materialCode: string;
  materialName: string;
  currentStock: number;
  reorderLevel: number;
  maxStockLevel: number;
  category: string;
};

type FinishedGood = {
  id: string;
  productId: string;
  batchNumber: string;
  productionDate: string;
  quantity: number;
  qualityStatus: string;
};

type Product = {
  id: string;
  productCode: string;
  productName: string;
  category: string;
};

export default function InventorySummaryDashboard() {
  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const calculateStockPercentage = (current: number, max: number) => {
    if (!max || max === 0) return 100;
    return (current / max) * 100;
  };

  const isLowStock = (current: number, max: number) => {
    const percentage = calculateStockPercentage(current, max);
    return percentage < 10;
  };

  const isCriticalStock = (current: number, reorder: number) => {
    return current <= (reorder || 0);
  };

  const lowStockMaterials = rawMaterials.filter(m => 
    isLowStock(m.currentStock, m.maxStockLevel) || isCriticalStock(m.currentStock, m.reorderLevel)
  );

  const finishedGoodsByProduct = products.map(product => {
    const productGoods = finishedGoods.filter(fg => fg.productId === product.id);
    const totalQuantity = productGoods.reduce((sum, fg) => sum + fg.quantity, 0);
    const approvedQuantity = productGoods
      .filter(fg => fg.qualityStatus === 'approved')
      .reduce((sum, fg) => sum + fg.quantity, 0);
    const pendingQuantity = productGoods
      .filter(fg => fg.qualityStatus === 'pending')
      .reduce((sum, fg) => sum + fg.quantity, 0);

    return {
      product,
      totalQuantity,
      approvedQuantity,
      pendingQuantity,
      batches: productGoods.length,
    };
  }).filter(pg => pg.totalQuantity > 0);

  const getStockStatusColor = (current: number, max: number, reorder: number) => {
    if (isCriticalStock(current, reorder)) return 'text-red-600 bg-red-50';
    if (isLowStock(current, max)) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusIcon = (current: number, max: number, reorder: number) => {
    if (isCriticalStock(current, reorder)) return <AlertTriangle className="h-4 w-4" />;
    if (isLowStock(current, max)) return <TrendingDown className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" data-testid="text-title">Inventory Summary</h2>
        <p className="text-muted-foreground text-sm" data-testid="text-subtitle">
          Real-time inventory levels and alerts
        </p>
      </div>

      {lowStockMaterials.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Low Stock Alerts</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              {lowStockMaterials.length} material(s) require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockMaterials.map(material => {
                const percentage = calculateStockPercentage(material.currentStock, material.maxStockLevel);
                return (
                  <div key={material.id} className="bg-white rounded-lg p-3 border border-red-200" data-testid={`alert-material-${material.materialCode}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm" data-testid="text-material-name">{material.materialName}</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-material-code">{material.materialCode}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs" data-testid="badge-stock-level">
                        {isCriticalStock(material.currentStock, material.reorderLevel) 
                          ? 'Critical' 
                          : `${percentage.toFixed(1)}%`}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Progress value={percentage} className="h-2" data-testid="progress-stock" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span data-testid="text-current-stock">Current: {material.currentStock}</span>
                        <span data-testid="text-max-stock">Max: {material.maxStockLevel || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Raw Materials Inventory</CardTitle>
          </div>
          <CardDescription>
            Current stock levels for all raw materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rawMaterials.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-materials">No raw materials found</p>
            ) : (
              rawMaterials.map(material => {
                const percentage = calculateStockPercentage(material.currentStock, material.maxStockLevel);
                const statusColor = getStockStatusColor(material.currentStock, material.maxStockLevel, material.reorderLevel);
                const StatusIcon = () => getStockStatusIcon(material.currentStock, material.maxStockLevel, material.reorderLevel);

                return (
                  <div key={material.id} className="border rounded-lg p-4" data-testid={`material-${material.materialCode}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold" data-testid="text-material-name">{material.materialName}</h3>
                          <Badge variant="outline" className="text-xs" data-testid="badge-material-code">
                            {material.materialCode}
                          </Badge>
                        </div>
                        {material.category && (
                          <p className="text-xs text-muted-foreground mt-1" data-testid="text-material-category">
                            {material.category}
                          </p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded ${statusColor}`}>
                        <StatusIcon />
                        <span className="text-xs font-medium" data-testid="text-stock-status">
                          {isCriticalStock(material.currentStock, material.reorderLevel) 
                            ? 'Critical' 
                            : isLowStock(material.currentStock, material.maxStockLevel)
                            ? 'Low'
                            : 'OK'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Progress value={percentage} className="h-2" data-testid="progress-material-stock" />
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-semibold" data-testid="text-current">{material.currentStock}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Reorder At</p>
                          <p className="font-semibold" data-testid="text-reorder">{material.reorderLevel || 'N/A'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Max</p>
                          <p className="font-semibold" data-testid="text-max">{material.maxStockLevel || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Finished Goods by Product</CardTitle>
          </div>
          <CardDescription>
            Production summary grouped by product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {finishedGoodsByProduct.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-goods">No finished goods found</p>
            ) : (
              finishedGoodsByProduct.map(({ product, totalQuantity, approvedQuantity, pendingQuantity, batches }) => (
                <div key={product.id} className="border rounded-lg p-4" data-testid={`product-${product.productCode}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" data-testid="text-product-name">{product.productName}</h3>
                        <Badge variant="outline" className="text-xs" data-testid="badge-product-code">
                          {product.productCode}
                        </Badge>
                      </div>
                      {product.category && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid="text-product-category">
                          {product.category}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" data-testid="text-total-quantity">{totalQuantity}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-batches">{batches} batch(es)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-xs text-green-700 mb-1">Approved</p>
                      <p className="text-lg font-semibold text-green-900" data-testid="text-approved">{approvedQuantity}</p>
                    </div>
                    <div className="bg-yellow-50 rounded p-3">
                      <p className="text-xs text-yellow-700 mb-1">Pending QC</p>
                      <p className="text-lg font-semibold text-yellow-900" data-testid="text-pending">{pendingQuantity}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

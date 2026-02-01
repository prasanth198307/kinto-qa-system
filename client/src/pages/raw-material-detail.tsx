import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Calendar, DollarSign, Layers, TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";

interface RawMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  description: string | null;
  typeId: string | null;
  uomId: string | null;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  isActive: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface RawMaterialType {
  id: string;
  typeName: string;
  typeCode: string;
}

interface UOM {
  id: string;
  code: string;
  name: string;
}

interface RawMaterialTransaction {
  id: string;
  rawMaterialId: string;
  transactionType: string;
  quantity: number;
  batchNumber: string | null;
  purchaseOrderId: string | null;
  productionEntryId: string | null;
  remarks: string | null;
  createdAt: string | null;
}

export default function RawMaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { logoutMutation, user } = useAuth();

  const { data: rawMaterials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const rawMaterial = rawMaterials.find(m => m.id === id);

  const { data: rawMaterialTypes = [] } = useQuery<RawMaterialType[]>({
    queryKey: ['/api/raw-material-types'],
  });

  const { data: uoms = [] } = useQuery<UOM[]>({
    queryKey: ['/api/uoms'],
  });

  const { data: transactions = [] } = useQuery<RawMaterialTransaction[]>({
    queryKey: ['/api/raw-material-transactions', { rawMaterialId: id }],
    enabled: !!id,
  });

  const getTypeName = (typeId: string | null) => {
    if (!typeId) return 'N/A';
    const type = rawMaterialTypes.find(t => t.id === typeId);
    return type?.typeName || typeId;
  };

  const getUomName = (uomId: string | null) => {
    if (!uomId) return 'N/A';
    const uom = uoms.find(u => u.id === uomId);
    return uom?.name || uomId;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          title="Raw Material Detail"
          user={user}
          onLogout={() => logoutMutation.mutate()}
        />
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!rawMaterial) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          title="Raw Material Detail"
          user={user}
          onLogout={() => logoutMutation.mutate()}
        />
        <div className="flex-1 p-4">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Raw material not found</p>
              <Button onClick={() => navigate('/inventory')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Inventory
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalHeader
        title={`Raw Material: ${rawMaterial.materialName}`}
        user={user}
        onLogout={() => logoutMutation.mutate()}
      />
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{rawMaterial.materialName}</h1>
          <Badge variant={rawMaterial.isActive === 'true' ? 'default' : 'secondary'}>
            {rawMaterial.isActive === 'true' ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rawMaterial.currentStock}</div>
              <p className="text-xs text-muted-foreground">
                Min: {rawMaterial.minStock} {getUomName(rawMaterial.uomId)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Unit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(rawMaterial.costPerUnit)}</div>
              <p className="text-xs text-muted-foreground">per {getUomName(rawMaterial.uomId)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Type</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTypeName(rawMaterial.typeId)}</div>
              <p className="text-xs text-muted-foreground">Material Category</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(rawMaterial.currentStock * rawMaterial.costPerUnit)}
              </div>
              <p className="text-xs text-muted-foreground">Total inventory value</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Code:</span>
                <span className="font-medium">{rawMaterial.materialCode}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{rawMaterial.materialName}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="font-medium">{rawMaterial.description || 'N/A'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit of Measure:</span>
                <span className="font-medium">{getUomName(rawMaterial.uomId)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {rawMaterial.createdAt ? format(new Date(rawMaterial.createdAt), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-medium text-lg">{rawMaterial.currentStock} {getUomName(rawMaterial.uomId)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Minimum Stock:</span>
                <span className="font-medium">{rawMaterial.minStock} {getUomName(rawMaterial.uomId)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stock Status:</span>
                {rawMaterial.currentStock <= rawMaterial.minStock ? (
                  <Badge variant="destructive">Low Stock</Badge>
                ) : rawMaterial.currentStock <= rawMaterial.minStock * 1.5 ? (
                  <Badge variant="secondary">Reorder Soon</Badge>
                ) : (
                  <Badge variant="default">Adequate</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Last 20 stock movements for this material</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.slice(0, 20).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.transactionType === 'IN' ? 'default' : 'secondary'}>
                          {tx.transactionType === 'IN' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {tx.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.batchNumber || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {tx.transactionType === 'IN' ? '+' : '-'}{tx.quantity}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.remarks || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

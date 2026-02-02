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

interface RawMaterialDetailProps {
  showHeader?: boolean;
}

export default function RawMaterialDetail({ showHeader = true }: RawMaterialDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

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

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = typeof amount === 'number' ? amount : 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(safeAmount / 100);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!rawMaterial) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Raw material not found</p>
            <Button 
              onClick={() => setLocation('/inventory-management?tab=raw-materials')} 
              className="mt-4"
              data-testid="button-back-to-inventory"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Raw Materials
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stockValue = (rawMaterial.currentStock || 0) * (rawMaterial.costPerUnit || 0);
  const isLowStock = (rawMaterial.currentStock || 0) < (rawMaterial.minStock || 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation('/inventory-management?tab=raw-materials')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Raw Materials
        </Button>
        <h1 className="text-2xl font-bold" data-testid="text-material-name">{rawMaterial.materialName}</h1>
        <Badge variant={rawMaterial.isActive === 'true' ? 'default' : 'secondary'} data-testid="badge-status">
          {rawMaterial.isActive === 'true' ? 'Active' : 'Inactive'}
        </Badge>
        {isLowStock && (
          <Badge variant="destructive" data-testid="badge-low-stock">Low Stock</Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-stock">{rawMaterial.currentStock}</div>
            <p className="text-xs text-muted-foreground">Min: {rawMaterial.minStock} {getUomName(rawMaterial.uomId)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stock-value">{formatCurrency(stockValue)}</div>
            <p className="text-xs text-muted-foreground">At {formatCurrency(rawMaterial.costPerUnit)}/unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Type</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-type-name">{getTypeName(rawMaterial.typeId)}</div>
            <p className="text-xs text-muted-foreground">Category</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit of Measure</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-uom">{getUomName(rawMaterial.uomId)}</div>
            <p className="text-xs text-muted-foreground">Measurement unit</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Material Information</CardTitle>
            <CardDescription>Details about this raw material</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Material Code</p>
                <p className="font-medium" data-testid="text-material-code">{rawMaterial.materialCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Material Name</p>
                <p className="font-medium">{rawMaterial.materialName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                {rawMaterial.typeId ? (
                  <Link href={`/raw-material-type/${rawMaterial.typeId}`}>
                    <p className="font-medium text-primary hover:underline cursor-pointer" data-testid="link-type">
                      {getTypeName(rawMaterial.typeId)}
                    </p>
                  </Link>
                ) : (
                  <p className="font-medium">N/A</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost Per Unit</p>
                <p className="font-medium" data-testid="text-cost-per-unit">{formatCurrency(rawMaterial.costPerUnit)}</p>
              </div>
            </div>

            {rawMaterial.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{rawMaterial.description}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {rawMaterial.createdAt ? format(new Date(rawMaterial.createdAt), 'dd MMM yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {rawMaterial.updatedAt ? format(new Date(rawMaterial.updatedAt), 'dd MMM yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Status</CardTitle>
            <CardDescription>Current inventory levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Stock</span>
                <span className="font-medium">{rawMaterial.currentStock} {getUomName(rawMaterial.uomId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minimum Stock</span>
                <span className="font-medium">{rawMaterial.minStock} {getUomName(rawMaterial.uomId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={isLowStock ? 'destructive' : 'default'}>
                  {isLowStock ? 'Below Minimum' : 'Adequate'}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stock Value</span>
                <span className="font-medium">{formatCurrency(stockValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cost Per Unit</span>
                <span className="font-medium">{formatCurrency(rawMaterial.costPerUnit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Stock movement history</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No transactions found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((txn) => (
                  <TableRow key={txn.id} data-testid={`row-transaction-${txn.id}`}>
                    <TableCell>
                      {txn.createdAt ? format(new Date(txn.createdAt), 'dd MMM yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={txn.transactionType === 'in' ? 'default' : 'secondary'}>
                        {txn.transactionType === 'in' ? (
                          <><TrendingUp className="w-3 h-3 mr-1" /> In</>
                        ) : (
                          <><TrendingDown className="w-3 h-3 mr-1" /> Out</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {txn.transactionType === 'in' ? '+' : '-'}{txn.quantity}
                    </TableCell>
                    <TableCell>{txn.batchNumber || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{txn.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

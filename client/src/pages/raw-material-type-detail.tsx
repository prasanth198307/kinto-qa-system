import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Layers, Package } from "lucide-react";
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

interface RawMaterialType {
  id: string;
  typeCode: string;
  typeName: string;
  description: string | null;
  isActive: number;
  createdAt: string | null;
}

interface RawMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  typeId: string | null;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  isActive: string;
}

interface RawMaterialTypeDetailProps {
  showHeader?: boolean;
}

export default function RawMaterialTypeDetail({ showHeader = true }: RawMaterialTypeDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: materialTypes = [], isLoading: isLoadingTypes } = useQuery<RawMaterialType[]>({
    queryKey: ['/api/raw-material-types'],
  });

  const { data: rawMaterials = [], isLoading: isLoadingMaterials } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const materialType = materialTypes.find(t => t.id === id);
  const materialsOfType = rawMaterials.filter(m => m.typeId === id);

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = typeof amount === 'number' ? amount : 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(safeAmount / 100);
  };

  const totalStockValue = materialsOfType.reduce((sum, m) => sum + ((m.currentStock || 0) * (m.costPerUnit || 0)), 0);

  if (isLoadingTypes) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!materialType) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Material type not found</p>
            <Button 
              onClick={() => setLocation('/inventory-management?tab=material-types')} 
              className="mt-4"
              data-testid="button-back-to-types"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Material Types
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation('/inventory-management?tab=material-types')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Material Types
        </Button>
        <h1 className="text-2xl font-bold" data-testid="text-type-name">{materialType.typeName}</h1>
        <Badge variant={materialType.isActive === 1 ? 'default' : 'secondary'} data-testid="badge-status">
          {materialType.isActive === 1 ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materials Count</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-materials-count">{materialsOfType.length}</div>
            <p className="text-xs text-muted-foreground">Raw materials in this category</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stock-value">{formatCurrency(totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">Combined inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-low-stock-count">
              {materialsOfType.filter(m => m.currentStock < m.minStock).length}
            </div>
            <p className="text-xs text-muted-foreground">Materials below minimum</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type Information</CardTitle>
          <CardDescription>Details about this material type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type Code</p>
              <p className="font-medium" data-testid="text-type-code">{materialType.typeCode}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type Name</p>
              <p className="font-medium">{materialType.typeName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={materialType.isActive === 1 ? 'default' : 'secondary'}>
                {materialType.isActive === 1 ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {materialType.createdAt ? format(new Date(materialType.createdAt), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
          {materialType.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{materialType.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materials in this Category</CardTitle>
          <CardDescription>All raw materials of type "{materialType.typeName}"</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMaterials ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : materialsOfType.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No materials in this category</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialsOfType.map((material) => (
                  <TableRow 
                    key={material.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/raw-material/${material.id}`)}
                    data-testid={`row-material-${material.id}`}
                  >
                    <TableCell className="font-medium">{material.materialCode}</TableCell>
                    <TableCell>{material.materialName}</TableCell>
                    <TableCell>
                      <span className={(material.currentStock || 0) < (material.minStock || 0) ? 'text-destructive font-medium' : ''}>
                        {material.currentStock || 0}
                      </span>
                    </TableCell>
                    <TableCell>{material.minStock}</TableCell>
                    <TableCell>{formatCurrency(material.costPerUnit)}</TableCell>
                    <TableCell>
                      <Badge variant={material.isActive === 'true' ? 'default' : 'secondary'}>
                        {material.isActive === 'true' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
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

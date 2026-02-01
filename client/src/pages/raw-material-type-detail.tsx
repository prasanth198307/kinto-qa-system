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
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";

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

export default function RawMaterialTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { logoutMutation, user } = useAuth();

  const { data: materialTypes = [], isLoading: isLoadingTypes } = useQuery<RawMaterialType[]>({
    queryKey: ['/api/raw-material-types'],
  });

  const { data: rawMaterials = [], isLoading: isLoadingMaterials } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const materialType = materialTypes.find(t => t.id === id);
  const materialsOfType = rawMaterials.filter(m => m.typeId === id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const totalStockValue = materialsOfType.reduce((sum, m) => sum + (m.currentStock * m.costPerUnit), 0);

  if (isLoadingTypes) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          title="Material Type Detail"
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

  if (!materialType) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          title="Material Type Detail"
          user={user}
          onLogout={() => logoutMutation.mutate()}
        />
        <div className="flex-1 p-4">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Material type not found</p>
              <Button onClick={() => navigate('/raw-material-types')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Material Types
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
        title={`Material Type: ${materialType.typeName}`}
        user={user}
        onLogout={() => logoutMutation.mutate()}
      />
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/raw-material-types')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{materialType.typeName}</h1>
          <Badge variant={materialType.isActive === 1 ? 'default' : 'secondary'}>
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
              <div className="text-2xl font-bold">{materialsOfType.length}</div>
              <p className="text-xs text-muted-foreground">Raw materials in this category</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
              <p className="text-xs text-muted-foreground">Combined inventory value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {materialsOfType.filter(m => m.currentStock <= m.minStock).length}
              </div>
              <p className="text-xs text-muted-foreground">Need reordering</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Type Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Code:</span>
                <p className="font-medium">{materialType.typeCode}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <p className="font-medium">{materialType.typeName}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm text-muted-foreground">Description:</span>
                <p className="font-medium">{materialType.description || 'No description'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Created:</span>
                <p className="font-medium">
                  {materialType.createdAt ? format(new Date(materialType.createdAt), 'dd MMM yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Materials in this Category</CardTitle>
            <CardDescription>All raw materials of type "{materialType.typeName}"</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMaterials ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : materialsOfType.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No materials found in this category
                    </TableCell>
                  </TableRow>
                ) : (
                  materialsOfType.map((material) => (
                    <TableRow key={material.id} className="cursor-pointer hover-elevate" onClick={() => navigate(`/raw-material/${material.id}`)}>
                      <TableCell className="font-medium">{material.materialCode}</TableCell>
                      <TableCell>{material.materialName}</TableCell>
                      <TableCell className="text-right">{material.currentStock}</TableCell>
                      <TableCell className="text-right">{material.minStock}</TableCell>
                      <TableCell className="text-right">{formatCurrency(material.costPerUnit)}</TableCell>
                      <TableCell>
                        {material.currentStock <= material.minStock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
                      </TableCell>
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

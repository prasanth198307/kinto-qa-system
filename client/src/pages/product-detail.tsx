import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, DollarSign, Layers, Box, ClipboardList } from "lucide-react";
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

interface Product {
  id: string;
  productCode: string;
  productName: string;
  skuCode: string | null;
  categoryId: string | null;
  typeId: string | null;
  description: string | null;
  unitPrice: number;
  costPrice: number;
  gstRate: number;
  hsnCode: string | null;
  isActive: number;
  createdAt: string | null;
}

interface ProductCategory {
  id: string;
  name: string;
  code: string;
}

interface ProductType {
  id: string;
  name: string;
  code: string;
}

interface ProductBom {
  id: string;
  productId: string;
  rawMaterialId: string;
  quantity: number;
  uomId: string | null;
}

interface RawMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  costPerUnit: number;
}

interface FinishedGood {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  qualityStatus: string;
  productionDate: string;
}

interface UOM {
  id: string;
  code: string;
  name: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { logoutMutation, user } = useAuth();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const product = products.find(p => p.id === id);

  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });

  const { data: productTypes = [] } = useQuery<ProductType[]>({
    queryKey: ['/api/product-types'],
  });

  const { data: bom = [] } = useQuery<ProductBom[]>({
    queryKey: ['/api/product-bom', id],
    enabled: !!id,
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: uoms = [] } = useQuery<UOM[]>({
    queryKey: ['/api/uoms'],
  });

  const productFinishedGoods = finishedGoods.filter(fg => fg.productId === id);
  const approvedStock = productFinishedGoods
    .filter(fg => fg.qualityStatus === 'approved')
    .reduce((sum, fg) => sum + fg.quantity, 0);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'N/A';
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getTypeName = (typeId: string | null) => {
    if (!typeId) return 'N/A';
    const type = productTypes.find(t => t.id === typeId);
    return type?.name || typeId;
  };

  const getRawMaterialName = (rmId: string) => {
    const rm = rawMaterials.find(r => r.id === rmId);
    return rm?.materialName || rmId;
  };

  const getUomName = (uomId: string | null) => {
    if (!uomId) return '';
    const uom = uoms.find(u => u.id === uomId);
    return uom?.name || '';
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
          title="Product Detail"
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

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          title="Product Detail"
          user={user}
          onLogout={() => logoutMutation.mutate()}
        />
        <div className="flex-1 p-4">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Product not found</p>
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
        title={`Product: ${product.productName}`}
        user={user}
        onLogout={() => logoutMutation.mutate()}
      />
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{product.productName}</h1>
          <Badge variant={product.isActive === 1 ? 'default' : 'secondary'}>
            {product.isActive === 1 ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedStock}</div>
              <p className="text-xs text-muted-foreground">Approved finished goods</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selling Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(product.unitPrice)}</div>
              <p className="text-xs text-muted-foreground">Per unit (excl. GST)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(product.costPrice)}</div>
              <p className="text-xs text-muted-foreground">Manufacturing cost</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST Rate</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{product.gstRate}%</div>
              <p className="text-xs text-muted-foreground">HSN: {product.hsnCode || 'N/A'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Code:</span>
                <span className="font-medium">{product.productCode}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU Code:</span>
                <span className="font-medium">{product.skuCode || 'N/A'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{getCategoryName(product.categoryId)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{getTypeName(product.typeId)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="font-medium">{product.description || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Tax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit Price:</span>
                <span className="font-medium">{formatCurrency(product.unitPrice)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost Price:</span>
                <span className="font-medium">{formatCurrency(product.costPrice)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margin:</span>
                <span className="font-medium">
                  {product.costPrice > 0 
                    ? `${(((product.unitPrice - product.costPrice) / product.costPrice) * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST Rate:</span>
                <span className="font-medium">{product.gstRate}%</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">HSN Code:</span>
                <span className="font-medium">{product.hsnCode || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bill of Materials (BOM)</CardTitle>
            <CardDescription>Raw materials required to produce this product</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raw Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bom.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No BOM defined for this product
                    </TableCell>
                  </TableRow>
                ) : (
                  bom.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getRawMaterialName(item.rawMaterialId)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{getUomName(item.uomId)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finished Goods Inventory</CardTitle>
            <CardDescription>Current stock by batch</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productFinishedGoods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No finished goods inventory for this product
                    </TableCell>
                  </TableRow>
                ) : (
                  productFinishedGoods.slice(0, 10).map((fg) => (
                    <TableRow key={fg.id} className="cursor-pointer hover-elevate" onClick={() => navigate(`/finished-good/${fg.id}`)}>
                      <TableCell className="font-medium">{fg.batchNumber}</TableCell>
                      <TableCell>
                        {fg.productionDate ? format(new Date(fg.productionDate), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">{fg.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={
                          fg.qualityStatus === 'approved' ? 'default' :
                          fg.qualityStatus === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {fg.qualityStatus}
                        </Badge>
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

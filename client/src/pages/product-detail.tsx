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

interface ProductDetailProps {
  showHeader?: boolean;
}

export default function ProductDetail({ showHeader = true }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const product = products.find(p => String(p.id) === String(id));

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

  const productFinishedGoods = finishedGoods.filter(fg => String(fg.productId) === String(id));
  const approvedStock = productFinishedGoods
    .filter(fg => fg.qualityStatus === 'approved')
    .reduce((sum, fg) => sum + (Number(fg.quantity) || 0), 0);

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

  const formatCurrency = (amount: string | number | undefined | null) => {
    const safeAmount = typeof amount === 'number' ? amount : (amount ? parseFloat(amount) : 0);
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

  if (!product) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Product not found</p>
            <Button 
              onClick={() => setLocation('/inventory-management?tab=products')} 
              className="mt-4"
              data-testid="button-back-to-products"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStock = productFinishedGoods.reduce((sum, fg) => sum + (Number(fg.quantity) || 0), 0);
  const stockValue = approvedStock * (Number(product.unitPrice) || 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation('/inventory-management?tab=products')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
        <h1 className="text-2xl font-bold" data-testid="text-product-name">{product.productName}</h1>
        <Badge variant={product.isActive === 1 ? 'default' : 'secondary'} data-testid="badge-status">
          {product.isActive === 1 ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unit-price">{formatCurrency(product.unitPrice)}</div>
            <p className="text-xs text-muted-foreground">Selling price</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cost-price">{formatCurrency(product.costPrice)}</div>
            <p className="text-xs text-muted-foreground">Manufacturing cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available-stock">{approvedStock}</div>
            <p className="text-xs text-muted-foreground">Approved units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stock-value">{formatCurrency(stockValue)}</div>
            <p className="text-xs text-muted-foreground">At unit price</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Details about this product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Product Code</p>
                <p className="font-medium" data-testid="text-product-code">{product.productCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SKU Code</p>
                <p className="font-medium">{product.skuCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium" data-testid="text-category">{getCategoryName(product.categoryId)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium" data-testid="text-type">{getTypeName(product.typeId)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">HSN Code</p>
                <p className="font-medium">{product.hsnCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">GST Rate</p>
                <p className="font-medium">{product.gstRate}%</p>
              </div>
            </div>

            {product.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{product.description}</p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {product.createdAt ? format(new Date(product.createdAt), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill of Materials</CardTitle>
            <CardDescription>Raw materials required for production</CardDescription>
          </CardHeader>
          <CardContent>
            {bom.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No BOM defined</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bom.map((item) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/raw-material/${item.rawMaterialId}`)}
                      data-testid={`row-bom-${item.id}`}
                    >
                      <TableCell className="font-medium">{getRawMaterialName(item.rawMaterialId)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{getUomName(item.uomId)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finished Goods Inventory</CardTitle>
          <CardDescription>All batches of this product in stock</CardDescription>
        </CardHeader>
        <CardContent>
          {productFinishedGoods.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No finished goods in stock</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productFinishedGoods.map((fg) => (
                  <TableRow 
                    key={fg.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/finished-good/${fg.id}`)}
                    data-testid={`row-finished-good-${fg.id}`}
                  >
                    <TableCell className="font-medium">{fg.batchNumber}</TableCell>
                    <TableCell>
                      {fg.productionDate ? format(new Date(fg.productionDate), 'dd MMM yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>{fg.quantity}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          fg.qualityStatus === 'approved' ? 'default' :
                          fg.qualityStatus === 'rejected' ? 'destructive' : 'secondary'
                        }
                      >
                        {fg.qualityStatus}
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

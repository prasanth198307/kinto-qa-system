import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Calendar, MapPin, User, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface FinishedGood {
  id: string;
  productId: string;
  batchNumber: string;
  originalBatchNumber: string | null;
  productionDate: string;
  quantity: number;
  qualityStatus: string;
  storageLocation: string | null;
  remarks: string | null;
  source: string | null;
  salesReturnItemId: string | null;
  repackingDate: string | null;
  inspectedBy: string | null;
  inspectionDate: string | null;
  createdAt: string | null;
}

interface Product {
  id: string;
  productCode: string;
  productName: string;
  unitPrice: number;
}

interface UserType {
  id: string;
  username: string;
  fullName: string | null;
}

interface FinishedGoodDetailProps {
  showHeader?: boolean;
}

export default function FinishedGoodDetail({ showHeader = true }: FinishedGoodDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: finishedGoods = [], isLoading: isLoadingFG } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  const finishedGood = finishedGoods.find(fg => fg.id === id);

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.productName || productId;
  };

  const getProductCode = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.productCode || '';
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'N/A';
    const u = users.find(usr => usr.id === userId);
    return u?.fullName || u?.username || userId;
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = typeof amount === 'number' ? amount : 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(safeAmount / 100);
  };

  const getSourceLabel = (source: string | null) => {
    switch (source) {
      case 'production': return 'Production';
      case 'sales_return_restock': return 'Sales Return (Restocked)';
      case 'sales_return_repack': return 'Sales Return (Repacked)';
      default: return source || 'Production';
    }
  };

  if (isLoadingFG) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!finishedGood) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Finished good not found</p>
            <Button 
              onClick={() => setLocation('/inventory-management?tab=finished-goods')} 
              className="mt-4"
              data-testid="button-back-to-inventory"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Finished Goods
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const product = products.find(p => p.id === finishedGood.productId);
  const stockValue = product ? (finishedGood.quantity || 0) * (product.unitPrice || 0) : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation('/inventory-management?tab=finished-goods')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Finished Goods
        </Button>
        <h1 className="text-2xl font-bold" data-testid="text-batch-title">Batch: {finishedGood.batchNumber}</h1>
        <Badge 
          variant={
            finishedGood.qualityStatus === 'approved' ? 'default' :
            finishedGood.qualityStatus === 'rejected' ? 'destructive' : 'secondary'
          }
          data-testid="badge-quality-status"
        >
          {finishedGood.qualityStatus}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-product-name">{getProductName(finishedGood.productId)}</div>
            <p className="text-xs text-muted-foreground">{getProductCode(finishedGood.productId)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-quantity">{finishedGood.quantity}</div>
            <p className="text-xs text-muted-foreground">Units in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stock-value">{formatCurrency(stockValue)}</div>
            <p className="text-xs text-muted-foreground">At unit price</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-production-date">
              {finishedGood.productionDate ? format(new Date(finishedGood.productionDate), 'dd MMM yyyy') : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Manufactured on</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
            <CardDescription>Details about this finished goods batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Batch Number</p>
                <p className="font-medium" data-testid="text-batch-number">{finishedGood.batchNumber}</p>
              </div>
              {finishedGood.originalBatchNumber && finishedGood.originalBatchNumber !== finishedGood.batchNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Original Batch</p>
                  <p className="font-medium" data-testid="text-original-batch">{finishedGood.originalBatchNumber}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Quality Status</p>
                <Badge 
                  variant={
                    finishedGood.qualityStatus === 'approved' ? 'default' :
                    finishedGood.qualityStatus === 'rejected' ? 'destructive' : 'secondary'
                  }
                >
                  {finishedGood.qualityStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <Badge variant="outline" data-testid="badge-source">{getSourceLabel(finishedGood.source)}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Storage Location</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {finishedGood.storageLocation || 'Not specified'}
                </p>
              </div>
              {finishedGood.inspectedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Inspected By</p>
                  <p className="font-medium flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {getUserName(finishedGood.inspectedBy)}
                  </p>
                </div>
              )}
              {finishedGood.inspectionDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Inspection Date</p>
                  <p className="font-medium">
                    {format(new Date(finishedGood.inspectionDate), 'dd MMM yyyy')}
                  </p>
                </div>
              )}
            </div>

            {finishedGood.remarks && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p className="font-medium">{finishedGood.remarks}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traceability</CardTitle>
            <CardDescription>Source and history tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">Source: {getSourceLabel(finishedGood.source)}</p>
                  <p className="text-sm text-muted-foreground">
                    {finishedGood.source === 'production' && 'Created from production entry'}
                    {finishedGood.source === 'sales_return_restock' && 'Restocked from sales return'}
                    {finishedGood.source === 'sales_return_repack' && 'Repacked from sales return'}
                  </p>
                </div>
              </div>

              {finishedGood.repackingDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Repacked On</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(finishedGood.repackingDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {finishedGood.salesReturnItemId && (
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Linked to Sales Return</p>
                    <p className="text-sm text-muted-foreground">
                      This batch originated from a sales return item
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {finishedGood.createdAt ? format(new Date(finishedGood.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Information about the product</CardDescription>
        </CardHeader>
        <CardContent>
          {product ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Product Name</p>
                <Link href={`/product/${product.id}`}>
                  <p className="font-medium text-primary hover:underline cursor-pointer" data-testid="link-product">
                    {product.productName}
                  </p>
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Product Code</p>
                <p className="font-medium">{product.productCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unit Price</p>
                <p className="font-medium">{formatCurrency(product.unitPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="font-medium">{formatCurrency(stockValue)}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Product information not available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Calendar, MapPin, User, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";

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

interface User {
  id: string;
  username: string;
  fullName: string | null;
}

export default function FinishedGoodDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { logoutMutation, user } = useAuth();

  const { data: finishedGoods = [], isLoading: isLoadingFG } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: users = [] } = useQuery<User[]>({
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount / 100);
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
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          title="Finished Good Detail"
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

  if (!finishedGood) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          title="Finished Good Detail"
          user={user}
          onLogout={() => logoutMutation.mutate()}
        />
        <div className="flex-1 p-4">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Finished good not found</p>
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

  const product = products.find(p => p.id === finishedGood.productId);
  const stockValue = product ? finishedGood.quantity * product.unitPrice : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalHeader
        title={`Batch: ${finishedGood.batchNumber}`}
        user={user}
        onLogout={() => logoutMutation.mutate()}
      />
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Batch: {finishedGood.batchNumber}</h1>
          <Badge variant={
            finishedGood.qualityStatus === 'approved' ? 'default' :
            finishedGood.qualityStatus === 'rejected' ? 'destructive' : 'secondary'
          }>
            {finishedGood.qualityStatus}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quantity</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{finishedGood.quantity}</div>
              <p className="text-xs text-muted-foreground">Units in this batch</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stockValue)}</div>
              <p className="text-xs text-muted-foreground">At selling price</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Production Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {finishedGood.productionDate ? format(new Date(finishedGood.productionDate), 'dd MMM') : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {finishedGood.productionDate ? format(new Date(finishedGood.productionDate), 'yyyy') : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Source</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{getSourceLabel(finishedGood.source)}</div>
              <p className="text-xs text-muted-foreground">Origin of this batch</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Batch Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch Number:</span>
                <span className="font-medium">{finishedGood.batchNumber}</span>
              </div>
              <Separator />
              {finishedGood.originalBatchNumber && finishedGood.originalBatchNumber !== finishedGood.batchNumber && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Batch:</span>
                    <span className="font-medium">{finishedGood.originalBatchNumber}</span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <Link href={`/product/${finishedGood.productId}`} className="font-medium text-primary hover:underline">
                  {getProductName(finishedGood.productId)}
                </Link>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Code:</span>
                <span className="font-medium">{getProductCode(finishedGood.productId)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Location:</span>
                <span className="font-medium">{finishedGood.storageLocation || 'N/A'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {finishedGood.createdAt ? format(new Date(finishedGood.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={
                  finishedGood.qualityStatus === 'approved' ? 'default' :
                  finishedGood.qualityStatus === 'rejected' ? 'destructive' : 'secondary'
                }>
                  {finishedGood.qualityStatus}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inspected By:</span>
                <span className="font-medium">{getUserName(finishedGood.inspectedBy)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inspection Date:</span>
                <span className="font-medium">
                  {finishedGood.inspectionDate 
                    ? format(new Date(finishedGood.inspectionDate), 'dd MMM yyyy') 
                    : 'N/A'}
                </span>
              </div>
              {finishedGood.repackingDate && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repacking Date:</span>
                    <span className="font-medium">
                      {format(new Date(finishedGood.repackingDate), 'dd MMM yyyy')}
                    </span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remarks:</span>
                <span className="font-medium max-w-[200px] text-right">{finishedGood.remarks || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {finishedGood.source && finishedGood.source !== 'production' && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Return Traceability</CardTitle>
              <CardDescription>This batch originated from a sales return</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Type:</span>
                <Badge variant="secondary">{getSourceLabel(finishedGood.source)}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales Return Item ID:</span>
                <span className="font-medium font-mono text-sm">
                  {finishedGood.salesReturnItemId || 'N/A'}
                </span>
              </div>
              {finishedGood.originalBatchNumber && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Batch (Physical Label):</span>
                    <span className="font-medium">{finishedGood.originalBatchNumber}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

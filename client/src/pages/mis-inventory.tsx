import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, AlertTriangle, Clock, TrendingDown, Download } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface InventoryData {
  summary: {
    totalRawMaterialValue: number;
    totalRawMaterials: number;
    belowReorder: number;
  };
  agingBuckets: {
    fresh: number;
    aged_30_60: number;
    aged_60_90: number;
    'aged_90+': number;
    unknown: number;
  };
  rawMaterials: Array<{
    id: string;
    materialCode: string;
    materialName: string;
    currentStock: number;
    unitCost: number;
    stockValue: number;
    reorderLevel: number | null;
    agingBucket: string;
  }>;
  finishedGoods: Array<{
    productName: string;
    batchCount: number;
    totalQuantity: number;
    oldestBatch: string;
    newestBatch: string;
  }>;
  slowMovers: Array<{
    id: string;
    materialCode: string;
    materialName: string;
    currentStock: number;
    lastIssued: string | null;
  }>;
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function MISInventory() {
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading } = useQuery<InventoryData>({
    queryKey: ['/api/mis/inventory-analytics'],
  });

  const agingLabels: Record<string, string> = {
    fresh: 'Fresh (< 30 days)',
    aged_30_60: '30-60 days',
    aged_60_90: '60-90 days',
    'aged_90+': '90+ days',
    unknown: 'Unknown'
  };

  const agingColors: Record<string, string> = {
    fresh: 'bg-green-500',
    aged_30_60: 'bg-amber-400',
    aged_60_90: 'bg-orange-500',
    'aged_90+': 'bg-destructive',
    unknown: 'bg-muted'
  };

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const summarySheet = [
        ['Inventory Intelligence Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['Summary'],
        ['Total Inventory Value', formatCurrencyForExcel(data.summary.totalRawMaterialValue)],
        ['Active Materials', data.summary.totalRawMaterials],
        ['Below Reorder Level', data.summary.belowReorder],
        [''],
        ['Aging Buckets'],
        ['Bucket', 'Value'],
        ...Object.entries(data.agingBuckets).map(([bucket, value]) => [
          agingLabels[bucket] || bucket,
          formatCurrencyForExcel(value)
        ])
      ];

      const materialsSheet = [
        ['Raw Materials'],
        ['Material Code', 'Material Name', 'Current Stock', 'Unit Cost', 'Stock Value', 'Reorder Level', 'Aging Bucket'],
        ...data.rawMaterials.map(m => [
          m.materialCode,
          m.materialName,
          m.currentStock,
          formatCurrencyForExcel(m.unitCost),
          formatCurrencyForExcel(m.stockValue),
          m.reorderLevel || 'N/A',
          m.agingBucket
        ])
      ];

      const finishedGoodsSheet = [
        ['Finished Goods'],
        ['Product Name', 'Batch Count', 'Total Quantity', 'Oldest Batch', 'Newest Batch'],
        ...data.finishedGoods.map(f => [
          f.productName,
          f.batchCount,
          f.totalQuantity,
          formatDateForExcel(f.oldestBatch),
          formatDateForExcel(f.newestBatch)
        ])
      ];

      const slowMoversSheet = [
        ['Slow Moving Items'],
        ['Material Code', 'Material Name', 'Current Stock', 'Last Issued'],
        ...data.slowMovers.map(s => [
          s.materialCode,
          s.materialName,
          s.currentStock,
          s.lastIssued ? formatDateForExcel(s.lastIssued) : 'Never'
        ])
      ];

      await exportToExcel({
        filename: `mis-inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Summary', data: summarySheet },
          { name: 'Raw Materials', data: materialsSheet },
          { name: 'Finished Goods', data: finishedGoodsSheet },
          { name: 'Slow Movers', data: slowMoversSheet },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-inventory-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Inventory Intelligence</h1>
            <p className="text-muted-foreground">Stock aging, slow movers, and value analysis</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExporting || isLoading}
          data-testid="button-export-excel"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Excel'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRawMaterialValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Materials</p>
                    <p className="text-2xl font-bold">{data.summary.totalRawMaterials}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Below Reorder Level</p>
                    <p className="text-2xl font-bold text-destructive">{data.summary.belowReorder}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inventory Aging</CardTitle>
                <CardDescription>Stock value by age</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.agingBuckets).map(([bucket, value]) => {
                    const total = Object.values(data.agingBuckets).reduce((sum, v) => sum + v, 0);
                    const percentage = total > 0 ? (value / total * 100) : 0;
                    return (
                      <div key={bucket} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{agingLabels[bucket]}</span>
                          <span className="font-medium">{formatCurrency(value)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${agingColors[bucket]} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-600" />
                  Slow Moving Items
                </CardTitle>
                <CardDescription>No issuance in 30+ days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {data.slowMovers.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium text-sm">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">{item.materialCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.currentStock.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.lastIssued 
                            ? `Last: ${new Date(item.lastIssued).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                            : 'Never issued'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {data.slowMovers.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No slow moving items</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Finished Goods Inventory</CardTitle>
              <CardDescription>Available stock by product</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead className="text-right">Oldest Batch</TableHead>
                    <TableHead className="text-right">Newest Batch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.finishedGoods.map((fg, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{fg.productName}</TableCell>
                      <TableCell className="text-right">{fg.batchCount}</TableCell>
                      <TableCell className="text-right">{fg.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {fg.oldestBatch ? new Date(fg.oldestBatch).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {fg.newestBatch ? new Date(fg.newestBatch).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.finishedGoods.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No finished goods data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Raw Materials Stock</CardTitle>
              <CardDescription>Top items by stock value</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rawMaterials.map((rm, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rm.materialName}</p>
                          <p className="text-xs text-muted-foreground">{rm.materialCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{rm.currentStock?.toLocaleString() || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(rm.unitCost || 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(rm.stockValue)}</TableCell>
                      <TableCell className="text-right">
                        {rm.reorderLevel && rm.currentStock <= rm.reorderLevel ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="capitalize">{rm.agingBucket.replace('_', ' ')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.rawMaterials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No raw materials data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load inventory analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

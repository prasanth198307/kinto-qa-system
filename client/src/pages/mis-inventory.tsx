import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Download, ArrowRight } from "lucide-react";
import { useState } from "react";
import { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface InventoryData {
  summary: { totalRawMaterialValue: number; totalRawMaterials: number; belowReorder: number };
  agingBuckets: { fresh: number; aged_30_60: number; aged_60_90: number; 'aged_90+': number; unknown: number };
  rawMaterials: Array<{ id: string; materialCode: string; materialName: string; currentStock: number; unitCost: number; stockValue: number; reorderLevel: number | null; agingBucket: string }>;
  finishedGoods: Array<{ productName: string; batchCount: number; totalQuantity: number; oldestBatch: string; newestBatch: string; stockValue: number }>;
  slowMovers: Array<{ id: string; materialCode: string; materialName: string; currentStock: number; lastIssued: string | null }>;
}

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function formatINRRupees(rupees: number) {
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function KpiBadge({ label, color }: { label: string; color: 'gray' | 'red' | 'orange' | 'green' | 'amber' }) {
  const cls = { gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400', green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }[color];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${cls}`}>{label}</span>;
}

function StockHealthBar({ current, reorder }: { current: number; reorder: number | null }) {
  if (!reorder || reorder === 0) return <div className="text-xs text-muted-foreground">—</div>;
  const pct = Math.min((current / reorder) * 100, 100);
  const color = pct <= 25 ? 'bg-red-500' : pct <= 50 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
    </div>
  );
}

function StockStatus({ current, reorder, agingBucket }: { current: number; reorder: number | null; agingBucket: string }) {
  if (reorder && current <= reorder * 0.3) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">REORDER NOW</span>;
  if (reorder && current <= reorder * 0.5) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">LOW STOCK</span>;
  if (!reorder) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">UNKNOWN</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">OK</span>;
}

export default function MISInventory() {
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading } = useQuery<InventoryData>({ queryKey: ['/api/mis/inventory-analytics'] });

  const agingLabels: Record<string, string> = { fresh: 'Fresh (< 30 days)', aged_30_60: '30–60 days', aged_60_90: '60–90 days', 'aged_90+': '90+ days', unknown: 'Unknown age' };
  const agingColors: Record<string, string> = { fresh: 'bg-green-500', aged_30_60: 'bg-amber-400', aged_60_90: 'bg-orange-500', 'aged_90+': 'bg-red-500', unknown: 'bg-gray-400' };

  const totalValue = data?.summary.totalRawMaterialValue || 0;
  const unknownAgeValue = data?.agingBuckets.unknown || 0;
  const unknownAgePct = totalValue > 0 ? Math.round((unknownAgeValue / totalValue) * 100) : 0;
  const isCritical = totalValue < 500000;

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportToExcel({
        filename: `mis-inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Summary', data: [['Total Inventory Value', formatCurrencyForExcel(totalValue)], ['Active Materials', data.summary.totalRawMaterials], ['Below Reorder', data.summary.belowReorder]] },
          { name: 'Raw Materials', data: [['Code', 'Name', 'Stock', 'Unit Cost', 'Value', 'Reorder Lvl', 'Aging'], ...data.rawMaterials.map(m => [m.materialCode, m.materialName, m.currentStock, formatCurrencyForExcel(m.unitCost * 100), formatCurrencyForExcel(m.stockValue), m.reorderLevel || 'N/A', m.agingBucket])] },
          { name: 'Finished Goods', data: [['Product', 'Batches', 'Total Qty', 'Oldest', 'Newest', 'Stock Value'], ...data.finishedGoods.map(f => [f.productName, f.batchCount, f.totalQuantity, formatDateForExcel(f.oldestBatch), formatDateForExcel(f.newestBatch), f.stockValue])] },
          { name: 'Slow Movers', data: [['Code', 'Name', 'Stock', 'Last Issued'], ...data.slowMovers.map(s => [s.materialCode, s.materialName, s.currentStock, s.lastIssued ? formatDateForExcel(s.lastIssued) : 'Never'])] },
        ],
      });
    } finally { setIsExporting(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-inventory-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Inventory Intelligence</h1>
          <p className="text-muted-foreground text-sm">Stock aging, slow movers, and value analysis — Inmoisture Pvt. Ltd.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting || isLoading} data-testid="button-export-excel">
          <Download className="w-4 h-4 mr-2" />{isExporting ? 'Exporting...' : 'Export Excel'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4"><div className="grid md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-64" /></div>
      ) : data ? (
        <>
          {isCritical && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">Critical: Total Inventory Value = {formatINR(totalValue)} only</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">This is extremely low for a water bottling plant. Either inventory items are not valued in the system, or stock receipts are not being logged. Raw materials alone should be ₹5L+.</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                  <KpiBadge label={isCritical ? 'CRITICAL' : 'HEALTHY'} color={isCritical ? 'red' : 'green'} />
                </div>
                <p className="text-2xl font-bold">{formatINR(totalValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Only RM labels logged</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">₹5L+ expected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">Active Materials</p>
                  <KpiBadge label={data.summary.totalRawMaterials < 10 ? 'LOW' : 'OK'} color={data.summary.totalRawMaterials < 10 ? 'orange' : 'green'} />
                </div>
                <p className="text-2xl font-bold">{data.summary.totalRawMaterials}</p>
                <p className="text-xs text-muted-foreground mt-1">Items with stock value</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 cursor-pointer hover:underline">Add more items</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">Below Reorder Level</p>
                  <KpiBadge label={data.summary.belowReorder === 0 ? 'NOT SET' : data.summary.belowReorder > 2 ? 'CRITICAL' : 'ALERT'} color={data.summary.belowReorder === 0 ? 'gray' : data.summary.belowReorder > 2 ? 'red' : 'amber'} />
                </div>
                <p className="text-2xl font-bold">{data.summary.belowReorder}</p>
                <p className="text-xs text-muted-foreground mt-1">No reorder points set</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 cursor-pointer hover:underline">Set reorder levels</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">Unknown Age Stock</p>
                  <KpiBadge label="DATA GAP" color="gray" />
                </div>
                <p className="text-2xl font-bold">{unknownAgePct}%</p>
                <p className="text-xs text-muted-foreground mt-1">{formatINR(unknownAgeValue)} — no date stamp</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 cursor-pointer hover:underline">Fix receipt dates</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Inventory Aging</CardTitle><CardDescription>Stock value by age bracket</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.agingBuckets).map(([bucket, value]) => {
                    const total = Object.values(data.agingBuckets).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? (value / total) * 100 : 0;
                    const noReceipts = value === 0 && bucket === 'fresh';
                    return (
                      <div key={bucket} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{agingLabels[bucket]}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{formatINR(value)}</span>
                            {noReceipts && <span className="text-xs text-muted-foreground">to</span>}
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${agingColors[bucket]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        {bucket === 'fresh' && value === 0 && <p className="text-xs text-muted-foreground">No receipt dates recorded</p>}
                        {bucket === 'aged_90+' && value > 0 && <p className="text-xs text-red-500">Expiry risk</p>}
                        {bucket === 'unknown' && value > 0 && <p className="text-xs text-muted-foreground">{unknownAgePct}%</p>}
                      </div>
                    );
                  })}
                </div>
                {unknownAgeValue > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <ArrowRight className="w-3 h-3" />
                    <span>Go to Inventory → Receipts and add date for each stock entry to enable aging analysis</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Slow Moving Items</CardTitle><CardDescription>No issuance in 30+ days</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.slowMovers.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">{item.materialCode} · {item.currentStock.toLocaleString()} units · ₹{((item.currentStock * 0) || 0).toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">SLOW MOVER</span>
                    </div>
                  ))}
                  {data.slowMovers.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No slow moving items — all materials issued regularly</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw Materials Stock</CardTitle>
              <CardDescription>All items by stock value · Reorder health · Days of stock</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material / Code</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Reorder Pt.</TableHead>
                    <TableHead>Stock Health</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rawMaterials.map((rm, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <p className="font-medium text-sm">{rm.materialName}</p>
                        <p className="text-xs text-muted-foreground">{rm.materialCode}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-sm font-medium">{rm.currentStock.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">units</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">₹{rm.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatINR(rm.stockValue)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{rm.reorderLevel ? `${rm.reorderLevel.toLocaleString()} units` : '—'}</TableCell>
                      <TableCell><StockHealthBar current={rm.currentStock} reorder={rm.reorderLevel} /></TableCell>
                      <TableCell><StockStatus current={rm.currentStock} reorder={rm.reorderLevel} agingBucket={rm.agingBucket} /></TableCell>
                    </TableRow>
                  ))}
                  {data.rawMaterials.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">No raw materials data — add materials and log stock receipts</TableCell></TableRow>}
                </TableBody>
              </Table>
              {data.rawMaterials.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
                  ↑ Only {data.summary.totalRawMaterials} materials are valued. Add all raw materials (PET preforms, caps, labels, shrink film, corrugated boxes, water treatment chemicals) to get accurate inventory position.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10">
            <CardHeader>
              <CardTitle className="text-base">Finished Goods Inventory</CardTitle>
              <CardDescription>Available stock by product — Setup required to activate</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batches</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead>Oldest Batch</TableHead>
                    <TableHead>Newest Batch</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.finishedGoods.map((fg, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{fg.productName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fg.batchCount > 0 ? `B-${String(fg.batchCount).padStart(4, '0')}` : '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fg.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fg.oldestBatch ? new Date(fg.oldestBatch).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fg.newestBatch ? new Date(fg.newestBatch).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fg.stockValue > 0 ? formatINRRupees(fg.stockValue) : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {data.finishedGoods.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">No finished goods data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <ArrowRight className="w-3 h-3 shrink-0" />
                <span>To activate Finished Goods tracking: (1) Log production shift entries → (2) System auto-creates FG batches → (3) Record dispatch when goods leave → (4) This table populates automatically</span>
              </div>
            </CardContent>
          </Card>

          {data.rawMaterials.filter(m => m.reorderLevel && m.currentStock <= m.reorderLevel).length > 0 && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold">Reorder Planning</h2>
                <p className="text-sm text-muted-foreground">Set reorder points to get automatic alerts when stock falls below safe levels</p>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {data.rawMaterials.filter(m => m.reorderLevel).slice(0, 4).map((rm, i) => {
                  const pct = rm.reorderLevel ? Math.min((rm.currentStock / rm.reorderLevel) * 100, 100) : 100;
                  const isUrgent = pct < 30;
                  const isReorder = pct < 60;
                  return (
                    <Card key={i} className={isUrgent ? 'border-red-300 dark:border-red-700' : isReorder ? 'border-amber-300 dark:border-amber-700' : ''}>
                      <CardContent className="p-4 space-y-2">
                        <p className="font-semibold text-sm">{rm.materialName}</p>
                        <p className="text-xs text-muted-foreground">Current: {rm.currentStock.toLocaleString()} units</p>
                        <p className="text-xs text-muted-foreground">Reorder at: {rm.reorderLevel?.toLocaleString()} units</p>
                        <p className={`text-xs font-bold ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                          Days left: ~{rm.reorderLevel ? Math.round((rm.currentStock / Math.max(rm.reorderLevel, 1)) * 30) : '?'}
                        </p>
                        <p className="text-xs text-muted-foreground">Usage rate: ~{rm.reorderLevel} units/month</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : isReorder ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>
                          {isUrgent ? 'URGENT' : isReorder ? 'REORDER' : 'MONITOR'}
                        </span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">Failed to load inventory analytics</p></CardContent></Card>
      )}
    </div>
  );
}

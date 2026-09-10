import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileBarChart2, Search, X } from "lucide-react";
import ExcelJS from "exceljs";

interface ReportRow {
  soDate: string;
  soNumber: string;
  buyerName: string;
  status: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  invoiced: "Invoiced",
  partially_invoiced: "Partially Invoiced",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  confirmed: "default",
  invoiced: "outline",
  partially_invoiced: "outline",
  cancelled: "destructive",
};

function fmt(val: number) {
  return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalesOrderReport() {
  const today = format(new Date(), "yyyy-MM-dd");
  const firstOfMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [filterMode, setFilterMode] = useState<"range" | "month">("range");
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [customerId, setCustomerId] = useState("all");
  const [productId, setProductId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [generated, setGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Lookup data
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/products"] });

  // Derive effective date range
  const effectiveDateFrom = filterMode === "month"
    ? format(startOfMonth(parse(selectedMonth, "yyyy-MM", new Date())), "yyyy-MM-dd")
    : dateFrom;
  const effectiveDateTo = filterMode === "month"
    ? format(endOfMonth(parse(selectedMonth, "yyyy-MM", new Date())), "yyyy-MM-dd")
    : dateTo;

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery<ReportRow[]>({
    queryKey: ["/api/sales-orders/report", activeFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo);
      if (activeFilters.customerId && activeFilters.customerId !== "all") params.set("customerId", activeFilters.customerId);
      if (activeFilters.productId && activeFilters.productId !== "all") params.set("productId", activeFilters.productId);
      if (activeFilters.status && activeFilters.status !== "all") params.set("status", activeFilters.status);
      const res = await fetch(`/api/sales-orders/report?${params}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
    enabled: generated,
  });

  function handleGenerate() {
    setActiveFilters({ dateFrom: effectiveDateFrom, dateTo: effectiveDateTo, customerId, productId, status: statusFilter });
    setGenerated(true);
  }

  function handleReset() {
    setDateFrom(firstOfMonth);
    setDateTo(today);
    setSelectedMonth(format(new Date(), "yyyy-MM"));
    setCustomerId("all");
    setProductId("all");
    setStatusFilter("all");
    setGenerated(false);
    setActiveFilters({});
  }

  // Group rows by date → buyer → sku
  const grouped = useMemo(() => {
    const byDate: Record<string, Record<string, ReportRow[]>> = {};
    for (const row of rows) {
      if (!byDate[row.soDate]) byDate[row.soDate] = {};
      if (!byDate[row.soDate][row.buyerName]) byDate[row.soDate][row.buyerName] = [];
      byDate[row.soDate][row.buyerName].push(row);
    }
    return byDate;
  }, [rows]);

  const totals = useMemo(() => ({
    qty: rows.reduce((s, r) => s + r.quantity, 0),
    taxable: rows.reduce((s, r) => s + r.taxableAmount, 0),
    tax: rows.reduce((s, r) => s + r.taxAmount, 0),
    total: rows.reduce((s, r) => s + r.totalAmount, 0),
  }), [rows]);

  async function exportToExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sales Order Report");

    const NAVY = "1A2B45";
    const LIGHT_HEADER = "EBF0FA";

    ws.columns = [
      { key: "date", width: 14 },
      { key: "soNo", width: 20 },
      { key: "buyer", width: 28 },
      { key: "status", width: 16 },
      { key: "sku", width: 14 },
      { key: "product", width: 28 },
      { key: "qty", width: 10 },
      { key: "unitPrice", width: 14 },
      { key: "taxable", width: 16 },
      { key: "tax", width: 14 },
      { key: "total", width: 16 },
    ];

    const titleRow = ws.addRow(["SALES ORDER REPORT"]);
    ws.mergeCells(`A${titleRow.number}:K${titleRow.number}`);
    titleRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 24;

    const periodLabel = filterMode === "month"
      ? `Month: ${format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy")}`
      : `Period: ${format(new Date(effectiveDateFrom), "dd MMM yyyy")} – ${format(new Date(effectiveDateTo), "dd MMM yyyy")}`;
    const subRow = ws.addRow([`${periodLabel}   |   Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`]);
    ws.mergeCells(`A${subRow.number}:K${subRow.number}`);
    subRow.font = { size: 10, color: { argb: `FF${NAVY}` } };
    subRow.alignment = { horizontal: "center" };
    subRow.height = 16;

    ws.addRow([]);

    const headers = ["Date", "SO Number", "Customer", "Status", "SKU", "Product", "Qty", "Unit Price", "Taxable Amt", "Tax", "Total Amt"];
    const hRow = ws.addRow(headers);
    hRow.eachCell(cell => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
    });
    hRow.height = 18;

    for (const [date, byBuyer] of Object.entries(grouped)) {
      const dateLabel = format(new Date(date), "dd MMM yyyy (EEE)");
      for (const [buyer, items] of Object.entries(byBuyer)) {
        for (const row of items) {
          const dr = ws.addRow([
            dateLabel,
            row.soNumber,
            buyer,
            STATUS_LABELS[row.status] || row.status,
            row.sku,
            row.productName,
            row.quantity,
            row.unitPrice,
            row.taxableAmount,
            row.taxAmount,
            row.totalAmount,
          ]);
          dr.eachCell((cell, col) => {
            cell.font = { size: 10 };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
            if (col >= 7) {
              cell.numFmt = "#,##0.00";
              cell.alignment = { horizontal: "right" };
            }
            cell.border = { bottom: { style: "hair", color: { argb: "FFEEEEEE" } } };
          });
        }
      }
    }

    // Grand total row
    const gtRow = ws.addRow(["GRAND TOTAL", "", "", "", "", "", totals.qty, "", totals.taxable, totals.tax, totals.total]);
    ws.mergeCells(`A${gtRow.number}:F${gtRow.number}`);
    gtRow.eachCell((cell, col) => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
      if (col >= 7) {
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
    });
    gtRow.height = 18;

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-order-report-${effectiveDateFrom}-to-${effectiveDateTo}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const loading = isLoading || isFetching;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileBarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sales Order Report</h1>
            <p className="text-sm text-muted-foreground">Day × Customer × SKU breakdown</p>
          </div>
        </div>
        {generated && rows.length > 0 && (
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Select criteria and click Generate Report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter Mode */}
            <div className="space-y-1 lg:col-span-4">
              <Label>Date Filter Mode</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filterMode === "range" ? "default" : "outline"}
                  onClick={() => setFilterMode("range")}
                >Between Dates</Button>
                <Button
                  size="sm"
                  variant={filterMode === "month" ? "default" : "outline"}
                  onClick={() => setFilterMode("month")}
                >By Month</Button>
              </div>
            </div>

            {filterMode === "range" ? (
              <>
                <div className="space-y-1">
                  <Label>From Date</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>To Date</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label>Month</Label>
                <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
              </div>
            )}

            <div className="space-y-1">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="All Customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {vendors.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Product / SKU</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="All Products" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.sku ? `${p.sku} – ` : ""}{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="partially_invoiced">Partially Invoiced</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Generate Report
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <X className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      {generated && !loading && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Orders (lines)", value: rows.length.toString() },
            { label: "Total Quantity", value: totals.qty.toLocaleString("en-IN") },
            { label: "Taxable Amount", value: `₹${fmt(totals.taxable)}` },
            { label: "Total Amount", value: `₹${fmt(totals.total)}` },
          ].map(kpi => (
            <Card key={kpi.label} className="text-center py-3">
              <div className="text-xl font-bold text-primary">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      {generated && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Generating report…
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No records found for the selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">SO Number</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold">Product</th>
                      <th className="px-4 py-3 text-right font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Taxable Amt</th>
                      <th className="px-4 py-3 text-right font-semibold">Tax</th>
                      <th className="px-4 py-3 text-right font-semibold">Total Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).map(([date, byBuyer]) => (
                      Object.entries(byBuyer).map(([buyer, items], buyerIdx) => (
                        items.map((row, rowIdx) => {
                          const isFirstOfDay = buyerIdx === 0 && rowIdx === 0;
                          const isFirstOfBuyer = rowIdx === 0;
                          return (
                            <tr key={`${row.soNumber}-${row.sku}`} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2 text-muted-foreground">
                                {isFirstOfDay ? <span className="font-semibold text-foreground">{format(new Date(date), "dd MMM yyyy")}</span> : ""}
                              </td>
                              <td className="px-4 py-2 font-mono text-xs">{row.soNumber}</td>
                              <td className="px-4 py-2">{isFirstOfBuyer ? buyer : ""}</td>
                              <td className="px-4 py-2">
                                <Badge variant={(STATUS_COLORS[row.status] || "secondary") as any} className="text-xs">
                                  {STATUS_LABELS[row.status] || row.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">{row.sku}</td>
                              <td className="px-4 py-2">{row.productName}</td>
                              <td className="px-4 py-2 text-right">{row.quantity.toLocaleString("en-IN")}</td>
                              <td className="px-4 py-2 text-right">₹{fmt(row.unitPrice)}</td>
                              <td className="px-4 py-2 text-right">₹{fmt(row.taxableAmount)}</td>
                              <td className="px-4 py-2 text-right">₹{fmt(row.taxAmount)}</td>
                              <td className="px-4 py-2 text-right font-medium">₹{fmt(row.totalAmount)}</td>
                            </tr>
                          );
                        })
                      ))
                    ))}
                    {/* Grand Total */}
                    <tr className="bg-muted/80 border-t-2 font-semibold">
                      <td colSpan={6} className="px-4 py-3 text-right">Grand Total</td>
                      <td className="px-4 py-3 text-right">{totals.qty.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right">₹{fmt(totals.taxable)}</td>
                      <td className="px-4 py-3 text-right">₹{fmt(totals.tax)}</td>
                      <td className="px-4 py-3 text-right">₹{fmt(totals.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

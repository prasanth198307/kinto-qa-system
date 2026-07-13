import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Users, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { downloadXLSX } from "@/lib/download-utils";
import { format } from "date-fns";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface VendorType {
  id: string;
  code: string;
  name: string;
}

interface VendorReportRow {
  id: string;
  vendorName: string;
  vendorCode: string;
  city: string;
  state: string;
  gstNumber: string;
  mobileNumber: string;
  email: string;
  contactPerson: string;
  vendorTypeNames: string;
  invoiceCount: number;
  totalInvoiceAmount: number;
  totalAmountReceived: number;
  totalCreditNotes: number;
  outstanding: number;
}

interface VendorReportData {
  vendors: VendorReportRow[];
}

export default function VendorReport() {
  const tenantConfig = useTenantConfig();
  const fmt = (paise: number) => fmtCur(paise / 100, tenantConfig);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");

  // Fetch vendor types from dedicated endpoint (always works independently)
  const { data: vendorTypes = [] } = useQuery<VendorType[]>({
    queryKey: ["/api/vendor-types"],
  });

  const { data, isLoading, refetch, isFetching, error } = useQuery<VendorReportData>({
    queryKey: ["/api/reports/vendor-report", selectedTypeId],
    queryFn: async () => {
      const url =
        selectedTypeId && selectedTypeId !== "all"
          ? `/api/reports/vendor-report?vendorTypeId=${selectedTypeId}`
          : `/api/reports/vendor-report`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vendor report");
      return res.json();
    },
  });

  const rows = data?.vendors || [];

  // Totals
  const totals = rows.reduce(
    (acc, r) => ({
      invoiceCount: acc.invoiceCount + r.invoiceCount,
      totalInvoiceAmount: acc.totalInvoiceAmount + r.totalInvoiceAmount,
      totalAmountReceived: acc.totalAmountReceived + r.totalAmountReceived,
      totalCreditNotes: acc.totalCreditNotes + r.totalCreditNotes,
      outstanding: acc.outstanding + r.outstanding,
    }),
    { invoiceCount: 0, totalInvoiceAmount: 0, totalAmountReceived: 0, totalCreditNotes: 0, outstanding: 0 }
  );

  const handleDownload = async () => {
    const XLSX = await import("xlsx");

    const selectedTypeName =
      selectedTypeId === "all"
        ? "All Types"
        : vendorTypes.find((t) => t.id === selectedTypeId)?.name || "Report";

    // Sheet data
    const sheetData = rows.map((r, i) => ({
      "Sr No": i + 1,
      "Vendor Name": r.vendorName,
      "Vendor Code": r.vendorCode,
      City: r.city,
      State: r.state,
      GSTIN: r.gstNumber,
      Mobile: r.mobileNumber,
      Email: r.email,
      "Contact Person": r.contactPerson,
      "Vendor Types": r.vendorTypeNames,
      "Invoice Count": r.invoiceCount,
      "Invoice Amount": parseFloat((r.totalInvoiceAmount / 100).toFixed(2)),
      "Amount Received": parseFloat((r.totalAmountReceived / 100).toFixed(2)),
      "Credit Notes": parseFloat((r.totalCreditNotes / 100).toFixed(2)),
      "Outstanding": parseFloat((r.outstanding / 100).toFixed(2)),
    }));

    // Add totals row
    sheetData.push({
      "Sr No": "" as any,
      "Vendor Name": "TOTAL",
      "Vendor Code": "",
      City: "",
      State: "",
      GSTIN: "",
      Mobile: "",
      Email: "",
      "Contact Person": "",
      "Vendor Types": "",
      "Invoice Count": totals.invoiceCount,
      "Invoice Amount": parseFloat((totals.totalInvoiceAmount / 100).toFixed(2)),
      "Amount Received": parseFloat((totals.totalAmountReceived / 100).toFixed(2)),
      "Credit Notes": parseFloat((totals.totalCreditNotes / 100).toFixed(2)),
      "Outstanding": parseFloat((totals.outstanding / 100).toFixed(2)),
    });

    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Column widths
    ws["!cols"] = [
      { wch: 6 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 18 },
      { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Report");

    const filename = `Vendor_Report_${selectedTypeName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    await downloadXLSX(wb, filename);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Vendor Report</CardTitle>
              <CardDescription>
                Sales summary per vendor, filtered by brand/type
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger className="w-44" data-testid="select-vendor-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vendorTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id} data-testid={`vendor-type-${t.code}`}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="default"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh-vendor-report"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="default"
                size="default"
                onClick={handleDownload}
                disabled={rows.length === 0}
                data-testid="button-download-vendor-report"
              >
                <Download className="w-4 h-4 mr-1" />
                Download Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Vendors</span>
              </div>
              <div className="text-xl font-bold">{rows.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Invoiced</span>
              </div>
              <div className="text-xl font-bold">{fmt(totals.totalInvoiceAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Received</span>
              </div>
              <div className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(totals.totalAmountReceived)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-muted-foreground">Outstanding</span>
              </div>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{fmt(totals.outstanding)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading vendor report...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-destructive text-sm gap-2">
              <AlertCircle className="w-8 h-8 opacity-50" />
              <span>Failed to load report. Please refresh.</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Users className="w-8 h-8 opacity-30" />
              <span>No vendors found for the selected type.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>City / State</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Types</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Invoice Amt</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Credit Notes</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={row.id} data-testid={`vendor-report-row-${row.id}`}>
                      <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.vendorName}</div>
                        {row.contactPerson && (
                          <div className="text-xs text-muted-foreground">{row.contactPerson}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.vendorCode || "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">{row.city || "-"}</div>
                        {row.state && <div className="text-xs text-muted-foreground">{row.state}</div>}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{row.gstNumber || "-"}</TableCell>
                      <TableCell>
                        <div className="text-xs">{row.mobileNumber || "-"}</div>
                        {row.email && <div className="text-xs text-muted-foreground truncate max-w-[140px]">{row.email}</div>}
                      </TableCell>
                      <TableCell>
                        {row.vendorTypeNames ? (
                          <div className="flex flex-wrap gap-1">
                            {row.vendorTypeNames.split(", ").map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{row.invoiceCount}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(row.totalInvoiceAmount)}</TableCell>
                      <TableCell className="text-right text-sm text-green-700 dark:text-green-400">{fmt(row.totalAmountReceived)}</TableCell>
                      <TableCell className="text-right text-sm text-blue-700 dark:text-blue-400">{fmt(row.totalCreditNotes)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {row.outstanding > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400">{fmt(row.outstanding)}</span>
                        ) : (
                          <span className="text-green-700 dark:text-green-400">Nil</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={7} className="text-right text-sm">
                      Total ({rows.length} vendors)
                    </TableCell>
                    <TableCell className="text-right text-sm">{totals.invoiceCount}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(totals.totalInvoiceAmount)}</TableCell>
                    <TableCell className="text-right text-sm text-green-700 dark:text-green-400">{fmt(totals.totalAmountReceived)}</TableCell>
                    <TableCell className="text-right text-sm text-blue-700 dark:text-blue-400">{fmt(totals.totalCreditNotes)}</TableCell>
                    <TableCell className="text-right text-sm text-amber-700 dark:text-amber-400">{fmt(totals.outstanding)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

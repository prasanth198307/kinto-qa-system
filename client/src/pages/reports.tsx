import { useState, useEffect, useMemo } from "react";
import VendorReport from "@/components/VendorReport";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FileText, Package, Receipt, ShoppingCart, Wrench, Filter, FileCheck2, Download, Wallet, Banknote, CreditCard, Check, ChevronsUpDown, Boxes, Settings, Trash2, Undo2, RefreshCw, Users, Factory, Info } from "lucide-react";
import { downloadXLSX } from "@/lib/download-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Gatepass, Invoice, RawMaterialIssuance, PurchaseOrder, PMExecution, InvoicePayment } from "@shared/schema";
import { DataTablePagination } from "@/components/DataTablePagination";
import PrintableGatepass from "@/components/PrintableGatepass";
import PrintableInvoice from "@/components/PrintableInvoice";
import PrintableRawMaterialIssuance from "@/components/PrintableRawMaterialIssuance";
import PrintablePurchaseOrder from "@/components/PrintablePurchaseOrder";
import PrintablePMExecution from "@/components/PrintablePMExecution";
import {
  generateGSTR1,
  generateGSTR3B,
  exportGSTReportAsJSON,
  exportGSTR1AsExcel,
  exportGSTR3BAsExcel,
  filterInvoicesByPeriod,
  getPeriodString,
  fetchGSTReportData,
  type GSTReportType,
  type PeriodType,
} from "@/lib/gst-reports";
import {
  fetchExpenseReport,
  fetchCashRegisterReport,
  exportExpenseReportAsExcel,
  exportCashRegisterReportAsExcel,
  type ExpenseReportData,
  type CashRegisterReportData,
} from "@/lib/expense-cash-reports";
import { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from "@/lib/excel-export";
import { Badge } from "@/components/ui/badge";

const safeFormat = (val: any, fmt: string, fallback = '-'): string => {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return format(d, fmt);
};

interface FinishedGoodItem {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  productionDate: string;
  quantity: number;
  qualityStatus: string;
  storageLocation: string | null;
}

interface FGProductGroup {
  productId: string;
  productName: string;
  items: FinishedGoodItem[];
  subtotal: number;
}

interface FGReportSummary {
  totalProducts: number;
  totalBatches: number;
  grandTotal: number;
  byQualityStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface FGReportResponse {
  groupedData: FGProductGroup[];
  summary: FGReportSummary;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    productId?: string;
    qualityStatus?: string;
  };
}

function FinishedGoodsReportContent() {
  const [fgDateFrom, setFgDateFrom] = useState("");
  const [fgDateTo, setFgDateTo] = useState("");
  const [fgSelectedProduct, setFgSelectedProduct] = useState("all");
  const [fgSelectedQualityStatus, setFgSelectedQualityStatus] = useState("all");
  const [fgReportGenerated, setFgReportGenerated] = useState(false);

  const { data: fgProducts = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const fgQueryParams: Record<string, string> = {};
  if (fgDateFrom) fgQueryParams.dateFrom = fgDateFrom;
  if (fgDateTo) fgQueryParams.dateTo = fgDateTo;
  if (fgSelectedProduct && fgSelectedProduct !== 'all') fgQueryParams.productId = fgSelectedProduct;
  if (fgSelectedQualityStatus && fgSelectedQualityStatus !== 'all') fgQueryParams.qualityStatus = fgSelectedQualityStatus;

  const { data: fgReportResponse, isLoading: fgIsLoading, refetch: fgRefetch, isFetching: fgIsFetching } = useQuery<FGReportResponse>({
    queryKey: ['/api/reports/finished-goods', fgQueryParams],
    enabled: false,
  });

  const fgGroupedData = fgReportResponse?.groupedData || [];
  const fgSummary = fgReportResponse?.summary;

  const handleFgGenerateReport = () => {
    fgRefetch();
    setFgReportGenerated(true);
  };

  const handleFgExportExcel = async () => {
    if (fgGroupedData.length === 0) return;

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    const excelData: any[][] = [
      ['Finished Goods Inventory Report'],
      ['Generated:', format(new Date(), 'dd MMM yyyy HH:mm')],
      [''],
      ['Summary'],
      ['Total Products:', fgSummary?.totalProducts || 0],
      ['Total Batches:', fgSummary?.totalBatches || 0],
      ['Grand Total Quantity:', fgSummary?.grandTotal || 0],
      [''],
    ];

    fgGroupedData.forEach(group => {
      excelData.push(
        [`Product: ${group.productName}`],
        ['Batch Number', 'Production Date', 'Quantity', 'Quality Status', 'Storage Location']
      );

      group.items.forEach(item => {
        excelData.push([
          item.batchNumber,
          safeFormat(item.productionDate, 'dd MMM yyyy'),
          item.quantity,
          item.qualityStatus,
          item.storageLocation || '-'
        ]);
      });

      excelData.push(
        ['', '', `Subtotal: ${group.subtotal}`, '', ''],
        ['']
      );
    });

    excelData.push(['', '', `GRAND TOTAL: ${fgSummary?.grandTotal || 0}`, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Finished Goods Report');

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    await downloadXLSX(wb, `finished-goods-report-${dateStr}.xlsx`);
  };

  const handleFgExportPDF = async () => {
    if (fgGroupedData.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download PDF");
      return;
    }

    const filterInfo = [];
    if (fgDateFrom) filterInfo.push(`From: ${safeFormat(fgDateFrom, 'dd MMM yyyy')}`);
    if (fgDateTo) filterInfo.push(`To: ${safeFormat(fgDateTo, 'dd MMM yyyy')}`);
    if (fgSelectedProduct !== 'all') {
      const product = fgProducts.find((p: any) => p.id === fgSelectedProduct);
      if (product) filterInfo.push(`Product: ${product.productName}`);
    }
    if (fgSelectedQualityStatus !== 'all') filterInfo.push(`Status: ${fgSelectedQualityStatus}`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Finished Goods Inventory Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 11px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-card { padding: 10px; border: 1px solid #ddd; border-radius: 4px; flex: 1; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; }
          .summary-card .value { font-size: 16px; font-weight: bold; }
          .product-group { margin-bottom: 20px; break-inside: avoid; }
          .product-header { background: #f0f0f0; padding: 8px 12px; font-weight: bold; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f9f9f9; font-weight: 600; }
          .text-right { text-align: right; }
          .grand-total { background: #333; color: white; padding: 10px; text-align: right; font-size: 14px; font-weight: bold; margin-top: 20px; }
          @media print { body { padding: 10px; } .product-group { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Finished Goods Inventory Report</h1>
          <p>Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
        ${filterInfo.length > 0 ? `<div style="margin-bottom:15px;padding:8px;background:#f5f5f5;border-radius:4px;"><strong>Filters:</strong> ${filterInfo.join(' | ')}</div>` : ''}
        <div class="summary">
          ${fgSummary?.totalProducts ? `<div class="summary-card"><div class="label">Total Products</div><div class="value">${fgSummary.totalProducts}</div></div>` : ''}
          ${fgSummary?.totalBatches ? `<div class="summary-card"><div class="label">Total Batches</div><div class="value">${fgSummary.totalBatches}</div></div>` : ''}
          ${fgSummary?.grandTotal ? `<div class="summary-card"><div class="label">Grand Total</div><div class="value">${fgSummary.grandTotal.toLocaleString()}</div></div>` : ''}
        </div>
        ${fgGroupedData.map(group => `
          <div class="product-group">
            <div class="product-header"><span>${group.productName}</span><span>Subtotal: ${group.subtotal.toLocaleString()}</span></div>
            <table>
              <thead><tr><th>Batch Number</th><th>Production Date</th><th class="text-right">Quantity</th><th>Quality Status</th><th>Storage Location</th></tr></thead>
              <tbody>
                ${group.items.map(item => `
                  <tr>
                    <td style="font-family: monospace;">${item.batchNumber}</td>
                    <td>${safeFormat(item.productionDate, 'dd MMM yyyy')}</td>
                    <td class="text-right">${item.quantity.toLocaleString()}</td>
                    <td>${item.qualityStatus.charAt(0).toUpperCase() + item.qualityStatus.slice(1)}</td>
                    <td>${item.storageLocation || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
        <div class="grand-total">Grand Total: ${(fgSummary?.grandTotal || 0).toLocaleString()}</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getFgQualityStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Finished Goods Inventory</CardTitle>
          <CardDescription>Product-wise inventory with batch details and subtotals</CardDescription>
        </div>
        <div className="flex gap-2">
          {fgReportGenerated && fgGroupedData.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleFgExportExcel} data-testid="button-fg-export-excel">
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleFgExportPDF} data-testid="button-fg-export-pdf">
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Production Date From</Label>
            <Input type="date" value={fgDateFrom} onChange={(e) => setFgDateFrom(e.target.value)} data-testid="input-fg-date-from" />
          </div>
          <div className="space-y-2">
            <Label>Production Date To</Label>
            <Input type="date" value={fgDateTo} onChange={(e) => setFgDateTo(e.target.value)} data-testid="input-fg-date-to" />
          </div>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={fgSelectedProduct} onValueChange={setFgSelectedProduct}>
              <SelectTrigger data-testid="select-fg-product"><SelectValue placeholder="All Products" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {fgProducts.map((product: any) => (
                  <SelectItem key={product.id} value={product.id}>{product.productName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quality Status</Label>
            <Select value={fgSelectedQualityStatus} onValueChange={setFgSelectedQualityStatus}>
              <SelectTrigger data-testid="select-fg-quality-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex items-end">
            <Button onClick={handleFgGenerateReport} disabled={fgIsLoading || fgIsFetching} className="w-full" data-testid="button-fg-generate">
              {fgIsLoading || fgIsFetching ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>
        </div>

        {fgReportGenerated && fgSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fgSummary.totalProducts > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">{fgSummary.totalProducts}</p>
              </div>
            )}
            {fgSummary.totalBatches > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Batches</p>
                <p className="text-2xl font-bold">{fgSummary.totalBatches}</p>
              </div>
            )}
            {fgSummary.byQualityStatus.approved > 0 && (
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Approved Qty</p>
                <p className="text-2xl font-bold text-green-600">{fgSummary.byQualityStatus.approved.toLocaleString()}</p>
              </div>
            )}
            {fgSummary.grandTotal > 0 && (
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-2xl font-bold">{fgSummary.grandTotal.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {fgReportGenerated && (
          <>
            {fgIsLoading || fgIsFetching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : fgGroupedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No finished goods found matching the selected criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {fgGroupedData.map((group) => (
                  <div key={group.productId} className="border rounded-lg overflow-hidden" data-testid={`fg-product-group-${group.productId}`}>
                    <div className="bg-muted px-4 py-2 flex items-center justify-between">
                      <span className="font-semibold">{group.productName}</span>
                      <Badge variant="outline">Subtotal: {group.subtotal.toLocaleString()}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch Number</TableHead>
                          <TableHead>Production Date</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Quality Status</TableHead>
                          <TableHead>Storage Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.batchNumber}</TableCell>
                            <TableCell>{safeFormat(item.productionDate, 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right font-semibold">{item.quantity.toLocaleString()}</TableCell>
                            <TableCell>{getFgQualityStatusBadge(item.qualityStatus)}</TableCell>
                            <TableCell className="text-muted-foreground">{item.storageLocation || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                <div className="border-t-2 border-primary pt-4">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg">
                      <span className="text-lg font-bold">Grand Total: {fgSummary?.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface MonthlySalesProduct {
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  invoiceCount: number;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  products: MonthlySalesProduct[];
  totalQuantity: number;
  totalAmount: number;
  invoiceCount: number;
}

interface MonthlySalesResponse {
  months: MonthlyData[];
  summary: {
    totalMonths: number;
    totalQuantity: number;
    totalAmount: number;
    totalInvoices: number;
    uniqueProducts: number;
  };
  filters: {
    year: number;
    month: number | null;
    startDate: string;
    endDate: string;
  };
}

function MonthlySalesReportContent() {
  const currentYear = new Date().getFullYear();
  const currentFY = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  
  const [msPeriodType, setMsPeriodType] = useState<string>("financial_year");
  const [msYear, setMsYear] = useState(currentFY);
  const [msMonth, setMsMonth] = useState<string>("all");
  const [msWeek, setMsWeek] = useState(1);
  const [msDateFrom, setMsDateFrom] = useState("");
  const [msDateTo, setMsDateTo] = useState("");
  const [msReportGenerated, setMsReportGenerated] = useState(false);

  // Calculate date range based on period type
  const getDateRange = () => {
    const today = new Date();
    if (msPeriodType === "weekly") {
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - (msWeek - 1) * 7);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      return {
        dateFrom: format(startDate, 'yyyy-MM-dd'),
        dateTo: format(endDate, 'yyyy-MM-dd')
      };
    } else if (msPeriodType === "monthly" && msMonth !== "all") {
      const year = msYear;
      const month = parseInt(msMonth);
      const lastDay = new Date(year, month, 0).getDate();
      return {
        dateFrom: `${year}-${String(month).padStart(2, '0')}-01`,
        dateTo: `${year}-${String(month).padStart(2, '0')}-${lastDay}`
      };
    } else if (msPeriodType === "custom" && msDateFrom && msDateTo) {
      return { dateFrom: msDateFrom, dateTo: msDateTo };
    }
    return null;
  };

  const msQueryParams: Record<string, string> = {};
  const dateRange = getDateRange();
  if (dateRange) {
    msQueryParams.dateFrom = dateRange.dateFrom;
    msQueryParams.dateTo = dateRange.dateTo;
  } else {
    msQueryParams.year = String(msYear);
    if (msPeriodType === "monthly" && msMonth !== 'all') msQueryParams.month = msMonth;
  }

  const { data: msReportResponse, isLoading: msIsLoading, refetch: msRefetch, isFetching: msIsFetching } = useQuery<MonthlySalesResponse>({
    queryKey: ['/api/reports/monthly-sales', msQueryParams],
    enabled: false,
  });

  const msMonths = msReportResponse?.months || [];
  const msSummary = msReportResponse?.summary;

  const handleMsGenerateReport = () => {
    msRefetch();
    setMsReportGenerated(true);
  };

  const handleMsExportExcel = async () => {
    if (msMonths.length === 0) return;

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    const excelData: any[][] = [
      ['Monthly Sales Report - Product-wise'],
      ['Generated:', format(new Date(), 'dd MMM yyyy HH:mm')],
      ['Financial Year:', `${msYear}-${msYear + 1}`],
      [''],
      ['Summary'],
      ['Total Invoices:', msSummary?.totalInvoices || 0],
      ['Total Quantity Sold:', msSummary?.totalQuantity || 0],
      ['Total Amount:', `₹${((msSummary?.totalAmount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Unique Products:', msSummary?.uniqueProducts || 0],
      [''],
    ];

    msMonths.forEach(month => {
      excelData.push(
        [`${month.monthLabel}`],
        ['Product Name', 'Quantity Sold', 'Amount (₹)', 'Invoice Count']
      );

      month.products.forEach(product => {
        excelData.push([
          product.productName,
          product.totalQuantity,
          (product.totalAmount / 100).toFixed(2),
          product.invoiceCount
        ]);
      });

      excelData.push(
        ['Month Total', month.totalQuantity, (month.totalAmount / 100).toFixed(2), month.invoiceCount],
        ['']
      );
    });

    excelData.push(['GRAND TOTAL', msSummary?.totalQuantity || 0, ((msSummary?.totalAmount || 0) / 100).toFixed(2), msSummary?.totalInvoices || 0]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Sales');

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    await downloadXLSX(wb, `monthly-sales-report-${msYear}-${dateStr}.xlsx`);
  };

  const handleMsExportPDF = async () => {
    if (msMonths.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download PDF");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Sales Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 11px; }
          .summary { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
          .summary-card { padding: 10px; border: 1px solid #ddd; border-radius: 4px; text-align: center; min-width: 120px; }
          .summary-card .label { font-size: 10px; color: #666; }
          .summary-card .value { font-size: 14px; font-weight: bold; }
          .month-section { margin-bottom: 20px; break-inside: avoid; }
          .month-header { background: #2563eb; color: white; padding: 8px 12px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f9f9f9; font-weight: 600; }
          .text-right { text-align: right; }
          .month-total { background: #f0f0f0; font-weight: bold; }
          .grand-total { background: #333; color: white; padding: 10px; text-align: right; font-size: 14px; font-weight: bold; margin-top: 20px; }
          @media print { body { padding: 10px; } .month-section { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Monthly Sales Report - Product-wise</h1>
          <p>Financial Year: ${msYear}-${msYear + 1} | Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
        <div class="summary">
          ${msSummary?.totalInvoices ? `<div class="summary-card"><div class="label">Total Invoices</div><div class="value">${msSummary.totalInvoices}</div></div>` : ''}
          ${msSummary?.totalQuantity ? `<div class="summary-card"><div class="label">Total Qty Sold</div><div class="value">${msSummary.totalQuantity.toLocaleString()}</div></div>` : ''}
          ${msSummary?.totalAmount ? `<div class="summary-card"><div class="label">Total Amount</div><div class="value">₹${(msSummary.totalAmount / 100).toLocaleString('en-IN')}</div></div>` : ''}
          ${msSummary?.uniqueProducts ? `<div class="summary-card"><div class="label">Products</div><div class="value">${msSummary.uniqueProducts}</div></div>` : ''}
        </div>
        ${msMonths.map(month => `
          <div class="month-section">
            <div class="month-header">${month.monthLabel}</div>
            <table>
              <thead><tr><th>Product Name</th><th class="text-right">Quantity</th><th class="text-right">Amount (₹)</th><th class="text-right">Invoices</th></tr></thead>
              <tbody>
                ${month.products.map(product => `
                  <tr>
                    <td>${product.productName}</td>
                    <td class="text-right">${product.totalQuantity.toLocaleString()}</td>
                    <td class="text-right">${(product.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td class="text-right">${product.invoiceCount}</td>
                  </tr>
                `).join('')}
                <tr class="month-total">
                  <td>Month Total</td>
                  <td class="text-right">${month.totalQuantity.toLocaleString()}</td>
                  <td class="text-right">${(month.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">${month.invoiceCount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `).join('')}
        <div class="grand-total">
          Grand Total: ${msSummary?.totalQuantity?.toLocaleString() || 0} units | ₹${((msSummary?.totalAmount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | ${msSummary?.totalInvoices || 0} invoices
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const fyOptions = [currentFY, currentFY - 1, currentFY - 2, currentFY - 3];
  const monthOptions = [
    { value: 'all', label: 'All Months (Full FY)' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Monthly Sales Report</CardTitle>
          <CardDescription>Product-wise sales breakdown by month</CardDescription>
        </div>
        <div className="flex gap-2">
          {msReportGenerated && msMonths.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleMsExportExcel} data-testid="button-ms-export-excel">
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleMsExportPDF} data-testid="button-ms-export-pdf">
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Period Type</Label>
            <Select value={msPeriodType} onValueChange={setMsPeriodType}>
              <SelectTrigger data-testid="select-ms-period-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="financial_year">Financial Year</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(msPeriodType === "financial_year" || msPeriodType === "monthly") && (
            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Select value={String(msYear)} onValueChange={(v) => setMsYear(Number(v))}>
                <SelectTrigger data-testid="select-ms-year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fyOptions.map(fy => (
                    <SelectItem key={fy} value={String(fy)}>{fy}-{fy + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {msPeriodType === "monthly" && (
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={msMonth} onValueChange={setMsMonth}>
                <SelectTrigger data-testid="select-ms-month"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {msPeriodType === "weekly" && (
            <div className="space-y-2">
              <Label>Week</Label>
              <Select value={String(msWeek)} onValueChange={(v) => setMsWeek(Number(v))}>
                <SelectTrigger data-testid="select-ms-week"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Current Week</SelectItem>
                  <SelectItem value="2">Last Week</SelectItem>
                  <SelectItem value="3">2 Weeks Ago</SelectItem>
                  <SelectItem value="4">3 Weeks Ago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {msPeriodType === "custom" && (
            <>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input type="date" value={msDateFrom} onChange={(e) => setMsDateFrom(e.target.value)} data-testid="input-ms-date-from" />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input type="date" value={msDateTo} onChange={(e) => setMsDateTo(e.target.value)} data-testid="input-ms-date-to" />
              </div>
            </>
          )}

          <div className="space-y-2 flex items-end">
            <Button onClick={handleMsGenerateReport} disabled={msIsLoading || msIsFetching || (msPeriodType === "custom" && (!msDateFrom || !msDateTo))} className="w-full" data-testid="button-ms-generate">
              {msIsLoading || msIsFetching ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>
        </div>

        {msReportGenerated && msSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {msSummary.totalInvoices > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Invoices</p>
                <p className="text-2xl font-bold">{msSummary.totalInvoices}</p>
              </div>
            )}
            {msSummary.totalQuantity > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Qty Sold</p>
                <p className="text-2xl font-bold">{msSummary.totalQuantity.toLocaleString()}</p>
              </div>
            )}
            {msSummary.totalAmount > 0 && (
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">₹{(msSummary.totalAmount / 100).toLocaleString('en-IN')}</p>
              </div>
            )}
            {msSummary.uniqueProducts > 0 && (
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">{msSummary.uniqueProducts}</p>
              </div>
            )}
          </div>
        )}

        {msReportGenerated && (
          <>
            {msIsLoading || msIsFetching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : msMonths.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sales data found for the selected period.
              </div>
            ) : (
              <div className="space-y-4">
                {msMonths.map((month) => (
                  <div key={month.month} className="border rounded-lg overflow-hidden" data-testid={`ms-month-${month.month}`}>
                    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
                      <span className="font-semibold">{month.monthLabel}</span>
                      <div className="flex gap-4 text-sm">
                        <span>{month.totalQuantity.toLocaleString()} units</span>
                        <span>₹{(month.totalAmount / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Amount (₹)</TableHead>
                          <TableHead className="text-right">Invoices</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {month.products.map((product, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell className="text-right">{product.totalQuantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right">₹{(product.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">{product.invoiceCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                <div className="border-t-2 border-primary pt-4">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg">
                      <span className="text-lg font-bold">
                        Grand Total: {msSummary?.totalQuantity?.toLocaleString()} units | ₹{((msSummary?.totalAmount || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ReportsProps {
  showHeader?: boolean;
}

export default function Reports({ showHeader = true }: ReportsProps = {}) {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const { canAccessScreen } = usePermissions();
  
  // Check individual report tab permissions - 100% database driven
  // If user has "reports" permission, they can see all tabs
  // Otherwise check individual report_* permissions
  const canAccessReportTab = (tabKey: string): boolean => {
    if (canAccessScreen('reports')) return true;
    return canAccessScreen(tabKey);
  };
  
  const tabPermissions = {
    gatepasses: canAccessReportTab('report_gatepasses'),
    invoices: canAccessReportTab('report_invoices'),
    issuances: canAccessReportTab('report_issuances'),
    'purchase-orders': canAccessReportTab('report_purchase_orders'),
    maintenance: canAccessReportTab('report_maintenance'),
    machines: canAccessReportTab('report_machines'),
    expenses: canAccessReportTab('report_expenses'),
    'cash-register': canAccessReportTab('report_cash_register'),
    'gst-reports': canAccessReportTab('report_gst'),
    payments: canAccessReportTab('report_payments'),
    'finished-goods': canAccessReportTab('report_finished_goods'),
    'monthly-sales': canAccessReportTab('report_monthly_sales'),
    'scrap': canAccessReportTab('report_scrap'),
    'sales-returns': canAccessReportTab('report_sales_returns'),
    'repacking': canAccessReportTab('report_repacking'),
    'vendor-report': canAccessReportTab('report_vendor_report'),
    'monthly-production': canAccessReportTab('report_monthly_production'),
  };
  
  // Find first accessible tab for default
  const getFirstAccessibleTab = () => {
    const tabs = ['gatepasses', 'invoices', 'issuances', 'purchase-orders', 'maintenance', 'machines', 'expenses', 'cash-register', 'gst-reports', 'payments', 'finished-goods', 'monthly-sales', 'scrap', 'sales-returns', 'repacking', 'vendor-report', 'monthly-production'];
    for (const tab of tabs) {
      if (tabPermissions[tab as keyof typeof tabPermissions]) return tab;
    }
    return 'gatepasses';
  };
  
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => getFirstAccessibleTab());
  
  // Pagination states for invoice tab
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(25);
  
  // GST Report States
  const [gstReportType, setGstReportType] = useState<GSTReportType>("GSTR1");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { data: tenantSettings } = useQuery<any>({ queryKey: ["/api/tenant/settings"] });
  const companyGSTIN: string = (tenantSettings?.gstNumber ?? "").toUpperCase();
  
  // Expense Report States
  const [expenseReportData, setExpenseReportData] = useState<ExpenseReportData | null>(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(false);
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [expensePayeeFilter, setExpensePayeeFilter] = useState("all");
  
  // Cash Register Report States
  const [cashRegisterReportData, setCashRegisterReportData] = useState<CashRegisterReportData | null>(null);
  const [cashRegisterReportLoading, setCashRegisterReportLoading] = useState(false);
  const [cashRegisterSalespersonFilter, setCashRegisterSalespersonFilter] = useState("all");
  const [cashRegisterStatusFilter, setCashRegisterStatusFilter] = useState("all");

  // Excel export states
  const [isExportingGatepasses, setIsExportingGatepasses] = useState(false);
  const [isExportingInvoices, setIsExportingInvoices] = useState(false);
  const [isExportingIssuances, setIsExportingIssuances] = useState(false);
  const [isExportingPOs, setIsExportingPOs] = useState(false);
  const [isExportingMaintenance, setIsExportingMaintenance] = useState(false);
  const [isExportingPayments, setIsExportingPayments] = useState(false);

  // Quick period selection for sales report
  const [salesPeriodType, setSalesPeriodType] = useState<string>("custom");
  const [salesMonth, setSalesMonth] = useState(new Date().getMonth() + 1);
  const [salesQuarter, setSalesQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [salesFY, setSalesFY] = useState(() => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  });

  // Gatepass-specific date filters (decoupled from global filters)
  const [gpDateFrom, setGpDateFrom] = useState("");
  const [gpDateTo, setGpDateTo] = useState("");
  const [gpPeriodType, setGpPeriodType] = useState<string>("custom");
  const [gpMonth, setGpMonth] = useState(new Date().getMonth() + 1);
  const [gpWeek, setGpWeek] = useState(1);
  const [gpFY, setGpFY] = useState(() => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  });

  // Payment-specific filters (decoupled from global filters)
  const [pmtDateFrom, setPmtDateFrom] = useState("");
  const [pmtDateTo, setPmtDateTo] = useState("");
  const [pmtPeriodType, setPmtPeriodType] = useState<string>("custom");
  const [pmtMonth, setPmtMonth] = useState(new Date().getMonth() + 1);
  const [pmtWeek, setPmtWeek] = useState(1);
  const [pmtFY, setPmtFY] = useState(() => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  });
  const [pmtCustomer, setPmtCustomer] = useState<string>("all");
  const [pmtCustomerPopoverOpen, setPmtCustomerPopoverOpen] = useState(false);

  // Helper function to calculate gatepass date range based on period values
  const calculateGpPeriodDates = (type: string, week: number, month: number, fy: number) => {
    const now = new Date();
    const year = now.getFullYear();
    
    if (type === "custom") {
      return null; // Keep existing dates for custom
    } else if (type === "weekly") {
      // Week selection: 1 = current week, 2 = last week, etc.
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset - ((week - 1) * 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: format(monday, 'yyyy-MM-dd'), to: format(sunday, 'yyyy-MM-dd') };
    } else if (type === "monthly") {
      const monthYear = month > now.getMonth() + 1 ? year - 1 : year;
      const startDate = new Date(monthYear, month - 1, 1);
      const endDate = new Date(monthYear, month, 0);
      return { from: format(startDate, 'yyyy-MM-dd'), to: format(endDate, 'yyyy-MM-dd') };
    } else if (type === "financial_year") {
      const startDate = new Date(fy, 3, 1); // April 1
      const endDate = new Date(fy + 1, 2, 31); // March 31
      return { from: format(startDate, 'yyyy-MM-dd'), to: format(endDate, 'yyyy-MM-dd') };
    }
    return null;
  };

  // Effect to recalculate gatepass dates when period type or values change
  useEffect(() => {
    const dates = calculateGpPeriodDates(gpPeriodType, gpWeek, gpMonth, gpFY);
    if (dates) {
      setGpDateFrom(dates.from);
      setGpDateTo(dates.to);
    }
  }, [gpPeriodType, gpWeek, gpMonth, gpFY]);

  // Effect to recalculate payment dates when period type or values change
  useEffect(() => {
    const dates = calculateGpPeriodDates(pmtPeriodType, pmtWeek, pmtMonth, pmtFY);
    if (dates) {
      setPmtDateFrom(dates.from);
      setPmtDateTo(dates.to);
    }
  }, [pmtPeriodType, pmtWeek, pmtMonth, pmtFY]);

  // Helper to set date range based on period selection
  const applyPeriodDates = (type: string) => {
    setSalesPeriodType(type);
    const now = new Date();
    const year = now.getFullYear();
    
    if (type === "custom") {
      // Keep existing dates
      return;
    } else if (type === "monthly") {
      const month = salesMonth;
      const monthYear = month > now.getMonth() + 1 ? year - 1 : year;
      const startDate = new Date(monthYear, month - 1, 1);
      const endDate = new Date(monthYear, month, 0);
      setDateFrom(format(startDate, 'yyyy-MM-dd'));
      setDateTo(format(endDate, 'yyyy-MM-dd'));
    } else if (type === "quarterly") {
      const quarter = salesQuarter;
      const qYear = salesFY;
      // Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
      const quarterStartMonth = quarter === 1 ? 3 : quarter === 2 ? 6 : quarter === 3 ? 9 : 0;
      const quarterYear = quarter === 4 ? qYear + 1 : qYear;
      const startDate = new Date(quarterYear, quarterStartMonth, 1);
      const endDate = new Date(quarterYear, quarterStartMonth + 3, 0);
      setDateFrom(format(startDate, 'yyyy-MM-dd'));
      setDateTo(format(endDate, 'yyyy-MM-dd'));
    } else if (type === "financial_year") {
      const fy = salesFY;
      const startDate = new Date(fy, 3, 1); // April 1
      const endDate = new Date(fy + 1, 2, 31); // March 31
      setDateFrom(format(startDate, 'yyyy-MM-dd'));
      setDateTo(format(endDate, 'yyyy-MM-dd'));
    }
  };

  // Generate financial year options (current + 2 previous)
  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const fyOptions = [currentFY, currentFY - 1, currentFY - 2];

  // Enhanced gatepass API for reports - includes batch codes and quantities
  // Uses server-side filtering for better performance
  interface EnhancedGatepass extends Gatepass {
    items: Array<{productName: string | null, batchNumber: string | null, quantity: number}>;
    batchSummary: string;
    totalQuantity: number;
  }
  
  // Build query URL with filter parameters for server-side filtering
  const gatepassQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (gpDateFrom) params.append('dateFrom', gpDateFrom);
    if (gpDateTo) params.append('dateTo', gpDateTo);
    if (selectedCustomer && selectedCustomer !== 'all') params.append('customer', selectedCustomer);
    const queryString = params.toString();
    return queryString ? `/api/gatepasses/report/enhanced?${queryString}` : '/api/gatepasses/report/enhanced';
  }, [gpDateFrom, gpDateTo, selectedCustomer]);
  
  const { data: gatepasses = [], isLoading: gatepassesLoading } = useQuery<EnhancedGatepass[]>({
    queryKey: ['/api/gatepasses/report/enhanced', gpDateFrom, gpDateTo, selectedCustomer],
    queryFn: async () => {
      const response = await fetch(gatepassQueryUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch gatepasses');
      return response.json();
    },
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: issuances = [], isLoading: issuancesLoading } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: purchaseOrders = [], isLoading: purchaseOrdersLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: pmExecutions = [], isLoading: pmExecutionsLoading } = useQuery<PMExecution[]>({
    queryKey: ['/api/pm-executions'],
  });

  // Machines query for machine reports
  const { data: machines = [], isLoading: machinesLoading } = useQuery<any[]>({
    queryKey: ['/api/machines'],
  });

  // Payments query - includes invoice info via history endpoint
  interface PaymentWithInvoice {
    id: string;
    invoiceId: string | null;
    paymentDate: string;
    amount: number;
    paymentMethod: string;
    referenceNumber: string | null;
    paymentType: string;
    bankName: string | null;
    remarks: string | null;
    cancelledAt: string | null;
    cancellationRemarks: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    vendorId: string | null;
    vendorName: string | null;
  }
  const { data: paymentsData = [], isLoading: paymentsLoading } = useQuery<PaymentWithInvoice[]>({
    queryKey: ['/api/invoice-payments/history'],
  });

  const isLoading = gatepassesLoading || invoicesLoading || issuancesLoading || purchaseOrdersLoading || pmExecutionsLoading || paymentsLoading || machinesLoading;

  // Extract unique customers from gatepasses and invoices - use Array.isArray for safety
  const uniqueCustomers = Array.from(new Set([
    ...(Array.isArray(gatepasses) ? gatepasses.map(g => g.customerName).filter(Boolean) : []),
    ...(Array.isArray(invoices) ? invoices.map(i => i.buyerName).filter(Boolean) : [])
  ])).sort();

  // Gatepasses are filtered server-side via API query params
  const filteredGatepasses = Array.isArray(gatepasses) ? gatepasses : [];

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.invoiceDate);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    // Customer filter
    if (selectedCustomer && selectedCustomer !== 'all') {
      if (item.buyerName !== selectedCustomer) return false;
    }
    return true;
  }) : [];

  const filteredIssuances = Array.isArray(issuances) ? issuances.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.issuanceDate);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  }) : [];

  const filteredPurchaseOrders = Array.isArray(purchaseOrders) ? purchaseOrders.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      if (!item.createdAt) return false;
      const date = new Date(item.createdAt);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  }) : [];

  const filteredPMExecutions = Array.isArray(pmExecutions) ? pmExecutions.filter(item => {
    // Date filter
    if (dateFrom || dateTo) {
      const date = new Date(item.completedAt);
      if (dateFrom && new Date(dateFrom) > date) return false;
      if (dateTo && new Date(dateTo) < date) return false;
    }
    return true;
  }) : [];

  // Filter payments by date and exclude cancelled
  // Extract unique buyers/vendors from payments for filter dropdown
  const uniquePaymentBuyers = Array.from(new Set(
    (Array.isArray(paymentsData) ? paymentsData : [])
      .map(p => p.vendorName)
      .filter(Boolean)
  )).sort() as string[];

  const filteredPayments = Array.isArray(paymentsData) ? paymentsData.filter(item => {
    // Exclude cancelled payments
    if (item.cancelledAt) return false;
    // Date filter using payment-specific filters
    if (pmtDateFrom || pmtDateTo) {
      const date = new Date(item.paymentDate);
      if (pmtDateFrom && new Date(pmtDateFrom) > date) return false;
      if (pmtDateTo && new Date(pmtDateTo) < date) return false;
    }
    // Customer/buyer filter
    if (pmtCustomer && pmtCustomer !== 'all') {
      if (item.vendorName !== pmtCustomer) return false;
    }
    return true;
  }) : [];

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCustomer("all");
  };
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setInvoicePage(1);
  }, [dateFrom, dateTo, selectedCustomer]);
  
  // Calculate paginated invoices with synchronous clamping
  const paginatedInvoicesData = useMemo(() => {
    const totalItems = filteredInvoices.length;
    const totalPages = Math.ceil(totalItems / invoicePageSize);
    
    // Normalize page synchronously: 0 for empty, clamp to [1,totalPages] for data
    const currentPage = totalPages === 0 ? 0 : Math.max(1, Math.min(invoicePage, totalPages));
    
    // For empty results, return empty data with page=0
    if (totalItems === 0) {
      return {
        paginatedInvoices: [],
        meta: {
          page: 0,
          pageSize: invoicePageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        currentPage,
      };
    }
    
    // Calculate slice using synchronized currentPage
    const startIndex = (currentPage - 1) * invoicePageSize;
    const endIndex = startIndex + invoicePageSize;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
    
    // Build metadata using synchronized currentPage
    const meta = {
      page: currentPage,
      pageSize: invoicePageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
    
    return { paginatedInvoices, meta, currentPage };
  }, [filteredInvoices, invoicePage, invoicePageSize]);
  
  // Persist normalized page back to state for next render
  useEffect(() => {
    if (paginatedInvoicesData.currentPage !== invoicePage) {
      setInvoicePage(paginatedInvoicesData.currentPage);
    }
  }, [paginatedInvoicesData.currentPage, invoicePage]);

  // Excel export handlers
  const handleExportGatepasses = async () => {
    if (filteredGatepasses.length === 0) return;
    setIsExportingGatepasses(true);
    try {
      const sheet = [
        ['Gatepass Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        gpDateFrom || gpDateTo ? ['Date Range', `${gpDateFrom || 'Start'} to ${gpDateTo || 'End'}`] : [''],
        [''],
        ['GP Number', 'Date', 'Customer', 'Driver Name', 'Driver Contact', 'Vehicle Number', 'Batch Codes & Qty', 'Total Qty', 'Status'],
        ...filteredGatepasses.map(g => [
          g.gatepassNumber,
          formatDateForExcel(g.gatepassDate),
          g.customerName || '-',
          g.driverName || '-',
          g.driverContact || '-',
          g.vehicleNumber || '-',
          g.batchSummary || '-',
          g.totalQuantity || 0,
          g.status || 'Generated'
        ])
      ];
      await exportToExcel({
        filename: `gatepasses-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [{ name: 'Gatepasses', data: sheet }],
      });
      toast({ title: 'Export Complete', description: 'Gatepasses exported to Excel' });
    } finally {
      setIsExportingGatepasses(false);
    }
  };

  const handleExportInvoices = async () => {
    if (filteredInvoices.length === 0) return;
    setIsExportingInvoices(true);
    try {
      // Fetch invoice items for all filtered invoices
      const invoiceItemsMap: Record<string, any[]> = {};
      await Promise.all(
        filteredInvoices.map(async (inv) => {
          try {
            const res = await fetch(`/api/invoice-items/${inv.id}`, { credentials: 'include' });
            if (res.ok) {
              invoiceItemsMap[inv.id] = await res.json();
            }
          } catch (e) {
            console.error(`Failed to fetch items for invoice ${inv.id}`);
          }
        })
      );

      // Summary sheet with invoice-level data
      const summarySheet = [
        ['Detailed Sales Report - Summary'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        dateFrom || dateTo ? ['Date Range', `${dateFrom || 'Start'} to ${dateTo || 'End'}`] : [''],
        [''],
        [
          'Invoice #', 'Date', 'Buyer Name', 'Buyer GSTIN/Aadhaar', 'Buyer Address', 
          'Buyer State', 'State Code', 'Contact', 'Total Amount', 'Amount Received', 
          'Balance Due', 'Status'
        ],
        ...filteredInvoices.map(inv => [
          inv.invoiceNumber,
          formatDateForExcel(inv.invoiceDate),
          inv.buyerName || '-',
          inv.buyerGstin || '-',
          inv.buyerAddress || '-',
          inv.buyerState || '-',
          inv.buyerStateCode || '-',
          inv.buyerContact || '-',
          formatCurrencyForExcel(inv.totalAmount),
          formatCurrencyForExcel(inv.amountReceived || 0),
          formatCurrencyForExcel((inv.totalAmount || 0) - (inv.amountReceived || 0)),
          inv.status || 'draft'
        ])
      ];

      // Add summary totals
      const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const totalReceived = filteredInvoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);
      summarySheet.push(['']);
      summarySheet.push(['', '', '', '', '', '', '', 'TOTAL:', formatCurrencyForExcel(totalAmount), formatCurrencyForExcel(totalReceived), formatCurrencyForExcel(totalAmount - totalReceived), '']);

      // Items sheet with line-item details
      const itemsSheet: (string | number)[][] = [
        ['Detailed Sales Report - Items Sold'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        [
          'Invoice #', 'Date', 'Buyer Name', 'Buyer GSTIN/Aadhaar', 'Buyer Address',
          'Product/Description', 'HSN Code', 'Quantity', 'Unit Price', 'Discount',
          'Taxable Value', 'CGST Rate', 'CGST Amt', 'SGST Rate', 'SGST Amt', 
          'IGST Rate', 'IGST Amt', 'Line Total'
        ]
      ];

      for (const inv of filteredInvoices) {
        const items = invoiceItemsMap[inv.id] || [];
        if (items.length === 0) {
          // Invoice with no items - just show invoice line
          itemsSheet.push([
            inv.invoiceNumber,
            formatDateForExcel(inv.invoiceDate),
            inv.buyerName || '-',
            inv.buyerGstin || '-',
            inv.buyerAddress || '-',
            '(No items)',
            '-', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
            formatCurrencyForExcel(inv.totalAmount)
          ]);
        } else {
          for (const item of items) {
            itemsSheet.push([
              inv.invoiceNumber,
              formatDateForExcel(inv.invoiceDate),
              inv.buyerName || '-',
              inv.buyerGstin || '-',
              inv.buyerAddress || '-',
              item.description || '-',
              item.hsnCode || item.sacCode || '-',
              item.quantity || 0,
              formatCurrencyForExcel(item.unitPrice || 0),
              formatCurrencyForExcel(item.discount || 0),
              formatCurrencyForExcel(item.taxableValue || 0),
              item.cgstRate ? `${(item.cgstRate / 100).toFixed(2)}%` : '0%',
              formatCurrencyForExcel(item.cgstAmount || 0),
              item.sgstRate ? `${(item.sgstRate / 100).toFixed(2)}%` : '0%',
              formatCurrencyForExcel(item.sgstAmount || 0),
              item.igstRate ? `${(item.igstRate / 100).toFixed(2)}%` : '0%',
              formatCurrencyForExcel(item.igstAmount || 0),
              formatCurrencyForExcel(item.totalAmount || 0)
            ]);
          }
        }
      }

      await exportToExcel({
        filename: `sales-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Summary', data: summarySheet },
          { name: 'Items Sold', data: itemsSheet }
        ],
      });
      toast({ title: 'Export Complete', description: 'Detailed sales report with items exported to Excel' });
    } finally {
      setIsExportingInvoices(false);
    }
  };

  const handleExportIssuances = async () => {
    if (filteredIssuances.length === 0) return;
    setIsExportingIssuances(true);
    try {
      const sheet = [
        ['Raw Material Issuance Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['Issuance #', 'Date', 'Issued To', 'Status'],
        ...filteredIssuances.map(iss => [
          iss.issuanceNumber,
          formatDateForExcel(iss.issuanceDate),
          iss.issuedTo || '-',
          'Issued'
        ])
      ];
      await exportToExcel({
        filename: `issuances-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [{ name: 'Issuances', data: sheet }],
      });
      toast({ title: 'Export Complete', description: 'Issuances exported to Excel' });
    } finally {
      setIsExportingIssuances(false);
    }
  };

  const handleExportPurchaseOrders = async () => {
    if (filteredPurchaseOrders.length === 0) return;
    setIsExportingPOs(true);
    try {
      const sheet = [
        ['Purchase Order Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['PO Number', 'Date', 'Vendor', 'Estimated Cost', 'Status'],
        ...filteredPurchaseOrders.map(po => [
          po.poNumber,
          po.createdAt ? formatDateForExcel(po.createdAt) : '-',
          po.supplier || '-',
          po.estimatedCost ? formatCurrencyForExcel(po.estimatedCost) : 0,
          po.status || 'draft'
        ])
      ];
      await exportToExcel({
        filename: `purchase-orders-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [{ name: 'Purchase Orders', data: sheet }],
      });
      toast({ title: 'Export Complete', description: 'Purchase orders exported to Excel' });
    } finally {
      setIsExportingPOs(false);
    }
  };

  const handleExportMaintenance = async () => {
    if (filteredPMExecutions.length === 0) return;
    setIsExportingMaintenance(true);
    try {
      const sheet = [
        ['Maintenance Execution Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['Execution Date', 'Machine ID', 'Plan ID', 'Status', 'Notes'],
        ...filteredPMExecutions.map(log => [
          safeFormat(log.completedAt, 'yyyy-MM-dd HH:mm'),
          log.machineId || '-',
          log.maintenancePlanId || '-',
          'Completed',
          log.remarks || '-'
        ])
      ];
      await exportToExcel({
        filename: `maintenance-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [{ name: 'Maintenance', data: sheet }],
      });
      toast({ title: 'Export Complete', description: 'Maintenance logs exported to Excel' });
    } finally {
      setIsExportingMaintenance(false);
    }
  };

  // Export payments to Excel
  const handleExportPayments = async () => {
    if (filteredPayments.length === 0) return;
    setIsExportingPayments(true);
    try {
      // Calculate totals
      const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const sheet = [
        ['Payments Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        dateFrom || dateTo ? ['Period', `${dateFrom || 'Start'} to ${dateTo || 'End'}`] : [],
        ['Total Payments', filteredPayments.length],
        ['Total Amount', formatCurrencyForExcel(totalAmount)],
        [''],
        ['Payment Date', 'Invoice No', 'Buyer', 'Amount (₹)', 'Payment Method', 'Payment Type', 'Reference No', 'Bank', 'Remarks'],
        ...filteredPayments.map(p => [
          formatDateForExcel(p.paymentDate),
          p.invoiceNumber || '-',
          p.vendorName || '-',
          formatCurrencyForExcel(p.amount),
          p.paymentMethod || '-',
          p.paymentType || '-',
          p.referenceNumber || '-',
          p.bankName || '-',
          p.remarks || '-'
        ])
      ].filter(row => row.length > 0);
      
      await exportToExcel({
        filename: `payments-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [{ name: 'Payments', data: sheet }],
      });
      toast({ title: 'Export Complete', description: 'Payments exported to Excel' });
    } finally {
      setIsExportingPayments(false);
    }
  };

  return (
    <>
      {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
      <div className={showHeader ? "p-4 mt-16 space-y-6" : "p-4 space-y-6"}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Access all your print reports and analytics</p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter reports by date range
            {(activeTab === 'gatepasses' || activeTab === 'invoices') && ' and customer'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 ${(activeTab === 'gatepasses' || activeTab === 'invoices') ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            {(activeTab === 'gatepasses' || activeTab === 'invoices') && (
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerPopoverOpen}
                      className="w-full justify-between"
                      data-testid="select-customer"
                    >
                      {selectedCustomer === "all" 
                        ? "All Customers" 
                        : selectedCustomer}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search customers..." data-testid="input-search-customer" />
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandList className="max-h-64 overflow-auto">
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedCustomer("all");
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedCustomer === "all" ? "opacity-100" : "opacity-0")} />
                            All Customers
                          </CommandItem>
                          {uniqueCustomers.map((customer) => (
                            <CommandItem
                              key={customer}
                              value={customer || ''}
                              onSelect={() => {
                                setSelectedCustomer(customer || '');
                                setCustomerPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedCustomer === customer ? "opacity-100" : "opacity-0")} />
                              {customer}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="gatepasses" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {tabPermissions.gatepasses && (
            <TabsTrigger value="gatepasses" data-testid="tab-gatepasses">
              <FileText className="w-4 h-4 mr-2" />
              Gatepasses
            </TabsTrigger>
          )}
          {tabPermissions.invoices && (
            <TabsTrigger value="invoices" data-testid="tab-invoices">
              <Receipt className="w-4 h-4 mr-2" />
              Invoices
            </TabsTrigger>
          )}
          {tabPermissions.issuances && (
            <TabsTrigger value="issuances" data-testid="tab-issuances">
              <Package className="w-4 h-4 mr-2" />
              Issuances
            </TabsTrigger>
          )}
          {tabPermissions['purchase-orders'] && (
            <TabsTrigger value="purchase-orders" data-testid="tab-purchase-orders">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Purchase Orders
            </TabsTrigger>
          )}
          {tabPermissions.maintenance && (
            <TabsTrigger value="maintenance" data-testid="tab-maintenance">
              <Wrench className="w-4 h-4 mr-2" />
              Maintenance
            </TabsTrigger>
          )}
          {tabPermissions.machines && (
            <TabsTrigger value="machines" data-testid="tab-machines">
              <Settings className="w-4 h-4 mr-2" />
              Machine Reports
            </TabsTrigger>
          )}
          {tabPermissions.expenses && (
            <TabsTrigger value="expenses" data-testid="tab-expenses">
              <Banknote className="w-4 h-4 mr-2" />
              Expenses
            </TabsTrigger>
          )}
          {tabPermissions['cash-register'] && (
            <TabsTrigger value="cash-register" data-testid="tab-cash-register">
              <Wallet className="w-4 h-4 mr-2" />
              Cash Register
            </TabsTrigger>
          )}
          {tabPermissions['gst-reports'] && (
            <TabsTrigger value="gst-reports" data-testid="tab-gst-reports">
              <FileCheck2 className="w-4 h-4 mr-2" />
              GST Reports
            </TabsTrigger>
          )}
          {tabPermissions.payments && (
            <TabsTrigger value="payments" data-testid="tab-payments">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
          )}
          {tabPermissions['finished-goods'] && (
            <TabsTrigger value="finished-goods" data-testid="tab-finished-goods">
              <Boxes className="w-4 h-4 mr-2" />
              Finished Goods
            </TabsTrigger>
          )}
          {tabPermissions['monthly-sales'] && (
            <TabsTrigger value="monthly-sales" data-testid="tab-monthly-sales">
              <Receipt className="w-4 h-4 mr-2" />
              Monthly Sales
            </TabsTrigger>
          )}
          {tabPermissions.scrap && (
            <TabsTrigger value="scrap" data-testid="tab-scrap">
              <Trash2 className="w-4 h-4 mr-2" />
              Scrap Report
            </TabsTrigger>
          )}
          {tabPermissions['sales-returns'] && (
            <TabsTrigger value="sales-returns" data-testid="tab-sales-returns">
              <Undo2 className="w-4 h-4 mr-2" />
              Sales Returns
            </TabsTrigger>
          )}
          {tabPermissions.repacking && (
            <TabsTrigger value="repacking" data-testid="tab-repacking">
              <RefreshCw className="w-4 h-4 mr-2" />
              Repacking
            </TabsTrigger>
          )}
          {tabPermissions['vendor-report'] && (
            <TabsTrigger value="vendor-report" data-testid="tab-vendor-report">
              <Users className="w-4 h-4 mr-2" />
              Vendor Report
            </TabsTrigger>
          )}
          {tabPermissions['monthly-production'] && (
            <TabsTrigger value="monthly-production" data-testid="tab-monthly-production">
              <Factory className="w-4 h-4 mr-2" />
              Monthly Production
            </TabsTrigger>
          )}
        </TabsList>

        {/* Gatepasses Tab */}
        <TabsContent value="gatepasses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Gatepass Reports</CardTitle>
                <CardDescription>
                  {filteredGatepasses.length} gatepass{filteredGatepasses.length !== 1 ? 'es' : ''} found
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportGatepasses}
                disabled={isExportingGatepasses || filteredGatepasses.length === 0}
                data-testid="button-export-gatepasses"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExportingGatepasses ? 'Exporting...' : 'Export Excel'}
              </Button>
            </CardHeader>
            
            {/* Quick Period Selection for Gatepasses */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Period Type</Label>
                  <Select value={gpPeriodType} onValueChange={setGpPeriodType}>
                    <SelectTrigger data-testid="select-gp-period-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="financial_year">Financial Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {gpPeriodType === "weekly" && (
                  <div>
                    <Label>Weeks Ago</Label>
                    <Select value={String(gpWeek)} onValueChange={(v) => setGpWeek(Number(v))}>
                      <SelectTrigger data-testid="select-gp-week">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Current Week</SelectItem>
                        <SelectItem value="2">Last Week</SelectItem>
                        <SelectItem value="3">2 Weeks Ago</SelectItem>
                        <SelectItem value="4">3 Weeks Ago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {gpPeriodType === "monthly" && (
                  <div>
                    <Label>Month</Label>
                    <Select value={String(gpMonth)} onValueChange={(v) => setGpMonth(Number(v))}>
                      <SelectTrigger data-testid="select-gp-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {gpPeriodType === "financial_year" && (
                  <div>
                    <Label>Financial Year</Label>
                    <Select value={String(gpFY)} onValueChange={(v) => setGpFY(Number(v))}>
                      <SelectTrigger data-testid="select-gp-fy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fyOptions.map(fy => (
                          <SelectItem key={fy} value={String(fy)}>FY {fy}-{(fy + 1).toString().slice(-2)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {gpPeriodType === "custom" && (
                  <>
                    <div>
                      <Label>From Date</Label>
                      <Input 
                        type="date" 
                        value={gpDateFrom} 
                        onChange={(e) => setGpDateFrom(e.target.value)}
                        data-testid="input-gp-date-from"
                      />
                    </div>
                    <div>
                      <Label>To Date</Label>
                      <Input 
                        type="date" 
                        value={gpDateTo} 
                        onChange={(e) => setGpDateTo(e.target.value)}
                        data-testid="input-gp-date-to"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <CardContent>
              {filteredGatepasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gatepasses found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>GP Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Batch Codes & Qty</TableHead>
                        <TableHead>Total Qty</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGatepasses.map((gatepass) => (
                        <TableRow key={gatepass.id}>
                          <TableCell className="font-medium">{gatepass.gatepassNumber}</TableCell>
                          <TableCell>{safeFormat(gatepass.gatepassDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{gatepass.customerName || '-'}</TableCell>
                          <TableCell>{gatepass.driverName || '-'}</TableCell>
                          <TableCell>{gatepass.driverContact || '-'}</TableCell>
                          <TableCell>{gatepass.vehicleNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={gatepass.batchSummary}>
                            {gatepass.batchSummary || '-'}
                          </TableCell>
                          <TableCell>{gatepass.totalQuantity || 0}</TableCell>
                          <TableCell>
                            <PrintableGatepass gatepass={gatepass} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Sales Report</CardTitle>
                  <CardDescription>
                    {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportInvoices}
                  disabled={isExportingInvoices || filteredInvoices.length === 0}
                  data-testid="button-export-invoices"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExportingInvoices ? 'Exporting...' : 'Export Excel'}
                </Button>
              </div>
              
              {/* Quick Period Selection */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Period Type</Label>
                  <Select value={salesPeriodType} onValueChange={(v) => applyPeriodDates(v)}>
                    <SelectTrigger data-testid="select-period-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="financial_year">Financial Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {salesPeriodType === "monthly" && (
                  <div>
                    <Label>Month</Label>
                    <Select value={String(salesMonth)} onValueChange={(v) => { setSalesMonth(Number(v)); setTimeout(() => applyPeriodDates("monthly"), 0); }}>
                      <SelectTrigger data-testid="select-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {salesPeriodType === "quarterly" && (
                  <>
                    <div>
                      <Label>Quarter</Label>
                      <Select value={String(salesQuarter)} onValueChange={(v) => { setSalesQuarter(Number(v)); setTimeout(() => applyPeriodDates("quarterly"), 0); }}>
                        <SelectTrigger data-testid="select-quarter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Q1 (Apr-Jun)</SelectItem>
                          <SelectItem value="2">Q2 (Jul-Sep)</SelectItem>
                          <SelectItem value="3">Q3 (Oct-Dec)</SelectItem>
                          <SelectItem value="4">Q4 (Jan-Mar)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Financial Year</Label>
                      <Select value={String(salesFY)} onValueChange={(v) => { setSalesFY(Number(v)); setTimeout(() => applyPeriodDates("quarterly"), 0); }}>
                        <SelectTrigger data-testid="select-fy-quarter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fyOptions.map(fy => (
                            <SelectItem key={fy} value={String(fy)}>FY {fy}-{(fy + 1).toString().slice(-2)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {salesPeriodType === "financial_year" && (
                  <div>
                    <Label>Financial Year</Label>
                    <Select value={String(salesFY)} onValueChange={(v) => { setSalesFY(Number(v)); setTimeout(() => applyPeriodDates("financial_year"), 0); }}>
                      <SelectTrigger data-testid="select-fy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fyOptions.map(fy => (
                          <SelectItem key={fy} value={String(fy)}>FY {fy}-{(fy + 1).toString().slice(-2)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(dateFrom || dateTo) && (
                  <div className="flex items-end">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Selected: </span>
                      {dateFrom || 'Start'} to {dateTo || 'End'}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices found. Try adjusting your filters.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Buyer Name</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoicesData.paginatedInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{safeFormat(invoice.invoiceDate, 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{invoice.buyerName}</TableCell>
                            <TableCell className="font-semibold">
                              ₹{(invoice.totalAmount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <PrintableInvoice invoice={invoice} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination Controls - only show when there are results */}
                  {paginatedInvoicesData.meta.totalItems > 0 && (
                    <div className="mt-4">
                      <DataTablePagination
                        meta={paginatedInvoicesData.meta}
                        onPageChange={setInvoicePage}
                        onPageSizeChange={(newSize) => {
                          setInvoicePageSize(newSize);
                          setInvoicePage(1); // Reset to first page
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Material Issuances Tab */}
        <TabsContent value="issuances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Raw Material Issuance Reports</CardTitle>
                <CardDescription>
                  {filteredIssuances.length} issuance{filteredIssuances.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportIssuances}
                disabled={isExportingIssuances || filteredIssuances.length === 0}
                data-testid="button-export-issuances"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExportingIssuances ? 'Exporting...' : 'Export Excel'}
              </Button>
            </CardHeader>
            <CardContent>
              {filteredIssuances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No issuances found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issuance #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Issued To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssuances.map((issuance) => (
                        <TableRow key={issuance.id}>
                          <TableCell className="font-medium">{issuance.issuanceNumber}</TableCell>
                          <TableCell>{safeFormat(issuance.issuanceDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{issuance.issuedTo || '-'}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Issued
                            </span>
                          </TableCell>
                          <TableCell>
                            <PrintableRawMaterialIssuance issuance={issuance} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Purchase Order Reports</CardTitle>
                <CardDescription>
                  {filteredPurchaseOrders.length} purchase order{filteredPurchaseOrders.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPurchaseOrders}
                disabled={isExportingPOs || filteredPurchaseOrders.length === 0}
                data-testid="button-export-purchase-orders"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExportingPOs ? 'Exporting...' : 'Export Excel'}
              </Button>
            </CardHeader>
            <CardContent>
              {filteredPurchaseOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No purchase orders found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchaseOrders.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">{po.poNumber}</TableCell>
                          <TableCell>
                            {safeFormat(po.createdAt, 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{po.supplier || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            {po.estimatedCost ? `₹${(po.estimatedCost / 100).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <PrintablePurchaseOrder po={po} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Maintenance Execution Reports</CardTitle>
                <CardDescription>
                  {filteredPMExecutions.length} execution log{filteredPMExecutions.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMaintenance}
                disabled={isExportingMaintenance || filteredPMExecutions.length === 0}
                data-testid="button-export-maintenance"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExportingMaintenance ? 'Exporting...' : 'Export Excel'}
              </Button>
            </CardHeader>
            <CardContent>
              {filteredPMExecutions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No maintenance logs found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Execution Date</TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPMExecutions.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {safeFormat(log.completedAt, 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{log.machineId || '-'}</TableCell>
                          <TableCell>{log.maintenancePlanId || '-'}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Completed
                            </span>
                          </TableCell>
                          <TableCell>
                            <PrintablePMExecution execution={log} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Machine Reports Tab */}
        <TabsContent value="machines">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Machine Reports</CardTitle>
                  <CardDescription>
                    Machine overview with checklists, PM schedules, and spare parts information
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!machines || machines.length === 0) return;
                    await exportToExcel({
                      filename: `machine-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
                      sheets: [
                        {
                          name: 'Machines',
                          data: [
                            ['Machine Name', 'Code', 'Type', 'Status', 'Location', 'Description', 'Spare Parts Count'],
                            ...machines.map((m: any) => [
                              m.name || '',
                              m.code || '',
                              m.type || '',
                              m.status || '',
                              m.location || '',
                              m.description || '',
                              m.sparePartCount || 0,
                            ]),
                          ],
                        },
                        {
                          name: 'Summary',
                          data: [
                            ['Metric', 'Count'],
                            ['Total Machines', machines.length],
                            ['Active', machines.filter((m: any) => m.status === 'active').length],
                            ['Under Maintenance', machines.filter((m: any) => m.status === 'maintenance').length],
                            ['Inactive', machines.filter((m: any) => m.status === 'inactive').length],
                          ],
                        },
                      ],
                    });
                  }}
                  disabled={!machines || machines.length === 0}
                  data-testid="button-download-machine-report"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Machine List */}
              {machinesLoading ? (
                <p className="text-muted-foreground text-center py-4">Loading machines...</p>
              ) : !machines || machines.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No machines found.</p>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Machines</p>
                        <p className="text-2xl font-bold">{machines.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-2xl font-bold text-green-600">
                          {machines.filter((m: any) => m.status === 'active').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Under Maintenance</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {machines.filter((m: any) => m.status === 'maintenance').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Inactive</p>
                        <p className="text-2xl font-bold text-muted-foreground">
                          {machines.filter((m: any) => m.status === 'inactive').length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Machine Details Table */}
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Machine Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Spare Parts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {machines.map((machine: any) => (
                          <TableRow key={machine.id}>
                            <TableCell className="font-medium">{machine.name}</TableCell>
                            <TableCell>{machine.code || '-'}</TableCell>
                            <TableCell>{machine.type || '-'}</TableCell>
                            <TableCell>
                              <span className={cn(
                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                machine.status === 'active' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                                machine.status === 'maintenance' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
                                machine.status === 'inactive' && "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                              )}>
                                {machine.status || 'unknown'}
                              </span>
                            </TableCell>
                            <TableCell>{machine.location || '-'}</TableCell>
                            <TableCell>
                              {machine.sparePartCount || 0} parts
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Report Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Expense Vouchers Report</CardTitle>
                  <CardDescription>
                    View and export expense vouchers with detailed line items
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setExpenseReportLoading(true);
                      try {
                        const data = await fetchExpenseReport(
                          dateFrom || undefined,
                          dateTo || undefined,
                          expenseStatusFilter !== 'all' ? expenseStatusFilter : undefined,
                          expensePayeeFilter !== 'all' ? expensePayeeFilter : undefined
                        );
                        setExpenseReportData(data);
                        toast({
                          title: "Report Generated",
                          description: `Found ${data.vouchers.length} vouchers`,
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to generate expense report",
                          variant: "destructive",
                        });
                      } finally {
                        setExpenseReportLoading(false);
                      }
                    }}
                    disabled={expenseReportLoading}
                    data-testid="button-generate-expense-report"
                  >
                    {expenseReportLoading ? 'Loading...' : 'Generate Report'}
                  </Button>
                  {expenseReportData && (
                    <Button
                      onClick={async () => {
                        try {
                          await exportExpenseReportAsExcel(expenseReportData);
                          toast({
                            title: "Export Complete",
                            description: "Excel file downloaded successfully",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to export Excel file",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-export-expense-excel"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={expenseStatusFilter} onValueChange={setExpenseStatusFilter}>
                    <SelectTrigger data-testid="select-expense-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payee Type</Label>
                  <Select value={expensePayeeFilter} onValueChange={setExpensePayeeFilter}>
                    <SelectTrigger data-testid="select-expense-payee">
                      <SelectValue placeholder="All Payees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payees</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Summary */}
              {expenseReportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Vouchers</div>
                      <div className="text-2xl font-bold">{expenseReportData.summary.totalVouchers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                      <div className="text-2xl font-bold">₹{(expenseReportData.summary.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total GST</div>
                      <div className="text-2xl font-bold">₹{(expenseReportData.summary.totalGST / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Approved</div>
                      <div className="text-2xl font-bold">{expenseReportData.summary.byStatus.approved || 0}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Vouchers Table */}
              {expenseReportData && expenseReportData.vouchers.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voucher No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payee</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead className="text-right">Amount (₹)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseReportData.vouchers.slice(0, 50).map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                          <TableCell>{safeFormat(voucher.voucherDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{voucher.payeeName}</TableCell>
                          <TableCell>{voucher.paymentMode}</TableCell>
                          <TableCell className="text-right">{(voucher.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              voucher.status === 'approved' ? 'bg-green-100 text-green-800' :
                              voucher.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                              voucher.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {voucher.status}
                            </span>
                          </TableCell>
                          <TableCell>{voucher.items?.length || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {expenseReportData.vouchers.length > 50 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Showing 50 of {expenseReportData.vouchers.length} vouchers. Download Excel for full report.
                    </div>
                  )}
                </div>
              )}
              
              {!expenseReportData && (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Generate Report" to view expense vouchers. Use date filters above for specific periods.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Register Report Tab */}
        <TabsContent value="cash-register">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Cash Register Report</CardTitle>
                  <CardDescription>
                    View daily cash flow, transactions, and expense details
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setCashRegisterReportLoading(true);
                      try {
                        const data = await fetchCashRegisterReport(
                          dateFrom || undefined,
                          dateTo || undefined,
                          cashRegisterSalespersonFilter !== 'all' ? cashRegisterSalespersonFilter : undefined,
                          cashRegisterStatusFilter !== 'all' ? cashRegisterStatusFilter : undefined
                        );
                        setCashRegisterReportData(data);
                        toast({
                          title: "Report Generated",
                          description: `Found ${data.days.length} days of data`,
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to generate cash register report",
                          variant: "destructive",
                        });
                      } finally {
                        setCashRegisterReportLoading(false);
                      }
                    }}
                    disabled={cashRegisterReportLoading}
                    data-testid="button-generate-cash-register-report"
                  >
                    {cashRegisterReportLoading ? 'Loading...' : 'Generate Report'}
                  </Button>
                  {cashRegisterReportData && (
                    <Button
                      onClick={async () => {
                        try {
                          await exportCashRegisterReportAsExcel(cashRegisterReportData);
                          toast({
                            title: "Export Complete",
                            description: "Excel file downloaded successfully",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to export Excel file",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-export-cash-register-excel"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={cashRegisterStatusFilter} onValueChange={setCashRegisterStatusFilter}>
                    <SelectTrigger data-testid="select-cash-register-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="reconciled">Reconciled</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Salesperson</Label>
                  <Select value={cashRegisterSalespersonFilter} onValueChange={setCashRegisterSalespersonFilter}>
                    <SelectTrigger data-testid="select-cash-register-salesperson">
                      <SelectValue placeholder="All Salespersons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Salespersons</SelectItem>
                      {cashRegisterReportData?.summary?.bySalesperson && 
                        Object.keys(cashRegisterReportData.summary.bySalesperson).map(sp => (
                          <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Summary */}
              {cashRegisterReportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Starting Balance</div>
                      <div className="text-xl font-bold">₹{(cashRegisterReportData.summary.startingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Cash Received</div>
                      <div className="text-xl font-bold text-green-600">₹{(cashRegisterReportData.summary.totalCashReceived / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Expenses</div>
                      <div className="text-xl font-bold text-red-600">₹{(cashRegisterReportData.summary.totalExpenses / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Total Transfers</div>
                      <div className="text-xl font-bold text-blue-600">₹{(cashRegisterReportData.summary.totalTransfers / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Ending Balance</div>
                      <div className="text-xl font-bold">₹{(cashRegisterReportData.summary.endingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Days</div>
                      <div className="text-xl font-bold">{cashRegisterReportData.summary.totalDays}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Days Table */}
              {cashRegisterReportData && cashRegisterReportData.days.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Salesperson</TableHead>
                        <TableHead className="text-right">Opening (₹)</TableHead>
                        <TableHead className="text-right">Cash Received (₹)</TableHead>
                        <TableHead className="text-right">Expenses (₹)</TableHead>
                        <TableHead className="text-right">Transfers (₹)</TableHead>
                        <TableHead className="text-right">Closing (₹)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashRegisterReportData.days.slice(0, 50).map((day) => (
                        <TableRow key={day.id}>
                          <TableCell className="font-medium">{safeFormat(day.registerDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{day.salespersonName}</TableCell>
                          <TableCell className="text-right">{(day.openingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-green-600">{(day.totalCashReceived / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-red-600">{(day.totalExpenses / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-blue-600">{(day.totalTransfers / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{(day.closingBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              day.status === 'reconciled' ? 'bg-green-100 text-green-800' :
                              day.status === 'locked' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {day.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {cashRegisterReportData.days.length > 50 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Showing 50 of {cashRegisterReportData.days.length} days. Download Excel for full report.
                    </div>
                  )}
                </div>
              )}
              
              {!cashRegisterReportData && (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Generate Report" to view cash register data. Use date filters above for specific periods.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Reports Tab */}
        <TabsContent value="gst-reports">
          <Card>
            <CardHeader>
              <CardTitle>GST Reports for Filing</CardTitle>
              <CardDescription>
                Generate GST-compliant reports in JSON and Excel formats for upload to GST portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="gst-report-type">Report Type</Label>
                  <Select value={gstReportType} onValueChange={(value) => setGstReportType(value as GSTReportType)}>
                    <SelectTrigger id="gst-report-type" data-testid="select-gst-report-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GSTR1">GSTR-1 (Outward Supplies)</SelectItem>
                      <SelectItem value="GSTR3B">GSTR-3B (Summary Return)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="period-type">Filing Period</Label>
                  <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                    <SelectTrigger id="period-type" data-testid="select-period-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gst-month">Month/Quarter</Label>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    disabled={periodType === 'annual'}
                  >
                    <SelectTrigger id="gst-month" data-testid="select-gst-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodType === 'monthly' ? (
                        <>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </>
                      ) : periodType === 'quarterly' ? (
                        <>
                          <SelectItem value="3">Q1 (Apr-Jun)</SelectItem>
                          <SelectItem value="6">Q2 (Jul-Sep)</SelectItem>
                          <SelectItem value="9">Q3 (Oct-Dec)</SelectItem>
                          <SelectItem value="12">Q4 (Jan-Mar)</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="12">Full Year</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gst-year">Financial Year</Label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger id="gst-year" data-testid="select-gst-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}-{(year + 1).toString().slice(-2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Report Information */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      {gstReportType === 'GSTR1' && 'GSTR-1: Outward Supplies'}
                      {gstReportType === 'GSTR3B' && 'GSTR-3B: Summary Return'}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {gstReportType === 'GSTR1' && 'Details of all outward supplies (sales), including B2B, B2CL (Large), B2CS (Small), and Exports classifications'}
                      {gstReportType === 'GSTR3B' && 'Monthly/Quarterly summary of outward taxable supplies with tax liability breakdown (CGST, SGST, IGST, Cess)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Notice for GSTR-1 */}
              {gstReportType === 'GSTR1' && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1">
                      <h5 className="font-semibold text-green-900 dark:text-green-100">Complete HSN Summary Included</h5>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        This report includes complete HSN-wise summaries with product-level details from invoice line items.
                        All HSN codes, quantities, UOM, taxable values, and tax breakdowns are aggregated from the invoice_items table.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={async () => {
                    try {
                      const period = getPeriodString(selectedMonth, selectedYear);
                      const reportData = await fetchGSTReportData(periodType, selectedMonth, selectedYear);
                      const invoicesFromReport = reportData.invoices.map(item => item.invoice);
                      
                      if (gstReportType === 'GSTR1') {
                        const report = generateGSTR1(
                          invoicesFromReport, 
                          period, 
                          companyGSTIN, 
                          reportData.hsnSummary,
                          reportData.creditNotes,
                          reportData.debitNotes
                        );
                        exportGSTReportAsJSON(report, 'GSTR1', period);
                      } else if (gstReportType === 'GSTR3B') {
                        const report = generateGSTR3B(invoicesFromReport, [], period, companyGSTIN, reportData.vendorDebitNotes);
                        exportGSTReportAsJSON(report, 'GSTR3B', period);
                      }
                    } catch (error) {
                      console.error('Failed to generate GST report:', error);
                      toast({
                        title: "Error",
                        description: "Failed to generate GST report. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex items-center gap-2"
                  data-testid="button-download-json"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const period = getPeriodString(selectedMonth, selectedYear);
                      const reportData = await fetchGSTReportData(periodType, selectedMonth, selectedYear);
                      const invoicesFromReport = reportData.invoices.map(item => item.invoice);
                      
                      if (gstReportType === 'GSTR1') {
                        const report = generateGSTR1(
                          invoicesFromReport, 
                          period, 
                          companyGSTIN, 
                          reportData.hsnSummary,
                          reportData.creditNotes,
                          reportData.debitNotes
                        );
                        await exportGSTR1AsExcel(report, period);
                      } else if (gstReportType === 'GSTR3B') {
                        const report = generateGSTR3B(invoicesFromReport, [], period, companyGSTIN, reportData.vendorDebitNotes);
                        await exportGSTR3BAsExcel(report, period);
                      }
                    } catch (error) {
                      console.error('Failed to generate GST report:', error);
                      toast({
                        title: "Error",
                        description: "Failed to generate GST report. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-download-excel"
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </Button>
              </div>

              {/* Report Preview */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-semibold mb-3">Report Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">GSTIN:</span>
                    <span className="ml-2 font-mono">{companyGSTIN}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <span className="ml-2">{getPeriodString(selectedMonth, selectedYear)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Invoices in Period:</span>
                    <span className="ml-2 font-semibold">
                      {filterInvoicesByPeriod(invoices, selectedMonth, selectedYear, periodType).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Filing Period:</span>
                    <span className="ml-2 capitalize">{periodType}</span>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h5 className="font-semibold">Included in Reports:</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ B2B Invoices (with GSTIN)</li>
                    <li>✓ B2CL - B2C Large (above ₹2.5L)</li>
                    <li>✓ B2CS - B2C Small (below ₹2.5L)</li>
                    <li>✓ EXP - Export Invoices</li>
                    <li className="text-green-600">✓ HSN Summary (with line item details)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h5 className="font-semibold">Tax Calculations:</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ CGST + SGST (Intra-state)</li>
                    <li>✓ IGST (Inter-state)</li>
                    <li>✓ Taxable Value computation</li>
                    <li>✓ Auto-classification by state</li>
                    <li className="text-green-600">✓ HSN-wise aggregation with UOM</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Payments Received</CardTitle>
                <CardDescription>
                  {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
                  {filteredPayments.length > 0 && (
                    <span className="ml-2">
                      | Total: ₹{(filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPayments}
                disabled={isExportingPayments || filteredPayments.length === 0}
                data-testid="button-export-payments"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExportingPayments ? 'Exporting...' : 'Export Excel'}
              </Button>
            </CardHeader>
            
            {/* Quick Period Selection for Payments */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Period Type</Label>
                  <Select value={pmtPeriodType} onValueChange={setPmtPeriodType}>
                    <SelectTrigger data-testid="select-pmt-period-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="financial_year">Financial Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pmtPeriodType === "weekly" && (
                  <div>
                    <Label>Weeks Ago</Label>
                    <Select value={String(pmtWeek)} onValueChange={(v) => setPmtWeek(Number(v))}>
                      <SelectTrigger data-testid="select-pmt-week">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Current Week</SelectItem>
                        <SelectItem value="2">Last Week</SelectItem>
                        <SelectItem value="3">2 Weeks Ago</SelectItem>
                        <SelectItem value="4">3 Weeks Ago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {pmtPeriodType === "monthly" && (
                  <div>
                    <Label>Month</Label>
                    <Select value={String(pmtMonth)} onValueChange={(v) => setPmtMonth(Number(v))}>
                      <SelectTrigger data-testid="select-pmt-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {pmtPeriodType === "financial_year" && (
                  <div>
                    <Label>Financial Year</Label>
                    <Select value={String(pmtFY)} onValueChange={(v) => setPmtFY(Number(v))}>
                      <SelectTrigger data-testid="select-pmt-fy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fyOptions.map(fy => (
                          <SelectItem key={fy} value={String(fy)}>FY {fy}-{(fy + 1).toString().slice(-2)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {pmtPeriodType === "custom" && (
                  <>
                    <div>
                      <Label>From Date</Label>
                      <Input 
                        type="date" 
                        value={pmtDateFrom} 
                        onChange={(e) => setPmtDateFrom(e.target.value)}
                        data-testid="input-pmt-date-from"
                      />
                    </div>
                    <div>
                      <Label>To Date</Label>
                      <Input 
                        type="date" 
                        value={pmtDateTo} 
                        onChange={(e) => setPmtDateTo(e.target.value)}
                        data-testid="input-pmt-date-to"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Customer</Label>
                  <Popover open={pmtCustomerPopoverOpen} onOpenChange={setPmtCustomerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={pmtCustomerPopoverOpen}
                        className="w-full justify-between"
                        data-testid="select-pmt-customer"
                      >
                        {pmtCustomer === "all" ? "All Customers" : pmtCustomer}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search customers..." data-testid="input-search-pmt-customer" />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandList className="max-h-64 overflow-auto">
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setPmtCustomer("all");
                                setPmtCustomerPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", pmtCustomer === "all" ? "opacity-100" : "opacity-0")} />
                              All Customers
                            </CommandItem>
                            {uniquePaymentBuyers.map((buyer) => (
                              <CommandItem
                                key={buyer}
                                value={buyer}
                                onSelect={() => {
                                  setPmtCustomer(buyer);
                                  setPmtCustomerPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", pmtCustomer === buyer ? "opacity-100" : "opacity-0")} />
                                {buyer}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Bank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                          <TableCell>
                            {safeFormat(payment.paymentDate, 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {payment.invoiceNumber || '-'}
                          </TableCell>
                          <TableCell>
                            {payment.vendorName || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{((payment.amount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                              {payment.paymentMethod || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              payment.paymentType === 'Full' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : payment.paymentType === 'Advance'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {payment.paymentType || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {payment.referenceNumber || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {payment.bankName || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finished Goods Tab */}
        <TabsContent value="finished-goods">
          <FinishedGoodsReportContent />
        </TabsContent>

        <TabsContent value="monthly-sales">
          <MonthlySalesReportContent />
        </TabsContent>

        {/* Scrap Report Tab */}
        <TabsContent value="scrap">
          <ScrapReportContent />
        </TabsContent>

        {/* Sales Returns Report Tab */}
        <TabsContent value="sales-returns">
          <SalesReturnsReportContent />
        </TabsContent>
        <TabsContent value="repacking">
          <RepackingReportContent />
        </TabsContent>
        <TabsContent value="vendor-report">
          <VendorReport />
        </TabsContent>
        <TabsContent value="monthly-production">
          <MonthlyProductionReportContent />
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}

// Scrap Report Content Component
function ScrapReportContent() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportGenerated, setReportGenerated] = useState(false);
  const [queryMonth, setQueryMonth] = useState<number | null>(null);
  const [queryYear, setQueryYear] = useState<number | null>(null);

  const { data: reportData, isLoading, isFetching } = useQuery<{
    month: number;
    year: number;
    summary: {
      totalRecords: number;
      totalQuantity: number;
      totalCostValue: number;
      totalSellingValue: number;
      totalLossAmount: number;
      totalGstReversal: number;
      totalDisposalValue: number;
      netLoss: number;
      byApprovalStatus: { pending: number; approved: number; rejected: number };
      byDamageReason: Record<string, { count: number; lossAmount: number }>;
      byProduct: Record<string, { productName: string; count: number; quantity: number; lossAmount: number }>;
    };
    records: any[];
  }>({
    queryKey: ['/api/scrap-inventory/report', { month: queryMonth, year: queryYear }],
    enabled: queryMonth !== null && queryYear !== null,
  });

  const handleGenerateReport = () => {
    setQueryMonth(selectedMonth);
    setQueryYear(selectedYear);
    setReportGenerated(true);
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    const excelData: any[][] = [
      ['Scrap Inventory Report'],
      [`Period: ${format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}`],
      ['Generated:', format(new Date(), 'dd MMM yyyy HH:mm')],
      [''],
      ['Summary'],
      ['Total Records:', reportData.summary.totalRecords],
      ['Total Quantity:', reportData.summary.totalQuantity],
      ['Total Cost Value:', `₹${(reportData.summary.totalCostValue / 100).toFixed(2)}`],
      ['Total Loss Amount:', `₹${(reportData.summary.totalLossAmount / 100).toFixed(2)}`],
      ['GST Reversal:', `₹${(reportData.summary.totalGstReversal / 100).toFixed(2)}`],
      ['Disposal Recovery:', `₹${(reportData.summary.totalDisposalValue / 100).toFixed(2)}`],
      ['Net Loss:', `₹${(reportData.summary.netLoss / 100).toFixed(2)}`],
      [''],
      ['Breakdown by Damage Reason'],
      ['Reason', 'Count', 'Loss Amount'],
    ];
    
    Object.entries(reportData.summary.byDamageReason).forEach(([reason, data]) => {
      excelData.push([reason, data.count, `₹${(data.lossAmount / 100).toFixed(2)}`]);
    });
    
    excelData.push(['']);
    excelData.push(['Breakdown by Product']);
    excelData.push(['Product', 'Count', 'Quantity', 'Loss Amount']);
    
    Object.entries(reportData.summary.byProduct).forEach(([_, data]) => {
      excelData.push([data.productName, data.count, data.quantity, `₹${(data.lossAmount / 100).toFixed(2)}`]);
    });
    
    excelData.push(['']);
    excelData.push(['Detailed Records']);
    excelData.push(['Scrap #', 'Date', 'Product', 'Batch', 'Qty', 'Reason', 'Status', 'Loss Amount']);
    
    reportData.records.forEach(r => {
      excelData.push([
        r.scrapNumber,
        safeFormat(r.scrapDate, 'dd MMM yyyy'),
        r.productName,
        r.batchNumber || '-',
        r.quantity,
        r.damageReason || '-',
        r.approvalStatus,
        `₹${((r.lossAmount || 0) / 100).toFixed(2)}`,
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Scrap Report');
    await downloadXLSX(wb, `scrap-report-${selectedMonth}-${selectedYear}.xlsx`);
  };

  const handlePrint = () => {
    if (!reportData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scrap Report - ${format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 1.5em; font-weight: bold; }
          .summary-label { color: #666; font-size: 0.9em; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          .text-right { text-align: right; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Scrap Inventory Report</h1>
        <p style="text-align: center;">${format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}</p>
        
        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${reportData.summary.totalRecords}</div>
              <div class="summary-label">Total Records</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.summary.totalQuantity}</div>
              <div class="summary-label">Total Quantity</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">₹${(reportData.summary.netLoss / 100).toFixed(2)}</div>
              <div class="summary-label">Net Loss</div>
            </div>
          </div>
        </div>
        
        <h3>Breakdown by Damage Reason</h3>
        <table>
          <tr><th>Reason</th><th class="text-right">Count</th><th class="text-right">Loss Amount</th></tr>
          ${Object.entries(reportData.summary.byDamageReason).map(([reason, data]) => 
            `<tr><td>${reason}</td><td class="text-right">${data.count}</td><td class="text-right">₹${(data.lossAmount / 100).toFixed(2)}</td></tr>`
          ).join('')}
        </table>
        
        <h3>Breakdown by Product</h3>
        <table>
          <tr><th>Product</th><th class="text-right">Count</th><th class="text-right">Quantity</th><th class="text-right">Loss Amount</th></tr>
          ${Object.entries(reportData.summary.byProduct).map(([_, data]) => 
            `<tr><td>${data.productName}</td><td class="text-right">${data.count}</td><td class="text-right">${data.quantity}</td><td class="text-right">₹${(data.lossAmount / 100).toFixed(2)}</td></tr>`
          ).join('')}
        </table>
        
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print Report</button>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scrap Inventory Report</CardTitle>
        <CardDescription>Monthly loss calculation from damaged/scrapped goods</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label>Month</Label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]" data-testid="select-scrap-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Year</Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]" data-testid="select-scrap-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerateReport} disabled={isLoading || isFetching} data-testid="button-generate-scrap-report">
            {isFetching ? 'Loading...' : 'Generate Report'}
          </Button>
          {reportData && (
            <>
              <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-scrap-excel">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={handlePrint} data-testid="button-print-scrap">
                <FileText className="w-4 h-4 mr-2" />
                Print
              </Button>
            </>
          )}
        </div>

        {reportGenerated && reportData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{reportData.summary.totalRecords}</div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{reportData.summary.totalQuantity}</div>
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">₹{(reportData.summary.totalLossAmount / 100).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Total Loss</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-600">₹{(reportData.summary.netLoss / 100).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Net Loss</div>
                </CardContent>
              </Card>
            </div>

            {/* By Approval Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Approval Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Badge variant="secondary">Pending: {reportData.summary.byApprovalStatus.pending}</Badge>
                  <Badge variant="default">Approved: {reportData.summary.byApprovalStatus.approved}</Badge>
                  <Badge variant="destructive">Rejected: {reportData.summary.byApprovalStatus.rejected}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* By Damage Reason */}
            {Object.keys(reportData.summary.byDamageReason).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Breakdown by Damage Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Loss Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(reportData.summary.byDamageReason).map(([reason, data]) => (
                        <TableRow key={reason}>
                          <TableCell className="capitalize">{reason.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right text-red-600">₹{(data.lossAmount / 100).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* By Product */}
            {Object.keys(reportData.summary.byProduct).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Breakdown by Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Loss Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(reportData.summary.byProduct).map(([id, data]) => (
                        <TableRow key={id}>
                          <TableCell>{data.productName}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right">{data.quantity}</TableCell>
                          <TableCell className="text-right text-red-600">₹{(data.lossAmount / 100).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Detailed Records */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detailed Records ({reportData.records.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scrap #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.scrapNumber}</TableCell>
                        <TableCell>{safeFormat(r.scrapDate, 'dd MMM yyyy')}</TableCell>
                        <TableCell>{r.productName}</TableCell>
                        <TableCell><Badge variant="outline">{r.batchNumber || '-'}</Badge></TableCell>
                        <TableCell className="text-right">{r.quantity}</TableCell>
                        <TableCell className="capitalize">{(r.damageReason || '-').replace(/_/g, ' ')}</TableCell>
                        <TableCell>
                          <Badge variant={r.approvalStatus === 'approved' ? 'default' : r.approvalStatus === 'rejected' ? 'destructive' : 'secondary'}>
                            {r.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600">₹{((r.lossAmount || 0) / 100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Sales Returns Report Content Component
function SalesReturnsReportContent() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [queryDateFrom, setQueryDateFrom] = useState<string | null>(null);
  const [queryDateTo, setQueryDateTo] = useState<string | null>(null);
  
  const { data: reportData, isLoading, isFetching } = useQuery<{
    dateFrom: string;
    dateTo: string;
    summary: {
      totalReturns: number;
      totalItems: number;
      totalQuantityReturned: number;
      totalCreditAmount: number;
      byStatus: { pending: number; received: number; inspected: number; completed: number };
      byDisposition: Record<string, { count: number; quantity: number }>;
      byProduct: Record<string, { productName: string; quantity: number; creditAmount: number }>;
    };
    records: any[];
  }>({
    queryKey: ['/api/reports/sales-returns-summary', { dateFrom: queryDateFrom, dateTo: queryDateTo }],
    enabled: queryDateFrom !== null && queryDateTo !== null,
  });

  const handleGenerateReport = () => {
    if (!dateFrom || !dateTo) return;
    setQueryDateFrom(dateFrom);
    setQueryDateTo(dateTo);
    setReportGenerated(true);
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    const excelData: any[][] = [
      ['Sales Returns Summary Report'],
      [`Period: ${safeFormat(dateFrom, 'dd MMM yyyy')} - ${safeFormat(dateTo, 'dd MMM yyyy')}`],
      ['Generated:', format(new Date(), 'dd MMM yyyy HH:mm')],
      [''],
      ['Summary'],
      ['Total Returns:', reportData.summary.totalReturns],
      ['Total Items:', reportData.summary.totalItems],
      ['Total Quantity:', reportData.summary.totalQuantityReturned],
      ['Total Credit Amount:', `₹${(reportData.summary.totalCreditAmount / 100).toFixed(2)}`],
      [''],
      ['Disposition Breakdown'],
      ['Disposition', 'Count', 'Quantity'],
    ];
    
    Object.entries(reportData.summary.byDisposition).forEach(([disposition, data]) => {
      excelData.push([disposition, data.count, data.quantity]);
    });
    
    excelData.push(['']);
    excelData.push(['Product Breakdown']);
    excelData.push(['Product', 'Quantity', 'Credit Amount']);
    
    Object.entries(reportData.summary.byProduct).forEach(([_, data]) => {
      excelData.push([data.productName, data.quantity, `₹${(data.creditAmount / 100).toFixed(2)}`]);
    });
    
    excelData.push(['']);
    excelData.push(['Detailed Records']);
    excelData.push(['Return #', 'Date', 'Customer', 'Status', 'Items', 'Total Credit']);
    
    reportData.records.forEach(r => {
      const totalCredit = r.items?.reduce((sum: number, item: any) => sum + (item.creditAmount || 0), 0) || 0;
      excelData.push([
        r.returnNumber,
        safeFormat(r.returnDate, 'dd MMM yyyy'),
        r.customerName,
        r.status,
        r.items?.length || 0,
        `₹${(totalCredit / 100).toFixed(2)}`,
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Returns Summary');
    await downloadXLSX(wb, `sales-returns-summary-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handlePrint = () => {
    if (!reportData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Returns Summary</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 1.5em; font-weight: bold; }
          .summary-label { color: #666; font-size: 0.9em; }
          .disposition-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
          .disposition-card { background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          .text-right { text-align: right; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Sales Returns Summary Report</h1>
        <p style="text-align: center;">${safeFormat(dateFrom, 'dd MMM yyyy')} - ${safeFormat(dateTo, 'dd MMM yyyy')}</p>
        
        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${reportData.summary.totalReturns}</div>
              <div class="summary-label">Total Returns</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.summary.totalItems}</div>
              <div class="summary-label">Total Items</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.summary.totalQuantityReturned}</div>
              <div class="summary-label">Total Quantity</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">₹${(reportData.summary.totalCreditAmount / 100).toFixed(2)}</div>
              <div class="summary-label">Total Credit</div>
            </div>
          </div>
        </div>
        
        <h3>Disposition Breakdown</h3>
        <div class="disposition-grid">
          ${Object.entries(reportData.summary.byDisposition).map(([disposition, data]) => `
            <div class="disposition-card">
              <div style="font-size: 1.5em; font-weight: bold;">${data.quantity}</div>
              <div style="text-transform: capitalize;">${disposition}</div>
              <div style="color: #666; font-size: 0.8em;">${data.count} items</div>
            </div>
          `).join('')}
        </div>
        
        <h3>By Product</h3>
        <table>
          <tr><th>Product</th><th class="text-right">Quantity</th><th class="text-right">Credit Amount</th></tr>
          ${Object.entries(reportData.summary.byProduct).map(([_, data]) => 
            `<tr><td>${data.productName}</td><td class="text-right">${data.quantity}</td><td class="text-right">₹${(data.creditAmount / 100).toFixed(2)}</td></tr>`
          ).join('')}
        </table>
        
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print Report</button>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Returns Summary Report</CardTitle>
        <CardDescription>Breakdown of returns by disposition (restock/scrap/repack)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
              data-testid="input-returns-date-from"
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
              data-testid="input-returns-date-to"
            />
          </div>
          <Button onClick={handleGenerateReport} disabled={!dateFrom || !dateTo || isLoading || isFetching} data-testid="button-generate-returns-report">
            {isFetching ? 'Loading...' : 'Generate Report'}
          </Button>
          {reportData && (
            <>
              <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-returns-excel">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={handlePrint} data-testid="button-print-returns">
                <FileText className="w-4 h-4 mr-2" />
                Print
              </Button>
            </>
          )}
        </div>

        {reportGenerated && reportData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{reportData.summary.totalReturns}</div>
                  <div className="text-sm text-muted-foreground">Total Returns</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{reportData.summary.totalItems}</div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{reportData.summary.totalQuantityReturned}</div>
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">₹{(reportData.summary.totalCreditAmount / 100).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Total Credit</div>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Return Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Pending: {reportData.summary.byStatus.pending}</Badge>
                  <Badge variant="outline">Received: {reportData.summary.byStatus.received}</Badge>
                  <Badge variant="default">Inspected: {reportData.summary.byStatus.inspected}</Badge>
                  <Badge className="bg-green-600">Completed: {reportData.summary.byStatus.completed}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Disposition Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Disposition Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(reportData.summary.byDisposition).map(([disposition, data]) => (
                    <div key={disposition} className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{data.quantity}</div>
                      <div className="text-sm capitalize">{disposition}</div>
                      <div className="text-xs text-muted-foreground">{data.count} items</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Product */}
            {Object.keys(reportData.summary.byProduct).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Breakdown by Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Credit Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(reportData.summary.byProduct).map(([id, data]) => (
                        <TableRow key={id}>
                          <TableCell>{data.productName}</TableCell>
                          <TableCell className="text-right">{data.quantity}</TableCell>
                          <TableCell className="text-right">₹{(data.creditAmount / 100).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Detailed Records */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Return Records ({reportData.records.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.records.map((r) => {
                      const totalCredit = r.items?.reduce((sum: number, item: any) => sum + (item.creditAmount || 0), 0) || 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm">{r.returnNumber}</TableCell>
                          <TableCell>{safeFormat(r.returnDate, 'dd MMM yyyy')}</TableCell>
                          <TableCell>{r.customerName}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{r.items?.length || 0}</TableCell>
                          <TableCell className="text-right">₹{(totalCredit / 100).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Repacking Report Content Component
function RepackingReportContent() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [queryDateFrom, setQueryDateFrom] = useState<string | null>(null);
  const [queryDateTo, setQueryDateTo] = useState<string | null>(null);
  
  const { data: reportData, isLoading, isFetching } = useQuery<{
    dateFrom: string;
    dateTo: string;
    summary: {
      totalRecords: number;
      totalQuantity: number;
      byStatus: { pending: number; approved: number; rejected: number };
      byQualityStatusQuantity: { pending: number; approved: number; rejected: number };
      byProduct: Record<string, { productName: string; productCode: string; pendingCount: number; approvedCount: number; pendingQty: number; approvedQty: number }>;
    };
    records: any[];
  }>({
    queryKey: ['/api/reports/repacking', { dateFrom: queryDateFrom, dateTo: queryDateTo }],
    enabled: queryDateFrom !== null && queryDateTo !== null,
  });

  const handleGenerateReport = () => {
    if (!dateFrom || !dateTo) return;
    setQueryDateFrom(dateFrom);
    setQueryDateTo(dateTo);
    setReportGenerated(true);
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Repacking Report'],
      ['Period', `${safeFormat(reportData.dateFrom, 'dd MMM yyyy')} - ${safeFormat(reportData.dateTo, 'dd MMM yyyy')}`],
      [],
      ['Summary'],
      ['Total Records', reportData.summary.totalRecords],
      ['Total Quantity', reportData.summary.totalQuantity],
      [],
      ['By Status (Count)'],
      ['Pending', reportData.summary.byStatus.pending],
      ['Approved', reportData.summary.byStatus.approved],
      ['Rejected', reportData.summary.byStatus.rejected],
      [],
      ['By Status (Quantity)'],
      ['Pending Qty', reportData.summary.byQualityStatusQuantity.pending],
      ['Approved Qty', reportData.summary.byQualityStatusQuantity.approved],
      ['Rejected Qty', reportData.summary.byQualityStatusQuantity.rejected],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    // Details sheet
    const detailsData = reportData.records.map(r => ({
      'Product Code': r.productCode || '',
      'Product Name': r.productName || 'Unknown',
      'Batch Number': r.batchNumber || '',
      'Original Batch': r.originalBatchNumber || '',
      'Quantity': r.quantity,
      'Quality Status': r.qualityStatus,
      'Created Date': safeFormat(r.createdAt, 'dd MMM yyyy', ''),
      'Repacking Date': safeFormat(r.repackingDate, 'dd MMM yyyy', ''),
      'Remarks': r.remarks || '',
    }));
    const detailsWs = XLSX.utils.json_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, detailsWs, 'Details');
    
    // Product breakdown sheet
    const productData = Object.entries(reportData.summary.byProduct).map(([id, data]) => ({
      'Product Code': data.productCode,
      'Product Name': data.productName,
      'Pending Count': data.pendingCount,
      'Pending Qty': data.pendingQty,
      'Approved Count': data.approvedCount,
      'Approved Qty': data.approvedQty,
    }));
    const productWs = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, productWs, 'By Product');
    
    await downloadXLSX(wb, `Repacking_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Repacking Report</CardTitle>
          <CardDescription>
            Items going through repacking workflow from sales returns
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
              data-testid="input-repacking-date-from"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
              data-testid="input-repacking-date-to"
            />
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={!dateFrom || !dateTo || isFetching}
            data-testid="button-generate-repacking-report"
          >
            {isFetching ? 'Generating...' : 'Generate Report'}
          </Button>
          {reportData && (
            <>
              <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-repacking-excel">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={handlePrint} data-testid="button-print-repacking">
                Print
              </Button>
            </>
          )}
        </div>

        {reportGenerated && reportData && (
          <div className="space-y-6 print:space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{reportData.summary.totalRecords}</div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{reportData.summary.totalQuantity}</div>
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-600">{reportData.summary.byQualityStatusQuantity.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending Qty</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{reportData.summary.byQualityStatusQuantity.approved}</div>
                  <div className="text-sm text-muted-foreground">Approved Qty</div>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-yellow-600">{reportData.summary.byStatus.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{reportData.summary.byStatus.approved}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600">{reportData.summary.byStatus.rejected}</div>
                    <div className="text-sm text-muted-foreground">Rejected</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Product</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Pending Count</TableHead>
                      <TableHead className="text-right">Pending Qty</TableHead>
                      <TableHead className="text-right">Approved Count</TableHead>
                      <TableHead className="text-right">Approved Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(reportData.summary.byProduct).map(([productId, data]) => (
                      <TableRow key={productId}>
                        <TableCell>
                          <div className="font-medium">{data.productName}</div>
                          {data.productCode && <div className="text-xs text-muted-foreground">{data.productCode}</div>}
                        </TableCell>
                        <TableCell className="text-right">{data.pendingCount}</TableCell>
                        <TableCell className="text-right">{data.pendingQty}</TableCell>
                        <TableCell className="text-right">{data.approvedCount}</TableCell>
                        <TableCell className="text-right">{data.approvedQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Details Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Repacking Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Repacked On</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.records.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.productName}</div>
                          {r.productCode && <div className="text-xs text-muted-foreground">{r.productCode}</div>}
                        </TableCell>
                        <TableCell>
                          <div>{r.batchNumber}</div>
                          {r.originalBatchNumber && r.originalBatchNumber !== r.batchNumber && (
                            <div className="text-xs text-muted-foreground">Orig: {r.originalBatchNumber}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={
                            r.qualityStatus === 'approved' ? 'default' :
                            r.qualityStatus === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {r.qualityStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {safeFormat(r.createdAt, 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          {safeFormat(r.repackingDate, 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Monthly Production per SKU Report
const MONTH_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function MonthlyProductionReportContent() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data: products = [] } = useQuery<any[]>({ queryKey: ['/api/products'] });

  const { data, isLoading, error } = useQuery<{
    year: number;
    months: string[];
    rows: Array<{
      productId: string;
      productName: string;
      productCode: string;
      monthly: number[];   // index-aligned with months[]
      total: number;
    }>;
    columnTotals: number[]; // index-aligned with months[]
  }>({
    queryKey: ['/api/reports/production-sku-monthly', { year: selectedYear }],
  });

  const yearOptions = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String);

  const months = data?.months || [];

  const filteredRows = (data?.rows || []).filter(p =>
    selectedProduct === 'all' || p.productId === selectedProduct
  );

  // Recompute column totals when filtering by product
  const filteredColTotals = months.map((_, i) =>
    filteredRows.reduce((s, r) => s + (r.monthly[i] || 0), 0)
  );

  const filteredGrandTotal = filteredRows.reduce((s, r) => s + r.total, 0);

  const handleExport = async () => {
    if (!data || filteredRows.length === 0) return;
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const monthLabels = months.map(m => MONTH_SHORT[m.slice(5, 7)] || m.slice(5, 7));
      const sheetRows: any[][] = [
        [`Monthly Production Report — ${selectedYear}`],
        [`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
        [`Source: Finished Goods entries (original production qty, unaffected by sales)`],
        [],
        ['Product', 'Product Code', ...monthLabels, 'Total'],
        ...filteredRows.map(p => [
          p.productName,
          p.productCode,
          ...p.monthly,
          p.total,
        ]),
        ['TOTAL', '', ...filteredColTotals, filteredGrandTotal],
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      XLSX.utils.book_append_sheet(wb, ws, `Production ${selectedYear}`);
      await downloadXLSX(wb, `monthly-production-${selectedYear}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Monthly Production per SKU
            </CardTitle>
            <CardDescription>
              Quantity produced each month per product — based on Finished Goods entries
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || isLoading || filteredRows.length === 0}
            data-testid="button-export-monthly-production"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md mt-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Quantities shown here are the <strong>original amounts entered</strong> when goods were added to Finished Goods. Even after stock is dispatched (and the current stock becomes zero), the production figure stays correct — dispatched quantities are added back to give you the real production total.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger data-testid="select-prod-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product (filter)</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger data-testid="select-prod-product">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.productName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary cards */}
        {!isLoading && filteredRows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-xl font-bold">{filteredRows.length}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Total Produced</p>
              <p className="text-xl font-bold">{filteredGrandTotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Active Months</p>
              <p className="text-xl font-bold">{filteredColTotals.filter(v => v > 0).length}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Peak Month</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {(() => {
                  const maxIdx = filteredColTotals.indexOf(Math.max(...filteredColTotals));
                  return filteredColTotals[maxIdx] > 0 && months[maxIdx]
                    ? MONTH_SHORT[months[maxIdx].slice(5, 7)]
                    : '—';
                })()}
              </p>
            </div>
          </div>
        )}

        {/* Pivot Table */}
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-sm text-destructive">Failed to load report. Please try again.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Factory className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No production data for {selectedYear}</p>
            <p className="text-sm mt-1">Finished goods entries with production dates in {selectedYear} will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[180px] font-semibold">
                    Product
                  </TableHead>
                  {months.map((m, i) => (
                    <TableHead
                      key={m}
                      className={`text-right min-w-[60px] font-semibold text-xs px-2 ${
                        !filteredColTotals[i] ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {MONTH_SHORT[m.slice(5, 7)]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[80px] font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((product) => {
                  const maxVal = Math.max(...product.monthly);
                  return (
                    <TableRow key={product.productId} data-testid={`row-monthly-prod-${product.productId}`}>
                      <TableCell className="sticky left-0 bg-background z-10 py-2">
                        <div className="font-medium text-sm">{product.productName}</div>
                        {product.productCode && (
                          <div className="text-xs text-muted-foreground">{product.productCode}</div>
                        )}
                      </TableCell>
                      {product.monthly.map((val, i) => {
                        const isPeak = val === maxVal && val > 0;
                        return (
                          <TableCell key={months[i]} className="text-right text-sm px-2 py-2">
                            {val ? (
                              <span className={`font-medium tabular-nums ${isPeak ? 'text-green-600 dark:text-green-400 font-bold' : ''}`}>
                                {val.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold text-sm tabular-nums">
                        {product.total.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="border-t-2 bg-muted/40 font-bold">
                  <TableCell className="sticky left-0 bg-muted/40 z-10 text-sm font-bold py-2">
                    Total
                  </TableCell>
                  {filteredColTotals.map((tot, i) => (
                    <TableCell key={months[i]} className="text-right px-2 py-2">
                      {tot ? (
                        <span className="text-sm font-bold tabular-nums">
                          {tot.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-normal">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold text-sm text-primary tabular-nums">
                    {filteredGrandTotal.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

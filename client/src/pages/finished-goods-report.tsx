import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileDown, FileText, Calendar, Package, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

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

interface ProductGroup {
  productId: string;
  productName: string;
  items: FinishedGoodItem[];
  subtotal: number;
}

interface ReportSummary {
  totalProducts: number;
  totalBatches: number;
  grandTotal: number;
  byQualityStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface ReportResponse {
  groupedData: ProductGroup[];
  summary: ReportSummary;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    productId?: string;
    qualityStatus?: string;
  };
}

export default function FinishedGoodsReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedQualityStatus, setSelectedQualityStatus] = useState("all");
  const [reportGenerated, setReportGenerated] = useState(false);

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const queryParams: Record<string, string> = {};
  if (dateFrom) queryParams.dateFrom = dateFrom;
  if (dateTo) queryParams.dateTo = dateTo;
  if (selectedProduct && selectedProduct !== 'all') queryParams.productId = selectedProduct;
  if (selectedQualityStatus && selectedQualityStatus !== 'all') queryParams.qualityStatus = selectedQualityStatus;

  const { data: reportResponse, isLoading, refetch, isFetching } = useQuery<ReportResponse>({
    queryKey: ['/api/reports/finished-goods', queryParams],
    enabled: false,
  });

  const groupedData = reportResponse?.groupedData || [];
  const summary = reportResponse?.summary;

  const handleGenerateReport = () => {
    refetch();
    setReportGenerated(true);
  };

  const handleExportExcel = async () => {
    if (groupedData.length === 0) {
      alert("No data to export. Please generate a report first.");
      return;
    }

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    const excelData: any[][] = [
      ['Finished Goods Inventory Report'],
      ['Generated:', format(new Date(), 'dd MMM yyyy HH:mm')],
      [''],
      ['Summary'],
      ['Total Products:', summary?.totalProducts || 0],
      ['Total Batches:', summary?.totalBatches || 0],
      ['Grand Total Quantity:', summary?.grandTotal || 0],
      [''],
      ['By Quality Status'],
      ['Approved:', summary?.byQualityStatus.approved || 0],
      ['Pending:', summary?.byQualityStatus.pending || 0],
      ['Rejected:', summary?.byQualityStatus.rejected || 0],
      [''],
      [''],
    ];

    groupedData.forEach(group => {
      excelData.push(
        [`Product: ${group.productName}`],
        ['Batch Number', 'Production Date', 'Quantity', 'Quality Status', 'Storage Location']
      );

      group.items.forEach(item => {
        excelData.push([
          item.batchNumber,
          format(new Date(item.productionDate), 'dd MMM yyyy'),
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

    excelData.push(['', '', `GRAND TOTAL: ${summary?.grandTotal || 0}`, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Finished Goods Report');

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `finished-goods-report-${dateStr}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (groupedData.length === 0) {
      alert("No data to export. Please generate a report first.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download PDF");
      return;
    }

    const filterInfo = [];
    if (dateFrom) filterInfo.push(`From: ${format(new Date(dateFrom), 'dd MMM yyyy')}`);
    if (dateTo) filterInfo.push(`To: ${format(new Date(dateTo), 'dd MMM yyyy')}`);
    if (selectedProduct !== 'all') {
      const product = products.find((p: any) => p.id === selectedProduct);
      if (product) filterInfo.push(`Product: ${product.productName}`);
    }
    if (selectedQualityStatus !== 'all') filterInfo.push(`Status: ${selectedQualityStatus}`);

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
          .filters { margin-bottom: 15px; padding: 8px; background: #f5f5f5; border-radius: 4px; }
          .filters span { margin-right: 15px; }
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
          .subtotal { font-weight: bold; background: #fafafa; }
          .grand-total { background: #333; color: white; padding: 10px; text-align: right; font-size: 14px; font-weight: bold; margin-top: 20px; }
          .status-approved { color: #16a34a; }
          .status-rejected { color: #dc2626; }
          .status-pending { color: #f59e0b; }
          @media print { 
            body { padding: 10px; } 
            .product-group { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Finished Goods Inventory Report</h1>
          <p>Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
        
        ${filterInfo.length > 0 ? `
          <div class="filters">
            <strong>Filters:</strong> ${filterInfo.join(' | ')}
          </div>
        ` : ''}
        
        <div class="summary">
          <div class="summary-card">
            <div class="label">Total Products</div>
            <div class="value">${summary?.totalProducts || 0}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Batches</div>
            <div class="value">${summary?.totalBatches || 0}</div>
          </div>
          <div class="summary-card">
            <div class="label">Approved Qty</div>
            <div class="value">${(summary?.byQualityStatus.approved || 0).toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="label">Grand Total</div>
            <div class="value">${(summary?.grandTotal || 0).toLocaleString()}</div>
          </div>
        </div>
        
        ${groupedData.map(group => `
          <div class="product-group">
            <div class="product-header">
              <span>${group.productName}</span>
              <span>Subtotal: ${group.subtotal.toLocaleString()}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Production Date</th>
                  <th class="text-right">Quantity</th>
                  <th>Quality Status</th>
                  <th>Storage Location</th>
                </tr>
              </thead>
              <tbody>
                ${group.items.map(item => `
                  <tr>
                    <td style="font-family: monospace;">${item.batchNumber}</td>
                    <td>${format(new Date(item.productionDate), 'dd MMM yyyy')}</td>
                    <td class="text-right">${item.quantity.toLocaleString()}</td>
                    <td class="status-${item.qualityStatus}">${item.qualityStatus.charAt(0).toUpperCase() + item.qualityStatus.slice(1)}</td>
                    <td>${item.storageLocation || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
        
        <div class="grand-total">
          Grand Total: ${(summary?.grandTotal || 0).toLocaleString()}
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getQualityStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" data-testid={`badge-status-${status}`}><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Finished Goods Inventory Report</h1>
          <p className="text-muted-foreground">Product-wise inventory with batch details and subtotals</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Filters
          </CardTitle>
          <CardDescription>Select criteria to generate the report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Production Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Production Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualityStatus">Quality Status</Label>
              <Select value={selectedQualityStatus} onValueChange={setSelectedQualityStatus}>
                <SelectTrigger data-testid="select-quality-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerateReport} disabled={isLoading || isFetching} data-testid="button-generate-report">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {isLoading || isFetching ? 'Generating...' : 'Generate Report'}
            </Button>
            {reportGenerated && groupedData.length > 0 && (
              <>
                <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-excel">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
                <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {reportGenerated && summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold" data-testid="text-total-products">{summary.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Batches</p>
                  <p className="text-2xl font-bold" data-testid="text-total-batches">{summary.totalBatches}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Approved Qty</p>
                  <p className="text-2xl font-bold" data-testid="text-approved-qty">{summary.byQualityStatus.approved.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold" data-testid="text-grand-total">{summary.grandTotal.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportGenerated && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Details</CardTitle>
            <CardDescription>
              Product-wise breakdown with manufacturing dates and batch codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || isFetching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : groupedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No finished goods found matching the selected criteria.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedData.map((group) => (
                  <div key={group.productId} className="border rounded-lg overflow-hidden" data-testid={`product-group-${group.productId}`}>
                    <div className="bg-muted px-4 py-3 flex items-center justify-between">
                      <h3 className="font-semibold text-lg" data-testid={`text-product-name-${group.productId}`}>
                        {group.productName}
                      </h3>
                      <Badge variant="outline" className="text-base" data-testid={`badge-subtotal-${group.productId}`}>
                        Subtotal: {group.subtotal.toLocaleString()}
                      </Badge>
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
                          <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                            <TableCell className="font-mono" data-testid={`text-batch-${item.id}`}>
                              {item.batchNumber}
                            </TableCell>
                            <TableCell data-testid={`text-date-${item.id}`}>
                              {format(new Date(item.productionDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className="text-right font-semibold" data-testid={`text-qty-${item.id}`}>
                              {item.quantity.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {getQualityStatusBadge(item.qualityStatus)}
                            </TableCell>
                            <TableCell className="text-muted-foreground" data-testid={`text-location-${item.id}`}>
                              {item.storageLocation || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                <div className="border-t-2 border-primary pt-4">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg">
                      <span className="text-lg font-bold" data-testid="text-report-grand-total">
                        Grand Total: {summary?.grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

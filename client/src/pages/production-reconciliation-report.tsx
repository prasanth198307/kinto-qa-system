import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, FileDown, Calendar } from "lucide-react";
import { format } from "date-fns";

interface MaterialDetail {
  rawMaterialId: string;
  materialName: string;
  materialType: string;
  baseUnit: string;
  quantityIssued: number;
  quantityUsed: number;
  quantityReturned: number;
  quantityPending: number;
  netConsumed: number;
  expectedTotal: number;
  variance: number;
  variancePercent: number;
}

interface ReportData {
  reconciliationNumber: string;
  reconciliationDate: string;
  shift: string;
  issuanceNumber: string;
  productionId: string;
  productId: string;
  productName: string;
  producedCases: number;
  producedBottles: number;
  yieldPercent: number;
  efficiency: number;
  materials: MaterialDetail[];
}

export default function ProductionReconciliationReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [reportGenerated, setReportGenerated] = useState(false);

  // Fetch products for dropdown
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Fetch production entries (batches) for dropdown
  const { data: productionEntries = [] } = useQuery<any[]>({
    queryKey: ['/api/production-entries'],
  });

  // Fetch report data
  const { data: reportResponse, isLoading, refetch } = useQuery<{ reportData: ReportData[] }>({
    queryKey: ['/api/reports/production-reconciliation', { dateFrom, dateTo, productId: selectedProduct, batchId: selectedBatch, shift: selectedShift }],
    enabled: false, // Only fetch when user clicks Generate Report
  });

  const reportData = reportResponse?.reportData || [];

  const handleGenerateReport = () => {
    refetch();
    setReportGenerated(true);
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      alert("No data to export. Please generate a report first.");
      return;
    }

    // Dynamic import for Mac compatibility
    const XLSX = await import('xlsx');

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data for each reconciliation
    reportData.forEach((report, index) => {
      // Summary data
      const summaryData = [
        ['Production Reconciliation Report'],
        [''],
        ['Reconciliation Number:', report.reconciliationNumber],
        ['Reconciliation Date:', format(new Date(report.reconciliationDate), 'dd MMM yyyy')],
        ['Shift:', report.shift.toUpperCase()],
        ['Issuance Number:', report.issuanceNumber],
        ['Production ID:', report.productionId],
        ['Product:', report.productName],
        ['Produced Cases:', report.producedCases],
        ['Produced Bottles:', report.producedBottles],
        ['Yield %:', report.yieldPercent.toFixed(2) + '%'],
        ['Efficiency %:', report.efficiency.toFixed(2) + '%'],
        [''],
        ['Material Breakdown'],
        ['Material Name', 'Type', 'Unit', 'Issued', 'Used', 'Returned', 'Pending', 'Net Consumed', 'Expected (BOM)', 'Variance', 'Var %', 'Status']
      ];

      // Material data
      report.materials.forEach(material => {
        summaryData.push([
          material.materialName,
          material.materialType,
          material.baseUnit,
          material.quantityIssued,
          material.quantityUsed,
          material.quantityReturned,
          material.quantityPending,
          material.netConsumed,
          material.expectedTotal,
          material.variance,
          material.variancePercent.toFixed(2) + '%',
          Math.abs(material.variancePercent) <= 2 ? 'Good' : Math.abs(material.variancePercent) <= 5 ? 'Warning' : 'Critical'
        ]);
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Add worksheet to workbook
      const sheetName = `Reconciliation_${index + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Generate filename with date range
    const fileName = `Production_Reconciliation_Report_${dateFrom || 'all'}_to_${dateTo || 'all'}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, fileName);
  };

  const handleExportPDF = () => {
    if (reportData.length === 0) {
      alert("No data to export. Please generate a report first.");
      return;
    }

    // Note: pdfkit requires a server-side implementation for proper PDF generation
    // For client-side, we'll use the browser's print functionality with a styled view
    
    // Create a new window with the report data
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    // Generate HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Production Reconciliation Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          h2 {
            color: #1a1a1a;
            margin-top: 30px;
          }
          .summary {
            margin: 20px 0;
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 10px;
          }
          .summary-label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #2563eb;
            color: white;
          }
          .good { background-color: #dcfce7; }
          .warning { background-color: #fef3c7; }
          .critical { background-color: #fee2e2; }
          .page-break {
            page-break-after: always;
          }
          @media print {
            body { margin: 0; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
    `;

    reportData.forEach((report, index) => {
      htmlContent += `
        ${index > 0 ? '<div class="page-break"></div>' : ''}
        <h1>Production Reconciliation Report</h1>
        
        <div class="summary">
          <div class="summary-label">Reconciliation Number:</div>
          <div>${report.reconciliationNumber}</div>
          
          <div class="summary-label">Reconciliation Date:</div>
          <div>${format(new Date(report.reconciliationDate), 'dd MMM yyyy')}</div>
          
          <div class="summary-label">Shift:</div>
          <div>${report.shift.toUpperCase()}</div>
          
          <div class="summary-label">Issuance Number:</div>
          <div>${report.issuanceNumber}</div>
          
          <div class="summary-label">Production ID:</div>
          <div>${report.productionId}</div>
          
          <div class="summary-label">Product:</div>
          <div>${report.productName}</div>
          
          <div class="summary-label">Produced Cases:</div>
          <div>${report.producedCases}</div>
          
          <div class="summary-label">Produced Bottles:</div>
          <div>${report.producedBottles}</div>
          
          <div class="summary-label">Yield %:</div>
          <div>${report.yieldPercent.toFixed(2)}%</div>
          
          <div class="summary-label">Efficiency %:</div>
          <div>${report.efficiency.toFixed(2)}%</div>
        </div>

        <h2>Material Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Material Name</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Issued</th>
              <th>Used</th>
              <th>Returned</th>
              <th>Pending</th>
              <th>Net Consumed</th>
              <th>Expected (BOM)</th>
              <th>Variance</th>
              <th>Var %</th>
            </tr>
          </thead>
          <tbody>
      `;

      report.materials.forEach(material => {
        const varClass = Math.abs(material.variancePercent) <= 2 ? 'good' : 
                        Math.abs(material.variancePercent) <= 5 ? 'warning' : 'critical';
        
        htmlContent += `
          <tr class="${varClass}">
            <td>${material.materialName}</td>
            <td>${material.materialType}</td>
            <td>${material.baseUnit}</td>
            <td>${material.quantityIssued}</td>
            <td>${material.quantityUsed}</td>
            <td>${material.quantityReturned}</td>
            <td>${material.quantityPending}</td>
            <td>${material.netConsumed}</td>
            <td>${material.expectedTotal}</td>
            <td>${material.variance >= 0 ? '+' : ''}${material.variance.toFixed(2)}</td>
            <td>${material.variancePercent >= 0 ? '+' : ''}${material.variancePercent.toFixed(2)}%</td>
          </tr>
        `;
      });

      htmlContent += `
          </tbody>
        </table>
      `;
    });

    htmlContent += `
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Calculate totals across all reconciliations
  const totalEfficiency = reportData.length > 0 
    ? reportData.reduce((sum, r) => sum + r.efficiency, 0) / reportData.length 
    : 0;
    
  const totalVariance = reportData.length > 0
    ? reportData.reduce((sum, r) => {
        const matVariance = r.materials.reduce((s, m) => s + m.variancePercent, 0) / (r.materials.length || 1);
        return sum + matVariance;
      }, 0) / reportData.length
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Production Reconciliation Report</CardTitle>
          <CardDescription>
            Analyze production variance, material consumption, and efficiency metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="date-from">Date From</Label>
              <div className="relative">
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Date To</Label>
              <div className="relative">
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product" data-testid="select-product">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="product-option-all">All Products</SelectItem>
                  {products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id} data-testid={`product-option-${product.id}`}>
                      {product.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch ID</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger id="batch" data-testid="select-batch">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="batch-option-all">All Batches</SelectItem>
                  {productionEntries.map((entry: any) => (
                    <SelectItem key={entry.id} value={entry.id} data-testid={`batch-option-${entry.id}`}>
                      {entry.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger id="shift" data-testid="select-shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="shift-option-all">All</SelectItem>
                  <SelectItem value="day" data-testid="shift-option-day">Day</SelectItem>
                  <SelectItem value="night" data-testid="shift-option-night">Night</SelectItem>
                  <SelectItem value="general" data-testid="shift-option-general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={handleGenerateReport} 
              disabled={isLoading}
              data-testid="button-generate-report"
            >
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
            {reportGenerated && reportData.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleExportExcel}
                  data-testid="button-export-excel"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF}
                  data-testid="button-export-pdf"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {reportGenerated && (
        <>
          {reportData.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No reconciliation data found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            reportData.map((report, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle>Reconciliation: {report.reconciliationNumber}</CardTitle>
                  <CardDescription>
                    {format(new Date(report.reconciliationDate), 'PPP')} - {report.shift.toUpperCase()} Shift
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Production Summary</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Batch ID</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Issue ID</TableHead>
                          <TableHead>Production ID</TableHead>
                          <TableHead>Produced Cases</TableHead>
                          <TableHead>Bottles</TableHead>
                          <TableHead>Yield %</TableHead>
                          <TableHead>Efficiency %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{report.productName}</TableCell>
                          <TableCell>{report.productionId || 'N/A'}</TableCell>
                          <TableCell className="uppercase">{report.shift}</TableCell>
                          <TableCell>{report.issuanceNumber}</TableCell>
                          <TableCell>{report.productionId || 'N/A'}</TableCell>
                          <TableCell>{report.producedCases}</TableCell>
                          <TableCell>{report.producedBottles.toLocaleString()}</TableCell>
                          <TableCell className={report.yieldPercent >= 95 ? "text-green-600" : "text-yellow-600"}>
                            {report.yieldPercent.toFixed(1)}%
                          </TableCell>
                          <TableCell className={report.efficiency >= 95 ? "text-green-600" : "text-yellow-600"}>
                            {report.efficiency.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Material Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Material Breakdown</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Base Unit</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Used</TableHead>
                          <TableHead>Returned</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>Net Consumed</TableHead>
                          <TableHead>Expected (BOM)</TableHead>
                          <TableHead>Variance</TableHead>
                          <TableHead>%Var</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.materials.map((material, i) => (
                          <TableRow key={material.rawMaterialId}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>{material.materialName}</TableCell>
                            <TableCell>{material.materialType}</TableCell>
                            <TableCell>{material.baseUnit}</TableCell>
                            <TableCell>{material.quantityIssued}</TableCell>
                            <TableCell>{material.quantityUsed}</TableCell>
                            <TableCell>{material.quantityReturned}</TableCell>
                            <TableCell>{material.quantityPending}</TableCell>
                            <TableCell className="font-medium">{material.netConsumed.toFixed(2)}</TableCell>
                            <TableCell>{material.expectedTotal.toFixed(2)}</TableCell>
                            <TableCell className={material.variance >= 0 ? "text-green-600" : "text-red-600"}>
                              {material.variance > 0 ? '+' : ''}{material.variance.toFixed(2)}
                            </TableCell>
                            <TableCell className={Math.abs(material.variancePercent) <= 5 ? "text-green-600" : "text-yellow-600"}>
                              {material.variancePercent > 0 ? '+' : ''}{material.variancePercent.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              {Math.abs(material.variancePercent) <= 5 ? "OK" : "Review"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">TOTAL MATERIAL EFFICIENCY:</span>
                      <span className={report.efficiency >= 95 ? "text-green-600 font-bold" : "text-yellow-600 font-bold"}>
                        {report.efficiency.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-semibold">TOTAL VARIANCE:</span>
                      <span className="font-bold">
                        {(report.materials.reduce((sum, m) => sum + m.variancePercent, 0) / (report.materials.length || 1)).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}

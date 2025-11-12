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
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedShift, setSelectedShift] = useState("all");
  const [reportGenerated, setReportGenerated] = useState(false);

  // Fetch products for dropdown
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch production entries (batches) for dropdown
  const { data: productionEntries = [] } = useQuery({
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

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    console.log("Export to Excel");
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log("Export to PDF");
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
                  <SelectItem value="" data-testid="product-option-all">All Products</SelectItem>
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
                  <SelectItem value="" data-testid="batch-option-all">All Batches</SelectItem>
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

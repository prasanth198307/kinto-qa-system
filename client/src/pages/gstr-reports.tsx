import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2025-26", "2024-25", "2023-24"];

export default function GSTRReportsPage() {
  const now = new Date();
  const tenantConfig = useTenantConfig();
  const formatCurrency = (amount: number) => fmtCur(amount, tenantConfig);
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(now.getFullYear().toString());

  const { data: gstr1Data, isLoading: gstr1Loading } = useQuery<any>({
    queryKey: ["/api/generic/gstr-1", month, year],
    queryFn: () => fetch(`/api/generic/gstr-1?month=${month}&year=${year}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    staleTime: 60 * 1000,
  });

  const { data: gstr3bData, isLoading: gstr3bLoading } = useQuery<any>({
    queryKey: ["/api/generic/gstr-3b", month, year],
    queryFn: () => fetch(`/api/generic/gstr-3b?month=${month}&year=${year}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    staleTime: 60 * 1000,
  });

  function downloadJSON(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const b2b = gstr1Data?.b2b || [];
  const b2c = gstr1Data?.b2c || [];
  const goldSales  = gstr1Data?.goldSales   || [];
  const hsnSummary = gstr1Data?.hsnSummary  || [];
  const sup_details = gstr3bData?.sup_details || {};
  const itc_elg = gstr3bData?.itc_elg || {};

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">GST Returns</h1>
        </div>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-40" data-testid="select-month"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-32" data-testid="select-year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="gstr1">
        <TabsList>
          <TabsTrigger value="gstr1" data-testid="tab-gstr1">GSTR-1 (Sales)</TabsTrigger>
          <TabsTrigger value="gstr3b" data-testid="tab-gstr3b">GSTR-3B (Summary)</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr1" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => downloadJSON(gstr1Data, `GSTR1_${month}_${year}.json`)} disabled={!gstr1Data} data-testid="button-download-gstr1">
              <Download className="h-4 w-4 mr-1" /> Export JSON
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">B2B — Registered Business Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {gstr1Loading ? (
                <div className="p-6 text-center text-muted-foreground">Loading...</div>
              ) : b2b.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No B2B invoices for selected period</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GSTIN</TableHead>
                      <TableHead>Buyer Name</TableHead>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b2b.map((inv: any, i: number) => (
                      <TableRow key={i} data-testid={`row-b2b-${i}`}>
                        <TableCell className="font-mono text-xs">{inv.buyer_gstin || "—"}</TableCell>
                        <TableCell>{inv.buyer_name}</TableCell>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.taxable_value || inv.subtotal || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.igst || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.cgst || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.sgst || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">B2C — Consumer Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {b2c.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No B2C invoices for selected period</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Buyer Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">Total Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b2c.map((inv: any, i: number) => (
                      <TableRow key={i} data-testid={`row-b2c-${i}`}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.buyer_name}</TableCell>
                        <TableCell>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.subtotal || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.tax_amount || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {goldSales.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex flex-wrap items-center gap-2">
                  Gold ERP — Jewellery Sales (HSN 7113, GST @3%)
                  <Badge variant="secondary">{goldSales.length} records</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estimate No.</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">CGST (1.5%)</TableHead>
                      <TableHead className="text-right">SGST (1.5%)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goldSales.map((s: any, i: number) => (
                      <TableRow key={i} data-testid={`row-gold-sale-${i}`}>
                        <TableCell className="font-mono text-sm">{s.estimate_no}</TableCell>
                        <TableCell>{s.customer_name}</TableCell>
                        <TableCell>{s.sale_date ? new Date(s.sale_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(s.taxable_value || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(s.cgst_amount || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(s.sgst_amount || 0))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(s.total_amount || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t px-4 py-2 flex flex-wrap justify-end gap-6 text-sm bg-muted/30">
                  <span className="text-muted-foreground">Total Taxable: <strong className="text-foreground">
                    {formatCurrency(goldSales.reduce((s: number, r: any) => s + Number(r.taxable_value || 0), 0))}
                  </strong></span>
                  <span className="text-muted-foreground">Total GST: <strong className="text-foreground">
                    {formatCurrency(goldSales.reduce((s: number, r: any) => s + Number(r.gst_amount || 0), 0))}
                  </strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* HSN-wise Summary — wired to invoice_items.hsn_code + products.hsn_code */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">HSN-wise Summary</CardTitle>
              {hsnSummary.length > 0 && <Badge variant="secondary">{hsnSummary.length} HSN{hsnSummary.length > 1 ? "s" : ""}</Badge>}
            </CardHeader>
            <CardContent className="p-0">
              {hsnSummary.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No HSN data for selected period. Ensure products have HSN codes set in Item Master.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">GST %</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-right">Total Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hsnSummary.map((row: any, i: number) => (
                      <TableRow key={i} data-testid={`row-hsn-${i}`}>
                        <TableCell className="font-mono text-sm font-medium">{row.hsn_code}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{row.description}</TableCell>
                        <TableCell className="text-center">{row.gst_rate ?? 0}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(row.taxable_value || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(row.cgst || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(row.sgst || 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(row.igst || 0))}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(row.total_tax || 0))}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(hsnSummary.reduce((s: number, r: any) => s + Number(r.taxable_value || 0), 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(hsnSummary.reduce((s: number, r: any) => s + Number(r.cgst || 0), 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(hsnSummary.reduce((s: number, r: any) => s + Number(r.sgst || 0), 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(hsnSummary.reduce((s: number, r: any) => s + Number(r.igst || 0), 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(hsnSummary.reduce((s: number, r: any) => s + Number(r.total_tax || 0), 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="gstr3b" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => downloadJSON(gstr3bData, `GSTR3B_${month}_${year}.json`)} disabled={!gstr3bData} data-testid="button-download-gstr3b">
              <Download className="h-4 w-4 mr-1" /> Export JSON
            </Button>
          </div>

          {gstr3bLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">3.1 — Outward Supplies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Total Taxable Value</span>
                    <span className="font-medium">{formatCurrency(Number(sup_details.taxable_value || 0))}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">IGST</span>
                    <span className="font-medium">{formatCurrency(Number(sup_details.igst || 0))}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="font-medium">{formatCurrency(Number(sup_details.cgst || 0))}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="font-medium">{formatCurrency(Number(sup_details.sgst || 0))}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">4 — Eligible ITC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">ITC on Inputs</span>
                    <span className="font-medium">{formatCurrency(Number(itc_elg.inputs || 0))}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">ITC on Capital Goods</span>
                    <span className="font-medium">{formatCurrency(Number(itc_elg.capital_goods || 0))}</span>
                  </div>
                </CardContent>
              </Card>

              {gstr3bData?.tax_rate_summary && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tax Rate-wise Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tax Rate</TableHead>
                          <TableHead className="text-right">Taxable Value</TableHead>
                          <TableHead className="text-right">Total Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gstr3bData.tax_rate_summary.map((row: any, i: number) => (
                          <TableRow key={i} data-testid={`row-tax-rate-${i}`}>
                            <TableCell><Badge variant="secondary">{row.tax_rate}%</Badge></TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(row.taxable_value || 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(row.tax_amount || 0))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

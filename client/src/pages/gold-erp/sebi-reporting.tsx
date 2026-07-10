import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Send, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtG = (n: number) => `${Number(n || 0).toFixed(3)}g`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const QUARTERS = ["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"];
const CY = new Date().getFullYear();
const YEARS = [CY - 1, CY, CY + 1].map(String);

export default function SEBIReportingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(CY));
  const [quarter, setQuarter] = useState("1");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: filingHistory = [] } = useQuery<any[]>({ queryKey: ["sebi-reports"], queryFn: () => fetch("/api/gold-erp/sebi/reports").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/gold-erp/sebi/report?month=${month}&year=${year}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
      setReportData(data);
    } catch { toast({ title: "Failed to fetch report", variant: "destructive" }); }
    setLoading(false);
  };

  const downloadXML = () => {
    window.open(`/api/gold-erp/sebi/report?month=${month}&year=${year}&format=xml`, "_blank");
    toast({ title: "Downloading SEBI XML report" });
  };

  const fileReport = useMutation({
    mutationFn: () => api("POST", "/api/gold-erp/sebi/report/file", { period_month: Number(month), period_year: Number(year) }),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["sebi-reports"] }); },
    onError: () => toast({ title: "Filing failed", variant: "destructive" }),
  });

  const quarterlyData = useQuery({
    queryKey: ["sebi-quarterly", year, quarter],
    queryFn: () => fetch(`/api/gold-erp/sebi/quarterly-report?year=${year}&quarter=${quarter}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }).catch(() => null),
    enabled: false,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SEBI Bullion Dealer Reporting</h1>
          <p className="text-sm text-muted-foreground">Monthly bullion dealer returns · XML export · Quarterly reporting · Filing history</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">SEBI Bullion Dealer Compliance</p>
        <p>Registered bullion dealers must file monthly returns with SEBI covering gold/silver stock positions, purchases, sales, and HUID-hallmarked pieces. XML format matches SEBI's prescribed schema. File by 7th of following month.</p>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Return</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly Summary</TabsTrigger>
          <TabsTrigger value="history">Filing History</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 items-end">
                <div>
                  <Label>Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchReport} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {reportData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">SEBI Bullion Monthly Return — {MONTHS[Number(month) - 1]} {year}</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={downloadXML}><Download className="h-3 w-3 mr-1" />Download XML</Button>
                  <Button size="sm" onClick={() => fileReport.mutate()} disabled={fileReport.isPending} className="bg-green-600 hover:bg-green-700">
                    {fileReport.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    <Send className="h-3 w-3 mr-1" />File with SEBI
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Gold Stock (grams)</p>
                  <p className="text-xl font-bold text-yellow-700">{fmtG(reportData.gold_stock?.grams)}</p>
                  <p className="text-sm text-muted-foreground">Value: {fmt(reportData.gold_stock?.value)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Silver Stock (grams)</p>
                  <p className="text-xl font-bold text-gray-600">{fmtG(reportData.silver_stock?.grams)}</p>
                  <p className="text-sm text-muted-foreground">Value: {fmt(reportData.silver_stock?.value)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">HUID Hallmarked Pieces</p>
                  <p className="text-xl font-bold text-green-600">{reportData.hallmarking?.huid_count || 0}</p>
                  <p className="text-sm text-muted-foreground">this period</p>
                </CardContent></Card>
              </div>

              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Metric</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell>Gold</TableCell><TableCell>Opening Stock (grams)</TableCell><TableCell className="text-right font-mono">{fmtG(reportData.gold_stock?.grams)}</TableCell></TableRow>
                  <TableRow><TableCell>Gold</TableCell><TableCell>Sales (grams)</TableCell><TableCell className="text-right font-mono">{fmtG(reportData.sales?.sold_grams)}</TableCell></TableRow>
                  <TableRow><TableCell>Gold</TableCell><TableCell>Items Sold</TableCell><TableCell className="text-right font-mono">{reportData.sales?.items_sold || 0}</TableCell></TableRow>
                  <TableRow><TableCell>Silver</TableCell><TableCell>Stock (grams)</TableCell><TableCell className="text-right font-mono">{fmtG(reportData.silver_stock?.grams)}</TableCell></TableRow>
                  <TableRow><TableCell>Hallmarking</TableCell><TableCell>HUID Count This Month</TableCell><TableCell className="text-right font-mono">{reportData.hallmarking?.huid_count || 0}</TableCell></TableRow>
                </TableBody>
              </Table>

              <div className="border rounded-lg">
                <div className="p-3 bg-muted/30 border-b flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">XML Preview (SEBI Schema)</p>
                  <Badge className="text-xs bg-gray-100 text-gray-700">SEBIBullionReport</Badge>
                </div>
                <pre className="p-3 text-xs font-mono text-green-800 overflow-x-auto bg-gray-50/50 whitespace-pre-wrap">{reportData.xml || ""}</pre>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quarterly" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 items-end">
                <div>
                  <Label>Financial Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quarter</Label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{QUARTERS.map((q, i) => <SelectItem key={i} value={String(i + 1)}>{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={() => quarterlyData.refetch()} disabled={quarterlyData.isFetching}>
                  {quarterlyData.isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                  Generate Quarterly
                </Button>
              </div>
            </CardContent>
          </Card>

          {quarterlyData.data && (
            <Table>
              <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Gold Sales (g)</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">HUID Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {(quarterlyData.data.monthly_breakdown || []).map((m: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{MONTHS[m.month - 1]} {year}</TableCell>
                    <TableCell className="text-right">{fmtG(m.gold_grams)}</TableCell>
                    <TableCell className="text-right">{m.items_sold || 0}</TableCell>
                    <TableCell className="text-right">{m.huid_count || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Report Type</TableHead><TableHead>Gold Stock (g)</TableHead><TableHead>Silver Stock (g)</TableHead><TableHead>Status</TableHead><TableHead>Filed At</TableHead></TableRow></TableHeader>
            <TableBody>
              {(filingHistory as any[]).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{MONTHS[(r.period_month || 1) - 1]} {r.period_year}</TableCell>
                  <TableCell className="text-xs capitalize">{r.report_type}</TableCell>
                  <TableCell className="text-right">{fmtG(r.gold_stock_grams)}</TableCell>
                  <TableCell className="text-right">{fmtG(r.silver_stock_grams)}</TableCell>
                  <TableCell><Badge className={`text-xs ${r.status === "filed" ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{r.filed_at ? new Date(r.filed_at).toLocaleString("en-IN") : "—"}</TableCell>
                </TableRow>
              ))}
              {(filingHistory as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No filings yet. Generate a monthly report and file it.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig } from "@/hooks/use-tenant-config";

function CompanyGroup({ companies }: { companies: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Subsidiary Companies</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Ownership %</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${c.ownership_pct}%` }} />
                    </div>
                    <span>{c.ownership_pct}%</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ConsolidatedReport({ report }: { report: any }) {
  if (!report) return <div className="text-muted-foreground text-sm p-4">Generate report to view consolidated financials</div>;
  const pl = report.consolidated_pl;
  const bs = report.consolidated_bs;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Consolidated P&L</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {[
              ["Revenue", pl.revenue],
              ["COGS", -pl.cogs],
              ["Gross Profit", pl.gross_profit],
              ["Operating Expenses", -pl.operating_expenses],
              ["EBITDA", pl.ebitda],
              ["Depreciation", -pl.depreciation],
              ["EBIT", pl.ebit],
              ["Interest", -pl.interest],
              ["PBT", pl.pbt],
              ["Tax", -pl.tax],
              ["PAT", pl.pat],
            ].map(([label, value]) => (
              <div key={String(label)} className={`flex justify-between py-0.5 ${String(label) === "PAT" || String(label) === "EBITDA" ? "font-bold border-t" : ""}`}>
                <span className="text-muted-foreground">{label}</span>
                <span className={(value as number) >= 0 ? "text-green-600" : "text-red-600"}>{fmt(Math.abs(value as number))}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
            Intercompany eliminated: {fmt(report.intercompany_eliminated)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Consolidated Balance Sheet</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {[
              ["Total Assets", bs.total_assets],
              ["Current Assets", bs.current_assets],
              ["Fixed Assets", bs.fixed_assets],
              ["Total Liabilities", bs.total_liabilities],
              ["Equity", bs.equity],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between py-0.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{fmt(value as number)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium mb-2">By Entity</div>
            {report.companies?.map((c: any) => (
              <div key={c.name} className="flex justify-between text-xs py-0.5">
                <span>{c.name} ({c.ownership}%)</span>
                <span className="text-green-600">PAT: {fmt(c.pat)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntercompanyTable({ transactions }: { transactions: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Intercompany Transactions</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From Company</TableHead>
              <TableHead>To Company</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.from_company}</TableCell>
                <TableCell>{t.to_company}</TableCell>
                <TableCell>{fmt(t.amount)}</TableCell>
                <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                <TableCell>{t.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function MultiCompanyPage() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const fmt = (n: number) => `${tenantConfig.currency_symbol}${(n / 100000).toFixed(1)}L`;
  const [report, setReport] = useState<any>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["consolidation-companies"],
    queryFn: () => apiRequest("GET", "/api/finance-erp/consolidation/companies"),
  });

  const { data: intercompany = [] } = useQuery({
    queryKey: ["intercompany-txns"],
    queryFn: () => apiRequest("GET", "/api/finance-erp/consolidation/intercompany"),
  });

  const reportMutation = useMutation({
    mutationFn: () => apiRequest("GET", "/api/finance-erp/consolidation/report"),
    onSuccess: (data: any) => { setReport(data); toast({ title: "Report Generated", description: "Consolidated financials computed" }); },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Multi-Company Consolidation</h1>
          <p className="text-muted-foreground">Consolidated P&L and Balance Sheet across all group entities</p>
        </div>
        <Button onClick={() => reportMutation.mutate()} disabled={reportMutation.isPending}>
          {reportMutation.isPending ? "Generating..." : "Generate Consolidated Report"}
        </Button>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Company Group</TabsTrigger>
          <TabsTrigger value="report">Consolidation Report</TabsTrigger>
          <TabsTrigger value="intercompany">Intercompany</TabsTrigger>
        </TabsList>
        <TabsContent value="companies"><CompanyGroup companies={companies as any[]} /></TabsContent>
        <TabsContent value="report"><ConsolidatedReport report={report} /></TabsContent>
        <TabsContent value="intercompany"><IntercompanyTable transactions={intercompany as any[]} /></TabsContent>
      </Tabs>
    </div>
  );
}
